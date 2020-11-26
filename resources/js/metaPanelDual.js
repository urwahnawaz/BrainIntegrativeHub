class MetaPanelDual extends MetaPanel {
    constructor(parentId, uniqueId, hdf5Group, name) {
        super(parentId, uniqueId, hdf5Group, name);
        
        var self = this;
        self.datasets2 = self.datasets.filter(d => self.hdf5Group.get(d + "/matrices").keys.length > 1);

        self.plot2 = new Plot(self.elementId + "plot2");
        self.controls2 = new PlotControls(self.elementId + "controls2");

        self.plot2.setTitle("Circular vs. linear RNA expression");

        self.controls2.onDatasetChange = () =>self._onPlotDatasetChange(self.controls2, self.plot2);
        self.controls2.onChange = () => self._onPlotChange(self.controls2, self.plot2);
    
        self.plot2.addYAxisCallback(function() {
            self.controls2.incrimentScale();
        });
    }

    static isDataDual(hdf5Group) {
        for(let d of hdf5Group.keys) {
            if(hdf5Group.get(d + "/matrices").keys.length <= 1) {
                return false;
            }
        }
        return true;
    }

    _setXAxis(controls, matrices, samples, plot) {
        var self = this;
        if(plot==self.plot2) {
            let matrixNames = matrices.attrs["order"];
            matrixNames.splice(matrixNames.indexOf('CI'), 1);
            controls.setXAxis(matrixNames, matrixNames[1]);
        } else {
            super._setXAxis(controls, matrices, samples, plot)
        }
    }
    
    _getPlotDataX(dataset, xAxis, yRow, plot) {
        return (plot==this.plot2) ? this._getPlotDataY(dataset, xAxis, yRow) : super._getPlotDataX(dataset, xAxis, yRow, plot);
    }

    _scalePlotData(plotData, func, offset, plot) {
        super._scalePlotData(plotData, func, offset);
        if(plot==this.plot2) for(let i=0; i<plotData.length; ++i) plotData[i].x = func(plotData[i].x + offset);
    }

    setCircId(circId, obj) {
        super.setCircId(circId, obj);
        let self = this;
        self.supressChanges = true;
        self.setControlDatasets(self.controls2, self.datasets2);
        self.supressChanges = false;
        self._onPlotChange(self.controls2, self.plot2);
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
                        <div class="row">
                            <div class="col-md-2">
                                <div id="${this.elementId + "controls"}"></div>
                            </div>
                            <div class="col-md-9 col-md-offset-1">
                                <div id="${this.elementId + "plot"}"></div>
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