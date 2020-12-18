import csv, re, os, math

if __name__ == '__main__':
    write_file1 = csv.writer(open("sy5y.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file1.writerow(["id", "symbol", "ensembl"])

    iter = csv.reader(open("./sy5y_full.csv", 'r'), delimiter=',')
    next(iter)
    for line in iter:
        write_file1.writerow([line[0], line[2], ""])

