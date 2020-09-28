import itertools
from circtissuematcher import CircTissueMatcher

class AbstractDB:
    name = "Unknown"

    matcher = CircTissueMatcher("./data")

    id_iter = itertools.count()
    id_max = 0

    def __init__(self):
        self.id = AbstractDB.id_max = next(AbstractDB.id_iter)