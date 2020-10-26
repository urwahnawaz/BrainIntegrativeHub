import csv, re, os

from abstractliftoveriter import AbstractLiftoverIter
from circrow import CircRow
from circhsa import CircHSA
from circhsagroup import CircHSAGroup
from circrangegroup import CircRangeGroup
from expression import Expression

#TODO Can generate link from name e.g. http://bis.zju.edu.cn/CircFunBase/detail.php?name=circ_000458
#Can also search by position using cgi form only

class CircFunBaseIter(AbstractLiftoverIter):
    name = "CircFunBase"
    url = "http://bis.zju.edu.cn/CircFunBase"
    urlPrefix = "http://bis.zju.edu.cn/CircFunBase/detail.php?name="
    hasIndividualURLs = True

    def __init__(self, directory):
        super().__init__(directory)

        self.read_file = open(os.path.join(directory, "Homo_sapiens_circ.txt"), 'r')
        self.read_obj = csv.reader(self.read_file, delimiter='\t')

        self.meta_index = -1
        self._updateLiftover(os.path.getmtime(self.read_file.name), "hg19")

        self.read_file.seek(0)
        next(self.read_obj)

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            line = next(self.read_obj)
            if line[1] == "-": continue
            self.meta_index += 1
            
            ids = CircHSAGroup()
            ids.addCircHSA(CircHSA("CircFunBase", line[0]))

            match = re.search(r'(chr[^:]+):(\d+)-(\d+)', line[1])

            if not match: continue

            group = CircRangeGroup(ch=match.group(1), strand='.', versions=super().__next__())
            ret = CircRow(group=group, hsa=ids, gene=line[3], db_id = self.id, meta_index = self.meta_index, url=line[0])

            if "brain" in line[2]:
                ret.addExpression(Expression(self.matcher.getTissueFromSynonym("Brain").name, line[5]))
            return ret
    def _toBedFile(self, fileFrom):
        next(self.read_obj)
        for line in self.read_obj:
            if line[1] == "-": continue
            bed = self._browserToBedHelper(line[1], '.')
            if bed:
                fileFrom.write(bed)
        self.read_file.seek(0)
        
