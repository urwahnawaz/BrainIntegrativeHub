import csv, re, os
import pandas as pd

from abstractmetaiter import AbstractMetaIter
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup
from expression import Expression
from circrow import CircRow

class CircGokoolIter(AbstractMetaIter):
    name = "Gokool"
    isDataset = True
    url = "https://www.biologicalpsychiatryjournal.com/article/S0006-3223(19)31581-1/"

    def __init__(self, directory):
        super().__init__(
            directory, 
            [directory + "/Reduced/gok_circ_cpm.csv", directory + "/Reduced/gok_ci.csv", directory + "/Reduced/gok_sj_cpm.csv"],
            ["CPM", "CI", "SJ"],
            "",
            "",
            directory + "/Reduced/gok_meta.csv",
            "CircRNA expression in human brain tissue")

        self.currSheet = 0
        self.fileName = os.path.join(directory, "SupplementalTables/SupplementalTable_S3.xlsx")
        self.read_file = pd.read_excel(self.fileName, sheet_name="A.DS1_annot.csv") #TODO: Fix incorrect date parsing e.g. gene sep-7 in excel
        self.read_obj = self.read_file.itertuples()

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.fileName), "hg19")

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)

            if not str(line[0+1]).startswith("ch"): continue
            self.meta_index += 1
            if line[8+1] == ".": continue

            ids = CircHSAGroup()
            ids.addCircHSA(CircHSA("Gokool", line[0]))
            if(line[25+1] == "circBase"): 
                ids.addCircHSA(CircHSA("circBase", line[26+1]))

            group = CircRangeGroup(ch=line[2+1], strand=line[8+1], versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene="" if  pd.isna(line[6+1]) else line[6+1], db_id=self.id, meta_index=self.meta_index)

            
            ret.addExpression(Expression(self.matcher.getTissueFromSynonym("CTX").name, "Gokool", int(line[20+1])))
            ret.addExpression(Expression(self.matcher.getTissueFromSynonym("CB").name, "Gokool", int(line[21+1])))

            return ret
    def _toBedFile(self, fileFrom):
        for line in self.read_file.itertuples():
            if not str(line[0+1]).startswith("ch") or line[8+1] == ".": continue
            fileFrom.write(line[2+1] + '\t' + str(line[3+1]) + '\t' + str(line[4+1]) + '\t' + line[8+1] + '\n')
            