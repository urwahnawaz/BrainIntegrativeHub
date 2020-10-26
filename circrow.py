
from abstractdb import AbstractDB
from sortedcontainers import SortedSet

class CircRow:
    META_INDEX_CIRC_NOT_IN_DB = -1

    def __init__(self, group, hsa, gene, db_id, meta_index, url=""):
        self.group = group
        self.hsa = hsa
        self.gene = gene
        self.expressions = SortedSet()
        self._meta = [CircRow.META_INDEX_CIRC_NOT_IN_DB] * (AbstractDB.id_max + 1)
        self._meta[db_id] = meta_index
        self.geneId = ""
        self.mergeCount = 0
        self._error = ""
        self._url = [""] * (AbstractDB.id_max + 1)
        self._url[db_id] = url

    def merge(self, other):
        #Add other tissues/studies, transfer reads to existing if undefined
        for val in other.expressions:
            pos = self.expressions.bisect_left(val)
            if pos >= 0 and pos < len(self.expressions) and self.expressions[pos] == val:
                if val.reads != -1 and self.expressions[pos].reads == -1:
                    self.expressions[pos].reads = val.reads
            else:
                self.addExpression(val)
        for i in range(len(other._meta)): self._meta[i] = max(self._meta[i], other._meta[i])
        for i in range(len(other._meta)): 
            if(not self._url[i]): self._url[i] = other._url[i]
        self.hsa.merge(other.hsa)
        self.mergeCount += other.mergeCount + (0 if (self.group == other.group) else 1) #Only counting non exact merges
    
    def addExpression(self, value):
        self.expressions.add(value)

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