import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup

class CircAtlas2Iter:
    def __init__(self, directory):
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, "hg38_hg19_v2.0.txt"), 'r'), delimiter='\t')
        
        next(self.read_obj)
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            match = re.search(r'chr([^:]+):(\d+)\|(\d+)', line[2])
            if not match: continue
            
            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()
            if(line[1] != '-'): ids.addCircID(CircID("circAltas", line[1]))
            if(line[4] != '-'): ids.addCircID(CircID("circBase", line[4]))
            if(line[5] != '-'): ids.addCircID(CircID("circRNADb", line[5]))
            if(line[6] != '-'): ids.addCircID(CircID("Circpedia2", line[6])) #Circpedia2 or deepbase2?

            #TODO would be better to import hg19 and hg38 here to reduce liftover errors
            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand='+', ref="hg38")
            ret = circrow.CircRow(group=group, hsa=ids, gene="")

            brainRelated = True

            if not brainRelated:
                continue

            return ret