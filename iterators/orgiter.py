import csv, re, os
import pandas as pd

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class OrgIter(AbstractLiftoverIter):
    name = "Org"

    def __init__(self, directory):
        super().__init__(directory)

        self.fileName = os.path.join(directory, "org_cpm.csv")
        self.read_file = open(self.fileName, 'r')
        self.read_obj = csv.reader(self.read_file, delimiter=',')

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.fileName), "hg19")
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            match = re.search(r'(chr[^_]+)_(\d+)_(\d+)_(.)', line[0])
            if not match: continue
            self.meta_index += 1
            ids = CircHSAGroup()
            group = CircRangeGroup(ch=match.group(1), strand=match.group(4), versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene="" if line[2] == "not_annotated" else line[2], db_id = self.id, meta_index=self.meta_index)
            return ret

    def _toBedFile(self, fileFrom):
        temp_read_obj = csv.reader(self.read_file, delimiter=',')
        next(temp_read_obj)
        for line in temp_read_obj:
            match = re.search(r'(chr[^_]+)_(\d+)_(\d+)_(.)', line[0])
            if match:
                fileFrom.write(self._browserArgsToBedHelper(match.group(1), match.group(2), match.group(3), match.group(4)))
        self.read_file.seek(0)