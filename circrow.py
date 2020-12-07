
from abstractdb import AbstractDB
from sortedcontainers import SortedSet

class CircRow:
    META_INDEX_CIRC_NOT_IN_DB = -1

    def __init__(self, group, hsa, gene, db_id, meta_index, url="", geneId=""):
        self.group = group
        self.hsa = hsa
        self.gene = gene
        self._meta = [CircRow.META_INDEX_CIRC_NOT_IN_DB] * (db_id + 1)
        self._meta[db_id] = meta_index
        self.geneId = geneId
        self._error = ""
        self._url = [""] * (db_id + 1)
        self._url[db_id] = url

    def getMeta(self, id):
        return -1 if id >= len(self._meta) else self._meta[id]
    
    def setMeta(self, id, value):
        if id >= len(self._meta):
            self._meta.extend([-1] * (id + 1 - len(self._meta)))
        self._meta[id] = value

    def merge(self, other):
        shouldSwap = False if len(self._meta) >= len(other._meta) else True

        newMeta = other._meta if shouldSwap else self._meta
        oldMeta = self._meta if shouldSwap else other._meta
        for i in range(len(oldMeta)): 
            newMeta[i] = max(self._meta[i], other._meta[i])
        self._meta = newMeta

        newURL = other._url if shouldSwap else self._url
        oldURL = self._url if shouldSwap else other._url
        for i in range(len(oldURL)): 
            if(not newURL[i]): newURL[i] = oldURL[i]
        self._url = newURL

        self.hsa.merge(other.hsa)

        if not self.gene and other.gene: self.gene = other.gene
        if not self.geneId and other.geneId: self.geneId = other.geneId
        if self.group.strand == '.' and other.group.strand != '.': self.group.strand = other.group.strand

    def toArray(self):
        return ["NA"] + self.group.toArray() + [self.gene]

    def __str__(self):
        return ("chr%s:%d-%d %s" % (str(self.group.ch), self.group.versions[0].start, self.group.versions[0].end, self.gene))

    def __lt__(self, other):
        if not isinstance(other, CircRow):
            raise NotImplementedError

        return self.group < other.group

    def __gt__(self, other):
        if not isinstance(other, CircRow):
            raise NotImplementedError

        return self.group > other.group

    def __eq__(self, other):
        if not isinstance(other, CircRow):
            raise NotImplementedError

        return self.group.nearEqual(other.group, 10)

    def __hash__(self):
        return hash(self.group)