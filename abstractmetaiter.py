from abstractliftoveriter import AbstractLiftoverIter
import csv, math, h5py
import numpy as np

class AbstractMetaIter(AbstractLiftoverIter):
    def __init__(self, directory, measures, measureNames, metadata, groupName):
        super().__init__(directory)
        self.measures = measures
        self.measureNames = measureNames
        self.metadata = metadata
        self.groupName = groupName
        self.hasMetadata = True

    def writeHDF5Metadata(self, root, rows):
        which = [row._meta[self.id] for row in rows if row._meta[self.id] > -1]
        which.sort()
        experiment = root.create_group(self.groupName + "/" + self.name)
        matrices = experiment.create_group("matrices")
        matrices.attrs.create("default", self.measureNames[0])
        samples = experiment.create_group("samples")
        for i in range(len(self.measures)):
            self._writeHDF5Matrix(self.measures[i], matrices, experiment, self.measureNames[i], which)
        self._writeHDF5Columns(self.metadata, samples)

    def _writeHDF5Matrix(self, fileName, entryGroup, idGroup, datasetName, which, noneType="NA"):
        heading = []
        lines = []
        m = -1
        n = 0
        for line in csv.reader(open(fileName, 'r'), delimiter=','):
            if m == -1:
                heading = line[1:]
            elif n >= len(which):
                break
            elif which[n] == m:
                lines.append(line)
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
        means = [np.mean([arr[i][j] for i in range(len(arr))]) for j in range(len(arr[0]))]
        stds = [np.std([arr[i][j] for i in range(len(arr))]) for j in range(len(arr[0]))]
        ds.attrs.create("sd", stds)
        ds.attrs.create("mean", means)

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
