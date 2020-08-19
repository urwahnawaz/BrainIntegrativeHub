import csv, re, os, json

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircAtlas2BrowserIter(AbstractLiftoverIter):
    name = "CircAtlas2Browser"
    tissues = ['Bone Marrow','Brain','Colon','Heart','Kidney','Liver','Lung','Placental','Prostate','Skeletal Muscle','Small Intestine','Spleen','Spinal Cord','Stomach','Testis','Thymus','Uterus','Pancreas','Retina']

    def __init__(self, directory):
        super().__init__(directory)

        self.read_file_main = open(os.path.join(directory, "browse_species_human.txt"), 'r')

        self.read_file_main_json = json.load(self.read_file_main)["data"]
        self.read_obj_main = self.read_file_main_json.__iter__()

        self._updateLiftover(os.path.getmtime(self.read_file_main.name), "hg19")

    def __iter__(self):
        return self
        
    def __next__(self):
        while(True):
            line = next(self.read_obj_main) 
            match = re.search(r'(chr[^:]+)', line["pos"])
            if not match: continue

            gene = re.search(r'-([^_]+)', line["name"]).group(1)

            ids = CircHSAGroup()
            ids.addCircHSA(CircHSA("circAltas", line["name"]))

            group = CircRangeGroup(ch=match.group(1), strand=line["strand"], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=gene, db_id = self.id)

            tissue = CircAtlas2BrowserIter.tissues[int(line["ntis"]) - 1]
            ret.addExpression(Expression(tissue, "circAtlas", float(line["score"])))
            return ret
    
    def _toBedFile(self, fileFrom):
        for line in self.read_file_main_json.__iter__():
            bed = self._browserToBedHelper(line["pos"].replace('|', '-'), line["strand"])
            if bed:
                fileFrom.write(bed)

            
