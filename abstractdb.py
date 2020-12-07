import itertools
import h5py
import numpy as np

class AbstractDB:
    url = ""
    urlPrefix = ""
    hasIndividualURLs = False

    id_iter = itertools.count()
    id_max = 0

    def __init__(self, name):
        self.id = AbstractDB.id_max = next(AbstractDB.id_iter)
        self.name = name

    def reduceIndices(self, rows):
        #Fix _meta indices, must do after filtering metadata
        fixed = 0
        for i in range(len(rows)):
            if rows[i].getMeta(self.id) >= 0:
                rows[i].setMeta(self.id, fixed)
                fixed += 1

    def writeHDF5URLs(self, hdf5Group, rows):
        hasIndividual = self.hasIndividualURLs
        if(hasIndividual): 
            urls = [r._url[self.id] for r in rows if r.getMeta(self.id) >= 0]
            if len(urls) == 0: 
                hasIndividual = False
            else:
                arr = np.array([u.encode() for u in urls], dtype="S" + str(len(max(urls, key=len))))
                ds = hdf5Group.create_dataset(self.name, data=arr, chunks=arr.shape, compression="gzip", compression_opts=9)
                ds.attrs.create("prefix", self.urlPrefix)
                ds.attrs.create("home", self.url)
        if not hasIndividual:
            ds = hdf5Group.create_dataset(self.name, data=h5py.Empty("S1"))
            ds.attrs.create("home", self.url)