import os, re, subprocess, shutil

from subprocess import DEVNULL, STDOUT, check_call
from tempfile import mkstemp
from abstractdb import AbstractDB
from circrange import CircRange

class AbstractLiftoverIter(AbstractDB):
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
        #TODO we no longer nead to read unmap files, just read BED name field
        #Update reference first
        self.curr_version[self.refGenomeIndex] = self._getCircRangeFromBed(next(self.read_obj_lift[self.refGenomeIndex]))

        for i in range(len(self.read_obj_lift)):
                if i == self.refGenomeIndex: continue
                if self.latest_unmap[i] and self.latest_unmap[i] == self.curr_version[self.refGenomeIndex]:
                    #Wait since current reference matches unmapped
                    self.curr_version[i] = None
                    self.latest_unmap[i] = self._getNextUnmap(self.read_obj_lift_unmap[i])
                    self.curr_version[i] = None
                else:
                    #Include since entry is mapped
                    self.curr_version[i] = self._getCircRangeFromBed(next(self.read_obj_lift[i]))

        #Return all liftovers, contains None where conversions failed
        return self.curr_version.copy()

    def _getNextUnmap(self, iter):
        line = "#"
        try:
            while line.startswith('#'):
                line = next(iter)
        except StopIteration:
            return None
        return self._getCircRangeFromBed(line)
        
    def _getCircRangeFromBed(self, line):
        values = line.split()
        return CircRange(start=int(values[1]), end=int(values[2]))

    def _updateLiftover(self, lastModified, refGenome):
        self.refGenomeIndex = AbstractLiftoverIter.required.index(refGenome)
        self.read_file_lift_unmap = [None] * len(AbstractLiftoverIter.required)
        nameFrom = os.path.join(self.directory, "liftover." + refGenome)
        with open(nameFrom, 'w') as fileFrom:
            self._toBedFile(fileFrom)

        #Create all other maps and unmaps
        for i in range(len(AbstractLiftoverIter.required)):
            if ((os.path.getsize(self.read_file_lift[i].name) <= 0 or lastModified >= os.path.getmtime(self.read_file_lift[i].name))):
                liftTo = AbstractLiftoverIter.required[i]
                if(liftTo != refGenome):
                    #Perform liftover
                    try:
                        proc = subprocess.run(["./utility/liftOver", nameFrom, self._getChainLocation(refGenome, liftTo), self.read_file_lift[i].name, self.read_file_lift[i].name + ".unmap"], stdout=DEVNULL, stderr=STDOUT) #liftOver oldFile map.chain newFile unMapped
                        print("Running liftover: " + ' '.join(proc.args))
                    except:
                        print("Could not liftover (make sure /utilities contains compatible binaries)")

            unmapName = self.read_file_lift[i].name + ".unmap"
            self.read_file_lift[i] = open(self.read_file_lift[i].name, 'r')
            self.read_file_lift_unmap[i] = open(unmapName, 'r') if os.path.isfile(unmapName) else None
        
        #Create read objects
        self.read_obj_lift = [fp.__iter__() for fp in self.read_file_lift]
        self.read_obj_lift_unmap = [fp.__iter__() if fp else None for fp in self.read_file_lift_unmap]
        self.latest_unmap = [self._getNextUnmap(it) if it else None for it in self.read_obj_lift_unmap]
        self.curr_version = [None] * len(AbstractLiftoverIter.required)
        
    
    def _toBedFile(self, fileFrom):
        raise "Not implimented"

    def _browserToBedHelper(self, line, strand, offset=0):
        match = re.search(r'(chr[^:]+):(\d+)\-(\d+)', line)

        if not match:
            return None
        elif(offset):
            return self._browserArgsToBedHelper(match.group(1), str(int(match.group(2))+offset), match.group(3), strand)
        else:
            return self._browserArgsToBedHelper(match.group(1), match.group(2), match.group(3), strand)

    def _browserArgsToBedHelper(self, chr, start, end, strand):
        return ("%s\t%s\t%s\t%s\t%s:%s-%s_%s\n" % (chr, start, end, strand, chr, start, end, strand))
    
    def _getChainLocation(self, fromName, toName):
        ret = os.path.join('data', fromName + "To" + toName.title() + ".over.chain.gz")
        if not os.path.isfile(ret):
            print(ret)
            raise "Chain file not found"
        return ret
