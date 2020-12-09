import csv, re, os

from abstractdb import AbstractDB
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

class MiOncoCirc2Iter(AbstractDB):
    tissues = ["ACC","BLCA","BRCA","CHOL","COLO","ESCA","GBM","HCC","HNSC","KDNY","LUNG","MBL","NRBL","OV","PAAD","PRAD","SARC","SECR","SKCM"]

    def __init__(self, directory):
        super().__init__("MiOncoCirc2", directory)

        self.read_file = open(os.path.join(self.directory, "v0.1.release.txt"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter='\t')

        self._updateLiftover(os.path.getmtime(self.read_file.name), "hg38")

        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)


            ids = CircHSAGroup()

            group = CircRangeGroup(ch="chr" + line[0], strand='+', versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=line[4], db_id = self.id)
            
            return ret

    def _toBedFile(self, fileFrom):
        next(self.read_obj)
        for line in self.read_obj:
            fileFrom.write("chr" + line[0] + '\t' + line[1] + '\t' + line[2] + '\t' + '+' + '\n')
        self.read_file.seek(0)