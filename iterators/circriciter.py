#TODO a lot of merges occur here due to separate entries for each expression
#Could adopt this approach by separating out tables to avoid duplicate information (refer to a single unique circrna)
#But then would need to standardize which tissues are present

import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircRicIter:
    def __init__(self, directory):
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, "circRNA_expression.csv"), 'r'), delimiter=',')
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            line = next(self.read_obj)

            if line[3] != "LGG": continue

            match = re.search(r'([^_]+)_(\d+)_(\d+)', line[0])
            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()

            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand='+', ref="hg19")
            ret = circrow.CircRow(group=group, hsa=ids, gene=line[5])
            ret.addExpression(Expression("Brain", "CircRic", int(line[4])))
            return ret