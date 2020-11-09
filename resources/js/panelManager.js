//Creates plot controls and plot for each hdf5 group.
// One for metadata vs measure, one for measure vs measure if there are multiple
class PanelManager {
    constructor(parentId, uniqueId, hdf5Group, name) {
        var self = this;

        self.parentId = parentId;
        self.elementId = uniqueId;
        self.hdf5Group = hdf5Group;
        self.name = name;
        
        self.datasets1 = self.hdf5Group.keys;
        self.datasets2 = self.datasets1.filter(d => self.hdf5Group.get(d + "/matrices").keys.length > 1);
        self.matrixDatasetsEnabled = (self.datasets2.length > 0);
        self.currIndex = {};

        if(self.matrixDatasetsEnabled) {
            document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTMLDouble()); //this is problem
        } else {
            document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTMLSingle());
        }

        self.plot1 = new Plot(self.elementId + "plot1");
        self.controls1 = new PlotControls(self.elementId + "controls1", "Measure", "Metadata Variable", "Second Metadata Variable");
        self._attachEvents(self.controls1, self.plot1, false);

        if(self.matrixDatasetsEnabled) {
            self.plot2 = new Plot(self.elementId + "plot2");
            self.controls2 = new PlotControls(self.elementId + "controls2");
            self._attachEvents(self.controls2, self.plot2, true);
        }

        self.rowCache = {};
        for(let dataset of self.datasets1) {
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
        //This works but there should be more hits
        //Try increasing hdf5 chunk size and removing deleted circrnas from matrices
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

    //assigns all callbacks to general, plot agnostic helper functions
    _attachEvents(controls, plot, useMatrices) {
        var self = this;
        controls.onDatasetChange = ()=>self._onPlotDatasetChange(controls, plot, useMatrices);
        controls.onChange = ()=>self._onPlotChange(controls, plot, useMatrices);
    }

    //sets xaxis, yaxis and colorings to what's available for this dataset
    _onPlotDatasetChange(controls, plot, useMatrices) { //how to check if selected circ is in this dataset? (to disable option)
        var self = this;

        let dataset = controls.getSelectedDataset();

        if(!dataset) return;

        let matrices = self.hdf5Group.get(dataset + "/matrices");
        let samples = self.hdf5Group.get(dataset + "/samples");
        if(useMatrices) controls.setXAxis(matrices.keys);
        else controls.setXAxis(samples.keys, samples.attrs["default"]);
        controls.setYAxis(matrices.keys, matrices.attrs["default"]);
        controls.setColorings(samples.keys.filter(k=>$.type(samples.get(k).value[0]) === "string"), "None");
    }

    //only difference in plots is one selects measure for x axis, other selects samples
    //could just try to find "selectedXAxis" in samples and them matrices and then fail
    _onPlotChange(controls, plot, useMatrices) {
        var self = this;

        if(self.supressChanges) return;

        let dataset = controls.getSelectedDataset();

        if(!dataset || self.currIndex[dataset] < 0) return;
        
        let yAxis = controls.getSelectedYAxis();
        let yRow = self.currIndex[dataset];
        let y = [];
        let which = [];
        let yMatrixRow = self._getMatrixRowChunkCached(dataset, yAxis, yRow);
        for(let i=0; i<yMatrixRow.length; ++i) {
            let val = yMatrixRow[i];
            //if(val > 0) { //TODO remove which since we are including ALL points
                y.push(val)
                which.push(i);
            //} 
        }

        let xAxis = controls.getSelectedXAxis();
        let x = [];
        if(useMatrices) {
            if(yAxis == xAxis) {
                x = [...y];
            } else {
                let xMatrixRow = self._getMatrixRowChunkCached(dataset, xAxis, yRow);
                x = which.map(i => xMatrixRow[i]);
            }
        } else {
            let samples = self.hdf5Group.get(dataset + "/samples/" + controls.getSelectedXAxis()).value;
            x = which.map(i => samples[i]);
        }

        let xAxisIsString = $.type(x[0]) === "string";
        controls.setColoringDisabled(xAxisIsString);

        let scale = controls.getSelectedScale();
        let yAxisLabel = yAxis;
        let xAxisLabel = xAxis;
        if(scale != "Linear") {
            let func = (scale == "Log e" ? Math.log : Math.log10);
            for(let i=0; i<y.length; ++i) y[i] = func(0.1 + y[i]);
            if(useMatrices) for(let i=0; i<x.length; ++i) x[i] = func(0.1 + x[i]);
            yAxisLabel += (" (" + scale + ")")
        }

        let z = undefined;
        let plotData = undefined;
        let coloring = controls.getSelectedColoring();
        if(!xAxisIsString && coloring != "None") {
            if(xAxis == coloring) {
                z = x;
            } else {
                let samples = self.hdf5Group.get(dataset + "/samples/" + coloring).value;
                z = which.map(i => samples[i]);
            }
            plotData = x.map((v, i) => {return {x: x[i], y: y[i], z: z[i]};});
        } else {
            plotData = x.map((v, i) => {return {x: x[i], y: y[i]};});
        }

        let sampleNames = self.hdf5Group.get(dataset).attrs["sample_id"];
        for(let i=0; i<which.length; ++i) {
            plotData[i].name = sampleNames[i];
        }

        if(xAxisIsString) {
            plot.updateBox(plotData, xAxisLabel, yAxisLabel);
        } else {
            plot.updateScatter(plotData, xAxisLabel, yAxisLabel, (useMatrices ? "Circular vs. linear RNA expression" : ""));
        }
    }

    setCircId(circId, obj) {
        let self = this;
        self.supressChanges = true;
        let found = false;
        self.currCircId = circId;
        for(let d of self.datasets1) {
            //self.currIndex[d] = self.hdf5Group.get(d + "/circ_id").value.indexOf(circId); //Note this only finds exact matches for now
            self.currIndex[d] = obj[d]; //probably a subset
            found |= (self.currIndex[d] >= 0);
        }
        self.controls1.setDatasets(self.datasets1.map(d => {return {name: d, disabled: (self.currIndex[d] < 0)};}));
        if(self.matrixDatasetsEnabled) self.controls2.setDatasets(self.datasets2.map(d => {return {name: d, disabled: (self.currIndex[d] < 0)};}));
        self.supressChanges = false;
        self._onPlotChange(self.controls1, self.plot1, false);
        if(self.matrixDatasetsEnabled) self._onPlotChange(self.controls2, self.plot2, true);

        if(found) {
            $('#' + this.elementId + "panel").show()
        } else {
            $('#' + this.elementId + "panel").hide()
        }
    }

    _generateHTMLSingle() {
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
                            <div class="col-md-2">
                                <div id="${this.elementId + "controls1"}"></div>
                            </div>
                            <div class="col-md-9 col-md-offset-1">
                                <div id="${this.elementId + "plot1"}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    _generateHTMLDouble() {
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
                        <div class="row">
                            <div class="col-md-2">
                                <div id="${this.elementId + "controls1"}"></div>
                            </div>
                            <div class="col-md-9 col-md-offset-1">
                                <div id="${this.elementId + "plot1"}"></div>
                            </div>
                        </div>
                        <hr class="mt-1 mb-1"/>
                        <div class="row">
                            <div class="col-md-2">
                                <div id="${this.elementId + "controls2"}"></div>
                            </div>
                            <div class="col-md-9 col-md-offset-1">
                                <div id="${this.elementId + "plot2"}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `
    }
}