import csv, re, os, math

if __name__ == '__main__':
    write_file1 = csv.writer(open("zhang.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file1.writerow(["id", "symbol", "ensembl"])

    write_file2 = csv.writer(open("zhang_cpm.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file2.writerow(["id", "FBN", "H9_ESC"])

    iter = csv.reader(open("./zhang_full.csv", 'r'), delimiter=',')
    next(iter)
    for line in iter:
        write_file1.writerow([line[0], line[2], ""])
        write_file2.writerow([line[0], line[3], line[4]])

