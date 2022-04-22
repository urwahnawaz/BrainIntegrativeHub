from abstractsource import AbstractSource
import csv, math, h5py, os
import numpy as np
from array import array

class AbstractMetaIter(AbstractSource):
    def __init__(self, name, nameLong, directory, matrices, metadata, qtl, customFilterName, customFilterColumn, customMetadataCategoryOrders, variancePartition, keyIsSymbol, output):
        super().__init__(name, directory)
        self.matrices = matrices
        self.metadata = metadata
        self.qtl = qtl
        self.customFilterName = customFilterName
        self.customFilterColumn = customFilterColumn
        self.customMetadataCategoryOrders = customMetadataCategoryOrders
        self.variancePartition = variancePartition
        self.keyIsSymbol = keyIsSymbol
        self.nameLong = nameLong
        self.output = output

    def getKeysOrdered(self, fileName):
        heading = None
        keys = []
        numberedRowsOffset = -1
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if not heading: 
                heading = line[1:]
                continue
            if numberedRowsOffset == -1: 
                if line[0] == "1": #This assumes actual matrix rows begin with ensembl ID, which should not be 1
                    numberedRowsOffset = 1
                    heading = heading[1:]
                    print("Removing numbered rows from source file")
                else:
                    numberedRowsOffset = 0
            key = line[numberedRowsOffset] if self.keyIsSymbol else line[numberedRowsOffset].split('.', 1)[0]
            keys.append(key)
        return heading, keys

    def intersectKeysOrdered(self, keys1, keys2):
        _auxset = set(keys1)
        return [x for x in keys2 if x in _auxset]

    def reorderListByKey(self, keys, list, keyToIndexFiltered):
        newList = [None] * (len(keyToIndexFiltered))
        for i in range(len(list)):
            index = keyToIndexFiltered.get(keys[i], -1)
            if index >= 0: newList[index] = list[i]
        return newList
        
    def _writeHDF5Columns(self, fileName, hdf5Group, sampleToIndexFiltered, noneType="NA"):
        heading = None
        removed = None
        lines = []
        keys = []
        numberedRowsOffset = -1
        print("Reading file " + os.path.join(self.directory, fileName))
        for line in csv.reader(open(os.path.join(self.directory, fileName), 'r'), delimiter=','):
            if not heading:
                heading = line[1:]
                removed = [False] * len(heading)
                continue
            if numberedRowsOffset == -1: 
                if line[0] == "1": #This assumes actual metadata rows begin with sample ID, which should not be 1
                    numberedRowsOffset = 1
                    heading = heading[1:]
                    removed = [False] * len(heading)
                    print("Removing numbered rows from source file")
                else:
                    numberedRowsOffset = 0
            lines.append(line[numberedRowsOffset+1:])
            keys.append(line[numberedRowsOffset])

        if(len(lines) == 0): raise Exception("File was empty")

        lines = self.reorderListByKey(keys, lines, sampleToIndexFiltered)

        if(len(lines) == 0): raise Exception("File metadata/matrix keys didn't match when reordering")

        allTypes = [int, float, str]
        allDefaults = [0, 0.0, ""]
        allTypesNp = ["i4", "f4", "S"]
        for i in range(len(lines[0])):
            for k in range(len(allTypes)):
                try:
                    # Attempt to parse all as this type
                    colType = allTypes[k]
                    values = [colType(lines[j][i]) if (lines[j][i] and lines[j][i] != noneType) else allDefaults[k] for j in range(len(lines))]

                    # Throw out categorical variables with more than 200 categories
                    if colType == str and len(set(filter(lambda item: item, values))) > 200:
                        raise ValueError('Too many categories to plot, skipping')

                    # No exception so correct type, fix values for hdf5
                    colTypeNp = allTypesNp[k] + (str(len(max(values, key=len))) if allTypes[k] == str else "")
                    if colType == str:
                        for m in range(len(values)):
                            values[m] = values[m].encode()

                    # Write dataset
                    arr = np.array(values, dtype=colTypeNp)
                    ds = hdf5Group.create_dataset(heading[i], data=arr, chunks=arr.shape, compression="gzip", compression_opts=9)

                    for order in self.customMetadataCategoryOrders:
                        if order["variable"] == heading[i]:
                            ds.attrs.create("order", order["order"])
                            groups = order.get("groups", None)
                            if(groups):
                                ds.attrs.create("groupSizes", list(map(lambda x: x["size"], groups)))
                                ds.attrs.create("groupLabels", list(map(lambda x: x["label"], groups)))
                            
                            colors = order.get("color", None)
                            if(colors):
                                ds.attrs.create("colors", colors)
                    break
                except:
                    continue
            else:
                removed[i] = True
        hdf5Group.attrs.create("order", [heading[j] for j in range(len(heading)) if not removed[j]])


    def writeHDF5Metadata(self, root, rows):
        headingMeta, keysMeta = self.getKeysOrdered(os.path.join(self.directory, self.metadata))
        headingMatrix, keysMatrix = self.getKeysOrdered(os.path.join(self.directory, self.matrices[0]["path"]))
        samplesOrdered = self.intersectKeysOrdered(headingMatrix, keysMeta)
        print(str(len(keysMatrix) * (len(samplesOrdered) * 4)) + " bytes")
        keyToIndexFiltered = {}
        tableIndices = []
        tableIndex = 0
        for row in rows:
            orderIndex = row.getOrder(self.id)
            metaIndex = row.getMeta(self.id)
            if metaIndex != -1: 
                keyToIndexFiltered[keysMatrix[metaIndex]] = orderIndex
                tableIndices.append(tableIndex)
            tableIndex += 1

        print(len(keysMatrix)) #why not same length? because unreliable are not in keyToIndexFiltered
        print(len(keyToIndexFiltered))
        print(str((max(keyToIndexFiltered.values())+1) * (len(samplesOrdered) * 4)) + " bytes")
        
        sampleToIndexFiltered = {}
        for i in range(len(samplesOrdered)):
            sampleToIndexFiltered[samplesOrdered[i]] = i

        experimentGroup = root.create_group(self.name)
        experimentGroup.attrs.create("name", self.nameLong) 

        #Write metadata
        samples = experimentGroup.create_group("samples")
        self._writeHDF5Columns(self.metadata, samples, sampleToIndexFiltered)

        #Write matrix
        matrixGroup = experimentGroup.create_group("matrices")
        matrixGroup.attrs.create("order", [m["type"] for m in self.matrices])
        lakeFileName = self.name + "_" + self.matrices[0]["type"]
        datalakeMaxBytes = 2000000000
        datalakeNames, shape = self._writeAsMatrix(os.path.join(self.directory, self.matrices[0]["path"]), keyToIndexFiltered, sampleToIndexFiltered, datalakeMaxBytes, lakeFileName, experimentGroup)
        #shape = self._writeAsMatrix(os.path.join(self.directory, self.matrices[0]["path"]), keyToIndexFiltered, sampleToIndexFiltered, output_file if matrixGroup else None, experimentGroup)
        ds = matrixGroup.create_dataset(self.matrices[0]["type"], data=h5py.Empty("S1"))
        ds.attrs.create("datalake", datalakeNames)
        ds.attrs.create("datalake-max", datalakeMaxBytes)
        ds.attrs.create("shape", shape)
        
        #Write indices
        experimentGroup.create_dataset("index", data=tableIndices, compression="gzip", compression_opts=9)

        #Write headings
        for i in range(len(samplesOrdered)): samplesOrdered[i] = samplesOrdered[i].encode()
        experimentGroup.create_dataset("sample_names", data=samplesOrdered, compression="gzip", compression_opts=9)

        if self.variancePartition:
            self._writeVariancePartition(self.variancePartition, experimentGroup, keyToIndexFiltered)
        
        if self.customFilterColumn:
            experimentGroup.attrs.create("customFilterColumn", self.customFilterColumn) 
            if self.customFilterName: experimentGroup.attrs.create("customFilterName", self.customFilterName) 
    

    def _writeAsMatrix(self, fileName, keyToIndexFiltered, sampleToIndexFiltered, datalakeMaxSize, lakeFileName, scaledOutput, noneType="NA"):
        #Writes matrix in overall row order
        bytesPerRow = (len(sampleToIndexFiltered) * 4)
        datalakeMaxSize = math.floor(datalakeMaxSize / bytesPerRow) * bytesPerRow #Round down so divisible by row bytes
        
        maxSize = (max(keyToIndexFiltered.values())+1) * bytesPerRow
        datalakeNames = []
        datalakeFiles = []
        for i in range(math.ceil(float(maxSize) / datalakeMaxSize)):
            datalakeName = lakeFileName + str(i+1) + ".matrix"
            datalakeNames.append(datalakeName)
            datalakeFiles.append(open(self.output + datalakeName, 'wb'))
            datalakeFiles[-1].seek((maxSize % datalakeMaxSize) if maxSize < (i+1)*datalakeMaxSize else datalakeMaxSize)
            array('f', [0] * len(sampleToIndexFiltered)).tofile(datalakeFiles[-1])

        heading = None
        numberedRowsOffset = -1
        logs = []
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if not heading: 
                heading = line[1:]
                continue
            if numberedRowsOffset == -1: 
                if line[0] == "1": #This assumes actual matrix rows begin with ensembl ID, which should not be 1
                    numberedRowsOffset = 1
                    heading = heading[1:]
                    print("Removing numbered rows from source file")
                else:
                    numberedRowsOffset = 0
            key = line[numberedRowsOffset] if self.keyIsSymbol else line[numberedRowsOffset].split('.', 1)[0]
            index = keyToIndexFiltered.get(key, -1)
            
            if index >= 0:
                fixedLine = self.reorderListByKey(heading, line[1 + numberedRowsOffset:], sampleToIndexFiltered)
                for i in range(len(fixedLine)): fixedLine[i] = float(fixedLine[i])
                if(scaledOutput): logs.append(np.mean([math.log2(abs(fixedLine[i]) + 0.01) for i in range(len(fixedLine))]))
                if(datalakeMaxSize >= 0):
                    totalIndex = index * (len(fixedLine) * 4)
                    partNumber = math.floor(totalIndex / datalakeMaxSize)
                    partIndex = totalIndex % datalakeMaxSize
                    datalakeFiles[partNumber].seek(partIndex)
                    array('f', fixedLine).tofile(datalakeFiles[partNumber]) #Subtle, but parts may not be divisible by line length so are underallocated, will be extended here regardless

        if(scaledOutput):
            logMean = np.mean(logs)
            logSd = np.std(logs)
            scaled = np.array([((x - logMean) / logSd) for x in logs], dtype="f4")
            scaledOutput.create_dataset("scaled", data=scaled, compression="gzip", compression_opts=9)

        for part in datalakeFiles:
            part.close()

        return datalakeNames, (len(keyToIndexFiltered), len(heading))

    def _getAsMatrix(self, fileName, keyToIndexFiltered, sampleToIndex, noneType="NA"):
        #Writes matrix in overall row order
        heading = None
        lines = [None] * len(keyToIndexFiltered)
        numberedRowsOffset = -1
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if not heading: 
                heading = line[1:]
                continue
            if numberedRowsOffset == -1: 
                if line[0] == "1": #This assumes actual matrix rows begin with ensembl ID, which should not be 1
                    numberedRowsOffset = 1
                    heading = heading[1:]
                    print("Removing numbered rows from source file")
                else:
                    numberedRowsOffset = 0

            key = line[numberedRowsOffset] if self.keyIsSymbol else line[numberedRowsOffset].split('.', 1)[0]
            index = keyToIndexFiltered.get(key, -1)
            if index >= 0:
                fromLine = line[1 + numberedRowsOffset:]
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
            if(line): mdata2.append(tuple([(line[i] if line[i] != noneType else -1.0) for i in range(len(line))]))
            else: mdata2.append(len(heading) * [-1])
        return heading, mdata2

    #Be warned, this is a subset of variables, so just write them in HDF5 attrs and be done with it
    def _writeVariancePartition(self, fileName, idGroup, keyToIndexFiltered):
        heading, mdata3 = self._getAsMatrix(os.path.join(self.directory, fileName), keyToIndexFiltered, None)
        arr = np.array(mdata3, dtype="<f4")
        ds = idGroup.create_dataset("variancePartition", data=arr, compression="gzip", compression_opts=9)
        ds.attrs.create("heading", heading)
