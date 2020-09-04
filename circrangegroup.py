from circrange import CircRange
from abstractliftoveriter import AbstractLiftoverIter

class CircRangeGroup:
    def __init__(self, ch, strand, versions):
        self.ch = ch
        self.strand = strand
        self.versions = versions

    def toArray(self):
        ret = [str(self.ch)]
        for r in self:
                ret.extend((str(r.start) if r else '', str(r.end) if r else ''))
        ret.extend(self.strand)
        return ret

    def toBrowserFormat(self):
        for i in range(len(AbstractLiftoverIter.required)):
            if(self.versions[i]):
                return "%s_%d_%d_%s_%s" % (self.ch, self.versions[i].start, self.versions[i].end, self.strand, str(i))
        return None
    
    def __iter__(self):
        return self.versions.__iter__()

    def __next__(self):
        return self.versions.__next__()

    def __lt__(self, other):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented
        for i in range(len(self.versions)):
            if(self.versions[i] and other.versions[i]):
                return (self.ch, self.versions[i]) < (other.ch, other.versions[i])
        return False
        
    def __gt__(self, other):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented
        for i in range(len(self.versions)):
            if(self.versions[i] and other.versions[i]):
                return (self.ch, self.versions[i]) > (other.ch, other.versions[i])
        return False

    def __eq__(self, other):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented
        for i in range(len(self.versions)):
            if(self.versions[i] and other.versions[i]):
                return (self.ch, self.versions[i], self.strand) == (other.ch, other.versions[i], other.strand)
        return False
    
    def nearEqual(self, other, dist):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented
        for i in range(len(self.versions)):
            if(self.versions[i] and other.versions[i]):
                return self.ch == other.ch and self.strand == other.strand and abs(self.versions[i].start - other.versions[i].start) <= dist and abs(self.versions[i].end - other.versions[i].end) <= dist
        return False

    def __hash__(self):
        ret =  hash(self.ch) ^ hash(self.strand)
        for i in range(len(self.versions)):
            if(self.versions[i]):
                return ret ^ hash(self.versions[i]) ^ hash(AbstractLiftoverIter.required[i])
        return ret