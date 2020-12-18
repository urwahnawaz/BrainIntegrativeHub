class CircHSA:
    def __init__(self, database, id):
        self.database = database
        self.id = id

    def __eq__(self, other):
        if not isinstance(other, CircHSA):
            raise NotImplementedError

        return self.database == other.database and self.id == other.id