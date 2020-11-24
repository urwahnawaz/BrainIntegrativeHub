import csv, re, os

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

#can generate link using id e.g. http://www.circbase.org/cgi-bin/singlerecord.cgi?id=hsa_circ_0114324
#Can also generate link using position

class CircBaseIter(AbstractLiftoverIter):
    url = "http://www.circbase.org/"
    urlPrefix = "http://www.circbase.org/cgi-bin/singlerecord.cgi?id="
    hasIndividualURLs = True
    files = ["Rybak2015.txt", "Maass2017.txt"]
    studies = ["Rybak2015", "Maass2017"]

    def __init__(self, directory):
        super().__init__("CircBase", directory)

        self.currFile = 0
        self.read_files = [open(os.path.join(self.directory, n), 'r') for n in CircBaseIter.files]
        self.read_objs = [csv.reader(f, delimiter='\t') for f in self.read_files]

        self.meta_index = -1
        self._updateLiftover(max([os.path.getmtime(os.path.join(self.directory, name)) for name in CircBaseIter.files]), "hg19")

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            try:
                line = next(self.read_objs[self.currFile])
            except StopIteration:
                self.read_files[self.currFile].seek(0)
                self.currFile += 1
                if(self.currFile >= len(CircBaseIter.files)):
                    self.currFile = 0
                    raise StopIteration
                line = next(self.read_objs[self.currFile])
            
            self.meta_index += 1 #TODO: This isn't really valid since there are multiple source files
            match = re.search(r'(chr[^:]+):(\d+)-(\d+)', line[0])

            ids = CircHSAGroup()
            ids.addCircHSA(CircHSA("circBase", line[2]))

            group = CircRangeGroup(ch=match.group(1), strand=line[1], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=line[10], db_id = self.id, meta_index=self.meta_index, url=line[2])
            return ret

    def _toBedFile(self, fileFrom):
        currFile = 0
        read_obj = csv.reader(open(os.path.join(self.directory, self.files[currFile]), 'r'), delimiter='\t')
        while(True):
            try:
                line = next(self.read_objs[self.currFile])
            except StopIteration:
                self.read_files[self.currFile].seek(0)
                self.currFile += 1
                if(self.currFile >= len(CircBaseIter.files)):
                    self.currFile = 0
                    return
                line = next(self.read_objs[self.currFile])

            bed = self._browserToBedHelper(line[0], line[1])
            if bed:
                fileFrom.write(bed)
        