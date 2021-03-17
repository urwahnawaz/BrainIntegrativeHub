import csv, re, os
import pandas as pd

from abstractmetaiter import AbstractMetaIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

class CircDatasetIter(AbstractMetaIter):
    def __init__(self, name, nameLong, directory, main, matrices, metadata, qtl, reference, isBrainDataset, url, annotationAccuracy, brainRegionFilter):
        super().__init__(name, nameLong, directory, matrices, metadata, qtl, brainRegionFilter)

        self.fileName = os.path.join(self.directory, main)
        self.read_file = open(self.fileName, 'r')
        self.read_obj = csv.reader(self.read_file, delimiter=',')
        self.isBrainDataset = isBrainDataset
        self.url = url
        self.annotationAccuracy = annotationAccuracy

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.fileName), reference)
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        line, match = self._nextMatch(self.read_obj)
        self.meta_index += 1
        group = CircRangeGroup(ch=match.group(1), strand=match.group(4), versions=super().__next__())
        self.keys.append(line[0])
        return CircRow(group=group, hsa=CircHSAGroup(), gene=line[1], geneId=line[2], db_id=self.id, meta_index=self.meta_index, annotationAccuracy=self.annotationAccuracy)

    def _nextMatch(self, iter):
        while True:
            line = next(iter)
            match = re.search(r'(chr[^:_|\-]+).(\d+).(\d+).([\.+\-])', line[0])
            if not match: continue# or match.group(4) == ".": continue #removing strand check means many get removed as unreliable?
            return line, match

    def _toBedFile(self, fileFrom):
        temp_read_obj = csv.reader(self.read_file, delimiter=',')
        next(temp_read_obj)
        try:
            while True:
                line, match = self._nextMatch(temp_read_obj)
                fileFrom.write(self._browserArgsToBedHelper(match.group(1), match.group(2), match.group(3), match.group(4)))
        except StopIteration:
            pass
        self.read_file.seek(0)