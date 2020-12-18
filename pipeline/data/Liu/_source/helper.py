#!/usr/bin/python

import csv, re, os, math
import pandas as pd

if __name__ == '__main__':
    read_file = pd.read_excel("Liu et al. 2020 - 13059_2019_1701_MOESM3_ESM.xlsx", sheet_name="Table S2")
    write_file1 = csv.writer(open("liu.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file1.writerow(["id", "symbol", "ensembl"])

    write_file2 = csv.writer(open("liu_cpm.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file2.writerow(["id", "mean"])
    for line in read_file.itertuples():
        if not str(line[0+1]).startswith("ch") or str(line[5+1]) == "nan": continue
        match = re.search(r'(chr[^:]+):(\d+)\|(\d+)', line[0+1])
        gene = ""
        for g in line[3+1].split(','):
            if g != "n.a.":
                gene = g
                break
        id = match.group(1) + "_" + match.group(2) + "_" + match.group(3) + "_" + line[1+1]
        write_file1.writerow([id, gene, ""])
        write_file2.writerow([id, math.pow(2, float(line[4+1]))]) #can ONLY re-log2 this to stay valid
