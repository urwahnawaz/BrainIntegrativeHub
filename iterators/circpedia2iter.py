import csv, re, os

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup

class Circpedia2Iter(AbstractLiftoverIter):
    url = "https://www.picb.ac.cn/rnomics/circpedia"
    urlPrefix = "https://www.picb.ac.cn/rnomics/circpedia/browser/%3Fdata%3Dhuman_hg38%26tracks%3DDNA%252CknownGene%252CHeLa_S3_poly(A)-_circ%252CHeLa_S3_poly(A)-%26highlight%3D%26loc%3D"
    hasIndividualURLs = True

    def __init__(self, directory):
        super().__init__("Circpedia2", directory)

        self.read_file = open(os.path.join(directory, "human_hg38_All_circRNA.csv"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter=',')

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.read_file.name), "hg38")

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            self.meta_index += 1

            match = re.search(r'(chr[^:]+):(\d+)-(\d+)', line[4]) #chr10:92909426-93014267

            ids = CircHSAGroup()
            #ids.addCircHSA(CircHSA("Circpedia2", line[0]))
            group = CircRangeGroup(ch=match.group(1), strand=line[5], versions=super().__next__())
            formattedURL = ""
            
            if(group.versions[1]):
                formattedURL = group.ch + "%25" + str(group.versions[1].start) + ".." + str(group.versions[1].end) #chr9%253A135882815..135883078
            ret = CircRow(group=group, hsa=ids, gene=line[2], db_id = self.id, meta_index=self.meta_index, url=formattedURL)
 
            return ret

    def _toBedFile(self, fileFrom):
        for line in self.read_obj:
            bed = self._browserToBedHelper(line[4], line[5])
            if bed:
                fileFrom.write(bed)
        self.read_file.seek(0)