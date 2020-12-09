#TODO a lot of merges occur here due to separate entries for each expression
#Could adopt this approach by separating out tables to avoid duplicate information (refer to a single unique circrna)
#But then would need to standardize which tissues are present

import csv, re, os

from abstractdb import AbstractDB
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

class CircRicIter(AbstractDB):
    def __init__(self, directory):
        super().__init__("CircRic", directory)

        self.read_file = open(os.path.join(directory, "circRNA_expression.csv"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter=',')

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.read_file.name), "hg19")

        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            line = next(self.read_obj)

            if line[3] != "LGG": continue
            self.meta_index += 1

            match = re.search(r'([^_]+)_(\d+)_(\d+)', line[0])

            ids = CircHSAGroup()

            group = CircRangeGroup(ch="chr" + str(match.group(1)), strand='+', versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=line[5], db_id = self.id, meta_index=self.meta_index)
            return ret

    def _toBedFile(self, fileFrom):
        next(self.read_obj)
        for line in self.read_obj:
            match = re.search(r'([^_]+)_(\d+)_(\d+)', line[0])
            fileFrom.write("chr" + match.group(1) + '\t' + match.group(2) + '\t' + match.group(3) + '\t' + '+' + '\n')
        self.read_file.seek(0)