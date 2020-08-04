import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircRNADbIter:
    def __init__(self, directory):
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, "circRNA_dataset.txt"), 'r'), delimiter='\t')

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            if "normal brain tissue" not in line[13]: continue

            line = next(self.read_obj)
            chMatch = re.search(r'chr([^:]+)', line[1])
            ch = None
            try: ch = int(chMatch.group(1))
            except: ch = chMatch.group(1)

            ids = CircIDGroup()
            ids.addCircID(CircID("circRNADb", line[0]))

            group = CircRangeGroup(ch=ch, start=int(line[2]), end=int(line[3]), strand=line[4], ref="hg19", slength=line[6])
            ret = circrow.CircRow(group=group, hsa=ids, gene=line[5])
            ret.addExpression(Expression("Brain", "CircRNADb"))
            return ret