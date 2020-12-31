# NeuroCirc
NeuroCirc is a web-based resource that integrates multiple datasets of circRNA expression from the human brain, and allows interactive exploration of these data, as well as user-provided data upload.
<br>
https://voineagulab.github.io/NeuroCirc/index.html

## CircRNA expression datasets
CircRNA expression in bulk brain tissue samples:
- <b> Gokool et al. </b> comprises 197 samples of frontal cortex, temporal cortex and cerebellum of autism cases and controls (Brain1.CTX-CB).
- <b> Liu et al.</b> includes 589 samples from dorsolateral pre-frontal cortex of schizophrenia cases and controls (Brain2.DLPFC). 

CircRNA expression duriing neuronal differentiation:
- <b> Zhang et al. </b> carried out differentiation of human ES cells to forebrain neurons for 14 days (NeurDiff1.hESC)
- <b> Rybak-Wolf et al. </b> differentiated neuroblastoma SH-SY5Y cells to neurons for 2, 4 or 8 days (NeurDiff2.SY5Y)

CircRNA expression data in human brain organoids (Org):
- <b> Sloan et al </b> carried out an organoid maturation timecourse (100- 495 days) with immunopanning of tyrosine hydroxylase positive neurons and astro-cytes at each time-point. circRNA quantification was carried out in Gokool et al. 

These datasets can be downloaded from: https://github.com/Voineagulab/NeuroCirc/tree/master/pipeline/data
The user also has the option to upload their own datasets which are then integrated in NeuroCirc in the same manner as the five core datasets. However, these data do not persist in NeuroCirc, they are only available for the session in which they are uploaded.
## Data Processing 
NeuroCirc contains the union of circRNAs from the core datasets described above, and (optionally) the user-provided dataset, processed as follows.
- <b> Annotation</b>
<br> The union of circRNAs were annotated using the following databases: CircAtlas2.0, CIRCpedia, CircBase, CircFunBase, and RNAdb. For consistency, the gene symbol and Ensembl ID for all circRNAs were annotated using CircAtlas – the most recent of the databases; for circRNAs not present in CircAtlas, the annotation from the original study was retained. 
Consistent gene symbols were assigned using synonyms from NCBI. 
- <b> Filtering</b>
<br> CircRNAs were filtered out if: (a) they were present in a single dataset and no database, (b) coordinates could not be lifted to hg38 or (c) the coordinates did not correspond to an annotated gene. 

## Search options
The home page of NeuroCirc allows the user to search circRNAs by gene symbol, Ensembl Gene ID, or circRNA coordinates on the hg19 or hg38 genome assemblies. 
Search results can be sorted by each column, as well as the total number of positive datasets or databases. Search results can be downloaded as a .csv file.
<br>
This page also provides the option to upload a new dataset in NeuroCirc.
<br>
<br>
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/search.png)

## Interactive data exploration
For each circRNA, NeuroCirc displays the following panels. Each panel includes a brief description of the data displayed and interactive plotting options.
- A genome browser track of the corresponding hg38 genomic coordinates.
- Detection in Brain Datasets and circRNA Databases.
<br>
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/example1.png)
<br>
- CircRNA expression across datasets.
<br>
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/example2.png)
- CircRNA expression in human brain tissue.
<br>
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/example3.png)
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/example4.png)
- CircRNA expression during neuronal differentiation.
<br>
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/example5.png)
- CircRNA ex-pression during cellular maturation in brain organoids” allow the user to explore the expression of the circRNA of interest in the differentiation time-course datasets and the organoid maturation timecourse data respectively.
<br>
![alt-text](https://github.com/Voineagulab/NeuroCirc/blob/master/resources/images/example6.png)
- If the user uploads a circRNA expression dataset, it can be explored in a separate panel.

<br>
<br>

## Saving the results
For each panel, the data displayed can be downloaded as a .csv file, and the corresponging plot as an image file (either .svg or .png).

## Running the pipeline
This is NOT necessary for end users but is included for future work.
During the first run, some database files may be downloaded from the source - this amounts to a few hundred megabytes.
Liftover is also performed during this first run, subsequent runs should be faster.

### Dependancies
NeuroCirc Requires Python3 and all the python libraries listed in requirements.txt.
Please also download "liftOver" and "bedToBigBed" executables for your platform 
(http://hgdownload.soe.ucsc.edu/admin/exe/) and place them in a new folder, pipeline/utilities.
Note liftOver requires a license for commercial use (https://genome-store.ucsc.edu/).

### Output
After executing main.py, the pipeline/output folder will contain relevant hdf5 and bb files.<br>
By copying these into the resources/data folder, you may update the website's core datasets and add new databases.<br>
The website may be run locally but requires e.g. "Web Server for Chrome" due to webworkers.
To search entries and plot metadata, go to our GitHub Pages site.<br>
Datasets may be added easily via the website interface but are not persistent, which would require editing the YAML and running the Python pipeline.

