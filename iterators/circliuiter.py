import csv, re, os
import pandas as pd

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircLiuIter(AbstractLiftoverIter):
    name = "Liu"
    isDataset = True

    def __init__(self, directory):
        super().__init__(directory)

        self.fileName = os.path.join(directory, "Liu et al. 2020 - 13059_2019_1701_MOESM3_ESM.xlsx")
        self.read_file = pd.read_excel(self.fileName, sheet_name="Table S2")
        self.read_obj = self.read_file.itertuples()

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.fileName), "hg19")

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)

            if not str(line[0+1]).startswith("chr"): continue
            self.meta_index += 1

            match = re.search(r'(chr[^:]+):(\d+)\|(\d+)', line[0+1])
            gene = ""
            for g in line[3+1].split(','):
                if g != "n.a.":
                    gene = g
                    break

            ids = CircHSAGroup()
            group = CircRangeGroup(ch=match.group(1), strand=line[1+1], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=gene, db_id = self.id, meta_index=self.meta_index)
            ret.addExpression(Expression(self.matcher.getTissueFromSynonym("Brain").name, "Liu", int(line[4+1])))
            return ret

    def _toBedFile(self, fileFrom):
        read_obj_tmp = self.read_file.itertuples()
        for line in read_obj_tmp:
            if not str(line[0+1]).startswith("chr"): continue
            bed = self._browserToBedHelper(line[0+1].replace('|', '-'), line[1+1])
            if bed:
                fileFrom.write(bed)