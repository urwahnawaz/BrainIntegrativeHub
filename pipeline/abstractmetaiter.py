from abstractsource import AbstractSource
import csv, math, h5py, os
import numpy as np

class AbstractMetaIter(AbstractSource):
    def __init__(self, name, nameLong, directory, matrices, metadata, qtl, brainRegionFilter):
        super().__init__(name, directory)
        self.matrices = matrices
        self.metadata = metadata
        self.qtl = qtl
        self.brainRegionFilter = brainRegionFilter
        self.keys = []
        self.nameLong = nameLong

    def writeHDF5Metadata(self, root, rows):
        if not len(self.keys):
            raise "Must read circular rnas before selecting metadata"

        keyToIndexFiltered = {}
        counter = 0
        for row in rows:
            index = row.getMeta(self.id)
            if index != -1:
                keyToIndexFiltered[self.keys[index]] = counter
                counter += 1

        experimentGroup = root.create_group(self.name)
        experimentGroup.attrs.create("name", self.nameLong) 

        sampleToIndex = None
        sampleHeadings = None
        if self.metadata:
            samples = experimentGroup.create_group("samples")
            sampleHeadings = self._writeHDF5Columns(self.metadata, samples)
            sampleToIndex = {}
            for i in range(len(sampleHeadings)):
                sampleToIndex[sampleHeadings[i]] = i

        if len(self.matrices):
            matrixGroup = None
            if self.metadata:
                matrixGroup = experimentGroup.create_group("matrices")
                matrixGroup.attrs.create("order", [m["type"] for m in self.matrices])
            for i in range(len(self.matrices)):
                heading, mdata2 = self._getAsMatrix(os.path.join(self.directory, self.matrices[i]["path"]), keyToIndexFiltered, sampleToIndex)
                arr = np.array(mdata2, dtype="<f4")

                if sampleHeadings: heading = sampleHeadings

                if matrixGroup:
                    if not "sample_id" in experimentGroup:
                        try:
                            experimentGroup.attrs.create("sample_id", np.array([h.encode() for h in heading], dtype="S" + str(len(max(heading, key=len)))))
                        except:
                            print("Too many sample headers to include as hdf5 attribute for experiment " + self.name)
                    matrixGroup.create_dataset(self.matrices[i]["type"], data=arr, chunks=(min(arr.shape[0], math.floor(10000/len(heading))), arr.shape[1]), compression="gzip", compression_opts=9)

                if i == 0:
                    self._writeHDF5Scaled(arr, experimentGroup)
        
        if self.qtl:
            self._writeHDF5CSVTable(self.qtl, experimentGroup, keyToIndexFiltered, rows)

        if self.brainRegionFilter:
            experimentGroup.attrs.create("brainRegionFilter", self.brainRegionFilter) 
    
    def _getAsMatrix(self, fileName, keyToIndexFiltered, sampleToIndex, noneType="NA"):
        #Writes matrix in overall row order
        heading = None
        lines = [None] * len(keyToIndexFiltered)
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if not heading: 
                heading = line[1:]
            else:
                versionlessEnsemblID = line[0].split('.', 1)[0]
                index = keyToIndexFiltered.get(versionlessEnsemblID, -1)
                if index >= 0:
                    fromLine = line[1:]
                    if sampleToIndex:
                        toLine = [-1] * len(sampleToIndex)
                        for i in range(len(fromLine)):
                            subIndex = sampleToIndex.get(heading[i], -1)
                            if subIndex != -1:
                                toLine[subIndex] = fromLine[i]
                        lines[index] = toLine
                    else:
                        lines[index] = fromLine

        mdata2 = []
        for line in lines:
            mdata2.append(tuple([(line[i] if line[i] != noneType else -1.0) for i in range(len(line))]))
        return heading, mdata2

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
        lines = []
        for line in csv.reader(open(os.path.join(self.directory, fileName), 'r'), delimiter=','):
            if not heading:
                heading = line
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
                    values = [colType(lines[j][i]) if (lines[j][i] and lines[j][i] != noneType) else allDefaults[k] for j in range(len(lines))]

                    # No exception so correct type, fix values for hdf5
                    colTypeNp = allTypesNp[k] + (str(len(max(values, key=len))) if allTypes[k] == str else "")
                    if colType == str:
                        for m in range(len(values)):
                            values[m] = values[m].encode()
                    # Write dataset
                    arr = np.array(values, dtype=colTypeNp)
                    hdf5Group.create_dataset(heading[i], data=arr, chunks=arr.shape, compression="gzip", compression_opts=9)
                    break
                except:
                    continue
            else:
                # TODO Completely empty column, remove
                heading.pop(i)
        hdf5Group.attrs.create("order", [heading[j] for j in range(1, len(heading))])

        return [lines[i][0] for i in range(len(lines))] #Return headings to copy this order

    def _writeHDF5CSVTable(self, fileName, hdf5Group, keyToIndexFiltered, rows, noneType="NA"):
        heading = []
        lines = [[] for i in range(len(keyToIndexFiltered))]
        
        qtlIter = open(os.path.join(self.directory, fileName), 'r').readlines().__iter__()
        heading = next(qtlIter).rstrip("\n").replace('"', '').split(",", 1)[1]

        #Now we know where to put everything that comes in
        for qtl in qtlIter:
            split = qtl.rstrip("\n").replace('"', '').split(',', 1)
            index = keyToIndexFiltered.get(split[0], -1)
            if index >= 0:
                lines[index].append(split[1])
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
        