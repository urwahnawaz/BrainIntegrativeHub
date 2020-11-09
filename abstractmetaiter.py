from abstractliftoveriter import AbstractLiftoverIter
import csv, math, h5py
import numpy as np

class AbstractMetaIter(AbstractLiftoverIter):
    def __init__(self, directory, measures, measureNames, table, tableKeys, metadata, groupName):
        super().__init__(directory)
        self.measures = measures
        self.measureNames = measureNames
        self.table = table
        self.tableKeys = tableKeys
        self.metadata = metadata
        self.groupName = groupName
        self.hasMetadata = True

    def writeHDF5Metadata(self, rootCharts, rootTables, rows):
        which = [row._meta[self.id] for row in rows if row._meta[self.id] > -1]
        root = rootTables if self.table else rootCharts         
        experiment = root.create_group(self.groupName + "/" + self.name)
        
        if len(self.measures):
            matrices = experiment.create_group("matrices")
            matrices.attrs.create("default", self.measureNames[0])
            for i in range(len(self.measures)):
                self._writeHDF5Matrix(self.measures[i], matrices, experiment, self.measureNames[i], which)
        
        if self.metadata:
            samples = experiment.create_group("samples")
            self._writeHDF5Columns(self.metadata, samples)

        if self.table:
            self._writeHDF5CSVTable(self.table, self.tableKeys, experiment, which, rows)

    def _writeHDF5Matrix(self, fileName, entryGroup, idGroup, datasetName, which, noneType="NA"):
        #Writes matrix in overall row order
        heading = []
        lines = [None] * len(which)
        sortedWhich = sorted(which)
        indexOfWhich = [None] * (max(which) + 1)
        for i in range(len(which)): indexOfWhich[which[i]] = i
        m = -1
        n = 0
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if m == -1:
                heading = line[1:]
            elif n >= len(which):
                break
            elif sortedWhich[n] == m:
                lines[indexOfWhich[sortedWhich[n]]] = line
                n += 1
            m += 1

        mdata1 = []
        mdata2 = []
        for line in lines:
            mdata1.append(line[0])
            mdata2.append(tuple([(line[i] if line[i] != noneType else -1.0) for i in range(1, len(line))]))

        # Note chunks are 100kb, and include whole rows
        arr = np.array(mdata2, dtype="f4")
        ds = entryGroup.create_dataset(datasetName, data=arr, chunks=(min(arr.shape[0], math.floor(10000/len(heading))), arr.shape[1]), compression="gzip", compression_opts=9)
        colMeans = [np.mean([arr[i][j] for i in range(len(arr))]) for j in range(len(arr[0]))]
        colSTDs = [np.std([arr[i][j] for i in range(len(arr))]) for j in range(len(arr[0]))]
        #ds.attrs.create("sd", colSTDs)
        #ds.attrs.create("mean", colMeans)

        # Write log mean scale (but only for CPM)
        if datasetName == "CPM":
            logs = [np.mean([math.log2(abs(arr[i][j]) + 0.01) for j in range(len(arr[0]))]) for i in range(len(arr))]
            logMean = np.mean(logs)
            logSd = np.std(logs)
            arr2 = np.array([((x - logMean) / logSd) for x in logs], dtype="f4")
            idGroup.create_dataset("scaled", data=arr2, compression="gzip", compression_opts=9)

        if not "sample_id" in idGroup:
            idGroup.attrs.create("sample_id", np.array([h.encode() for h in heading], dtype="S" + str(len(max(heading, key=len)))))

    def _writeHDF5Columns(self, fileName, hdf5Group, noneType="NA"):
        heading = []
        isHeading = True
        lines = []
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
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
        hdf5Group.attrs.create("default", heading[1])

    #Note QTL is random order!!
    def _writeHDF5CSVTable(self, fileName, fileNameKeys, hdf5Group, which, rows, noneType="NA"):
        heading = []
        lines = [[] for i in range(len(which))]
        sortedWhich = sorted(which)
        indexOfWhich = [None] * (max(which) + 1)
        for i in range(len(which)): indexOfWhich[which[i]] = i

        logs = [0.0] * len(which)
        keyObj = {}
        keyIter = csv.reader(open(fileNameKeys, 'r'), delimiter=',').__iter__()
        next(keyIter)
        
        #Get indices for all keys
        n = 0
        m = 0
        for key in keyIter:
            if sortedWhich[n] == m:
                where = indexOfWhich[sortedWhich[n]]
                keyObj[key[0][:-2]] = where
                logs[where] = float(key[5])
                n += 1
            m += 1


        qtlIter = open(fileName, 'r').readlines().__iter__()
        heading = next(qtlIter).rstrip("\n")

        #Now we know where to put everything that comes in
        for qtl in qtlIter:
            keyFiltered = qtl.split(',', 1)[0]
            if keyFiltered in keyObj:
                lines[keyObj[keyFiltered]].append(qtl.rstrip("\n"))
        
        fixed = 0
        j = 0
        qtlIndices = [None] * len(lines)
        for i in range(len(lines)):
            qtlIndices[i] = fixed if len(lines[i]) else -1
            fixed += len(lines[i])

        hdf5Group.create_dataset("indices", data=np.array(qtlIndices, dtype="i4"), compression="gzip", compression_opts=9)

        mdata = []
        for i in range(len(lines)):
            if len(lines[i]) > 0:
                for subline in lines[i]:
                    mdata.append(subline)
        
        arr = np.array(mdata, dtype="S" + str(len(max(mdata, key=len))))
        ds = hdf5Group.create_dataset("QTL", data=arr, compression="gzip", compression_opts=9)
        ds.attrs.create("heading", heading)

        #TODO since liu is only dataset here hardcode scale calculation
        logMean = np.mean(logs)
        logSd = np.std(logs)
        arr2 = np.array([((x - logMean) / logSd) for x in logs], dtype="f4")
        hdf5Group.create_dataset("scaled", data=arr2, compression="gzip", compression_opts=9)
        