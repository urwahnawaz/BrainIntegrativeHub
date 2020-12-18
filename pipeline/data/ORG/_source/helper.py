import csv, re, os, math

if __name__ == '__main__':
    write_file1 = csv.writer(open("org.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file1.writerow(["id", "symbol", "ensembl"])

    iter = csv.reader(open("./org_full.csv", 'r'), delimiter=',')
    next(iter)
    for line in iter:
        gene = "" if line[2] == "not_annotated" else line[2]

        write_file1.writerow([line[0], gene, ""])

