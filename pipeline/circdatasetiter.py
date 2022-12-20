import csv, re, os
import pandas as pd

from abstractmetaiter import AbstractMetaIter
from circrow import CircRow
from seekablecsvreader import SeekableCSVReader

class CircDatasetIter(AbstractMetaIter):
    def __init__(self, name, nameLong, directory, matrices, metadata, qtl, isBrainDataset, url, annotationAccuracy, customFilterName, customFilterColumn, customMetadataCategoryOrders, variancePartition, keyIsSymbol, output, annot):
        super().__init__(name, nameLong, directory, matrices, metadata, qtl, customFilterName, customFilterColumn, customMetadataCategoryOrders, variancePartition, keyIsSymbol, output, annot)

        if(len(matrices) != 1): raise Exception("Single matrix only must be supplied for " + name + " dataset (see input.yaml)")

        self.matrixReader = SeekableCSVReader(filename=os.path.join(self.directory, matrices[0]["path"]), removeKeyDotPostfix=not self.keyIsSymbol)
        self.isBrainDataset = isBrainDataset
        self.url = url
        self.annotationAccuracy = annotationAccuracy
        self.meta_index = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = self.matrixReader.__next__()
        #if not line:
        #    raise StopIteration
        circ =  None
        if self.keyIsSymbol: circ = CircRow(gene=line[0], geneId="", db_id=self.id, meta_index=self.meta_index, annotationAccuracy=self.annotationAccuracy)
        else: circ = CircRow(gene="", geneId=line[0], db_id=self.id, meta_index=self.meta_index, annotationAccuracy=self.annotationAccuracy)
        self.meta_index += 1
        return circ