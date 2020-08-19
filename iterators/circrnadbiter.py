import csv, re, os

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircRNADbIter(AbstractLiftoverIter):
    name = "RNADb"

    def __init__(self, directory):
        super().__init__(directory)

        self.read_file = open(os.path.join(directory, "circRNA_dataset.txt"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter='\t')

        self._updateLiftover(os.path.getmtime(self.read_file.name), "hg19")

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            if "normal brain tissue" not in line[13]: continue

            line = next(self.read_obj)

            ids = CircHSAGroup()
            ids.addCircHSA(CircHSA("circRNADb", line[0]))

            group = CircRangeGroup(ch=line[1], strand=line[4], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=line[5], db_id = self.id)
            ret.addExpression(Expression("Brain", "CircRNADb"))
            return ret

    def _toBedFile(self, fileFrom):
        next(self.read_obj)
        for line in self.read_obj:
            if "normal brain tissue" not in line[13]: continue
            fileFrom.write(line[1] + '\t' + line[2] + '\t' + line[3] + '\t' + line[4] + '\n')
        self.read_file.seek(0)