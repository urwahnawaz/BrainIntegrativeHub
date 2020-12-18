#!/usr/bin/python

import csv, re, os, math
import pandas as pd
import datetime

if __name__ == '__main__':
    read_file = pd.read_excel("SupplementalTable_S3.xlsx", sheet_name="A.DS1_annot.csv")
    write_file = csv.writer(open("gok.csv", 'w', newline=''), delimiter=',', quotechar='\"', quoting=csv.QUOTE_NONNUMERIC)
    write_file.writerow(["id", "symbol", "ensembl"])
    for line in read_file.itertuples():
        if not str(line[1+1]).startswith("ch"): continue

        ensembl = ""
        if str(line[5+1]) != "nan":
            ensembl = line[5+1]
            multi = ensembl.split(", ")
            if multi: ensembl = multi[0]

        #gene = genes.get(ensembl, "")
        gene = ""
        if str(line[6+1]) != "nan" and not isinstance(line[6+1], datetime.date):
            gene = line[6+1]

        write_file.writerow([line[1+1], gene, ensembl])


        