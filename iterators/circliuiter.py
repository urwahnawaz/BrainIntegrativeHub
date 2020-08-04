import csv, re, circrow, os
import pandas as pd

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircLiuIter:
    def __init__(self, directory):
        self.directory = directory
        self.fileName = os.path.join(directory, "Liu et al. 2020 - 13059_2019_1701_MOESM3_ESM.xlsx")
        self.read_obj = pd.read_excel(self.fileName, sheet_name="Table S2").itertuples()

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)

            if not str(line[0+1]).startswith("chr"):
                continue

            match = re.search(r'chr([^:]+):(\d+)\|(\d+)', line[0+1])

            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()
            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand=line[1+1], ref="hg19")
            ret = circrow.CircRow(group=group, hsa=ids, gene="." if line[3+1] == "n.a." else line[3+1])
            ret.addExpression(Expression("Brain", "Liu", int(line[4+1])))
            return ret