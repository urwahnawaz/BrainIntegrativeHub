# Brain Integrative Transcriptome Hub - BITHub
Brain Integrative Transcriptome Hub is a web-based resource that integrates multiple transcriptomic datasets of the human brain and allows interactive exploration of these data, as well as user-provided data upload.
<br>



## Datasets 

Bulk human brain RNA-seq datasets:
- <b> [BrainSpan](https://doi.org/10.1038/nature10523) </b> comprises of 526 samples across multiple brain structures including 11 neocortical areas, cerebellar cortex, mediodorsal nucleus of the thalamus, striatum, amygdala, and hippocampus. Samples include prenatal (age < 0; range, 8 to 38 post-conception weeks) and postnatal (age ≥ 4 mos ; range, 4 mos to 41 years) developmental stages with phenotypes of the normal human brain


- <b> [BrainSeq](https://doi.org/10.1016/j.neuron.2019.05.013) </b> includes RNA-seq data of the human postmortem brain including hippocampus and dorsolateral prefrontal cortex. Collado-Torres et al used RiboZero libraries on 900 tissue samples from 551 individuals (including 286 with schizophrenia). Prenatal  (age < 0; range, 14 to 22 post-conception weeks) and postnatal (age ≥ 18 years; range, 18 to 96 years) samples were used in this work.

- <b>[GTEx](https://gtexportal.org/home/) </b> contains 2,642 RNA-seq samples of the human postmortem in postnatal ages (age < 20; range 20 to 79 years) across 13 brain regions. 

- <b>[PsychEncode](10.1126/science.aat7615) </b>



Single-nucleus RNA-seq datasets of the human brain:
- <b> [Velmeshev et al]() </b>  
- <b> [Human Cell Atlas]() </b>  



The user also has the option to upload their own datasets which are then integrated in BITHub in the same manner as the five core datasets. However, these data do not persist in BITHub, they are only available for the session in which they are uploaded.

## Data Processing 

### Metadata pre-processing
Datasets were downloaded from their respective portals/original publications that have been described above. The metadata annotations were updated with consistent and human readable labeling for column names. New columns specifying ‘Age Intervals’, ‘Regions’, ‘Diagnosis’ and ‘Period’ were also added to all bulk datasets. 
Samples were binned into age intervals as specified in the BrainSpan Developmental Transcriptome Technical White Paper for all datasets for samples with age < 20 years old where ages >20 years were binned in 10 year intervals. 

An additional column ‘Numeric Ages’ was added for BrainSpan, BrainSeq and PsychEncode datasets where pcw and neonatal ages were converted to numeric ages (years) for conssitency: 

To convert pcw age to numeric age we used the following formula where X is the resulting numeric age
```
X = -(40 - pcw) /52 
```
 To convert months to numeric ages we simply divided the month by 12: 

 ```
 X =  mos / 12

 ```

Prenatal or postnatal tags were assigned to samples depending on their numeric age where numeric age < 0 was labeled as prenatal and numeric age < 0 as postnatal. 

BrainSpan data currently lacks annotations reporting the RNA Integrity Number (RIN) of samples processed. To address this, Feng et al (2015) developed an mRNA Integrity Number value based on quantitative modeling of the 3’ bias of read coverage, and applied this to the BrainSpan RNA-seq data. To centralize this information, the mRIN statistics calculated in Feng et al were also added to the BrainSpan metadata annotations for BITHub. 


### Variance partition analysis 
VariancePartition was used for mixed linear analysis  to estimate the proportion of variance explained by the selected covariates on each gene.  Highly correlated covariates cannot be included in the model, and so as a result covariates that were not strongly correlated for each dataset were selected to the the varianceParititon analysis on filtered genes. For filtering, the expression cut-off was selected at 1 RPKM/TPM/CPM  in at least 10% of the samples. 

## Overview of Functionalities 
BITHub implements multiple functionalities and can generate z-score distribution of genes in multiple datasets for cross-comparison. Additionally, users can investigate expression properties of specific genes against multiple metadata annotations, including technical, biological and sample specific variables. 

### Input Data
To compare the expression of a given gene or gene sets across different datasets, use the quick search bar in the homepage by either entering the gene symbol or Ensembl IDs. Comma separated values (.csv) containing a list of genes can also be uploaded and searched for. 
 
### Search Results 
Once a query has been sent to the interface, the user will be directed to the Search page with the results. The gene or genes of interest will be shown in a table with their Ensembl ID, Gene Symbol and a heatmap. The heatmap denotes the relative expression of the gene amongst datasets and if that gene is present in the given dataset. The user can then navigate directly to the corresponding gene page and explore its expression properties for each dataset. 

### Compare gene expression across datasets 


The panel of the search results show a scatter plot with z-score transformed mean of every gene in the dataset. X-axis shows dataset 1, and the y-axis shows dataset 2. The dataset of interest can be selected using the drop down menu on the right. The gene or genes of interest are highlighted in green. 
To allow the direct comparison of gene expression across different datasets, we have provided a scatterplot listing z-score log2 mean transformed values of gene expression. This plot shows all genes in a given dataset with the gene of interest highlighted in green. Users can use this plot to determine how well a gene is expressed amongst any two datasets.


![alt-text](https://github.com/unawaz1996/bithub/blob/for-integration/resources/images/example1.png)
<br>

 
### Interactive exploration of metadata variables
 - Bulk datasets and Single cell datasets
For each gene, BITHub displays interactive plots that allow the full exploration of gene expression values (CPM/TPM/RPKM - depending on the original dataset normalization) in the bulk and single-nucleus datasets. By selecting metadata variables, users have the ability to determine how gene expression of interest varies with any metadata properties such as phenotype (e.g Age, Sex ), sample characterics or sequencing metrics.  Users also have the ability to filter the data based on region by selecting their region of interest from the ‘Select Brain Region’ drop down menu. 



![alt-text](https://github.com/unawaz1996/bithub/blob/for-integration/resources/images/example3.png)
![alt-text](https://github.com/unawaz1996/bithub/blob/for-integration/resources/images/example2.png)
<br>

- varianceParition 


<br>

Our database incorporates results from varianceParition into our database. The bar-graph for the variance partition shows the fraction of variance explained against selected metadata variables. The varianceParition results are currently only available for the bulk datasets and cannot be filtered by region.
 
If this panel shows ‘No variance partition’, this is because the gene was likely filtered out in the variancePartition analysis pipeline


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



