#!/usr/bin/python

#Papers included:
#Maass2017 Memczak2013 Rybak2015 Salzman2013

#TODO: rewrite so databases are circiters but datasets/metadata are in predefined csv format
#Makes sense to separate them since databases can be updated (and should have an update function) 
# whereas datasets cannot be and it should be easy to add more

#TODO: add multiple dtype support to jsfive

from collections import Counter
import csv, datetime, re, os, h5py, sys, math, subprocess
from subprocess import DEVNULL, STDOUT, check_call
from sortedcontainers import SortedSet
from matplotlib import pyplot
from upsetplot import from_contents, plot
import numpy as np
import oyaml as yaml

from circrow import CircRow
from circhsa import CircHSA
from circrangegroup import CircRangeGroup
from circrange import CircRange
from circhsagroup import CircHSAGroup
from abstractliftoveriter import AbstractLiftoverIter
from circdatasetiter import CircDatasetIter
from abstractmetaiter import AbstractMetaIter

from iterators.circbaseiter import CircBaseIter
from iterators.circpedia2iter import Circpedia2Iter
from iterators.circrnadbiter import CircRNADbIter
from iterators.circfunbaseiter import CircFunBaseIter
from iterators.circriciter import CircRicIter
from iterators.circatlas2iter import CircAtlas2Iter
from iterators.circatlas2browseriter import CircAtlas2BrowserIter
from iterators.mioncocirc2iter import MiOncoCirc2Iter

nmDist = 1 #Maximum difference in coordinates to be considered a near match

def isUnreliable(circ, iters):
    ds = 0
    db = 0
    for i in range(len(iters)):
        if circ.getMeta(i) != CircRow.META_INDEX_CIRC_NOT_IN_DB:
            if isinstance(iters[i], CircDatasetIter):
                ds += 1
            else:
                db += 1
    return ds <= 1 and db == 0

def isInDataset(circ, iters):
    for i in range(len(iters)):
        if isinstance(iters[i], CircDatasetIter) and circ.getMeta(i) != CircRow.META_INDEX_CIRC_NOT_IN_DB:
            return True
    return False

def shouldMerge(circ1, circ2):
    cmp = circ1.hsa.cmp(circ2.hsa)
    return ((cmp == CircHSAGroup.CMP_EQUAL) or (cmp == CircHSAGroup.CMP_UNKNOWN and circ1.group.nearEqual(circ2.group, nmDist)))

def mustMerge(circIter, circ1):
    return (not isinstance(circIter, CircDatasetIter))

def generateOutput(inputIterators):
    ss = SortedSet()
    for circIter in inputIterators:
        print(datetime.datetime.now().strftime("%H:%M:%S") + " Merging " + circIter.name)
        for circ in circIter:
            pos = ss.bisect_left(circ)
            #Compare circbase codes (hsa_circ_xxxx) if available, otherwise compare BSJ coordinates
            if(pos >= 0 and pos < len(ss)):
                if(shouldMerge(circ, ss[pos])):
                    ss[pos].merge(circ)
                elif((pos+1) < len(ss) and shouldMerge(circ, ss[pos+1])):
                    ss[pos+1].merge(circ)
                elif not mustMerge(circIter, circ):
                        ss.add(circ)
            elif not mustMerge(circIter, circ):
                ss.add(circ)
        print("(total merged circrnas: %d)" % (len(ss)))
    return ss

def writeIntersectionPlot(inputIterators, iter):
    contents = {}
    for circIter in inputIterators:
        contents[circIter.name] = [c for c in iter if (c.getMeta(circIter.id) != CircRow.META_INDEX_CIRC_NOT_IN_DB)]
    
    df = from_contents(contents)
    plot(df, facecolor="red", sort_by="cardinality", show_counts='%d')
    pyplot.savefig('./output/out.png')

#View using https://ncnr.nist.gov/ncnrdata/view/nexus-hdf-viewer.html
#Note JS reader DOES NOT support track_order
def writeHDF5(circIters, iter, inputObj, outFile="output/out.hdf5"):
    #h5py.get_config().track_order = True
    root = h5py.File(outFile,'w')

    longestId = len(max(iter, key=lambda x:len(x.group.toId())).group.toId())
    longestGene = len(max(iter, key=lambda x:len(x.gene)).gene)
    longestEnsembl = len(max(iter, key=lambda x:len(x.geneId)).geneId)

    defaultVisible = [0, 1, 2, 3, 6, 7, 8]
    defaultSearchable = [0, 7, 8]
    isDatabase = [0] * 9
    isDataset = [0] * 9
    isBrainDataset = [0] * 9
    dataOrder = ["circ_id_hg38", "chr", "start_hg19", "end_hg19", "start_hg38", "end_hg38", "strand", "gene_symbol", "ensembl_id"]
    data = root.create_group("data")
    data.create_dataset(dataOrder[0], data=np.array([circ.group.toId().encode() for circ in iter], dtype='S%d'%longestId), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[1], data=np.array([circ.group.ch.encode() for circ in iter], dtype='S5'), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[2], data=np.array([circ.group.versions[0].start for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[3], data=np.array([circ.group.versions[0].end for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[4], data=np.array([circ.group.versions[1].start for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[5], data=np.array([circ.group.versions[1].end for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[6], data=np.array([circ.group.strand.encode() for circ in iter], dtype='S1'), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[7], data=np.array([circ.gene.encode() for circ in iter], dtype='S%d'%longestGene), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[8], data=np.array([circ.geneId.encode() for circ in iter], dtype='S%d'%longestEnsembl), compression="gzip", compression_opts=9)

    urls = root.create_group("urls")
    metadata = root.create_group("metadata")

    for i in range(len(circIters)):
        if isinstance(circIters[i], AbstractMetaIter): circIters[i].writeHDF5Metadata(metadata, iter)
        circIters[i].reduceIndices(iter)
        circIters[i].writeHDF5URLs(urls, iter)
        data.create_dataset(circIters[i].name, data=np.array([int(circ.getMeta(i)) for circ in iter], dtype="i4"), compression="gzip", compression_opts=9)
        
        isDatasetCurr = isinstance(circIters[i], CircDatasetIter)
        
        isDataset.append(int(isDatasetCurr))
        isDatabase.append(int(not isDatasetCurr))
        isBrainDataset.append(int(isDatasetCurr and circIters[i].isBrainDataset))
        dataOrder.append(circIters[i].name)
        defaultVisible.append(i + 9)
    
    data.attrs.create("defaultCoord", 1)
    data.attrs.create("order", dataOrder)
    data.attrs.create("isDataset", isDataset)
    data.attrs.create("isDatabase", isDatabase)
    data.attrs.create("isBrainDataset", isBrainDataset)
    data.attrs.create("defaultVisible", defaultVisible)
    data.attrs.create("defaultSearchable", defaultSearchable)

    panels = root.create_group("panels")
    panelOrder = []
    for panelGroup in inputObj["panels"]:
        group = panels.create_group(panelGroup["name"])
        description = panelGroup["description"]
        for dataset in inputObj["datasets"]:
            description = description.replace("href=" + dataset["id"], 'href="' + dataset.get("url", "") + '" target="_blank"')

        group.attrs.create("description", description)
        for panelDataset in panelGroup["datasets"]:
            group[panelDataset] = metadata[panelDataset]
        panelOrder.append(panelGroup["name"])
    panels.attrs.create("order", panelOrder)

def writeCSV(fileName, iter, writeError=False):
    #"","chr","hg38.start","hg38.end","hg19.coord","score","strand","hg38.coord","hg38.id","DS.gok","DS.liu","DS.sy5y","DS.esc","DS.org","nDS","DB.atlas","DB.pedia","DB.base","DB.fun","nDB"
    #"1","chr1",9972018,9981170,"chr1_10032076_10041228_+",0,"+","chr1_9972018_9981170_+","chr1_9972018_9981170",TRUE,TRUE,FALSE,FALSE,FALSE,2,TRUE,TRUE,TRUE,FALSE,3
    with open(fileName, 'w', newline='') as csvfile:
        i = 1
        writer = csv.writer(csvfile, delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
        for circ in iter:
            writer.writerow([str(i), circ.group.toId()] + ([circ._error] if writeError else []))
            i += 1

def annotateEnsemblNCBI(iter):
    ##tax_id	GeneID	Symbol	LocusTag	Synonyms	dbXrefs	chromosome	map_location	description	type_of_gene	Symbol_from_nomenclature_authority	Full_name_from_nomenclature_authority	Nomenclature_status	Other_designations	Modification_date	Feature_type
    #9606	1	A1BG	-	A1B|ABG|GAB|HYST2477	MIM:138670|HGNC:HGNC:5|Ensembl:ENSG00000121410	19	19q13.43	alpha-1-B glycoprotein	protein-coding	A1BG	alpha-1-B glycoprotein	O	alpha-1B-glycoprotein|HEL-S-163pA|epididymis secretory sperm binding protein Li 163pA	20200818	-
    synonyms = {}
    ids = {}
    genes = {}
    for line in csv.reader(open("./data/Homo_sapiens.gene_info", 'r'), delimiter='\t'):
        gene = line[2]
        id = re.search(r'Ensembl:([A-Z0-9]+)', line[5])
        for synonym in line[4].split('|'): synonyms[synonym] = gene
        if not id: continue
        ids[gene] = id.group(1)
        genes[id.group(1)] = gene

    for circ in iter:
        newer = None
        if circ.gene:
            newer = synonyms.get(circ.gene, None)
        if not newer and circ.geneId:
            newer = genes.get(circ.geneId, None)

        if newer: circ.gene = newer
        if not circ.geneId and circ.gene: 
            circ.geneId = ids.get(circ.gene, "")


def annotateEnsembl(iter):
    #1	havana	gene	11869	14409	.	+	.	gene_id "ENSG00000223972"; gene_version "5"; gene_name "DDX11L1"; gene_source "havana"; gene_biotype "transcribed_unprocessed_pseudogene";
    dic = {}
    for line in csv.reader(open("./data/Homo_sapiens.GRCh38.101.gtf", 'r'), delimiter='\t'):
        if len(line) < 9: continue
        match = re.search(r'gene_id \"([^\"]+)\".*gene_name \"([^\"]+)\";', line[8])
        dic[match.group(2)] = match.group(1)

    for circ in iter:
        if not circ.geneId: circ.geneId = dic.get(circ.gene, dic.get(str(circ.gene) + "1", ""))

def annotateEnsemblBiomart(iter):
    dic = {}
    rev = {}
    for line in csv.reader(open("./data/mart_export.txt", 'r'), delimiter='\t'):
        dic[line[4]] = line[0]
        rev[line[0]] = line[4]

    for circ in iter:
        if not circ.geneId and circ.gene: circ.geneId = dic.get(circ.gene, "")
        if not circ.gene and circ.geneId: circ.gene = rev.get(circ.geneId, "")

def filterOutputToList(iter, circIters):
    ret = []
    countExcludedDs = 0
    countExcludedEns = 0
    countExcluded38 = 0
    for circ in iter:
        if isUnreliable(circ, circIters): 
            countExcludedDs += 1
            circ._error = "ERROR: unreliable (in single novel dataset and no database)"
        elif circ.group.strand == '.':
            circ._error = "ERROR: no strand"
        elif not circ.group.hasId(1) or not circ.group.hasId(0):
            countExcluded38 += 1
            circ._error = "ERROR: no hg38 liftover"
        elif not circ.geneId and not circ.gene: 
            countExcludedEns += 1
            circ._error = "ERROR: no Ensembl ID and gene symbol/alias found"
        else: ret.append(circ)
    return ret, countExcludedDs, countExcludedEns, countExcluded38

def outputTrack(iter):
    with open("./output/out.bed", 'w', newline='') as csvfile:
        writer = csv.writer(csvfile, delimiter='\t', quotechar='\"', quoting=csv.QUOTE_NONE)
        for circ in iter:
            writer.writerow([circ.group.ch, circ.group.versions[1].start, circ.group.versions[1].end, circ.group.toId()])

    sortedBed = open("./output/sorted.bed", "w")
    proc1 = subprocess.run(["sort", "-k1,1", "-k2,2n", "./output/out.bed"], stdout=sortedBed, stderr=STDOUT)
    #proc2 = subprocess.run(["./utility/bedGraphToBigWig", "./sorted.bed", "http://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes", "./out.bw"], stdout=subprocess.PIPE, stderr=STDOUT)
    proc2 = subprocess.run(["./utility/bedToBigBed", "-type=bed4", "./output/sorted.bed", "http://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes", "./output/out.bb"], stdout=subprocess.PIPE, stderr=STDOUT)

    if os.path.exists("./output/out.bed"): os.remove("./output/out.bed")
    if os.path.exists("./output/sorted.bed"): os.remove("./output/sorted.bed")

if __name__ == '__main__':
    with open("./input.yaml", 'r') as stream:
        circIters = []
        inputObj = None
        try:
            inputObj = yaml.safe_load(stream)
            for dataset in inputObj["datasets"]:
                circIters.append(CircDatasetIter(dataset["id"], dataset.get("name", ""), dataset["dir"], dataset["main"], dataset.get("matrices", []), dataset.get("meta", None), dataset.get("qtl", None), dataset["reference"], dataset.get("isBrain", False), dataset.get("url", "")))
        
        except yaml.YAMLError as exc:
            print(exc)
            exit(1)

    circIters += [
        Circpedia2Iter("./data/CIRCpedia2"), 
        CircBaseIter("./data/Circbase"), 
        CircRNADbIter("./data/circRNADb"), 
        CircFunBaseIter("./data/CircFunBase"),
        CircAtlas2BrowserIter("./data/circAtlas2"),
    ]

    print(datetime.datetime.now().strftime("%H:%M:%S") + " Annotating and Filtering")

    # 1.
    # This step creates circrows for each entry and merges to existing if within 10 bases (checks left first then right of closest)
    # It follows that datasets/databases we iterate through first end up being the "official" coordinates
    # Less than/greater than is determined by 1. hg38, 2. hg19 to find this nearest match
    # Entries with different HSA codes referring to the same database are not merged
    # Merging involves finding the union of all tissue expressions, database/dataset presence and URLs
    # This presence is represented as an index from the original source, used for later metadata steps
    ss = generateOutput(circIters)

    #2. These steps attempt to convert gene name synonyms to the official gene name and also find ensembl ID
    annotateEnsemblNCBI(ss)
    annotateEnsemblBiomart(ss)

    # 3.
    # This step filters out entries that don't have a gene name, ensembl id, hg38 or hg19 coordinates
    li, countExcludedDs, countExcludedEns, countExcluded38 = filterOutputToList(ss, circIters)

    # 4. 
    # This step writes everything to file, including metadata
    # Some very large matrices (e.g. CPM) use chunk compression for now, so we only decompress a ~page at a time
    # Metadata is reordered based on overall neurocirc order (useful for chunk compression)
    # Metadata pertaining to rows that have been filtered out in step 3. is not included
    writeHDF5(circIters, li, inputObj)

    print("> Filtered %d [unreliable]" % (countExcludedDs))
    print("> Filtered %d [liftover]" % (countExcluded38))
    print("> Filtered %d [ensembl]" % (countExcludedEns))
    
    print(datetime.datetime.now().strftime("%H:%M:%S") + " Writing outputs")

    if len(circIters) > 1: 
        writeIntersectionPlot(circIters, li)

    print("%d circrnas written" % (len(li)))

    writeCSV("./output/outError.csv", [x for x in ss if x._error], True)
    outputTrack(li)