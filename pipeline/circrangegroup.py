from circrange import CircRange
from abstractliftoveriter import AbstractLiftoverIter

class CircRangeGroup:
    def __init__(self, ch, strand, versions):
        self.ch = ch
        self.strand = strand
        self.versions = versions #TODO: strand can change in liftover!

    def toArray(self):
        ret = [str(self.ch)]
        for r in self:
                ret.extend((str(r.start) if r else '', str(r.end) if r else ''))
        ret.extend(self.strand)
        return ret

    def toId(self, version=1):
        if self.versions[version]:
            return "%s_%d_%d_%s" % (self.ch, self.versions[version].start, self.versions[version].end, self.strand)
        return None

    def hasId(self, version=1):
        return bool(self.versions[version])
    
    def __iter__(self):
        return self.versions.__iter__()

    def __next__(self):
        return self.versions.__next__()

    def __lt__(self, other):
        if not isinstance(other, CircRangeGroup):
            raise NotImplemented
        for i in range(len(self.versions)-1, -1, -1):
            if(self.versions[i] and other.versions[i]):
                return (i, self.ch, self.versions[i], self.strand) < (i, other.ch, other.versions[i], other.strand)
        return False
        
    def __gt__(self, other):
        if not isinstance(other, CircRangeGroup):
            raise NotImplemented
        for i in range(len(self.versions)-1, -1, -1):
            if(self.versions[i] and other.versions[i]):
                return (i, self.ch, self.versions[i], self.strand) > (i, other.ch, other.versions[i], other.strand)
        return False

    def __eq__(self, other):
        if not isinstance(other, CircRangeGroup):
            raise NotImplemented
        for i in range(len(self.versions)-1, -1, -1):
            if(self.versions[i] and other.versions[i]):
                return (self.ch, self.versions[i], self.strand) == (other.ch, other.versions[i], other.strand)
        return False

    def __hash__(self):
        for i in range(len(self.versions)-1, -1, -1):
            if(self.versions[i]):
                return hash(self.ch) ^ hash(self.strand) ^ hash(self.versions[i]) ^ hash(i)
        return -1