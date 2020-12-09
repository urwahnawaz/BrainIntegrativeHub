import csv, re, os

from abstractdb import AbstractDB
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

#can generate link using id e.g. http://www.circbase.org/cgi-bin/singlerecord.cgi?id=hsa_circ_0114324
#Can also generate link using position

class CircBaseIter(AbstractDB):
    url = "http://www.circbase.org/"
    urlPrefix = "http://www.circbase.org/cgi-bin/singlerecord.cgi?id="
    hasIndividualURLs = True

    def __init__(self, directory):
        super().__init__("CircBase", directory)

        self._updateFile("http://circbase.org/download/hsa_hg19_circRNA.txt", os.path.join(self.directory, "hsa_hg19_circRNA.txt"))

        self.read_file = open(os.path.join(self.directory, "hsa_hg19_circRNA.txt"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter='\t')

        self.meta_index = -1

        self._updateLiftover(os.path.getmtime(os.path.join(self.directory, "hsa_hg19_circRNA.txt")), "hg19")

        self.read_file.seek(0)
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            
            self.meta_index += 1

            ids = CircHSAGroup()
            ids.addCircHSA(CircHSA("circBase", line[4]))

            group = CircRangeGroup(ch=line[0], strand=line[3], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=line[11] if line[11] != "None" else "", db_id = self.id, meta_index=self.meta_index, url=line[4])
            return ret

    def _toBedFile(self, fileFrom):
        next(self.read_obj)
        for line in self.read_obj:
            fileFrom.write(self._browserArgsToBedHelper(line[0], line[1], line[2], line[3]))
        self.read_file.seek(0)
        