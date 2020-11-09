#!/usr/bin/python

#Papers included:
#Maass2017 Memczak2013 Rybak2015 Salzman2013

from collections import Counter
import csv, datetime, re, os, h5py, sys, math
from sortedcontainers import SortedSet
from matplotlib import pyplot
from upsetplot import from_contents, plot
import numpy as np

from circrow import CircRow
from circhsa import CircHSA
from circrangegroup import CircRangeGroup
from circrange import CircRange
from circhsagroup import CircHSAGroup
from abstractliftoveriter import AbstractLiftoverIter
from iterators.circbaseiter import CircBaseIter
from iterators.circpedia2iter import Circpedia2Iter
from iterators.circrnadbiter import CircRNADbIter
from iterators.circfunbaseiter import CircFunBaseIter
from iterators.circriciter import CircRicIter
from iterators.circatlas2iter import CircAtlas2Iter
from iterators.circatlas2browseriter import CircAtlas2BrowserIter
from iterators.circgokooliter import CircGokoolIter
from iterators.circliuiter import CircLiuIter
from iterators.mioncocirc2iter import MiOncoCirc2Iter
from iterators.esc_fbniter import ESC_FBNIter
from iterators.orgiter import OrgIter
from iterators.sy5yiter import SY5YIter

nmDist = 10 #Maximum difference in coordinates to be considered a near match

def isInDataset(circ, iters):
    for i in range(len(iters)):
        if iters[i].isDataset and circ._meta[i] != CircRow.META_INDEX_CIRC_NOT_IN_DB:
            return True
    return False

def shouldMerge(circ1, circ2):
    cmp = circ1.hsa.cmp(circ2.hsa)
    return ((cmp == CircHSAGroup.CMP_EQUAL) or (cmp == CircHSAGroup.CMP_UNKNOWN and circ1.group.nearEqual(circ2.group, nmDist)))

def mustMerge(circ1):
    return circ1.group.strand == '.'

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
                elif not mustMerge(circ):
                        ss.add(circ)
            elif not mustMerge(circ):
                ss.add(circ)
        print("(total merged circrnas: %d)" % (len(ss)))
    return ss

def writeIntersectionPlot(inputIterators, iter):
    contents = {}
    for circIter in inputIterators:
        contents[circIter.name] = [c for c in iter if (c._meta[circIter.id] != CircRow.META_INDEX_CIRC_NOT_IN_DB)]
    
    df = from_contents(contents)
    plot(df, facecolor="red", sort_by="cardinality", show_counts='%d')
    pyplot.savefig('out.png')

#View using https://ncnr.nist.gov/ncnrdata/view/nexus-hdf-viewer.html
#Note JS reader DOES NOT support track_order
def writeHDF5(circIters, iter, outFile="out.hdf5"):
    root = h5py.File(outFile,'w')

    longestId = len(max(iter, key=lambda x:len(x.group.toId())).group.toId())
    longestGene = len(max(iter, key=lambda x:len(x.gene)).gene)
    longestEnsembl = len(max(iter, key=lambda x:len(x.geneId)).geneId)

    data = root.create_group("data")
    data.create_dataset("circ_id", data=np.array([circ.group.toId().encode() for circ in iter], dtype='S%d'%longestId), compression="gzip", compression_opts=9)
    data.create_dataset("chr", data=np.array([circ.group.ch.encode() for circ in iter], dtype='S5'), compression="gzip", compression_opts=9)
    data.create_dataset("start_hg19", data=np.array([circ.group.versions[0].start for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset("end_hg19", data=np.array([circ.group.versions[0].end for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset("start_hg38", data=np.array([circ.group.versions[1].start for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset("end_hg38", data=np.array([circ.group.versions[1].end for circ in iter], dtype='i4'), compression="gzip", compression_opts=9)
    data.create_dataset("strand", data=np.array([circ.group.strand.encode() for circ in iter], dtype='S1'), compression="gzip", compression_opts=9)
    data.create_dataset("gene_symbol", data=np.array([circ.gene.encode() for circ in iter], dtype='S%d'%longestGene), compression="gzip", compression_opts=9)
    data.create_dataset("ensembl_id", data=np.array([circ.geneId.encode() for circ in iter], dtype='S%d'%longestEnsembl), compression="gzip", compression_opts=9)
    
    urls = root.create_group("urls")
    charts = root.create_group("charts")
    tables = root.create_group("tables")
    for i in range(len(circIters)):
        if(circIters[i].hasMetadata): circIters[i].writeHDF5Metadata(charts, tables, iter)
        circIters[i].reduceIndices(iter)
        circIters[i].writeHDF5URLs(urls, iter)
        data.create_dataset(circIters[i].name, data=np.array([int(circ._meta[i]) for circ in iter], dtype="i4"), compression="gzip", compression_opts=9)

def writeCSV(fileName, iter, datasetsMap, databasesMap, writeError=False):
    #"","chr","hg38.start","hg38.end","hg19.coord","score","strand","hg38.coord","hg38.id","DS.gok","DS.liu","DS.sy5y","DS.esc","DS.org","nDS","DB.atlas","DB.pedia","DB.base","DB.fun","nDB"
    #"1","chr1",9972018,9981170,"chr1_10032076_10041228_+",0,"+","chr1_9972018_9981170_+","chr1_9972018_9981170",TRUE,TRUE,FALSE,FALSE,FALSE,2,TRUE,TRUE,TRUE,FALSE,3
    with open(fileName, 'w', newline='') as csvfile:
        i = 1
        writer = csv.writer(csvfile, delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
        for circ in iter:
            id19 = circ.group.toId(0)
            id38 = circ.group.toId(1)
            dsBools = [(circ._meta[datasetsMap[i]] != CircRow.META_INDEX_CIRC_NOT_IN_DB) for i in range(len(datasetsMap))]
            dbBools = [(circ._meta[databasesMap[i]] != CircRow.META_INDEX_CIRC_NOT_IN_DB) for i in range(len(databasesMap))]
            dsStrings = [("TRUE" if x else "FALSE") for x in dsBools]
            dbStrings = [("TRUE" if x else "FALSE") for x in dbBools]
            dsCount = sum(x == True for x in dsBools)
            dbCount = sum(x == True for x in dbBools)
            writer.writerow([str(i), circ.group.ch, circ.group.versions[1].start, circ.group.versions[1].end, id19, 0, circ.group.strand, id38, id38[:-1]] + dsStrings + [dsCount] + dbStrings + [dbCount] + ([circ._error] if writeError else []))
            i += 1

def readCSV(fileName, datasetsMap, databasesMap):
    #"","chr","hg38.start","hg38.end","hg19.coord","score","strand","hg38.coord","hg38.id","DS.gok","DS.liu","DS.sy5y","DS.esc","DS.org","nDS","DB.atlas","DB.pedia","DB.base","DB.fun","nDB"
    #"1","chr1",9972018,9981170,"chr1_10032076_10041228_+",0,"+","chr1_9972018_9981170_+","chr1_9972018_9981170_",True,True,False,False,False,2,True,True,True,False,3
    output = SortedSet()
    for line in csv.reader(open(fileName, 'r'), delimiter=','):
        hg19 = re.search(r'_([0-9]+)_([0-9]+)_', line[4])
        strand = line[6]
        if (not hg19) or (strand == "."): continue
        group = CircRangeGroup(line[1], strand, [CircRange(int(hg19.group(1)), int(hg19.group(2))), CircRange(int(line[2]), int(line[3]))])
        circ = CircRow(group, CircHSAGroup(), "", 0, -1)
        for i in range(len(datasetsMap)): circ._meta[datasetsMap[i]] = (1 if line[i + 9] == "TRUE" else -1)
        for i in range(len(databasesMap)): circ._meta[databasesMap[i]] = (1 if line[i + 15] == "TRUE" else -1)
        output.add(circ)
    return output

def annotateEnsemblNCBI(iter):
    ##tax_id	GeneID	Symbol	LocusTag	Synonyms	dbXrefs	chromosome	map_location	description	type_of_gene	Symbol_from_nomenclature_authority	Full_name_from_nomenclature_authority	Nomenclature_status	Other_designations	Modification_date	Feature_type
    #9606	1	A1BG	-	A1B|ABG|GAB|HYST2477	MIM:138670|HGNC:HGNC:5|Ensembl:ENSG00000121410	19	19q13.43	alpha-1-B glycoprotein	protein-coding	A1BG	alpha-1-B glycoprotein	O	alpha-1B-glycoprotein|HEL-S-163pA|epididymis secretory sperm binding protein Li 163pA	20200818	-
    synonyms = {}
    ids = {}
    genes = {}
    for line in csv.reader(open("./data/Homo_sapiens.gene_info", 'r'), delimiter='\t'):
        gene = line[2]
        id = re.search(r'Ensembl:([A-Z0-9]+)', line[5])
        if not id: continue
        ids[gene] = id.group(1)
        genes[id.group(1)] = gene
        for synonym in line[4].split('|'): synonyms[synonym] = gene

    for circ in iter:
        newer = None
        if circ.gene:
            newer = synonyms.get(circ.gene, None)
        if not newer and circ.geneId:
            newer = genes.get(circ.geneId, None)

        if newer: circ.gene = newer
        if not circ.geneId and circ.gene: 
            circ.geneId = ids.get(circ.gene, None)


def annotateEnsembl(iter):
    #1	havana	gene	11869	14409	.	+	.	gene_id "ENSG00000223972"; gene_version "5"; gene_name "DDX11L1"; gene_source "havana"; gene_biotype "transcribed_unprocessed_pseudogene";
    dic = {}
    for line in csv.reader(open("./data/Homo_sapiens.GRCh38.101.gtf", 'r'), delimiter='\t'):
        if len(line) < 9: continue
        match = re.search(r'gene_id \"([^\"]+)\".*gene_name \"([^\"]+)\";', line[8])
        dic[match.group(2)] = match.group(1)

    for circ in iter:
        if not circ.geneId: circ.geneId = dic.get(circ.gene, dic.get(str(circ.gene) + "1", None))

def annotateEnsemblBiomart(iter):
    dic = {}
    rev = {}
    for line in csv.reader(open("./data/mart_export.txt", 'r'), delimiter='\t'):
        dic[line[4]] = line[0]
        rev[line[0]] = line[4]

    for circ in iter:
        if not circ.geneId and circ.gene: circ.geneId = dic.get(circ.gene, None)
        if not circ.gene and circ.geneId: circ.gene = rev.get(circ.geneId, "")

def filterOutputToList(iter, circIters):
    ret = []
    countExcludedDs = 0
    countExcludedEns = 0
    countExcluded38 = 0
    for circ in iter:
        if not isInDataset(circ, circIters): 
            countExcludedDs += 1
            circ._error = "ERROR: not in novel datasets"
        elif not circ.group.hasId(): 
            countExcluded38 += 1
            circ._error = "ERROR: no hg38 liftover"
        elif not circ.geneId: 
            countExcludedEns += 1
            circ._error = "ERROR: no Ensembl ID found for gene symbol/alias: " + str(circ.gene)
        else: ret.append(circ)
    return ret, countExcludedDs, countExcludedEns, countExcluded38

def outputComparisonCSVs(ss, li, circIters):
    names = [v.name for v in circIters]
    datasets = ["Gokool", "Liu", "SY5Y", "ESC_FBN", "Org"]
    databases = ["CircAtlas2", "Circpedia2", "CircBase", "CircFunBase"]
    datasetsMap = [names.index(v) for v in datasets]
    databasesMap = [names.index(v) for v in databases]
    if -1 not in datasetsMap and -1 not in databasesMap: 
        writeCSV("outPy.csv", li, datasetsMap, databasesMap)
        ss2 = readCSV("./data/neuroCirc.csv", datasetsMap, databasesMap)
        writeCSV("outR.csv", ss2, datasetsMap, databasesMap)
        missing = ss2.difference(ss)
        writeCSV("outMissing.csv", missing, datasetsMap, databasesMap)
        error = [x for x in ss2.intersection(ss) if x._error]
        writeCSV("outError.csv", error, datasetsMap, databasesMap, True)

if __name__ == '__main__':
    circIters = [
        CircLiuIter("./data/Liu"),
        CircGokoolIter("./data/Gokool"),
        ESC_FBNIter("./data/ESC_FBN/Processed"),
        OrgIter("./data/ORG/Processed"),
        SY5YIter("./data/SY5Y/Processed"),
        Circpedia2Iter("./data/CIRCpedia2"), 
        CircBaseIter("./data/Circbase"), 
        CircRNADbIter("./data/circRNADb"), 
        CircFunBaseIter("./data/CircFunBase"),
        CircAtlas2BrowserIter("./data/circAtlas2"), #No tissue info without individual php calls 
        #CircAtlas2Iter("./data/circAtlas2"), #No strand info
        #CircRicIter("./data/CircRic"), #No strand info
        #MiOncoCirc2Iter("./data/MiOncoCirc2") #No strand or tissue info
    ]

    print(datetime.datetime.now().strftime("%H:%M:%S") + " Annotating and Filtering")

    ss = generateOutput(circIters)
    annotateEnsemblNCBI(ss)
    annotateEnsemblBiomart(ss)

    li, countExcludedDs, countExcludedEns, countExcluded38 = filterOutputToList(ss, circIters)

    writeHDF5(circIters, li)

    print("> Filtered %d [not in novel datasets]" % (countExcludedDs))
    print("> Filtered %d [no hg38]" % (countExcluded38))
    print("> Filtered %d [no ensembl]" % (countExcludedEns))
    
    print(datetime.datetime.now().strftime("%H:%M:%S") + " Writing outputs")

    if len(circIters) > 1: 
        writeIntersectionPlot(circIters, li)

    print("%d circrnas written" % (len(li)))

    outputComparisonCSVs(ss, li, circIters)