//Creates plot controls and plot for each hdf5 group.
// One for metadata vs measure, one for measure vs measure if there are multiple
class MetaPanel {
    constructor(parentId, uniqueId, hdf5Group, name) {
        var self = this;

        self.parentId = parentId;
        self.elementId = uniqueId;
        self.hdf5Group = hdf5Group;
        self.name = name;
        self.description = hdf5Group.attrs.description;
        
        self.datasets = self.hdf5Group.keys;
        self.currIndex = {};

        document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTML());

        self.plot = new Plot(self.elementId + "plot");
        self.controls = new PlotControls(self.elementId + "controls", "Measure", "Metadata Variable", "Second Metadata Variable");
        self.controls.onDatasetChange = ()=>self._onPlotDatasetChange(self.controls, self.plot);
        self.controls.onChange = ()=>self._onPlotChange(self.controls, self.plot);

        self.plot.addYAxisCallback(function() {
            self.controls.incrimentScale();
        });

        self.rowCache = {};
        for(let dataset of self.datasets) {
            let ret = {};
            for(let matrix of self.hdf5Group.get(dataset + "/matrices").keys) {
                ret[matrix] = {id: -1, data: undefined};
            }
            self.rowCache[dataset] = ret;
        }
    }

    _getMatrixRowCached(datasetName, matrixName, row) {
        var self = this;
        let matrix = self.hdf5Group.get(datasetName + "/matrices/" + matrixName);
        let cache = self.rowCache[datasetName][matrixName];
        if(cache.id == row) {
            console.log(`used cached row ${row}`);
        } else {
            console.log("no cached row");
            let rowStart = row * matrix.shape[1];
            cache.data = matrix.value.slice(rowStart, rowStart + matrix.shape[1])
            cache.id = row;
        }
        return cache.data;
    }

    _getMatrixRowChunkCached(datasetName, matrixName, row) {
        var self = this;
        let matrix = self.hdf5Group.get(datasetName + "/matrices/" + matrixName);
        let chunks = matrix._dataobjects.chunks;
        let rowLength = matrix.shape[1];
        let chunkSize = chunks[0] * chunks[1];
        if((chunkSize % rowLength) != 0) {
            console.log(`cannot use chunk cache, rows span multiple chunks`);
            return this._getMatrixRowCached(datasetName, matrixName, row);
        }
        let rowStart = row * rowLength;
        let matrixSize =  matrix.shape[0] * matrix.shape[1];
        let chunkIndex = Math.floor(rowStart / chunkSize);
        let chunkStart = chunkIndex * chunkSize;
        let cache = self.rowCache[datasetName][matrixName];
        if(cache.id == chunkStart) {
            console.log(`used cached chunk ${chunkIndex}`);
        } else {
            console.log("no cached chunk");
            cache.data = matrix.value.slice(chunkStart, Math.min(chunkStart + chunkSize, matrixSize));
            cache.id = chunkStart;
        }
        return cache.data.slice(rowStart - chunkStart, rowStart + rowLength - chunkStart);
    }

    _getPlotDataY(dataset, yAxis, yRow, plot) {
        return this._getMatrixRowChunkCached(dataset, yAxis, yRow);
    }

    _getPlotDataX(dataset, xAxis, yRow, plot) {
        return this.hdf5Group.get(dataset + "/samples/" + xAxis).value;
    }

    _scalePlotData(plotData, func, offset, plot) {
        for(let i=0; i<plotData.length; ++i) plotData[i].y = func(plotData[i].y + offset);
    }

    _onPlotDatasetChange(controls, plot) {
        var self = this;

        let dataset = controls.getSelectedDataset();
        if(!dataset) return;

        self.supressChanges = true;

        let matrices = self.hdf5Group.get(dataset + "/matrices");
        let samples = self.hdf5Group.get(dataset + "/samples");

        controls.setYAxis(matrices.keys, matrices.attrs["order"][0]);
        controls.setColorings(samples.keys.filter(k=>$.type(samples.get(k).value[0]) === "string"), "None");

        self._setXAxis(controls, matrices, samples, plot);

        self.supressChanges = false;
        self._onPlotChange(controls, plot);
    }

    _setXAxis(controls, matrices, samples, plot) {
        controls.setXAxis(samples.keys, samples.attrs["order"][0]);
    }

    _onPlotChange(controls, plot) {
        var self = this;

        if(self.supressChanges) return;

        let dataset = controls.getSelectedDataset();

        if(!dataset || self.currIndex[dataset] < 0) {
            plot.updateDisabled();
            return;
        }
        
        let yAxis = controls.getSelectedYAxis();
        let yRow = self.currIndex[dataset];
        let y = self._getPlotDataY(dataset, yAxis, yRow, plot);

        let xAxis = controls.getSelectedXAxis();
        let x = self._getPlotDataX(dataset, xAxis, yRow, plot);

        let xAxisIsString = $.type(x[0]) === "string";
        controls.setColoringDisabled(xAxisIsString);

        let z = undefined;
        let plotData = undefined;
        let coloring = controls.getSelectedColoring();
        if(!xAxisIsString && coloring != "None") {
            if(xAxis == coloring) {
                z = x;
            } else {
                z = self.hdf5Group.get(dataset + "/samples/" + coloring).value;
            }
            plotData = x.map((v, i) => {return {x: x[i], y: y[i], z: z[i]};});
        } else {
            plotData = x.map((v, i) => {return {x: x[i], y: y[i]};});
        }

        let scale = controls.getSelectedScale();
        let yAxisLabel = yAxis;
        let xAxisLabel = xAxis;
        if(scale != "Linear") {
            let func = (scale == "Log e" ? Math.log : Math.log10);
            self._scalePlotData(plotData, func, 0.1, plot);
            yAxisLabel += (" (" + scale + ")")
        }

        let sampleNames = self.hdf5Group.get(dataset).attrs["sample_id"];
        for(let i=0; i<plotData.length; ++i) {
            plotData[i].name = sampleNames[i];
        }

        if(xAxisIsString) {
            plot.updateBox(plotData, xAxisLabel, yAxisLabel);
        } else {
            plot.updateScatter(plotData, xAxisLabel, yAxisLabel);
        }
    }

    setCircId(circId, obj) {
        let self = this;
        self.supressChanges = true;
        let found = false;
        self.currCircId = circId;
        for(let d of self.datasets) {
            self.currIndex[d] = obj[d];
            found |= (self.currIndex[d] >= 0);
        }

        self.setControlDatasets(self.controls, self.datasets);
       
        self.supressChanges = false;
        self._onPlotChange(self.controls, self.plot, false);

        if(found) {
            $('#' + this.elementId + "panel").show()
        } else {
            $('#' + this.elementId + "panel").hide()
        }
    }

    setControlDatasets(controls, datasets) {
        var self = this;
        controls.setDatasets(datasets.map(d => {return {name: d, disabled: (self.currIndex[d] < 0)};}));
    }

    _generateHTML() {
        return /*html*/`
            <div id="${this.elementId + "panel"}" class="panel-group">
                <div class="panel panel-default">
                    <div class="panel-heading">
                        <h4 class="panel-title">
                            <a data-toggle="collapse" href="#${this.elementId + "collapse"}">${this.name}</a>
                        </h4>
                    </div>
                    <div id="${this.elementId + "collapse"}" class="panel-collapse collapse in">
                        <div class="panel-body">
                            <div>${this.description}</div><br><br>
                            <div class="col-md-2">
                                <div id="${this.elementId + "controls"}"></div>
                            </div>
                            <div class="col-md-9 col-md-offset-1">
                                <div id="${this.elementId + "plot"}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}