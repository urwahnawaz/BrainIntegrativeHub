//Creates plot controls and plot for each hdf5 group.
// One for metadata vs measure, one for measure vs measure if there are multiple
class MetaPanel {
    constructor(parentId, uniqueId, hdf5Group, name, names, datalakeURL) {
        var self = this;

        self.suppressChanges = 0;

        self.parentId = parentId;
        self.elementId = uniqueId;
        self.hdf5Group = hdf5Group;
        self.name = name;
        self.description = hdf5Group.attrs.description;
        
        self.datasets = [];
        self.currIndex = undefined;

        self.datalakeURL = datalakeURL

        self.hasAnyVariancePartition = false;
        for(let d of hdf5Group.keys) {
            let group = hdf5Group.get(d);
            if(group.keys.includes("matrices")) {
                self.datasets.push(d);
            }
            if(group.keys.includes("variancePartition")) {
                self.hasAnyVariancePartition = true;
            }
        }

        document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTML());

        self.plot = new PlotContainer(self.elementId + "plot");
        self.controls = new PlotControls(self.elementId + "controls", "Metadata Variable", "Expression Measure", "Second Metadata Variable");
        self.controls.onDatasetChange = () => {
            self._onPlotDatasetChange(self.controls, self.plot); 
            if(self.hasAnyVariancePartition) self._onVariancePartitionChange(self.controls, self.plot2);
        }
        self.controls.onChange = ()=>self._onPlotChange(self.controls, self.plot);

        self.plot.addYAxisCallback(function() {
            self.controls.incrimentScale();
        });

        if(self.hasAnyVariancePartition) {
            self.plot2 = new PlotContainer(self.elementId + "plot2");
            self.plot2.setDimensions(800, 400, 80, 110, 40, 60); //increase left margin
        }

        self.rowCache = {};
        for(let dataset of self.datasets) {
            let ret = {};
            for(let matrix of self.hdf5Group.get(dataset + "/matrices").keys) {
                ret[matrix] = {id: -1, data: undefined};
            }
            self.rowCache[dataset] = ret;
        }

        self.names = {};
        self.customFilters = {};
        for(let dataset of self.datasets) {
            let currName = self.hdf5Group.get(dataset).attrs["name"];
            self.names[dataset] = currName ? currName : dataset;

            let currCustomFilterValues = new Set(["All"]);
            let currFilterColumn = self.hdf5Group.get(dataset).attrs["customFilterColumn"].trim();
            if(currFilterColumn) {
                self.hdf5Group.get(dataset + "/samples/" + currFilterColumn).value.forEach(item => currCustomFilterValues.add(item))
            }
            self.customFilters[dataset] = {column: currFilterColumn, name: self.hdf5Group.get(dataset).attrs["customFilterName"], values: Array.from(currCustomFilterValues)};
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


    _getMatrixRowDataLakeCached(datasetName="BrainSeq", matrixName="RPKM", row=0, callback=console.log) {
        var self = this

        let matrix = this.hdf5Group.get(datasetName + "/matrices/" + matrixName);

        let shape = matrix.attrs["shape"];
        let index = matrix.get("index").value;

        console.log(row);
        console.log(index.length)

        let byteStart = index[row];
        let byteEnd = index[row+1];

        function abortableFetch(request, opts) {
            const controller = new AbortController();
            const signal = controller.signal;
          
            return {
              abort: () => controller.abort(),
              ready: fetch(request, { ...opts, signal })
            };
        }

        function convertBlock(incomingData) { // incoming data is an ArrayBuffer
            var i, l = incomingData.length; // length, we need this for the loop
            var outputData = new Float32Array(incomingData.length); // create the Float32Array for output
            for (i = 0; i < l; i++) {
                outputData[i] = (incomingData[i] - 128) / 128.0; // convert audio to float
            }
            return outputData; // return the Float32Array
        }

        let cache = this.rowCache[datasetName][matrixName];
        if(cache.id == row) {
            console.log(`used cached chunk ${row}`);
            callback(cache.data);
        } else {
            let f = abortableFetch(self.datalakeURL + "/" + matrix.attrs["path"], {
                method: "GET",
                cache: "force-cache",
                headers: {
                    "Range": `bytes=${byteStart}-${byteEnd-1}`,
                }
            });

            f.ready.then(res => {
                if(res.status != "206") {
                    f.abort();
                    throw "Response was not partial"
                }
                return res.arrayBuffer()
            })
            .then(buff => {
                console.log(buff.byteLength);
                console.log(`bytes=${byteStart}-${byteEnd-1}`)
                let inflated = pako.inflate(buff);
                
                let dataView = new DataView(inflated.buffer);
                const range = (start, stop, step = 1) => Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)
                let array = range(0, inflated.byteLength / 4).map(idx => dataView.getFloat32(idx * 4, true));  

                console.log("length of row is " + array.length + ", length should be " + shape[1])
                console.log(array)
                console.log("no cached chunk");
                cache.data = array;
                cache.id = row;
                callback(array);
            }, (e) => {
                console.log(e);
                callback(null);
            });
        }
    }

    _getPlotDataY(dataset, yAxis, yRow, plot, callback) {
        this._getMatrixRowDataLakeCached(dataset, yAxis, yRow, callback);
    }

    _getPlotDataX(dataset, xAxis, yRow, plot, callback) {
        callback(this.hdf5Group.get(dataset + "/samples/" + xAxis).value);
    }

    _scalePlotData(plotData, func, offset, plot, scale, labels) {
        for(let i=0; i<plotData.length; ++i) plotData[i].y = func(plotData[i].y + offset);
        labels.yAxisLabel += (" (" + scale + ")")
    }

    _onPlotDatasetChange(controls, plot) {
        var self = this;

        let dataset = controls.getSelectedDataset();
        if(!dataset) return;

        self.suppressChanges++;

        let currCustomFilter = self.customFilters[dataset];
        controls.setCustomFilter(currCustomFilter.name || currCustomFilter.column, currCustomFilter.values);

        let matrices = self.hdf5Group.get(dataset + "/matrices");
        let samples = self.hdf5Group.get(dataset + "/samples");

        let coloring = samples.attrs["order"].filter(k=>$.type(samples.get(k).value[0]) === "string");
        coloring.unshift("None");

        controls.setYAxis(matrices.attrs["order"], matrices.attrs["order"][0]);
        controls.setColorings(coloring, coloring[0]);
        //controls.setColorings(coloring, coloring.length > 1 ? coloring[1] : coloring[0]);

        self._setXAxis(controls, matrices, samples, plot);

        self.suppressChanges--;
        self._onPlotChange(controls, plot);
    }

    _setXAxis(controls, matrices, samples, plot) {
        controls.setXAxis(samples.attrs["order"], samples.attrs["order"][0]);
    }

    _onPlotChange(controls, plot) {
        var self = this;

        if(self.suppressChanges > 0) return;

        let dataset = controls.getSelectedDataset();

        if(!dataset || self.currIndex[dataset] < 0) {
            plot.updateDisabled();
            return;
        }

        plot.updateDisabled("Fetching data...");
        
        let yAxis = controls.getSelectedYAxis();
        let yRow = self.currIndex[dataset];
        self._getPlotDataY(dataset, yAxis, yRow, plot, (y) => {
            if(y == null) {
                plot.updateDisabled("Data could not be retrieved");
            } else {
                let xAxis = controls.getSelectedXAxis();
                let xDataset = self.hdf5Group.get(dataset + "/samples/" + xAxis);
                let orderXDic = xDataset.attrs["order"];
                let groupLabelsX = xDataset.attrs["groupLabels"];
                let groupSizesX = xDataset.attrs["groupSizes"];
                
                self._getPlotDataX(dataset, xAxis, yRow, plot, (x) => {
                    if(x == null) { 
                        plot.updateDisabled("Data could not be retrieved");
                    } else {
                        let xAxisIsString = $.type(x[0]) === "string";

                        let z = undefined;
                        let orderZDic = undefined;
                        let plotData = undefined;
                        let coloring = controls.getSelectedColoring();
                        if(coloring != "None" && coloring != xAxis) {
                            let coloringDataset = self.hdf5Group.get(dataset + "/samples/" + coloring);
                            z = coloringDataset.value;
                            orderZDic = coloringDataset.attrs["order"];
                            z = self.hdf5Group.get(dataset + "/samples/" + coloring).value;
                            plotData = x.map((v, i) => {return {x: x[i], y: y[i], z: z[i]};});
                        } else {
                            plotData = x.map((v, i) => {return {x: x[i], y: y[i]};});
                        }

                        let scale = controls.getSelectedScale();
                        let labels = {yAxisLabel: yAxis, xAxisLabel: xAxis};
                        if(scale != "Linear") {
                            let func = (scale == "Log e" ? Math.log : Math.log10);
                            self._scalePlotData(plotData, func, 0.1, plot, scale, labels);
                        }

                        if(self.hdf5Group.get(dataset).keys.includes("sample_names")) {
                            let sampleNames = self.hdf5Group.get(dataset + "/sample_names").value;
                            for(let i=0; i<plotData.length; ++i) plotData[i].name = sampleNames[i];
                        }
                        
                        //Filter by predefined custom categorical variable (e.g. region)
                        let currFilterColumn = self.customFilters[dataset].column;
                        let filterSelected = controls.getSelectedCustomFilter();
                        
                        if(currFilterColumn && filterSelected != "All") {
                            let filterValues = self.hdf5Group.get(dataset + "/samples/" + currFilterColumn).value;
                            plotData = plotData.filter((value, index) => filterValues[index] == filterSelected);
                        }

                        if(plotData.length == 0) {
                            plot.updateDisabled();
                            return;
                        }
                        if(xAxisIsString) {
                            plot.updateViolin(self.names[dataset], self.currCircId, plotData, labels.xAxisLabel, labels.yAxisLabel, orderXDic, groupLabelsX, groupSizesX, orderZDic, orderZDic ? undefined : xDataset.attrs["colors"]);
                            //plot.addTitles(self.names[dataset], self.currCircId);
                        } else {
                            plot.updateScatter(self.names[dataset], self.currCircId, plotData, labels.xAxisLabel, labels.yAxisLabel, orderZDic);
                            //plot.addTitles(self.names[dataset], self.currCircId);
                        }
                    }
                });
            }
        });
    }

    _onVariancePartitionChange(controls, plot) {
        var self = this;

        if(self.suppressChanges > 0) return;

        let dataset = controls.getSelectedDataset();

        if(!dataset || self.currIndex[dataset] < 0 || !self.hdf5Group.get(dataset).keys.includes("variancePartition")) {
            plot.updateDisabled("No variance partition");
            return;
        }

        let variancePartitionData = self.hdf5Group.get(dataset + "/variancePartition");
        let heading = variancePartitionData.attrs["heading"];
        let start = heading.length * self.currIndex[dataset];
        let dataY = variancePartitionData.value.slice(start, start + heading.length);

        let dataYSum = 0;
        let data = [];
        for(let i=0; i<heading.length; dataYSum += dataY[i], ++i) data.push({y: heading[i], x: dataY[i]});

        if(dataYSum == -heading.length) {
            plot.updateDisabled("No variance partition");
            return;
        }
        plot.updateBar(dataset, self.currCircId, data, "Fraction Variance Explained", "Metadata Variable");
        //plot.addTitles("Variance Partition", self.currCircId);
    }

    setCircId(circId, obj) {
        let self = this;
        self.suppressChanges++;
        self.currCircId = circId;
        self.currIndex = obj;

        let found = false;
        for(let d of self.datasets) {
            found |= (self.currIndex[d] >= 0);
        }

        self.setControlDatasets(self.controls, self.datasets);
       
        self.suppressChanges--;
        self._onPlotChange(self.controls, self.plot, false);

        if(self.hasAnyVariancePartition) self._onVariancePartitionChange(self.controls, self.plot2);

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
                            <div class="panel-description">${this.description}</div><br><br>
                            <div class="row">
                                <div class="col-md-2">
                                    <div id="${this.elementId + "controls"}"></div>
                                </div>
                                <div class="col-md-10">
                                    <div id="${this.elementId + "plot"}"></div>
                                </div>
                            </div>
                            ${!this.hasAnyVariancePartition ? "" : 
                            /*html*/`<hr class="mt-1 mb-1"/>
                            <div class="row">
                                <div class="col-md-10 col-md-offset-2">
                                    <div id="${this.elementId + "plot2"}"></div>
                                </div>
                            </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}