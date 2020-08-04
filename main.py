#!/usr/bin/python

#Papers included:
#Maass2017 Memczak2013 Rybak2015 Salzman2013

import csv, datetime, re
from sortedcontainers import SortedSet

from circrow import CircRow
from circid import CircID
from circrangegroup import CircRangeGroup
from circidgroup import CircIDGroup
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

nmDist = 1 #Maximum difference in coordinates to be considered a near match
nmMerge = True #Should near matches or duplicates be merged
nmPrint = False #Should merges be reported in console

#from owlready2 import *
#onto = get_ontology("./data/bto.owl").load()
#graph = default_world.as_rdflib_graph()

def shouldMerge(circ1, circ2):
    cmp = circ1.hsa.cmp(circ2.hsa)     
    return ((cmp == CircIDGroup.CMP_EQUAL) or (cmp == CircIDGroup.CMP_UNKNOWN and circ1.group.ch == circ2.group.ch and ((abs(circ1.group.versions[0].start - circ2.group.versions[0].start) <= nmDist and abs(circ1.group.versions[0].end - circ2.group.versions[0].end) <= nmDist) or (abs(circ1.group.versions[1].start - circ2.group.versions[1].start) <= nmDist and abs(circ1.group.versions[1].end - circ2.group.versions[1].end) <= nmDist))))

def writeSingleTable(ss):
    id = 1
    with open('out.csv ', mode='w', newline='') as fp:
        write_obj = csv.writer(fp, delimiter='\t', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for circ in ss:
            for exp in circ.expressions:
                if re.search(r'Brain|CBX|CTX|Cerebellum|Cortex|Diencephalon|Forebrain|Occipital|Parietal|Temporal', exp.tissueId, flags=re.IGNORECASE):
                    circ.writeRow(id, write_obj)
                    id += 1
                    break
    return id-1

def writeDoubleTable(ss):
    id = 1
    with open('outExp.csv', mode='w', newline='') as fp1:
        write_obj1 = csv.writer(fp1, delimiter='\t', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        with open('outCirc.csv', mode='w', newline='') as fp2:
            write_obj2 = csv.writer(fp2, delimiter='\t', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            for circ in ss:
                for exp in circ.expressions:
                    if re.search(r'Brain|CBX|CTX|Cerebellum|Cortex|Diencephalon|Forebrain|Occipital|Parietal|Temporal', exp.tissueId, flags=re.IGNORECASE):
                        circ.writeRow(id, write_obj1, write_obj2)
                        id += 1
                        break
    return id-1

def writeHTML(ss, limit=1001): #limit -1 for no limit, but page gets quite laggy
    id = 0
    with open('outCirc.html', mode='w', newline='') as fp:
        fp.write(templatePre)


        headings = "<tr><th>ID</th><th>chromosome</th>"
        for ref in CircRangeGroup.required:
            headings += "<th>start (%s)</th><th>end (%s)</th>" % (ref, ref)
        headings += "<th>strand</th>"
        for db in CircID.dbIds.keys():
            headings += "<th>%s</th>" % (db)
        headings += "<th>gene</th><th>Expressions</th></tr>"
        fp.write(headings)

        for circ in ss:
            for exp in circ.expressions:
                if re.search(r'Brain|CBX|CTX|Cerebellum|Cortex|Diencephalon|Forebrain|Occipital|Parietal|Temporal', exp.tissueId, flags=re.IGNORECASE):
                    id += 1
                    if limit > 0:
                        limit -= 1
                    if limit != 0:
                        circ.writeHTMLRow(id, fp)
                    break

        fp.write(templatePost)
    return id

def writeTissuesAll(ss):
    tissueSS = SortedSet()
    for circ in ss:
        for exp in circ.expressions:
            tissueSS.add(exp.tissueId)
    with open('outTissuesAll.csv ', mode='w', newline='') as fp:
        write_obj = csv.writer(fp, delimiter='\t', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for tissue in tissueSS:
            write_obj.writerow([tissue])

def writeTissues(ss):
    tissueSS = SortedSet()
    for circ in ss:
        containsBrain = False
        for exp in circ.expressions:
            if re.search(r'Brain|CBX|CTX|Cerebellum|Cortex|Diencephalon|Forebrain|Occipital|Parietal|Temporal', exp.tissueId, flags=re.IGNORECASE):
                containsBrain = True
                break
        if containsBrain:
            for exp in circ.expressions:
                tissueSS.add(exp.tissueId)
    with open('outTissues.csv ', mode='w', newline='') as fp:
        write_obj = csv.writer(fp, delimiter='\t', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for tissue in tissueSS:
            write_obj.writerow([tissue])
        


def main():
    nmCount = 0
    ss = SortedSet()

    circIters = [
        CircLiuIter("./data/Liu"),
        CircAtlas2BrowserIter("./data/circAtlas2"),
        CircAtlas2Iter("./data/circAtlas2"),
        CircGokoolIter("./data/Gokool"),
        Circpedia2Iter("./data/CIRCpedia2"), 
        CircBaseIter("./data/Circbase"), 
        CircRNADbIter("./data/circRNADb"), 
        CircFunBaseIter("./data/CircFunBase"),
        CircRicIter("./data/CircRic"),
        MiOncoCirc2Iter("./data/MiOncoCirc2")
    ]

    for circIter in circIters:
        print(datetime.datetime.now().strftime("%H:%M:%S") + " Reading " + circIter.directory)
        for circ in circIter:
            pos = ss.bisect_left(circ)

            #Compare circbase codes (hsa_circ_xxxx) if available, otherwise compare BSJ coordinates
            if(nmMerge and pos >= 0 and pos < len(ss)):
                if(shouldMerge(circ, ss[pos])):
                    ss[pos].merge(circ)
                    nmCount += 1
                    if(nmPrint): print("merging " + str(ss[pos]) + " with " + str(circ))
                elif(pos >= 0 and pos+1 < len(ss)) and shouldMerge(circ, ss[pos+1]):
                    ss[pos+1].merge(circ)
                    nmCount += 1
                    if(nmPrint): print("merging " + str(ss[pos+1]) + " with " + str(circ))
                else:
                        ss.add(circ)
            else:
                ss.add(circ)
        print("(total circrnas: %d, total merges: %d)" % (len(ss), nmCount))

    print(datetime.datetime.now().strftime("%H:%M:%S") + " Writing ./out.csv")
    #fCount = writeSingleTable(ss)
    fCount = writeHTML(ss)
    writeDoubleTable(ss)
    writeTissues(ss)
    writeTissuesAll(ss)
    print("(total brain-related circrnas: %d)" % (fCount))


if __name__ == '__main__':
    templatePre = """
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="utf-8"/>
            <style>
                .parent ~ .cchild {
                display: none;
                }
                .open .parent ~ .cchild {
                display: table-row;
                }
                .parent {
                cursor: pointer;
                }
                tbody {
                color: #212121;
                }
                .open {
                background-color: #e6e6e6;
                }

                .open .cchild {
                background-color: #999;
                color: white;
                }
                .parent > *:last-child {
                width: 30px;
                }
                .parent i {
                transform: rotate(0deg);
                transition: transform .3s cubic-bezier(.4,0,.2,1);
                margin: -.5rem;
                padding: .5rem;
                
                }
                .open .parent i {
                transform: rotate(180deg)
                }
            </style>
        </head>
        <body>
            <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
            <!-- Latest compiled and minified CSS -->
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">

            <!-- Optional theme -->
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">

            <!-- Latest compiled and minified JavaScript -->
            <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" />

            <div class="container">
                <table class="table">

    """

    templatePost = """
                </table>
            </div>

            <script>
                $('table').on('click', 'tr.parent .fa-chevron-down', function(){
                    $(this).closest('tbody').toggleClass('open');
                });
            </script>
        </body>
    </html>

    """
    main()