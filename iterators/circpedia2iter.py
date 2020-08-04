import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class Circpedia2Iter:
    def __init__(self, directory):
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, "human_hg38_All_circRNA.csv"), 'r'), delimiter=',')

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            #if re.match(r'(Cerebellum|Cortex|Diencephalon|Forebrain|Occipital|Parietal|Temporal)', line[9]) is None: continue

            posMatch = re.search(r'chr([^:]+):(\d+)-(\d+)', line[4]) #chr10:92909426-93014267
            ch = None
            try: ch = int(posMatch.group(1))
            except: ch = posMatch.group(1)

            ids = CircIDGroup()
            ids.addCircID(CircID("Circpedia2", line[0]))
            
            group = CircRangeGroup(ch=ch, start=int(posMatch.group(2)), end=int(posMatch.group(3)), strand=line[5], ref="hg38")
            
            brainRelated = True

            ret = circrow.CircRow(group=group, hsa=ids, gene=line[2])

            ret.addExpression(Expression(line[9].lower(), "Circpedia2", float(line[6])))

            if not brainRelated:
                continue

            return ret