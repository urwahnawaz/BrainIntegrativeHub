# Pre-processing of RNA-seq datasets 

## Bulk RNA-seq
In order to preprocess the raw RNA-seq datafiles: 

On terminal:

```
https://github.com/VoineaguLabUNSW/BITHub.git

cd BITHub/R/preprocess
```

Open up Rstudio, or code editor of choice and ensure that you are working from the preprocessing directory 

In Rstudio, open file 

```
clean_and_format.R
```

This file sources to several functions that are written in the functions.R 


Just add the location of directories to where 
1) Raw data is stored 
2) Output directory 
3) Bulk dataset that's being formatted 

## BrainSeq 

To preprocess BrainSeq data, the following two files are needed: 

* BrainSeq2 expression and metadata file (https://s3.us-east-2.amazonaws.com/libd-brainseq2/rse_gene_unfiltered.Rdata)

These files are R objects. To run the preprocessing steps, change file path to where the R objects are located 

```{r}
# Change to your own input directory where BrainSeq files are located 
dir = file.path("/home/neuro/Documents/BrainData/Bulk/Brainseq")

# Change to your own out directory
outdir = file.path("/home/neuro/Documents/BrainData/Bulk/Brainseq/Formatted")

clean_and_format(dir,"BrainSeq", outdir)
```


## BrainSpan

To preprocess BrainSpan data, you must ensure that the BrainSpan Dir contains:

* columns_metadata.csv
* rows_metadata.csv
* expression_matrix.csv

To retrieve these files: 

1) Go to [BrainSpan Developmental Atlas](https://www.brainspan.org/static/download.html) 

2) Download the RNA-Seq Gencode v10 summarized to genes 

Two additional information files that contain information on the BrainSpan RNA-seq data were also retrieved for the pre-processing steps. These files are located in the `resources/data/annotations` from the root of the BITHub repository and will be automatically fetched once you run the script.  

```{r}
# Change to your own input directory where BrainSpan files are located 
bspandir = file.path("/home/neuro/Documents/BrainData/Bulk/BrainSpan/Kang/genes_matrix_csv")

# Change to your own out directory
outdir = file.path("/home/neuro/Documents/BrainData/Bulk/BrainSpan/Formatted/")

clean_and_format(bspandir,"BrainSpan", outdir)
```

## GTEx 

To preprocess GTEx brain data - the following files must be in the GTEx input directory. These files can be found at the [GTEx Download page](https://gtexportal.org/home/datasets)

* GTEx_Analysis_2017-06-05_v8_RNASeQCv1.1.9_gene_tpm.gct.gz 
* GTEx_Analysis_v8_Annotations_SubjectPhenotypesDS.txt 
* GTEx_Analysis_v8_Annotations_SampleAttributesDS.txt


```
# Change to your own input directory where GTEx files are located 
dir = file.path("/home/neuro/Documents/BrainData/Bulk/GTEx")

# Change to your own out directory
outdir = file.path("/home/neuro/Documents/BrainData/Bulk/GTEx/Formatted")

clean_and_format(dir,"GTEx", outdir)
```

## PsychEncode 

Retriving and preprocessing files from PsychEncode will require access to the Synapse Portal for the metadata files. 
The expression matrix can be downloaded from 

