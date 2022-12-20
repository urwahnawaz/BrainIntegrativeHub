import h5py, sys, yaml, json, datetime, os, shutil

#Grabs important pipeline metadata during makefile process
#Copies metadata csvs and metadata.json to ../resources automatically but you will need to add and push

#Usage: make_helper /path/to/input.yaml
#Output Example: ./output/ hopeful-austin-9ca901 59090

outDir = ""
project = ""
token = ""
rows = ""
jsonData = {}

with open(sys.argv[1], 'r') as stream:
    #Scrape output directory and project name
    data_loaded = yaml.safe_load(stream)
    outDir = data_loaded.get("output", "")
    project = data_loaded.get("netlifyDeploy", "")
    token = data_loaded.get("netlifyToken", "")
    metaDst = "../resources/data/metadata/"

    #Copy metadata files and index inside metadata.json
    metaFiles = []
    if not os.path.exists(metaDst): os.makedirs(metaDst)
    #shutil.rmtree(metaDst)
    for d in data_loaded["datasets"]: 
        metaSrc = os.path.join(d["dir"], d["meta"])
        shutil.copy2(metaSrc, metaDst)
        metaFiles.append({"name": d["id"], "path": "resources/data/metadata/" + d["meta"], "data": d["id"] + '_' + d["matrices"][0] + '.csv.gz', "samples": sum(1 for line in open(metaSrc))-1})
    jsonData["meta_files"] = metaFiles

if(outDir):
    #Scrape project name, row count and current time
    f = h5py.File(outDir.rstrip("/") + "/out.hdf5", 'r')
    data = f["data"]
    val = list(data.keys())[0]
    rows = data[val].shape[0]

    if(project):
        jsonData["data_url"] = "https://" + project + ".netlify.app"
        jsonData["count"] = rows
        jsonData["last_updated"] = datetime.date.today().strftime("%B %Y")

#Write metadata.json
with open("../resources/data/metadata.json", 'w') as f:
    json.dump(jsonData, f, indent=2)

#Return important values to Make
print(outDir + " " + project + " " + str(rows) + " " + token)
