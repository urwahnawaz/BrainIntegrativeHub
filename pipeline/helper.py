import csv


d = ','
q ='"'

#Need to run for PsychEncode, Gtex, Brainspan

numbered="./data/FormattedData/PsychEncode/Job-154061626746631166818172835.csv"
named="./data/FormattedData/PsychEncode/DER-02_PEC_gene_expression_matrix_tpm_formatted.csv"
output=numbered.replace(".csv", "_fixed.csv")

header = True
i = 0
try:
    with open(numbered,'r') as f1:
        r1 = csv.reader(f1, delimiter=d, quotechar=q)
        with open(named,'r') as f2:
            r2 = csv.reader(f2, delimiter=d, quotechar=q)
            with open(output,'w', newline='') as f3:
                w1 = csv.writer(f3, delimiter=d, quotechar=q, quoting=csv.QUOTE_MINIMAL)

                i1 = iter(r1)
                i2 = iter(r2)
                namedRow = next(i2)
                print(len(namedRow))
                while True:
                    numberedRow = next(i1)
                    if header:
                        header=False
                        w1.writerow(numberedRow)
                        continue
                    if i+1 < len(namedRow):
                        w1.writerow([namedRow[i+1]] + numberedRow[1:])
                    i += 1
except Exception as e:
    print(e)

print(i)






