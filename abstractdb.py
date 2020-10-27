import itertools
from circtissuematcher import CircTissueMatcher
import h5py
import numpy as np

class AbstractDB:
    name = "Unknown"
    url = ""
    urlPrefix = ""
    isDataset = False
    hasMetadata = False
    hasIndividualURLs = False

    matcher = CircTissueMatcher("./data")

    id_iter = itertools.count()
    id_max = 0

    def __init__(self):
        self.id = AbstractDB.id_max = next(AbstractDB.id_iter)

    def reduceIndices(self, rows):
        #Fix _meta indices, must do after filtering metadata
        #temp = sorted(rows, key=lambda x:x._meta[self.id])
        fixed = 0
        for i in range(len(rows)):
            if rows[i]._meta[self.id] >= 0:
                rows[i]._meta[self.id] = fixed
                fixed += 1

    def writeHDF5URLs(self, hdf5Group, rows):
        if(self.hasIndividualURLs): 
            urls = [r._url[self.id] for r in rows if r._meta[self.id] >= 0]
            arr = np.array([u.encode() for u in urls], dtype="S" + str(len(max(urls, key=len))))
            ds = hdf5Group.create_dataset(self.name, data=arr, chunks=arr.shape, compression="gzip", compression_opts=9)
            ds.attrs.create("prefix", self.urlPrefix)
            ds.attrs.create("home", self.url)
        elif(self.url):
            ds = hdf5Group.create_dataset(self.name, data=h5py.Empty("S1"))
            ds.attrs.create("home", self.url)