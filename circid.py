class CircID:
    dbIds = {}
    dbNextId = 0

    def __init__(self, database, id):
        self.dbId = CircID.dbIds.get(database, None)

        #Behaves as an R 'Factor' to prevent storing the database names many times
        if self.dbId is None:
            self.dbId = CircID.dbNextId
            CircID.dbIds[database] = CircID.dbNextId
            CircID.dbNextId += 1
        
        self.id = id

    def getDatabaseAsString(self):
        return CircId[self.dbId]

    def getIdAsString(self):
        return self.id

    def __eq__(self, other):
        if not isinstance(other, CircID):
            raise NotImplementedError

        return self.dbId == other.dbId and self.id == other.id