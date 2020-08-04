import csv, re, circrow, os, json

from circrow import CircRow
from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircAtlas2BrowserIter:
    tissues = ['Bone Marrow','Brain','Colon','Heart','Kidney','Liver','Lung','Placental','Prostate','Skeletal Muscle','Small Intestine','Spleen','Spinal Cord','Stomach','Testis','Thymus','Uterus','Pancreas','Retina']

    def __init__(self, directory):
        self.directory = directory
        self.read_obj = json.load(open(os.path.join(directory, "browse_species_human.txt"), 'r'))["data"].__iter__()

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            match = re.search(r'chr([^:]+):(\d+)\|(\d+)', line["pos"]) #chrX:17477146|17512549
            if not match: continue
            
            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()
            ids.addCircID(CircID("circAltas", line["name"]))

            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand=line["strand"], ref="hg38", slength="" if line["len"] == "Unknown" else line["len"])
            ret = CircRow(group=group, hsa=ids, gene="")

            tissue = CircAtlas2BrowserIter.tissues[int(line["ntis"]) - 1]
            ret.addExpression(Expression(tissue, "circAtlas", float(line["score"])))

            return ret