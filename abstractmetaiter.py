from abstractliftoveriter import AbstractLiftoverIter
import csv, math, h5py, os
import numpy as np

class AbstractMetaIter(AbstractLiftoverIter):
    def __init__(self, name, directory, matrices, metadata, qtl):
        super().__init__(name, directory)
        self.matrices = matrices
        self.metadata = metadata
        self.qtl = qtl
        self.keys = []

    def writeHDF5Metadata(self, root, rows):
        if not len(self.keys):
            raise "Must read circular rnas before selecting metadata"

        keyToIndexFiltered = {}
        counter = 0
        for row in rows:
            index = row.getMeta(self.id)
            if index != -1:
                keyToIndexFiltered[self.keys[index][:-2]] = counter #TODO: for now we are removing strand
                counter += 1

        experimentGroup = root.create_group(self.name)        
        if len(self.matrices):
            matrixGroup = None
            if self.metadata:
                matrixGroup = experimentGroup.create_group("matrices")
                matrixGroup.attrs.create("order", [m["type"] for m in self.matrices])
            for i in range(len(self.matrices)):
                heading, mdata1, mdata2 = self._getAsMatrix(os.path.join(self.directory, self.matrices[i]["path"]), keyToIndexFiltered)
                arr = np.array(mdata2, dtype="f4")

                if matrixGroup:
                    self._writeHDF5Matrix(heading, arr, matrixGroup, experimentGroup, self.matrices[i]["type"])
            
                if i == 0:
                    self._writeHDF5Scaled(arr, experimentGroup)
        
        if self.metadata:
            samples = experimentGroup.create_group("samples")
            self._writeHDF5Columns(self.metadata, samples)

        if self.qtl:
            self._writeHDF5CSVTable(self.qtl, experimentGroup, keyToIndexFiltered, rows)

    def _getAsMatrix(self, fileName, keyToIndexFiltered, noneType="NA"):
        #Writes matrix in overall row order
        heading = None
        lines = [None] * len(keyToIndexFiltered)
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if not heading: heading = line[1:]
            else:
                index = keyToIndexFiltered.get(line[0][:-2], -1)
                if index >= 0:
                    lines[index] = line

        mdata1 = []
        mdata2 = []
        for line in lines:
            mdata1.append(line[0])
            mdata2.append(tuple([(line[i] if line[i] != noneType else -1.0) for i in range(1, len(line))]))
        return heading, mdata1, mdata2


    def _writeHDF5Matrix(self, heading, arr, entryGroup, idGroup, datasetName):
        # Note chunks are 100kb, and include whole rows
        ds = entryGroup.create_dataset(datasetName, data=arr, chunks=(min(arr.shape[0], math.floor(10000/len(heading))), arr.shape[1]), compression="gzip", compression_opts=9)
        
        if not "sample_id" in idGroup:
            idGroup.attrs.create("sample_id", np.array([h.encode() for h in heading], dtype="S" + str(len(max(heading, key=len)))))

    #Only call this on cpm
    def _writeHDF5Scaled(self, arr, idGroup):
        colMeans = [np.mean([arr[i][j] for i in range(len(arr))]) for j in range(len(arr[0]))]
        colSTDs = [np.std([arr[i][j] for i in range(len(arr))]) for j in range(len(arr[0]))]

        logs = [np.mean([math.log2(abs(arr[i][j]) + 0.01) for j in range(len(arr[0]))]) for i in range(len(arr))]
        logMean = np.mean(logs)
        logSd = np.std(logs)
        arr2 = np.array([((x - logMean) / logSd) for x in logs], dtype="f4")
        idGroup.create_dataset("scaled", data=arr2, compression="gzip", compression_opts=9)

    def _writeHDF5Columns(self, fileName, hdf5Group, noneType="NA"):
        heading = []
        isHeading = True
        lines = []
        for line in csv.reader(open(os.path.join(self.directory, fileName), 'r'), delimiter=','):
            if isHeading:
                heading = line
                isHeading = False
            else:
                lines.append(line)
        heading[0] = "circ_id"

        allTypes = [int, float, str]
        allDefaults = [0, 0.0, ""]
        allTypesNp = ["i4", "f4", "S"]
        for i in range(1, len(lines[0])):
            for k in range(len(allTypes)):
                try:
                    # Attempt to parse all as this type
                    colType = allTypes[k]
                    values = [colType(lines[j][i]) for j in range(
                        len(lines)) if lines[j][i] != noneType]

                    # No exception so correct type, fix values for hdf5
                    colTypeNp = allTypesNp[k] + (str(len(max(values, key=len)))if allTypes[k] == str else "")
                    for m in range(len(values)):
                        if m == noneType: values[m] = allDefaults[k]
                        elif colType == str: values[m] = values[m].encode()

                    # Write dataset
                    arr = np.array(values, dtype=colTypeNp)
                    hdf5Group.create_dataset(heading[i], data=arr, chunks=arr.shape, compression="gzip", compression_opts=9)
                    break
                except:
                    continue
            else:
                raise("ERROR no type resolved for " + heading[i])
        hdf5Group.attrs.create("order", [heading[i] for i in range(1, len(heading))])

    def _writeHDF5CSVTable(self, fileName, hdf5Group, keyToIndexFiltered, rows, noneType="NA"):
        heading = []
        lines = [[] for i in range(len(keyToIndexFiltered))]
        
        qtlIter = open(os.path.join(self.directory, fileName), 'r').readlines().__iter__()
        heading = next(qtlIter).rstrip("\n").split(",", 1)[1]

        #Now we know where to put everything that comes in
        for qtl in qtlIter:
            index = keyToIndexFiltered.get(qtl.split(',', 1)[0], -1)
            if index >= 0:
                lines[index].append(qtl.rstrip("\n").split(",", 1)[1])
        fixed = 0
        j = 0
        qtlIndices = [None] * len(lines)
        for i in range(len(lines)):
            qtlIndices[i] = fixed if len(lines[i]) else -1
            fixed += len(lines[i])

        hdf5Group.create_dataset("indices", data=np.array(qtlIndices, dtype="i4"), compression="gzip", compression_opts=9)

        mdata = [] #TODO: seems to be problem with qtl matching -> no strand in qtl table!
        for i in range(len(lines)):
            if len(lines[i]) > 0:
                for subline in lines[i]:
                    mdata.append(subline)
        
        arr = np.array(mdata, dtype="S" + str(len(max(mdata, key=len))))
        ds = hdf5Group.create_dataset("QTL", data=arr, compression="gzip", compression_opts=9)
        ds.attrs.create("heading", heading) 
        