import csv, re, os

from abstractdb import AbstractDB
from circrow import CircRow
from circhsa import CircHSA
from circrange import CircRange
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

class CircAtlas2Iter(AbstractDB):
    url = "http://159.226.67.237:8080/new/index.php"
    urlPrefix = "http://159.226.67.237:8080/new/circ_detail.php?ID="
    hasIndividualURLs = True

    def __init__(self, directory):
        super().__init__("CircAtlas2", directory)

        self.directory = directory

        #self._updateFileZip("http://159.226.67.237:8080/new/download_file.php", os.path.join(self.directory, "human_bed_v2.0.txt"))

        self.read_file = open(os.path.join(self.directory, "human_bed_v2.0.txt"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter='\t')
        
        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(os.path.join(self.directory, "human_bed_v2.0.txt")), "hg38")
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            
            self.meta_index += 1

            ids = CircHSAGroup()

            match = re.search(r'hsa-([^_]+)_[0-9]+', line[4])

            gene = match.group(1) if match else ""
            if gene == "intergenic": gene = ""

            group = CircRangeGroup(ch=line[0], strand=line[3], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=gene, db_id=self.id, meta_index=self.meta_index, url=line[4])
            return ret

    def _toBedFile(self, fileFrom):
        next(self.read_obj)
        try:
            while True:
                line = next(self.read_obj)
                fileFrom.write(self._browserArgsToBedHelper(line[0], line[1], line[2], line[3]))
        except StopIteration:
            pass
        self.read_file.seek(0)
        