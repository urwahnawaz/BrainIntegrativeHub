class SeekableCSVReader():
    def __init__(self, filename, delim=',', removeKeyDotPostfix=False):
        print("Reading " + filename)
        self.f = open(filename, 'r')
        self.delim = delim

        #Calculate offset - ideally this is fixed in input
        startTell = self.f.tell()
        self.removeKeyDotPostfix = False
        self.offset = 0
        self.__next__()
        rawHeading = self.currLine
        self.__next__()
        rawFirstLine = self.currLine
        if rawFirstLine[0].isnumeric(): self.offset = 1 #Cut out 1, 2, 3, 4 column
        if rawHeading[1] == 'Symbol': self.offset = 1 #Cut out duplacted symbols columm
        self.setLineStartTell(startTell)

        #Read header correctly
        self.__next__()
        self.heading = self.currLine[1:]

        #Prepare to read data
        self.removeKeyDotPostfix = removeKeyDotPostfix

    def getHeading(self):
        return self.heading
        
    def getLineStartTell(self):
        return self.currTell
    
    def setLineStartTell(self, tell):
        self.f.seek(tell)

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            self.currTell = self.f.tell()
            self.currLine = self._extractFields(self.f.readline())
            if self.currLine and self.removeKeyDotPostfix: self.currLine[0] = self.currLine[0].split(".", 1)[0]

            if self.currLine == None: raise StopIteration
            elif not len(self.currLine): continue
            
            return self.currLine
    
    def _extractFields(self, string):
        if not string: return None
        fields = string.split(self.delim)
        
        for i in range(len(fields)): fields[i] = fields[i].strip(' "\'\t\r\n')
        return fields[self.offset:]
        
    def __del__(self):
        print("Closing " + self.f.name)
        self.f.close()


def print_test(r):
    print(r.getHeading())
    count = 10
    for line in r:
        if not count: break
        print(line[0:5])
        count -= 1

if __name__ == "__main__":
    #r = SeekableCSVReader(filename="/mnt/e/ProjectsCurrent/NeuroIntegration/pipeline/data/FormattedData/HCA/HCA-exp.csv", removeKeyDotPostfix=False)
    #r = SeekableCSVReader(filename="/mnt/e/ProjectsCurrent/NeuroIntegration/pipeline/data/FormattedData/BrainSpan/BrainSpan-exp.csv", removeKeyDotPostfix=False)
    print_test(SeekableCSVReader(filename="/mnt/e/ProjectsCurrent/NeuroIntegration/pipeline/data/FormattedData/PsychENCODE/PsychEncode-exp.csv", removeKeyDotPostfix=True))
    print_test(SeekableCSVReader(filename="/mnt/e/ProjectsCurrent/NeuroIntegration/pipeline/data/FormattedData/PsychENCODE/PsychEncode-metadata-subset.csv", removeKeyDotPostfix=False))