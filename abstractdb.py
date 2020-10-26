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

    def writeHDF5URLs(self, hdf5Group, rows):
        if(self.hasIndividualURLs): 
            urls = [r._url[self.id] for r in rows]
            arr = np.array([u.encode() for u in urls], dtype="S" + str(len(max(urls, key=len))))
            ds = hdf5Group.create_dataset(self.name, data=arr, chunks=arr.shape, compression="gzip", compression_opts=9)
            ds.attrs.create("prefix", self.urlPrefix)
            ds.attrs.create("home", self.url)
        elif(self.url):
            ds = hdf5Group.create_dataset(self.name, data=h5py.Empty("S1"))
            ds.attrs.create("home", self.url)