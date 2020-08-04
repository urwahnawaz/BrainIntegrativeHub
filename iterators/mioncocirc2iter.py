import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class MiOncoCirc2Iter:
    tissues = ["ACC","BLCA","BRCA","CHOL","COLO","ESCA","GBM","HCC","HNSC","KDNY","LUNG","MBL","NRBL","OV","PAAD","PRAD","SARC","SECR","SKCM"]

    def __init__(self, directory):
        self.currFile = 0
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(self.directory, "v0.1.release.txt"), 'r'), delimiter='\t')
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)

            ch = None
            try: ch = int(line[0])
            except: ch = line[0]

            ids = CircIDGroup()

            group = CircRangeGroup(ch=ch, start=int(line[1]), end=int(line[2]), strand='+', ref="hg38")
            ret = circrow.CircRow(group=group, hsa=ids, gene=line[4])


            ret.addExpression(Expression("Human", "MiOncoCirc2", int(line[3])))
            
            return ret