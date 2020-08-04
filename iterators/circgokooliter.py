import csv, re, circrow, os
import pandas as pd

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircGokoolIter:
    sheets = ["A.DS1_annot.csv"]#, "B.DS2_annot"] #Note B.DS2 are replicates and will hence all be merged

    def __init__(self, directory):
        self.directory = directory
        self.currSheet = 0
        self.fileName = os.path.join(directory, "SupplementalTables/SupplementalTable_S3.xlsx")
        self.read_obj = pd.read_excel(self.fileName, sheet_name=CircGokoolIter.sheets[self.currSheet]).itertuples()

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            try:
                line = next(self.read_obj)
            except StopIteration:
                self.currSheet += 1
                if(self.currSheet < len(CircGokoolIter.sheets)):
                    self.read_obj = pd.read_excel(self.fileName, sheet_name=CircGokoolIter.sheets[self.currSheet]).itertuples()
                else:
                    raise StopIteration
                line = next(self.read_obj)

            if not str(line[0+1]).startswith("ch") or line[8+1] == ".":
                continue

            match = re.search(r'chr([^_]+)', line[2+1])
            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()
            
            ids.addCircID(CircID("Gokool", line[0]))
            if(line[25+1] == "circBase"): 
                ids.addCircID(CircID("circBase", line[26+1]))

            group = CircRangeGroup(ch=ch, start=int(line[3+1]), end=int(line[4+1]), strand=line[8+1], ref="hg19")
            ret = circrow.CircRow(group=group, hsa=ids, gene="." if line[6+1] == "nan" else line[6+1])

            brainRelated = True

            ret.addExpression(Expression("CTX", "Gokool", int(line[20+1])))
            ret.addExpression(Expression("CB", "Gokool", int(line[21+1])))

            if not brainRelated:
                continue

            return ret