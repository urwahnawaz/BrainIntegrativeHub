import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircBaseIter:
    files=["Rybak2015.txt", "Maass2017.txt"]
    studies = ["Rybak2015", "Maass2017"]

    def __init__(self, directory):
        self.currFile = 0
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(self.directory, CircBaseIter.files[self.currFile]), 'r'), delimiter='\t')

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            try:
                line = next(self.read_obj)
            except StopIteration:
                self.currFile += 1
                if(self.currFile < len(CircBaseIter.files)):
                    self.read_obj = csv.reader(open(os.path.join(self.directory, self.files[self.currFile]), 'r'), delimiter='\t')
                else:
                    raise StopIteration
                line = next(self.read_obj)

            match = re.search(r'chr([^:]+):(\d+)-(\d+)', line[0])
            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()
            ids.addCircID(CircID("circBase", line[2]))

            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand=line[1], ref="hg19", slength=line[4])
            ret = circrow.CircRow(group=group, hsa=ids, gene=line[10])

            tissues = line[5].replace(" ", "").split(',')
            expressions = line[6].replace(" ", "").split(',')
            #studies = line[11].replace(" ", "").split(',') #Same circs in multiple studies, use this method for duplicate expression entries

            for i in range(len(tissues)):
                tissue = tissues[i].replace("_", " ")
                if expressions[i] == "NA":
                    continue
                expression = float(expressions[i])
                ret.addExpression(Expression(tissue, CircBaseIter.studies[self.currFile], expression))
                #for study in studies:
                    #ret.addExpression(Expression(tissue, study, expression))

            return ret