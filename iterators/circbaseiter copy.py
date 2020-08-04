import csv, re, circrow, os

from circid import CircID
from circidgroup import CircIDGroup
from circrangegroup import CircRangeGroup
from expression import Expression

class CircBaseIter:
    files=["Rybak2015.txt", "Maass2017.txt"]

    def __init__(self, directory, onto):
        self.currFile = 0
        self.directory = directory
        self.read_obj = csv.reader(open(os.path.join(directory, CircBaseIter.files[self.currFile]), 'r'), delimiter='\t')
        self.onto = onto

    def __iter__(self):
        return self

    def __next__(self):
        while(True):
            try:
                line = next(self.read_obj)
            except StopIteration:
                self.currFile += 1
                if(self.currFile < len(CircBaseIter.files)):
                    self.read_obj = csv.reader(open(os.path.join(directory, files[self.currFile]), 'r'), delimiter='\t')
                else:
                    raise StopIteration

            match = re.search(r'chr([^:]+):(\d+)-(\d+)', line[0])
            ch = None
            try: ch = int(match.group(1))
            except: ch = match.group(1)

            ids = CircIDGroup()
            ids.addCircID(CircID("CircBase", line[2]))

            group = CircRangeGroup(ch=ch, start=int(match.group(2)), end=int(match.group(3)), strand=line[1], ref="hg19", slength=line[4])
            ret = circrow.CircRow(group=group, hsa=ids, gene=line[10])
            
            hasBrainSubclass = False

            for tissue in line[5].replace(" ", "").split(','):
                search = tissue.replace("_", " ")

                #This is very cool but takes FOREVER. Better to match at end

                #Select first subclass of brain matching
                result = list(self.onto.query_owlready(f"""
                prefix obo: <http://purl.obolibrary.org/obo/>
                prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                prefix bto: <http://purl.obolibrary.org/obo/>
                select ?one
                WHERE
                {{
                ?one rdfs:label ?two .
                FILTER(regex(?two, "{search}", "i")) .
                }}
                LIMIT 1
                OFFSET 0
                """))

                found = str(result[0]) if len(result) else ""
                
                print(search + " found: " + found)

                if not result:
                    continue

                for study in line[11].replace(" ", "").split(','):
                    ret.addExpression(Expression(search, study))
                    hasBrainSubclass = True

            if hasBrainSubclass:
                return ret

            

#expressions[(studyid, tissueid)] = reads

#TODO store paper as pubmedid
#Store expressions and tissues in tree