class Expression:
    def __init__(self, tissueId, studyId, reads=-1):
        self.tissueId = tissueId
        self.studyId = studyId
        self.reads = reads

    def toArray(self):
        return [self.tissueId, self.studyId, self.reads]

    def __str__(self):
        return self.tissueId + ' ' + self.studyId + ' ' + str(self.reads)

    def __lt__(self, other):
        if not isinstance(other, Expression):
            return NotImplemented
        
        return (self.tissueId, self.studyId) < (other.tissueId, other.studyId)

    def __gt__(self, other):
        if not isinstance(other, Expression):
            return NotImplemented
        
        return (self.tissueId, self.studyId) > (other.tissueId, other.studyId)

    def __eq__(self, other):
        if not isinstance(other, Expression):
            return NotImplemented

        return self.tissueId == other.tissueId and self.studyId == other.studyId

    def __hash__(self):
        return hash(self.tissueId) ^ hash(self.studyId)