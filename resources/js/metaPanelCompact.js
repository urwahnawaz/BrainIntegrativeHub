class MetaPanelCompact extends MetaPanel {
    constructor(parentId, uniqueId, hdf5Group, name) {
        super(parentId, uniqueId, hdf5Group, name);
        
        var self = this;

        self.plot2 = new Plot(self.elementId + "plot2");
        self.controls2 = new PlotControls(self.elementId + "controls2");

        self.plot.setTitle(self.datasets[0]);
        self.plot2.setTitle(self.datasets[1]);
        self.plot.setDimensions(550, 400, 0, 70);
        self.plot2.setDimensions(550, 400, 0, 70);

        self.controls2.onDatasetChange = () =>self._onPlotDatasetChange(self.controls2, self.plot2);
        self.controls2.onChange = () => self._onPlotChange(self.controls2, self.plot2);
    
        self.plot2.addYAxisCallback(function() {
            self.controls2.incrimentScale();
        });
    }

    static isDataCompact(hdf5Group) {
        if(hdf5Group.keys.length != 2) return false;
        for(let d of hdf5Group.keys) {
            if(hdf5Group.get(d + "/samples").keys.length > 1) {
                return false;
            }
        }
        return true;
    }

    setCircId(circId, obj) {
        super.setCircId(circId, obj);
        let self = this;
        self.supressChanges = true;
        self.setControlDatasets(self.controls2, self.datasets);
        self.supressChanges = false;
        self._onPlotChange(self.controls2, self.plot2);
    }

    setControlDatasets(controls, datasets) {
        var self = this;
        controls.setDataset(controls == self.controls ? datasets[0] : datasets[1]);
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
                            <div class="col-md-6 col-md-offset-0">
                                <div id="${this.elementId + "plot"}"></div>
                            </div>
                            <div class="col-md-6 col-md-offset-0">
                                <div id="${this.elementId + "plot2"}"></div>
                            </div>
                        </div>
                        <div class="row" style="display:none">
                            <div class="col-md-2">
                            <div id="${this.elementId + "controls"}"></div>
                            </div>
                            <div class="col-md-2">
                                <div id="${this.elementId + "controls2"}"></div>
                            </div>
                        </div>
                        <hr class="mt-1 mb-1"/>
                        <div class="row">
                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `
    }
}