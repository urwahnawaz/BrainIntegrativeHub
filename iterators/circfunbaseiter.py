import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircFunBaseIter:
    def __init__(self, directory):
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, "Homo_sapiens_circ.txt"), 'r'), delimiter='\t')
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            if "brain" not in line[2]: continue
            
            ids = CircIDGroup()
            ids.addCircID(CircID("CircFunBase", line[0]))

            match = re.search(r'chr([^:]+):(\d+)-(\d+)', line[1])

            if(match is None): continue

            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)            

            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand='+', ref="hg19")
            ret = circrow.CircRow(group=group, hsa=ids, gene=line[3])
            ret.addExpression(Expression("Brain", line[5]))
            return ret