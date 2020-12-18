class CircRange:
    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __str__(self):
        return '(' + str(self.start) + '-' + str(self.end) + ')'
    
    def __len__(self):
        return self.end - self.start

    def __lt__(self, other):
        if not isinstance(other, CircRange):
            raise NotImplementedError

        return (self.start, self.end) < (other.start, other.end)

    def __gt__(self, other):
        if not isinstance(other, CircRange):
            raise NotImplementedError

        return (self.start, self.end) > (other.start, other.end)

    def __eq__(self, other):
        if not isinstance(other, CircRange):
            raise NotImplementedError

        return (self.start, self.end) == (other.start, other.end)

    def __hash__(self):
        return hash(self.start) ^ hash(self.end)

