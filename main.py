#!/usr/bin/python

#Papers included:
#Maass2017 Memczak2013 Rybak2015 Salzman2013

#TODO Also circatlas2browser liftover automatic fails but works manually?

from collections import Counter
import csv, datetime, re, sqlite3, os
from sortedcontainers import SortedSet
from matplotlib import pyplot
from upsetplot import from_contents, plot

from circrow import CircRow
from circhsa import CircHSA
from circrangegroup import CircRangeGroup
from circhsagroup import CircHSAGroup
from abstractliftoveriter import AbstractLiftoverIter
from iterators.circbaseiter import CircBaseIter
from iterators.circpedia2iter import Circpedia2Iter
from iterators.circrnadbiter import CircRNADbIter
from iterators.circfunbaseiter import CircFunBaseIter
from iterators.circriciter import CircRicIter
from iterators.circatlas2iter import CircAtlas2Iter
from iterators.circatlas2browseriter import CircAtlas2BrowserIter
from iterators.circgokooliter import CircGokoolIter
from iterators.circliuiter import CircLiuIter
from iterators.mioncocirc2iter import MiOncoCirc2Iter

nmDist = 10 #Maximum difference in coordinates to be considered a near match

def containsBrain(circ):
    if(circ._meta[2] == CircRow.META_INDEX_CIRC_NOT_IN_DB): return False #TODO temporarily remove everything not in Gokool
    for exp in circ.expressions:
        if re.search(r'Brain|CBX|CTX|Cerebellum|Cortex|Diencephalon|Forebrain|Occipital|Parietal|Temporal', exp.tissueId, flags=re.IGNORECASE):
            return True
    return False

def generateOutput(inputIterators):
    nmCount = 0
    ss = SortedSet()
    for circIter in inputIterators:
        print(datetime.datetime.now().strftime("%H:%M:%S") + " Merging " + circIter.name)
        for circ in circIter:
            pos = ss.bisect_left(circ)

            #Compare circbase codes (hsa_circ_xxxx) if available, otherwise compare BSJ coordinates
            if(pos >= 0 and pos < len(ss)):
                if(shouldMerge(circ, ss[pos])):
                    ss[pos].merge(circ)
                    nmCount += 1
                elif(pos >= 0 and pos+1 < len(ss)) and shouldMerge(circ, ss[pos+1]):
                    ss[pos+1].merge(circ)
                    nmCount += 1
                else:
                        ss.add(circ)
            else:
                ss.add(circ)
        print("(total circrnas: %d, total merges: %d)" % (len(ss), nmCount))
    print(datetime.datetime.now().strftime("%H:%M:%S") + " Writing outputs")
    return ss

def writeIntersectionPlot(inputIterators, ss):
    contents = {}
    for circIter in inputIterators:
        contents[circIter.name] = [c for c in ss if (c._meta[circIter.id] != CircRow.META_INDEX_CIRC_NOT_IN_DB) and containsBrain(c)] #and containsBrain(c)
    
    df = from_contents(contents)
    plot(df, facecolor="red", sort_by="cardinality")
    pyplot.savefig('out.png')

def shouldMerge(circ1, circ2):
    cmp = circ1.hsa.cmp(circ2.hsa)     
    return ((cmp == CircHSAGroup.CMP_EQUAL) or (cmp == CircHSAGroup.CMP_UNKNOWN and circ1.group.nearEqual(circ2.group, nmDist)))

def writeSqlite(circIters, ss, outFile="out.db"):
    count = 0

    if os.path.exists(outFile): os.remove(outFile)
    con = sqlite3.connect(outFile)

    #Create main table for storing unique circrnas
    con.execute('\n'.join([
        "CREATE TABLE circrna ("
            "circ_id PRIMARY_KEY,",
            "chr TEXT NOT NULL,",
            *["start_%s INTEGER,\nend_%s INTEGER," % (ref, ref) for ref in AbstractLiftoverIter.required],
            "strand TEXT NOT NULL,",
            *["meta_%s INTEGER," % (it.name) for it in circIters if it.hasMeta],
            "gene TEXT",
        ");"
    ]))

    #Insert main values
    cmd = '\n'.join([
        "insert into circrna (",
            "circ_id,",
            "chr,",
            *["start_%s,\nend_%s," % (ref, ref) for ref in AbstractLiftoverIter.required],
            "strand,",
            *["meta_%s," % (it.name) for it in circIters if it.hasMeta],
            "gene",
        f") values(?, ?,{' ?,' * ((2 * len(AbstractLiftoverIter.required)) + (sum(it.hasMeta for it in circIters)))} ?, ?)"
    ])

    con.executemany(cmd, [tuple([circ.group.toBrowserFormat()] + circ.group.toArray() + [circ._meta[i] for i in range(len(circ._meta)) if circIters[i].hasMeta] + [circ.gene]) for circ in ss if containsBrain(circ)])
    #con.executemany(cmd,  [tuple([circ.group.toBrowserFormat()] + circ.group.toArray() + [circ.gene]) for circ in ss if containsBrain(circ)])

    #Create expression table
    con.execute("""
    CREATE TABLE expression(
        circ_id TEXT NOT NULL,
        tissue TEXT NOT NULL,
        study TEXT NOT NULL,
        reads INTEGER NOT NULL
    );
    """)

    #Insert expression values
    cmd = """
    insert into expression(
        circ_id,
        tissue,
        study,
        reads
    ) values(?, ?, ?, ?)
    """
    for circ in ss:
        if containsBrain(circ):
            count +=1
            vals = [tuple([circ.group.toBrowserFormat()] + exp.toArray()) for exp in circ.expressions]
            con.executemany(cmd, vals)
    
    con.commit()
    con.execute("VACUUM")
    con.close()
    return count

if __name__ == '__main__':
    circIters = [
        CircLiuIter("./data/Liu"),
        #CircAtlas2BrowserIter("./data/circAtlas2"), #No tissue info without individual php calls
        #CircAtlas2Iter("./data/circAtlas2"), #No strand info
        CircGokoolIter("./data/Gokool"),
        Circpedia2Iter("./data/CIRCpedia2"), 
        CircBaseIter("./data/Circbase"), 
        CircRNADbIter("./data/circRNADb"), 
        CircFunBaseIter("./data/CircFunBase"),
        #CircRicIter("./data/CircRic"), #No strand info
        #MiOncoCirc2Iter("./data/MiOncoCirc2") #No strand or tissue info
    ]

    ss = generateOutput(circIters)
    if len(circIters) > 1: writeIntersectionPlot(circIters, ss)
    count = writeSqlite(circIters, ss, "out.db")
    print("Done (total brain-related circrnas: %d)" % (count))