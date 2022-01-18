//Creates plot controls and plot for each hdf5 group.
// One for metadata vs measure, one for measure vs measure if there are multiple
class MetaPanel {
    constructor(parentId, uniqueId, hdf5Group, name, names) {
        var self = this;

        self.suppressChanges = 0;

        self.parentId = parentId;
        self.elementId = uniqueId;
        self.hdf5Group = hdf5Group;
        self.name = name;
        self.description = hdf5Group.attrs.description;
        
        self.datasets = [];
        self.currIndex = undefined;

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

        self.plot = new Plot(self.elementId + "plot");
        self.controls = new PlotControls(self.elementId + "controls", "Metadata Variable", "Expression Measure", "Second Metadata Variable");
        self.controls.onDatasetChange = ()=>self._onPlotDatasetChange(self.controls, self.plot);
        self.controls.onChange = ()=>self._onPlotChange(self.controls, self.plot);

        self.plot.addYAxisCallback(function() {
            self.controls.incrimentScale();
        });

        if(self.hasAnyVariancePartition) {
            self.plot2 = new Plot(self.elementId + "plot2");
            self.plot2.setDimensions(950, 400, 80, 150, 40, 60);
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
        self.brainRegions = {};
        for(let dataset of self.datasets) {
            let currName = self.hdf5Group.get(dataset).attrs["name"];
            self.names[dataset] = currName ? currName : dataset;

            let currRegions = new Set(["All"]);
            let currBrainRegionFilters = self.hdf5Group.get(dataset).attrs["brainRegionFilter"];
            if(currBrainRegionFilters) {
                self.hdf5Group.get(dataset + "/samples/" + currBrainRegionFilters).value.forEach(item => currRegions.add(item))
            }
            self.brainRegions[dataset] = {key: currBrainRegionFilters, values: Array.from(currRegions)};
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

    //Should centrallise caching and asynchronously hot load first page when makeTable is called
    //OR open modal immediately but show circle spinning
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
    
    _getMatrixRowDataLakeCached(datasetName="BrainSeq", matrixName="RPKM", row=0, callback=console.log) {
        let matrix = this.hdf5Group.get(datasetName + "/matrices/" + matrixName);

        let bytesPerFloat = 4;

        let shape = matrix.attrs["shape"];
        let rowStart = row * shape[1];
        let rowEnd = Math.min(rowStart + shape[1], shape[0] * shape[1]);
        let chunkRows = 1; //e.g. could be page size but then sorting would break
        let chunkSize = chunkRows * shape[1];

        let datalakeMax = matrix.attrs["datalake-max"];
        let divideOffset =  datalakeMax % (chunkSize * bytesPerFloat) ? 1 : 0; //Account for trucation of chunks every time we switch to a new file part
        let currPart = Math.floor(rowStart * bytesPerFloat / datalakeMax);

        let chunkCurr = Math.floor(row / chunkRows) + divideOffset * currPart;
        let chunkStart = Math.max(chunkCurr * chunkSize, currPart * datalakeMax / bytesPerFloat);
        let chunkEnd = Math.min(chunkStart + chunkSize, (currPart+1) * datalakeMax / bytesPerFloat); //Initermediate parts
        chunkEnd = Math.min(chunkEnd, shape[0] * shape[1]) //Last part, which may be less than datalakeMax

        function abortableFetch(request, opts) {
            const controller = new AbortController();
            const signal = controller.signal;
          
            return {
              abort: () => controller.abort(),
              ready: fetch(request, { ...opts, signal })
            };
        }

        let cache = this.rowCache[datasetName][matrixName];
        if(cache.id == chunkCurr) {
            console.log(`used cached chunk ${chunkCurr}`);
            callback(cache.data.slice(rowStart - chunkStart, rowEnd - chunkStart));
        } else {
            
            let start = (chunkStart * bytesPerFloat) % datalakeMax;
            let end = (chunkEnd * bytesPerFloat) % datalakeMax

            let f = abortableFetch("https://hopeful-austin-9ca901.netlify.app/" + matrix.attrs["datalake"][currPart], {
                method: "GET",
                cache: "force-cache",
                headers: {
                    "Range": `bytes=${start}-${end-1}`,
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
                console.log(end);
                console.log(buff.byteLength);
                console.log(`bytes=${start}-${end-1}`)
                let array = new Float32Array(buff.slice(0, end));
                console.log("no cached chunk");
                cache.data = array;
                cache.id = chunkCurr;
                callback(cache.data.slice(rowStart - chunkStart, rowEnd - chunkStart));
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

        controls.setRegions(self.brainRegions[dataset].values);

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
                        let bandwidth = 2.5;
                        if(scale != "Linear") {
                            let func = (scale == "Log e" ? Math.log : Math.log10);
                            self._scalePlotData(plotData, func, 0.1, plot, scale, labels);
                            bandwidth = func(bandwidth);
                        }

                        if(self.hdf5Group.keys.includes("sample_id")) {
                            let sampleNames = self.hdf5Group.get(dataset).attrs["sample_id"];
                            for(let i=0; i<plotData.length; ++i) plotData[i].name = sampleNames[i];
                        } else {
                            for(let i=0; i<plotData.length; ++i) plotData[i].name = "sample" + i;
                        }
                        
                        //Filter by selected region
                        let currRegionKey = self.brainRegions[dataset].key;
                        let filterSelected = controls.getSelectedRegion();
                        
                        if(currRegionKey && filterSelected != "All") {
                            console.log(currRegionKey);
                            console.log(filterSelected);
                            let filterValues = self.hdf5Group.get(dataset + "/samples/" + currRegionKey).value;
                            plotData = plotData.filter((value, index) => filterValues[index] == filterSelected);
                        }

                        if(plotData.length == 0) {
                            plot.updateDisabled();
                            return;
                        }

                        if(xAxisIsString) {
                            plot.updateViolin(plotData, labels.xAxisLabel, labels.yAxisLabel, self.names[dataset], orderXDic, groupLabelsX, groupSizesX, orderZDic, bandwidth);
                        } else {
                            plot.updateScatter(plotData, labels.xAxisLabel, labels.yAxisLabel, self.names[dataset], orderZDic);
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
            plot.updateDisabled();
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
            plot.updateDisabled();
            return;
        }
        
        plot.updateBar(data, "Fraction Variance Explained", "Metadata Variable", "Variance Partition");
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
                                <div class="col-md-12">
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