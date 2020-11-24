#TODO: could increase performance by storing in bits and using AND
from circhsa import CircHSA

class CircHSAGroup:
    CMP_EQUAL = 1
    CMP_UNEQUAL = 0
    CMP_UNKNOWN = -1
    
    def __init__(self):
        self.ids = []

    def addCircHSA(self, circHSA):
        self.ids.append(circHSA)

    def merge(self, other):
        for id in other.ids:
            if id not in self.ids:
                self.ids.append(id)

    def __eq__(self, other):
        if not isinstance(other, CircHSAGroup):
            raise NotImplementedError

        #If any of the database id schemes match they are equal
        for id in self.ids:
            if id in other.ids:
                return True
        return False

    def cmp(self, other):
        for id in self.ids:
            for oid in other.ids:
                if(id.database == oid.database):
                    return CircHSAGroup.CMP_EQUAL if id.id == oid.id else CircHSAGroup.CMP_UNEQUAL
        return CircHSAGroup.CMP_UNKNOWN
