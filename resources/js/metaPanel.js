//Creates plot controls and plot for each hdf5 group.
// One for metadata vs measure, one for measure vs measure if there are multiple
class MetaPanel {
    constructor(parentId, uniqueId, hdf5Group, name) {
        var self = this;

        self.suppressChanges = 0;

        self.parentId = parentId;
        self.elementId = uniqueId;
        self.hdf5Group = hdf5Group;
        self.name = name;
        self.description = hdf5Group.attrs.description;
        
        self.datasets = [];
        self.currIndex = undefined;

        document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTML());

        self.qtls = [];
        self.indices = {}
        for(let d of hdf5Group.keys) {
            let group = hdf5Group.get(d);
            if(group.keys.includes("QTL")) {
                self.qtls.push(d);
                self.indices[d] = [...group.get("indices").value];
            }

            if(group.keys.includes("matrices")) {
                self.datasets.push(d);
            }
        }

        if(self.qtls.length > 0) {
            document.getElementById(self.elementId + "panel").childNodes[1].childNodes[3].childNodes[1].insertAdjacentHTML("beforeend", self._generateQTLHTML());
            let hidableParent = $("#" + this.elementId + "qtl").parent().parent('.hidable');
            if(hidableParent && self.qtls.length == 1) {
                    hidableParent.hide();
            }
            $("#" + this.elementId + "qtl").selectpicker("refresh");
        }

        self.plot = new Plot(self.elementId + "plot");
        self.controls = new PlotControls(self.elementId + "controls", "Metadata Variable", "Expression Measure", "Second Metadata Variable");
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

    _getMatrixRowDataLake(datasetName="BrainSeq", matrixName="RPKM", row=0, callback=console.log) {
        console.log(this.hdf5Group);
        let matrix = this.hdf5Group.get(datasetName + "/matrices/" + matrixName);

        let url = "https://laughing-noether-c70ca8.netlify.app/" + matrix.attrs["datalake"];

        let shape = matrix.attrs["shape"];
        let rowStart = row * shape[1];
        let rowEnd = Math.min(rowStart + shape[1], shape[0] * shape[1]);

        let start = rowStart * 4;
        let end = rowEnd * 4;

        fetch(url, {
            method: "GET",
            cache: "force-cache",
            headers: {
                "Range": `bytes=${start}-${end-1}`,
            }
        })
        .then(res => res.arrayBuffer())
        .then(buff => {
            let array = new Float32Array(buff.slice(0, end));
            console.log(buff.byteLength - (end-start));
            callback(array) //Throwing away a lot, could cache  this
        });
    }

    _getMatrixRowDataLakeCached(datasetName="BrainSeq", matrixName="RPKM", row=0, callback=console.log) {
        let matrix = this.hdf5Group.get(datasetName + "/matrices/" + matrixName);

        let bytesPerFloat = 4;

        let shape = matrix.attrs["shape"];
        let rowStart = row * shape[1];
        let rowEnd = Math.min(rowStart + shape[1], shape[0] * shape[1]);
        let chunkRows = 1; //e.g. could be page size but then sorting would break
        let chunkSize = chunkRows * shape[1];
        let chunkCurr = Math.floor(row / chunkRows);
        let chunkStart = chunkCurr * chunkSize;
        let chunkEnd = Math.min(chunkStart + chunkSize, shape[0] * shape[1]);
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
            let start = chunkStart * bytesPerFloat;
            let end = chunkEnd * bytesPerFloat;

            let f = abortableFetch("https://laughing-noether-c70ca8.netlify.app/" + matrix.attrs["datalake"], {
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
                        if(scale != "Linear") {
                            let func = (scale == "Log e" ? Math.log : Math.log10);
                            self._scalePlotData(plotData, func, 0.1, plot, scale, labels);
                        }

                        if(self.hdf5Group.keys.includes("sample_id")) {
                            let sampleNames = self.hdf5Group.get(dataset).attrs["sample_id"];
                            for(let i=0; i<plotData.length; ++i) plotData[i].name = sampleNames[i];
                        } else {
                            for(let i=0; i<plotData.length; ++i) plotData[i].name = i;
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
                            plot.updateViolin(plotData, labels.xAxisLabel, labels.yAxisLabel, self.names[dataset], orderXDic, groupLabelsX, groupSizesX, orderZDic);
                        } else {
                            plot.updateScatter(plotData, labels.xAxisLabel, labels.yAxisLabel, self.names[dataset], orderZDic);
                        }
                    }
                });
            }
        });
    }

    _onQTLChange() {
        var self = this;

        if(self.qtls.length == 0) return;

        $("#" + this.elementId + "qtltitle").text("CircQTL:" + self.qtls[0])

        let rows = undefined;
        let dataset = $("#" + self.elementId + "qtl").val();
        let datasetObj = self.hdf5Group.get(dataset + "/QTL");
        let heading = datasetObj.attrs.heading.split(",");
        let index = self.currIndex[dataset];

        if(index >= 0) {
            $("#" + this.elementId + "noqtl").text("No Significant QTLs");
            let indices = self.indices[dataset];
            let qtlCalcIndex = indices[index]
            if(qtlCalcIndex >= 0) {
                let end = -1;
                for(let i = index + 1; i < indices.length; ++i) {
                    if(indices[i] >= 0) {
                        end = indices[i];
                        break;
                    }
                }
                rows = datasetObj.value.slice(qtlCalcIndex, (end == -1 ? datasetObj.shape[0] : end));
                for(let i=0; i<rows.length; ++i) rows[i] = rows[i].split(",");
            }
        } else {
            $("#" + this.elementId + "noqtl").text("No Data");
        }

        let qtlContents = "";
        qtlContents += '<thead>';
        qtlContents += "<tr>";
        for(let h of heading) qtlContents += `<th>${h}</th>`
        qtlContents += "</tr>";
        qtlContents += '</thead>';
        qtlContents += '<tbody>';
        if(rows) {
            for(let r of rows) {
                qtlContents += "<tr>";
                for(let v of r) qtlContents += `<td>${v}</td>`
                qtlContents += "</tr>";
            }
            $("#" + this.elementId + "noqtl").hide();
        } else {
            $("#" + this.elementId + "noqtl").show();
        }
        qtlContents += '</tbody>';

        document.getElementById(self.elementId + "table").innerHTML = qtlContents;
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

        self._onQTLChange();

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

    _generateQTLHTML() { //TODO: generalize for more than one QTL
        return /*html*/`
            <hr class="mt-1 mb-1"/>
            <span class="hidable">
                <div class="col-md-2">
                    <select id="${this.elementId + "qtl"}" class="selectpicker">
                        ${this.qtls.map(v => "<option>" + v + "</option>")}
                    </select>
                </div>
                <br><br>
            </span>
            <div class="row justify-content-center">
                <div id="${this.elementId + "qtltitle"}" class="text-center"></div>
                <br><br>
                <div class="col-auto">
                    <table class="table qtltable" id="${this.elementId + "table"}"></table>
                </div>
                <div id="${this.elementId + "noqtl"}" class="text-center"></div>
            </div>
            `
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