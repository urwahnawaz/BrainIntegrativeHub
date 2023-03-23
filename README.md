# What is BITHub? 

Brain Integrative Transcriptome Hub (BITHub)is a web resource that aggregates gene-expression data from the human brain across multiple consortia, and allows direct comparison of gene expression in an interactive manner.


<br>

Table of Contents:

- [Datasets](#datasets)
  * [Data collection](#data-collection)
  * [Metadata annotation](#metadata-annotation)
  * [Determining drivers of variation](#determining-drivers-of-variation)
  * [Normalization](#normalization)
- [Data exploration](#data-exploration)
  * [Input Data](#input-data)
  * [Search Results](#search-results)
  * [Saving the results](#saving-the-results)
  * [Running the pipeline](#running-the-pipeline)
    + [Dependancies](#dependancies)
    + [Output](#output)



<br>


# Datasets 

All scripts for pre-processing data are in the `R/preprocess` folder. Please read the [`R/preprocess/README.md`](https://github.com/VoineaguLabUNSW/BITHub/blob/master/R/preprocess/README.md) for more information on how to use the script to pre-process files. 

## Data collection 

Both processed bulk and single-nucleus RNA-seq human brain transcriptomic datasets were retrieved from their respective portals as highlighted in Table 1. As the metadata annotation was heterogeneous across the datasets, rigorous harmonization was performed. For each dataset, columns specifying Age Intervals, Regions, Diagnosis and Period were also added.

| Dataset   | Description | n | Original file |
| ------------- | ------------- | ------------- | ------------- |
| BrainSeq  | RNA-seq data of the human postmortem brain including hippocampus and dorsolateral prefrontal cortex. Collado-Torres et al used RiboZero libraries on 900 tissue samples from 551 individuals (including 286 with schizophrenia). Prenatal  (age < 0; range, 14 to 22 post-conception weeks) and postnatal (age ≥ 18 years; range, 18 to 96 years) samples were used in this work. | 900 | [BrainSeq Phase II](https://eqtl.brainseq.org/phase2/) <br><br> [Expression matrix and metadata](https://s3.us-east-2.amazonaws.com/libd-brainseq2/rse_gene_unfiltered.Rdata) |
| BrainSpan  | Samples collected and analyzed by Kang et al across multiple brain structures including 11 neocortical areas, cerebellar cortex, mediodorsal nucleus of the thalamus, striatum, amygdala, and hippocampus. Samples included prenatal (age < 0; range, 8 to 38 post-conception weeks) and postnatal (age ≥ 4 mos ; range, 4 mos to 41 years) phenotypes of the normal human brain   | 524  | [BrainSpan Developmental Atlas](https://www.brainspan.org/static/download.html) <br><br> [Expression matrix and metadata](http://www.brainspan.org/api/v2/well_known_file_download/267666525) <br><br> Additional metadata information <br> [Allen Brain Atlas](https://help.brain-map.org/download/attachments/3506181/Human_Brain_Seq_Stages.pdf?)  <br><br> mRIN: <br> Feng et al (2015)|
| GTEx  | The Genotype-Tissue Expression database contains 2,642 samples of the human postmortem brain in postnatal ages (age <20; range 20 to 79 years across 13 brain regions. All samples have been collected from non-diseased individuals   | 2642  | [GTEx v8](https://gtexportal.org/home/datasets) <br><br> [Gene TPMs](https://storage.googleapis.com/gtex_analysis_v8/rna_seq_data/GTEx_Analysis_2017-06-05_v8_RNASeQCv1.1.9_gene_tpm.gct.gz) <br> <br> Metadata files <br> [Phenotype Attributes](https://storage.googleapis.com/gtex_analysis_v8/annotations/GTEx_Analysis_v8_Annotations_SubjectPhenotypesDS.txt) <br> [Sample Attributes](https://storage.googleapis.com/gtex_analysis_v8/annotations/GTEx_Analysis_v8_Annotations_SampleAttributesDS.txt) |
| PsychEncode | The PsychEncode dataset contains data of the dorsolateral prefrontal cortex from human postmortem tissues from prenatal (age <0; range 4 to 40 pcw) and postnatal samples. Samples include controls and individuals with diagnosis of Bipolar Disorder, ASD, Schizophrenia and Affective disorder.   | 1428 | [PsychEncode Resource](http://resource.psychencode.org) <br><br> [Expression matrix](http://resource.psychencode.org/Datasets/Derived/DER-02_PEC_Gene_expression_matrix_TPM.txt)  <br><br> Metadata file  <br> *Access from Synapse* |
| Human Cell Atlas  | Content Cell  | 32,749 | Content Cell  |
| Velmeshev et al  | Velmeshev et al generated single-nuclei from 48 post-mortem tissue samples from the prefrontal cortex, anterior cingulate and insular cortical regions. Donors included 16 control subjects and 11 patients with ASD. All samples are postnatal  | 81,216 | [Cells UCSC](https://cells.ucsc.edu/?ds=autism)  <br> <br> Matrix: <br> [exprMatrix.tsv.gz](https://cells.ucsc.edu/autism/exprMatrix.tsv.gz) <br> Values in matrix are: 10x UMI counts from cellranger, log2-transformed <br><br> Raw count matrix: <br> [rawMatrix.zip](https://cells.ucsc.edu/autism/rawMatrix.zip) |



The user also has the option to upload their own datasets which are then integrated in BITHub in the same manner as the five core datasets. However, these data do not persist in BITHub, they are only available for the session in which they are uploaded.


## Metadata annotation
Developmental Ages 
<br>
Samples were binned into age intervals that were used to define developmental stages. For all samples < 20 years old, the binning was performed based on the BrainSpan Technical White Paper (Kang el al, 2011), whereas samples  20 years were binned in 10 year intervals. 

To allow comparison on a consistent scale, all ages were converted to years (numeric age). 
For prenatal ages (labeled -pcw): 

```
Numeric age =  -(40 - pcw) 52 
```

where pcw is the age in post-conception weeks, 40 is the total number of prenatal weeks, and 52 denotes the total number of weeks in a year. 

For ages labelled in months (labelled mos): 

```
Numeric age = mos / 12
```

where 12 represents the total number of months in a year. 

Prenatal or postnatal tags were assigned to samples depending on their numeric age where numeric age < 0 was labeled as prenatal and numeric age < 0 as postnatal.


Ontology and nomenclature of brain regions <br>

The brain structures were divided into 4 main categories (regions): Cortex, Subcortex, Cerebellum and Spinal Cord. 


## Determining drivers of variation

VariancePartition was used for mixed linear analysis to estimate the proportion of variance explained by the selected covariates on each gene.  Highly correlated covariates cannot be included in the model, and so as a result covariates that were not strongly correlated for each dataset were selected to the the varianceParititon analysis on filtered genes. For filtering, the expression cut-off was selected at 1 RPKM/TPM/CPM  in at least 10% of the samples

## Normalization 
To allow direct comparison of datasets with different normalizations, datasets have z-score transformed mean log2 expression values. 


# Data exploration 
BITHub implements multiple functionalities and can generate z-score distribution of genes in multiple datasets for cross-comparison. Additionally, users can investigate expression properties of specific genes against multiple metadata annotations, including technical, biological and sample specific variables. 

## Input Data
To compare the expression of a given gene or gene sets across different datasets, use the quick search bar in the homepage by either entering the gene symbol or Ensembl IDs. Comma separated values (.csv) containing a list of genes can also be uploaded and searched for. The search page also provides the user the option to upload a new dataset to BITHub. 

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/BITHub-search.png">



 
## Search Results 
Once a query has been sent to the interface, the user will be directed to the Search page with the results. The gene or genes of interest will be shown in a table with their Ensembl ID, Gene Symbol and a heatmap. The heatmap denotes the relative expression of the gene amongst datasets and if that gene is present in the given dataset. The user can then navigate directly to the corresponding gene page and explore its expression properties for each dataset. Search results can be downloaded as. .csv file. 

Users can explore the following properties on BITHub: 


* Detection in Brain Datasets 

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/BITHub-detection.png">



* Gene expression across datasets for single gene

The panel of the search results show a scatter plot with z-score transformed mean of every gene in the dataset. X-axis shows dataset 1, and the y-axis shows dataset 2. The dataset of interest can be selected using the drop down menu on the right. The gene or genes of interest are highlighted in green. 
To allow the direct comparison of gene expression across different datasets, we have provided a scatterplot listing z-score log2 mean transformed values of gene expression. This plot shows all genes in a given dataset with the gene of interest highlighted in green. Users can use this plot to determine how well a gene is expressed amongst any two datasets.

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/Pax6-example-multiple-datasets.png">


* Gene expression across datasets for multiple genes 

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/Multiple-genes.png">

* Exploring gene expression relationship with metadata variables in bulk datasets

For each gene, BITHub displays interactive plots that allow the full exploration of gene expression values (CPM/TPM/RPKM - depending on the original dataset normalization) in the bulk and single-nucleus datasets. By selecting metadata variables, users have the ability to determine how gene expression of interest varies with any metadata properties such as phenotype (e.g Age, Sex ), sample characterics or sequencing metrics.  Users also have the ability to filter the data based on region by selecting their region of interest from the ‘Select Brain Region’ drop down menu. 

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/Pax6-bulk-example.png">

* Exploring impact of cellular composition on gene expression 

For bulk datasets, BITHub provides information of cell-type deconvolution from the original study. Users can explore these proeprties by selecting the cell-types from the metadata panel under Sample Characertics.

<img width="1434" alt="image" src= "https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/Cell-type-composition-example.png">


Currently BITHub only provides these composition estimates for BrainSeq and PsychEncode data. However, we are working on a pipeline to standardize deconvolution estimates for these datasets. 


* Drivers of variation 

BITHub incorporates results from varianceParition.  The bar-graph for the variance partition shows the fraction of variance explained against selected metadata variables. The varianceParition results are currently only available for the bulk datasets. 

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/Pax6-varPart.png">


* Exploring single-cell properties 

<img width="1434" alt="image" src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/snRNAseq-pax6.png">


* Removing a specific annotation for overview of properties 

<img width="1434" alt="image"  src="https://github.com/VoineaguLabUNSW/BITHub/blob/master/resources/images/BITHub-selection.mov">



<br>





## Saving the results
For each panel, the data displayed can be downloaded as a .csv file, and the corresponging plot as an image file (either .svg or .png).

## Running the pipeline
This is NOT necessary for end users but is included for future work.
During the first run, some database files may be downloaded from the source - this amounts to a few hundred megabytes.
Liftover is also performed during this first run, subsequent runs should be faster.

### Dependancies
BITHub Requires Python3 and all the python libraries listed in requirements.txt.

### Output
After executing main.py, the pipeline/output folder will contain relevant hdf5 and bb files.<br>
By copying these into the resources/data folder, you may update the website's core datasets and add new databases.<br>
The website may be run locally but requires e.g. "Web Server for Chrome" due to webworkers.
To search entries and plot metadata, go to our GitHub Pages site.<br>
Datasets may be added easily via the website interface but are not persistent, which would require editing the YAML and running the Python pipeline.



