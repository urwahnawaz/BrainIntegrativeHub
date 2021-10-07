import csv, re, os
import pandas as pd

from abstractmetaiter import AbstractMetaIter
from circrow import CircRow

class CircDatasetIter(AbstractMetaIter):
    def __init__(self, name, nameLong, directory, matrices, metadata, qtl, isBrainDataset, url, annotationAccuracy, brainRegionFilter):
        super().__init__(name, nameLong, directory, matrices, metadata, qtl, brainRegionFilter)

        if(len(matrices) != 1):
            raise Exception("Single matrix only must be supplied for " + name + " dataset (see input.yaml)")

        self.fileName = os.path.join(self.directory, matrices[0]["path"])
        self.read_file = open(self.fileName, 'r')
        self.read_obj = csv.reader(self.read_file, delimiter=',')
        self.isBrainDataset = isBrainDataset
        self.url = url
        self.annotationAccuracy = annotationAccuracy
        self.numberedRowsOffset = -1

        self.meta_index = -1
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            line = next(self.read_obj)

            if self.numberedRowsOffset == -1:
                if line[0] == "1":
                    self.numberedRowsOffset = 1
                    print("Removing numbered rows from source file")
                else:
                    self.numberedRowsOffset = 0

            self.meta_index += 1
            if line[self.numberedRowsOffset]:
                versionlessEnsemblID = line[self.numberedRowsOffset].split('.', 1)[0]
                self.keys.append(versionlessEnsemblID)
                return CircRow(gene="", geneId=versionlessEnsemblID, db_id=self.id, meta_index=self.meta_index, annotationAccuracy=self.annotationAccuracy)
