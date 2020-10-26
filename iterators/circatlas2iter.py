import csv, re, os

from abstractdb import AbstractDB
from circrow import CircRow
from circhsa import CircHSA
from circrange import CircRange
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

class CircAtlas2Iter(AbstractDB):
    name = "CircAtlas2DL"
    url = "http://159.226.67.237:8080/new/index.php"

    def __init__(self, directory):
        super().__init__()

        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, "hg38_hg19_v2.0.txt"), 'r'), delimiter='\t')
        
        next(self.read_obj)
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            hg38Match = re.search(r'(chr[^:]+):(\d+)\|(\d+)', line[2])
            hg19Match = re.search(r'(chr[^:]+):(\d+)\|(\d+)', line[3])
            if not (hg38Match or hg19Match):
                continue

            ids = CircHSAGroup()
            if(line[1] != '-'): ids.addCircHSA(CircHSA("circAltas", line[1]))
            if(line[4] != '-'): ids.addCircHSA(CircHSA("circBase", line[4]))
            if(line[5] != '-'): ids.addCircHSA(CircHSA("circRNADb", line[5]))
            if(line[6] != '-'): ids.addCircHSA(CircHSA("Circpedia2", line[6])) #Circpedia2 or deepbase2?

            hg19 = CircRange(start=int(hg19Match.group(2)), end=int(hg19Match.group(3))) if hg19Match else None
            hg38 = CircRange(start=int(hg38Match.group(2)), end=int(hg38Match.group(3))) if hg38Match else None
            group = CircRangeGroup(ch=hg19Match.group(1) if hg19Match else hg38Match.group(1), strand='+', versions=[hg19, hg38])

            gene = re.search(r'-([^_]+)', line[1])
            ret = CircRow(group=group, hsa=ids, gene=gene.group(1) if gene else None, db_id = self.id, meta_index=self.meta_index)
            return ret

            #I think it might be the strand that is preventing merges