# NeuroCirc
Circular RNA repository with a focus on human brain studies.

## Exploring the data
To search entries and plot metadata, go to our GitHub Pages site.<br>
Datasets may be added easily via the website interface but are not persistent, which would require editing the YAML and running the Python pipeline.


## Running the pipeline
This is NOT necessary for end users but is included for future work.

During the first run, some database files may be downloaded from the source - this amounts to a few hundred megabytes.
Liftover is also performed during this first run, subsequent runs should be faster.

### Dependancies

Requires Python3 and all the python libraries listed in requirements.txt.

Please also download "liftOver" and "bedToBigBed" executables for your platform 
(http://hgdownload.soe.ucsc.edu/admin/exe/) and place them in a new folder, pipeline/utilities.
Note liftOver requires a license for commercial use (https://genome-store.ucsc.edu/).

### Output

After executing main.py, the pipeline/output folder will contain relevant hdf5 and bb files.<br>
By copying these into the resources/data folder, you may update the website's core datasets and add new databases.<br>
The website may be run locally but requires e.g. "Web Server for Chrome" due to webworkers.

