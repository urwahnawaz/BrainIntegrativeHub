import os
import pandas as pd

from circtissue import CircTissue

class CircTissueMatcher:
    def __init__(self, directory):
        self.fileName = os.path.join(directory, "outTissuesAll_IV.xlsx")
        self.read_file = pd.read_excel(self.fileName, sheet_name="outTissuesAll")
        self.tissues = {}

        for line in self.read_file.itertuples():
            synonyms = line[0+1].split(", ")
            tissue = CircTissue(str(line[1+1]), pd.isna(line[2+1]), pd.isna(line[3+1]), pd.isna(line[4+1]), pd.isna(line[5+1]), pd.isna(line[6+1]), line[7+1])
            for s in synonyms:
                self.tissues[s.lower()] = tissue

    def getTissueFromSynonym(self, synonym):
        ret = self.tissues.get(synonym.lower(), None)
        #if not ret:
            #raise "Could not match tissue " + synonym
        return ret