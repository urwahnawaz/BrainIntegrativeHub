from pyliftover import LiftOver #TODO: use https://pypi.org/project/segment-liftover/ for segments

from circrange import CircRange

#TODO make sure unconverted/accurate coordinate is first so it is used for comparisons
class CircRangeGroup:
    required = ["hg19", "hg38"]
    cached = {}

    def __init__(self, ch, start, end, strand, ref, slength=-1):
        self.ch = ch
        self.strand = strand
        self.versions = []

        for newRef in CircRangeGroup.required:
            if(ref == newRef):
                self.versions.append(CircRange(start, end, ref, slength))
            else: 
                lo = CircRangeGroup.cached.get(ref + newRef, None)
                if(lo == None):
                    lo = CircRangeGroup.cached[ref + newRef] = LiftOver(ref, newRef)
                newStart = lo.convert_coordinate("chr" + str(ch), start, strand)
                newEnd = lo.convert_coordinate("chr" + str(ch), end, strand)
                
                self.versions.append(CircRange(newStart[0][1] if newStart else -1, newEnd[0][1] if newEnd else -1, newRef))

    def toArray(self):
        ret = ["chr" + str(self.ch)]
        for r in self:
            ret.extend((str(r.start), str(r.end)))
        ret.extend(self.strand)
        return ret
    
    def __iter__(self):
        return self.versions.__iter__()

    def __next__(self):
        return self.versions.__next__()

    def __lt__(self, other):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented

        selfCh = self.ch if isinstance(self.ch, int) else 23 + len(self.ch) + ord(self.ch[0])
        otherCh = other.ch if isinstance(other.ch, int) else 23 + len(other.ch) + ord(other.ch[0])

        return (selfCh, self.versions[0]) < (otherCh, other.versions[0])

    def __gt__(self, other):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented

        selfCh = self.ch if isinstance(self.ch, int) else 23 + len(self.ch) + ord(self.ch[0])
        otherCh = other.ch if isinstance(other.ch, int) else 23 + len(other.ch) + ord(other.ch[0])

        return (selfCh, self.versions[0]) > (otherCh, other.versions[0])

    def __eq__(self, other):
        if not isinstance(other, CircRangeGroup):
            return NotImplemented

        selfCh = self.ch if isinstance(self.ch, int) else 23 + len(self.ch) + ord(self.ch[0])
        otherCh = other.ch if isinstance(other.ch, int) else 23 + len(other.ch) + ord(other.ch[0])

        return (selfCh, self.versions[0], self.strand) == (otherCh, other.versions[0], other.strand)

    def __hash__(self):
        return hash(self.ch) ^ hash(self.versions[0]) ^ hash(self.strand)