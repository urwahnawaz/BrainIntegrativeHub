
from sortedcontainers import SortedSet

class CircRow:
    META_INDEX_CIRC_NOT_IN_DB = -1

    def __init__(self, geneId, db_id, meta_index, url="", gene="", annotationAccuracy=0):
        self._meta = [CircRow.META_INDEX_CIRC_NOT_IN_DB] * (db_id + 1)
        self._meta[db_id] = meta_index
        self._order = None
        self.geneId = geneId
        self.gene = gene
        self._error = ""
        self._url = [""] * (db_id + 1)
        self._url[db_id] = url
        self.annotationAccuracy = annotationAccuracy

    def getMeta(self, id):
        return -1 if id >= len(self._meta) else self._meta[id]
    
    def setMeta(self, id, value):
        if id >= len(self._meta):
            self._meta.extend([-1] * (id + 1 - len(self._meta)))
        self._meta[id] = value

    def getOrder(self, id):
        return -1 if (not self._order or id >= len(self._order)) else self._order[id]

    def setOrder(self, id, value):
        if not self._order:
            self._order = [CircRow.META_INDEX_CIRC_NOT_IN_DB] * len(self._meta)
        elif id >= len(self._order):
            self._order.extend([-1] * (id + 1 - len(self._order)))
        self._order[id] = value

    def merge(self, other):
        shouldSwap = False if len(self._meta) >= len(other._meta) else True

        newMeta = other._meta if shouldSwap else self._meta
        oldMeta = self._meta if shouldSwap else other._meta
        for i in range(len(oldMeta)): 
            newMeta[i] = max(oldMeta[i], newMeta[i])
        self._meta = newMeta

        newURL = other._url if shouldSwap else self._url
        oldURL = self._url if shouldSwap else other._url
        for i in range(len(oldURL)): 
            if(not newURL[i]): newURL[i] = oldURL[i]
        self._url = newURL

        inaccurate = other.annotationAccuracy > self.annotationAccuracy
        if inaccurate: 
            self.annotationAccuracy = other.annotationAccuracy

        if (not self.gene or inaccurate) and other.gene:
            self.gene = other.gene
            if inaccurate: self.geneId = ""

        if (not self.geneId or inaccurate) and other.geneId: 
            self.geneId = other.geneId
            if inaccurate: self.gene = ""
        
    def toArray(self):
        return ["NA"] + [self.gene]

    def __str__(self):
        return ("%s" % (self.geneId))

    def __lt__(self, other):
        if not isinstance(other, CircRow):
            raise NotImplementedError

        return self.gene < other.gene if self.geneId == other.geneId else self.geneId < other.geneId

    def __gt__(self, other):
        if not isinstance(other, CircRow):
            raise NotImplementedError

        return self.gene > other.gene if self.geneId == other.geneId else self.geneId > other.geneId

    def __eq__(self, other):
        if not isinstance(other, CircRow):
            raise NotImplementedError

        return self.gene == other.gene if self.geneId == other.geneId else self.geneId == other.geneId

    def __hash__(self):
        return hash(self.geneId) ^ hash(self.gene)