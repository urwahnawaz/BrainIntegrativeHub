//Creates plot controls and plot for each hdf5 group.
// One for metadata vs measure, one for measure vs measure if there are multiple
class CustomPanel {
    constructor(parentId, name) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "custom";
        self.name = name;
        
        self.datasets = {};
        self.currIndex = {};

        document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTMLSingle());

        self.plot1 = new PlotContainer(self.elementId + "plot1");
        self.controls1 = new PlotControls(self.elementId + "controls1", "Metadata Variable", "Second Metadata Variable");
        self._attachEvents(self.controls1, self.plot1);
    }

    addCustomDataset(name, dataMatrix, metadataMatrix) {
        console.log(dataMatrix);
        let self = this;
        self.datasets[name] = {data: dataMatrix, meta: metadataMatrix};
    }

    //assigns all callbacks to general, plot agnostic helper functions
    _attachEvents(controls, plot) {
        var self = this;
        controls.onDatasetChange = ()=>self._onPlotDatasetChange(controls, plot);
        controls.onChange = ()=>self._onPlotChange(controls, plot);
    }

    //sets xaxis, yaxis and colorings to what's available for this dataset
    _onPlotDatasetChange(controls, plot) { //how to check if selected circ is in this dataset? (to disable option)
        var self = this;

        let dataset = controls.getSelectedDataset();

        if(!dataset) return;

        let samples = self.datasets[dataset].meta;
        controls.setXAxis(Object.keys(samples), undefined);
        controls.setYAxis(["CPM"], undefined);
        controls.setColorings(Object.keys(samples).filter(k=>$.type(samples[k][0]) === "string"), "None");
    }

    //only difference in plots is one selects measure for x axis, other selects samples
    //could just try to find "selectedXAxis" in samples and them matrices and then fail
    _onPlotChange(controls, plot) {
        var self = this;

        if(self.supressChanges) return;

        let dataset = controls.getSelectedDataset();

        if(!dataset || self.currIndex[dataset] < 0) return;
        
        let yAxis = controls.getSelectedYAxis();
        let yRow = self.currIndex[dataset];
        let y = [];
        let which = [];
        let yMatrixRow = self.datasets[dataset].data[yRow];//self._getMatrixRowChunkCached(dataset, yAxis, yRow);
        for(let i=0; i<yMatrixRow.length; ++i) {
            let val = yMatrixRow[i];
            y.push(val)
            which.push(i);
        }

        let xAxis = controls.getSelectedXAxis();
        let x = [];

        let samples = self.datasets[dataset].meta[controls.getSelectedXAxis()];//self.hdf5Group.get(dataset + "/samples/" + controls.getSelectedXAxis()).value;
        x = which.map(i => samples[i]);

        let xAxisIsString = $.type(x[0]) === "string";
        controls.setColoringDisabled(xAxisIsString);

        let scale = controls.getSelectedScale();
        let yAxisLabel = yAxis;
        let xAxisLabel = xAxis;
        if(scale != "Linear") {
            let func = (scale == "Log e" ? Math.log : Math.log10);
            for(let i=0; i<y.length; ++i) y[i] = func(0.1 + y[i]);
            yAxisLabel += (" (" + scale + ")")
        }

        let z = undefined;
        let plotData = undefined;
        let coloring = controls.getSelectedColoring();
        if(!xAxisIsString && coloring != "None") {
            if(xAxis == coloring) {
                z = x;
            } else {
                let samples = self.datasets[dataset].meta[coloring];//self.hdf5Group.get(dataset + "/samples/" + coloring).value;
                z = which.map(i => samples[i]);
            }
            plotData = x.map((v, i) => {return {x: x[i], y: y[i], z: z[i]};});
        } else {
            plotData = x.map((v, i) => {return {x: x[i], y: y[i]};});
        }

        if(xAxisIsString) {
            plot.updateViolin(dataset, self.currCircId, plotData, xAxisLabel, yAxisLabel);
        } else {
            plot.updateScatter(dataset, self.currCircId, plotData, xAxisLabel, yAxisLabel);
        }
    }

    setCircId(circId, obj) {
        let self = this;
        self.supressChanges = true;
        let found = false;
        self.currCircId = circId;
        for(let d of Object.keys(self.datasets)) {
            self.currIndex[d] = obj[d];
            found |= (self.currIndex[d] >= 0);
        }
        self.controls1.setDatasets(Object.keys(self.datasets).map(d => {return {name: d, disabled: (self.currIndex[d] < 0)};}));
        self.supressChanges = false;
        self._onPlotChange(self.controls1, self.plot1);

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
                            <div class="col-md-10">
                                <div id="${this.elementId + "plot1"}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}