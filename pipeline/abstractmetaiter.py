from abstractsource import AbstractSource
from seekablecsvreader import SeekableCSVReader
import csv, math, h5py, os, zlib, struct
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

    def getKeysOrdered(self, fileName, removeKeyDotPostfix):
        keys = []
        reader = SeekableCSVReader(filename=fileName, removeKeyDotPostfix=removeKeyDotPostfix)
        for line in reader: keys.append(line[0])
        return reader.getHeading(), keys

    def intersectKeysOrdered(self, keys1, keys2):
        _auxset = set(keys1)
        return [x for x in keys2 if x in _auxset]

    def reorderListByKey(self, keys, currList, keyToIndexFiltered):
        newList = [None] * (1 + max(keyToIndexFiltered.values()))
        for i in range(len(currList)):
            index = keyToIndexFiltered.get(keys[i], -1)
            if index >= 0: newList[index] = currList[i]
        return list(filter(None, newList))
        
    def _writeHDF5Columns(self, fileName, hdf5Group, sampleToIndexFiltered, noneType="NA"):
        lines = []
        samples = []

        sampleReader = SeekableCSVReader(filename=os.path.join(self.directory, fileName))
        heading = sampleReader.getHeading()
        removed = [False] * len(heading)

        for line in sampleReader:
            lines.append(line[1:])
            samples.append(line[0])

        lines = self.reorderListByKey(samples, lines, sampleToIndexFiltered)

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
        headingMeta, keysMeta = self.getKeysOrdered(os.path.join(self.directory, self.metadata), False)
        headingMatrix, keysMatrix = self.getKeysOrdered(os.path.join(self.directory, self.matrices[0]["path"]), not self.keyIsSymbol)
        samplesOrdered = self.intersectKeysOrdered(headingMatrix, keysMeta)

        keyToIndexFiltered = {} #map subsetted genes from this matrix to overall row order
        tableIndices = [] #map rows in this subsetted matrix back to overall row indices
        tableIndex = 0

        #Are there gaps in order index?
        prev = -1
        for row in rows:
            metaIndex = row.getMeta(self.id)
            if metaIndex >= 0: 
                orderIndex = row.getOrder(self.id)
                keyToIndexFiltered[keysMatrix[metaIndex]] = orderIndex
                tableIndices.append(tableIndex)
                prev = orderIndex
            tableIndex += 1

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
        datalakeIndices, datalakeName, shape = self._writeAsMatrixCompressed(os.path.join(self.directory, self.matrices[0]["path"]), keyToIndexFiltered, sampleToIndexFiltered, lakeFileName, experimentGroup)
        ds = matrixGroup.create_group(self.matrices[0]["type"])

        ds.create_dataset("index", data=datalakeIndices, compression="gzip", compression_opts=9)
        ds.attrs.create("path", datalakeName)
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

    def _writeAsMatrixCompressed(self, fileName, keyToIndexFiltered, sampleToIndexFiltered, lakeFileName, scaledOutput, noneType="NA"):
        datalakeName = lakeFileName + ".matrix"

        with open(self.output + datalakeName, 'wb') as datalakeFile:
            tells = []
            logs = []
            offset = 0
            seen = [False] * len(keyToIndexFiltered)
            matrixReader = SeekableCSVReader(filename=fileName, removeKeyDotPostfix=not self.keyIsSymbol)
            for line in matrixReader:
                key = line[0]
                index = keyToIndexFiltered.get(key, -1)
                if index >= 0 and not seen[index]:
                    tells.append((index, matrixReader.getLineStartTell(), key))
                    seen[index] = True

            tells.sort()

            datalakeIndices = []
            totalBytesWritten = 0
            debug = True
            for tell in tells:
                matrixReader.setLineStartTell(tell[1])
                line = matrixReader.__next__()
                fixedLine = self.reorderListByKey(matrixReader.getHeading(), line[1:], sampleToIndexFiltered)
                for i in range(len(fixedLine)): fixedLine[i] = float(fixedLine[i])
                if(scaledOutput): logs.append(np.mean([math.log2(abs(fixedLine[i]) + 0.01) for i in range(len(fixedLine))]))
                datalakeIndices.append(totalBytesWritten)
                totalBytesWritten += datalakeFile.write(zlib.compress(bytes().join((struct.pack('<f', val) for val in fixedLine))))

                if debug:
                    debug = False
                    print(fixedLine)
                    print(tell[2])
                    print(totalBytesWritten)

            datalakeIndices.append(totalBytesWritten)

            if(scaledOutput):
                logMean = np.mean(logs)
                logSd = np.std(logs)
                scaled = np.array([((x - logMean) / logSd) for x in logs], dtype="f4")
                scaledOutput.create_dataset("scaled", data=scaled, compression="gzip", compression_opts=9)

        return datalakeIndices, datalakeName, (len(keyToIndexFiltered), len(sampleToIndexFiltered))

    def _getAsMatrix(self, fileName, keyToIndexFiltered, sampleToIndex, noneType="NA"):
        #Writes matrix in overall row order
        lines = [None] * (1 + max(keyToIndexFiltered.values()))
        matrixReader = SeekableCSVReader(filename=fileName, removeKeyDotPostfix=not self.keyIsSymbol)
        heading = matrixReader.getHeading()
        lineLen = len(sampleToIndex if sampleToIndex else heading)
        for line in matrixReader:
            key = line[0]
            index = keyToIndexFiltered.get(key, -1)
            if index >= 0:
                fromLine = line[1:]
                if sampleToIndex:
                    toLine = [-1] * lineLen
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
            else: mdata2.append([-1] * lineLen)
        return heading, mdata2

    #Be warned, this is a subset of variables, so just write them in HDF5 attrs and be done with it
    def _writeVariancePartition(self, fileName, idGroup, keyToIndexFiltered):
        heading, mdata3 = self._getAsMatrix(os.path.join(self.directory, fileName), keyToIndexFiltered, None)
        arr = np.array(mdata3, dtype="<f4")
        ds = idGroup.create_dataset("variancePartition", data=arr, compression="gzip", compression_opts=9)
        ds.attrs.create("heading", heading)
