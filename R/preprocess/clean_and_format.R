source("functions.R")


## BrainSeq 

# Change to your own input directory where BrainSeq files are located 
dir = file.path("/home/neuro/Documents/BrainData/Bulk/Brainseq")

# Change to your own out directory
outdir = file.path("/home/neuro/Documents/BrainData/Bulk/Brainseq/Formatted")

clean_and_format(dir,"BrainSeq", outdir) # This function will save the files in the outdir

# Preprocessing of BrainSpan files 

## In the bspan directory, you must ensure you have the following files 
## columns_metadata.csv
## rows_metadata.csv
## expression_matrix.csv

bspandir = file.path("/home/neuro/Documents/BrainData/Bulk/BrainSpan/Kang/genes_matrix_csv")

outdir = file.path("/home/neuro/Documents/BrainData/Bulk/BrainSpan/Formatted/")

clean_and_format(bspandir,"BrainSpan", outdir) 



# Preprocessing of GTEx files 

## In the GTEx dir, you must ensure you have the following files 
## GTEx_Analysis_v8_Annotations_SubjectPhenotypesDS.txt
## GTEx_Analysis_v8_Annotations_SampleAttributesDS.txt
## GTEx_Analysis_2017-06-05_v8_RNASeQCv1.1.9_gene_tpm.gct.gz

## Change to your own input directory where GTEx files are located 
dir = file.path("/home/neuro/Documents/BrainData/Bulk/GTEx")

## Change to your own out directory
outdir = file.path("/home/neuro/Documents/BrainData/Bulk/GTEx/Formatted")

clean_and_format(dir,"GTEx", outdir)

# PsychEncode 
## Change to own input directory 
 
dir = file.path("/home/neuro/Documents/BrainData/Bulk/PsychEncode")

# #Change to your own out directory
outdir = file.path("/home/neuro/Documents/BrainData/Bulk/PsychEncode/Formatted")

clean_and_format(dir,"PsychEncode", outdir)
