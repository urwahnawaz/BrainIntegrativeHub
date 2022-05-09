#!/usr/bin/python

#TODO: add multiple dtype and track order support to jsfive

from collections import Counter
import csv, datetime, re, os, h5py, sys, math, subprocess
from subprocess import DEVNULL, STDOUT, check_call
from sortedcontainers import SortedSet
from matplotlib import pyplot
from upsetplot import from_contents, plot
import numpy as np
import oyaml as yaml

from circrow import CircRow
from circdatasetiter import CircDatasetIter
from abstractmetaiter import AbstractMetaIter
from abstractdb import AbstractDB

def getCount(circ, iters):
    ds = 0
    db = 0
    for i in range(len(iters)):
        if circ.getMeta(i) != CircRow.META_INDEX_CIRC_NOT_IN_DB:
            if isinstance(iters[i], CircDatasetIter):
                ds += 1
            else:
                db += 1
    return ds, db

def isUnreliable(circ, iters):
    ds, db = getCount(circ, iters)
    if(not circ.geneId): circ._error = "No geneId for symbol " + circ.gene
    elif ds <= 1: circ._error = "Only in one dataset"
    return circ._error
    
def shouldMerge(circ1, circ2):
    return circ1.geneId == circ2.geneId

def mustMerge(circIter, circ1):
    return (isinstance(circIter, AbstractDB))

def generateOutput(inputIterators):
    ss = SortedSet()
    for circIter in inputIterators:
        print(datetime.datetime.now().strftime("%H:%M:%S") + " Merging " + circIter.name)
        for circ in circIter:
            annotate(circ)
            pos = ss.bisect_left(circ)
            if pos < len(ss) and circ == ss[pos]:
                ss[pos].merge(circ)
            elif isinstance(circIter, CircDatasetIter):
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
def writeHDF5(circIters, iter, inputObj):
    #h5py.get_config().track_order = True
    root = h5py.File(inputObj["output"] + "out.hdf5",'w')

    longestGene = max((len(x.gene) if x.gene else 0) for x in iter)
    longestEnsembl = max((len(x.geneId) if x.geneId else 0) for x in iter)

    print(longestGene)
    print(longestEnsembl)

    defaultVisible = [0, 1]
    defaultSearchable = [0, 1]
    isDatabase = [0, 0]
    isDataset = [0, 0]
    isBrainDataset = [0, 0]
    dataOrder = ["Ensembl ID","Gene Symbol"]
    data = root.create_group("data")
    data.create_dataset(dataOrder[0], data=np.array([circ.geneId.encode() for circ in iter], dtype='S%d'%longestEnsembl), compression="gzip", compression_opts=9)
    data.create_dataset(dataOrder[1], data=np.array([circ.gene.encode() for circ in iter], dtype='S%d'%longestGene), compression="gzip", compression_opts=9)
    
    urls = root.create_group("urls")
    metadata = root.create_group("metadata")

    for i in range(len(circIters)):
        circIters[i].reduceIndices(iter)
        if isinstance(circIters[i], AbstractMetaIter): circIters[i].writeHDF5Metadata(metadata, iter)
        circIters[i].writeHDF5URLs(urls, iter)
        data.create_dataset(circIters[i].name, data=np.array([int(circ.getOrder(i)) for circ in iter], dtype="i4"), compression="gzip", compression_opts=9)
        
        isDatasetCurr = isinstance(circIters[i], CircDatasetIter)
        
        isDataset.append(int(isDatasetCurr))
        isDatabase.append(int(not isDatasetCurr))
        isBrainDataset.append(int(isDatasetCurr and circIters[i].isBrainDataset))
        defaultVisible.append(len(dataOrder))
        dataOrder.append(circIters[i].name)

    #Interleave binary files

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
            writer.writerow([str(i), circ.geneId] + ([circ._error] if writeError else []))
            i += 1

synonyms = {}
ids = {}
genes = {}
def annotateEnsemblNCBIInit():
    global synonyms, ids, genes

    ##tax_id	GeneID	Symbol	LocusTag	Synonyms	dbXrefs	chromosome	map_location	description	type_of_gene	Symbol_from_nomenclature_authority	Full_name_from_nomenclature_authority	Nomenclature_status	Other_designations	Modification_date	Feature_type
    #9606	1	A1BG	-	A1B|ABG|GAB|HYST2477	MIM:138670|HGNC:HGNC:5|Ensembl:ENSG00000121410	19	19q13.43	alpha-1-B glycoprotein	protein-coding	A1BG	alpha-1-B glycoprotein	O	alpha-1B-glycoprotein|HEL-S-163pA|epididymis secretory sperm binding protein Li 163pA	20200818	-
    for line in csv.reader(open("./data/Homo_sapiens.gene_info", 'r'), delimiter='\t'):
        gene = line[2]
        id = re.search(r'Ensembl:([A-Z0-9]+)', line[5])
        for synonym in line[4].split('|'): synonyms[synonym] = gene
        if not id: continue
        ids[gene] = id.group(1)
        genes[id.group(1)] = gene


def annotateBiomartInit():
    global synonyms, ids, genes
    for line in csv.reader(open("./data/mart_export.txt", 'r'), delimiter=','):
        synonyms[line[2]] = line[1]
        ids[line[1]] = line[0]
        genes[line[0]] = line[1]

def annotate(circ):
    global synonyms, ids, genes

    if(circ.gene): circ.gene = synonyms.get(circ.gene, circ.gene)
    if(circ.geneId): circ.gene = genes.get(circ.geneId, "")
    elif(circ.gene): circ.geneId = ids.get(circ.gene, "")

if __name__ == '__main__':
    #annotateEnsemblNCBIInit()
    annotateBiomartInit()

    with open("./input.yaml", 'r') as stream:
        circIters = []
        inputObj = None
        try:
            inputObj = yaml.safe_load(stream)
            for dataset in inputObj["datasets"]:
                d_id = dataset["id"]
                custom = dataset.get("customFilter", None)
                orders = list(filter(lambda x: d_id in x["datasets"], inputObj.get("customMetadataCategoryOrders", [])))
                circIters.append(CircDatasetIter(d_id, dataset.get("name", ""), dataset["dir"], dataset.get("matrices", list()), dataset.get("meta", None), dataset.get("qtl", None), dataset.get("isBrain", False), dataset.get("url", ""), dataset.get("annotationAccuracy", 0), custom.get("name", "") if custom else "", custom.get("column", "") if custom else "", orders, dataset.get("variancePartition", None), dataset.get("keyIsSymbol", False), inputObj.get("output")))
        
        except yaml.YAMLError as exc:
            print(exc)
            exit(1)

    print(datetime.datetime.now().strftime("%H:%M:%S") + " Annotating and Filtering")

    # 1.
    # This step creates circrows for each entry and merges exact coordinate/strand matches
    # Less than/greater than is determined by 1. hg38, 2. hg19 to find this nearest match
    # Merging involves finding the union of all database/dataset presence and URLs
    # This presence is represented as an index from the original source, used for later metadata steps
    ss = generateOutput(circIters)

    if not os.path.exists('output'):
        os.makedirs('output')
    # 3. 
    # This step writes everything to file, including metadata
    # Some very large matrices (e.g. CPM) use chunk compression for now, so we only decompress a ~page at a time
    # Metadata is reordered based on overall neurocirc order (useful for chunk compression)
    # Metadata pertaining to rows that have been filtered out in step 3. is not included
    filtered = [circ for circ in ss if not isUnreliable(circ, circIters)]
    writeHDF5(circIters, filtered, inputObj)
    
    print(datetime.datetime.now().strftime("%H:%M:%S") + " Writing outputs")

    print("%d circrnas written" % (len(ss)))

    writeCSV(inputObj["output"] + "outError.csv", [x for x in ss if x._error], True)

    #if len(circIters) > 1: writeIntersectionPlot(circIters, ss)