import os, re, subprocess, shutil, csv

from subprocess import DEVNULL, STDOUT, check_call
from tempfile import mkstemp
from abstractsource import AbstractSource
from circrange import CircRange

class AbstractLiftoverIter(AbstractSource):
    required = ["hg19", "hg38"]

    def __init__(self, name, directory):
        super().__init__(name)

        self.directory = directory
        self.read_file_lift = [None] * len(AbstractLiftoverIter.required)
        for i in range(len(AbstractLiftoverIter.required)):
            #Ensure all liftover files exist
            self.read_file_lift[i] = open(os.path.join(directory, "liftover." + AbstractLiftoverIter.required[i]), 'a+')
            self.read_file_lift[i].close()

    def __iter__(self):
        return self

    def __next__(self):
        original = self.read_obj_lift_latest[self.refGenomeIndex]
        self.curr_version[self.refGenomeIndex] = CircRange(start=int(original[1]), end=int(original[2]))

        for i in range(len(self.read_obj_lift)):
                if i == self.refGenomeIndex: continue
                lifted = self.read_obj_lift_latest[i]
                if lifted[4] == original[4]:
                    self.curr_version[i] = CircRange(start=int(lifted[1]), end=int(lifted[2]))
                    self.read_obj_lift_latest[i] = next(self.read_obj_lift[i])
                else:
                    self.curr_version[i] = None
        
        self.read_obj_lift_latest[self.refGenomeIndex] = next(self.read_obj_lift[self.refGenomeIndex])

        #Return all liftovers, contains None where conversions failed
        return self.curr_version.copy()

    def _updateLiftover(self, lastModified, refGenome):
        self.refGenomeIndex = AbstractLiftoverIter.required.index(refGenome)
        nameFrom = os.path.join(self.directory, "liftover." + refGenome)
        with open(nameFrom, 'w') as fileFrom:
            self._toBedFile(fileFrom)

        #Create all other maps and unmaps
        for i in range(len(AbstractLiftoverIter.required)):
            if True or ((os.path.getsize(self.read_file_lift[i].name) <= 0 or lastModified >= os.path.getmtime(self.read_file_lift[i].name))):
                liftTo = AbstractLiftoverIter.required[i]
                if(liftTo != refGenome):
                    #Perform liftover
                    try:
                        proc = subprocess.run(["./utility/liftOver", nameFrom, self._getChainLocation(refGenome, liftTo), self.read_file_lift[i].name, self.read_file_lift[i].name + ".unmap"], stdout=DEVNULL, stderr=STDOUT) #liftOver oldFile map.chain newFile unMapped
                        print("Running liftover: " + ' '.join(proc.args))
                    except:
                        print("Could not liftover (make sure /utilities contains compatible binaries)")

            self.read_file_lift[i] = open(self.read_file_lift[i].name, 'r')
        
        #Create read objects
        self.read_obj_lift = [csv.reader(fp, delimiter="\t") for fp in self.read_file_lift]
        self.read_obj_lift_latest = [next(it) for it in self.read_obj_lift]
        self.curr_version = [None] * len(AbstractLiftoverIter.required)
        
    def _toBedFile(self, fileFrom):
        raise "Not implimented"

    def _browserToBedHelper(self, line, strand, offset=0):
        match = re.search(r'(chr[^:]+):(\d+)\-(\d+)', line)
        if not match:
            return None
        elif(offset):
            return self._browserArgsToBedHelper(match.group(1), str(int(match.group(2))+offset), match.group(3), strand)
        return self._browserArgsToBedHelper(match.group(1), match.group(2), match.group(3), strand)

    def _browserArgsToBedHelper(self, chr, start, end, strand, startOffset=0, endOffset=0):
        if startOffset or endOffset:
            s = str(int(start) + startOffset)
            e = str(int(end) + endOffset)
            return ("%s\t%s\t%s\t%s\t%s:%s-%s_%s\n" % (chr, s, e, strand, chr, s, e, strand))
        return ("%s\t%s\t%s\t%s\t%s:%s-%s_%s\n" % (chr, start, end, strand, chr, start, end, strand))
    
    def _getChainLocation(self, fromName, toName):
        ret = os.path.join('data', fromName + "To" + toName.title() + ".over.chain.gz")
        if not os.path.isfile(ret):
            print(ret)
            raise "Chain file not found"
        return ret
