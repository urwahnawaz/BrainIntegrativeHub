#TODO: could increase performance by storing in bits and using AND
from circid import CircID

class CircIDGroup:
    CMP_EQUAL = 1
    CMP_UNEQUAL = 0
    CMP_UNKNOWN = -1

    def __init__(self):
        self.ids = []

    def addCircID(self, circID):
        self.ids.append(circID)

    def merge(self, other):
        for id in other.ids:
            if id not in self.ids:
                self.ids.append(id)

    def toArray(self):
        ret = ["."] * CircID.dbNextId
        for i in self.ids:
            ret[i.dbId] = str(i.id)
        return ret

    def __eq__(self, other):
        if not isinstance(other, CircIDGroup):
            raise NotImplementedError

        #If any of the database id schemes match they are equal
        for id in self.ids:
            if id in other.ids:
                return True
        return False

    def cmp(self, other):
        for id in self.ids:
            for oid in other.ids:
                if(id.dbId == oid.dbId):
                    return CircIDGroup.CMP_EQUAL if id.id == oid.id else CircIDGroup.CMP_UNEQUAL
        return CircIDGroup.CMP_UNKNOWN
