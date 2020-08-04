
from sortedcontainers import SortedSet

class CircRow:
    def __init__(self, group, hsa, gene):
        self.group = group
        self.hsa = hsa
        self.gene = gene
        self.expressions = SortedSet()

    def merge(self, other):
        #Add other tissues/studies, transfer reads to existing if undefined
        for val in other.expressions:
            pos = self.expressions.bisect_left(val)
            if pos >= 0 and pos < len(self.expressions) and self.expressions[pos] == val:
                if val.reads != -1 and self.expressions[pos].reads == -1:
                    self.expressions[pos].reads = val.reads
            else:
                self.addExpression(val)
           
        self.hsa.merge(other.hsa)
    
    def addExpression(self, value):
        self.expressions.add(value)

    def writeRow(self, id, writeObj, writeObjHeader=None):
        prefix = [id] + self.group.toArray() + self.hsa.toArray() + [self.gene]

        if writeObjHeader:
            writeObjHeader.writerow(prefix)
            for exp in self.expressions:
                writeObj.writerow([id] + exp.toArray())
        else:
            for exp in self.expressions:
                writeObj.writerow(prefix + exp.toArray())

    def writeHTMLRow(self, id, writeObj):
        #Writing parent section
        out = '<tbody><tr class="parent">'
        for val in ([id] + self.group.toArray() + self.hsa.toArray() + [self.gene] + [len(self.expressions)]):
            out += "<td>%s</td>" % (val)
        out += '<td><i class="fa fa-chevron-down"></i></td>'

        #Writing child section
        out += '<tr class="cchild"><td>Tissue</td><td>Study</td><td>Reads</td></tr>'
        for exp in self.expressions:
            out += '<tr class="cchild">'
            for val in exp.toArray():
                out += "<td>%s</td>" % (val)
            out += '</tr>'
        
        out += '</tr></tbody>'
        writeObj.write(out)


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

        return self.group == other.group

    def __hash__(self):
        return hash(self.group)