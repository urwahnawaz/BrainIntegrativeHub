class LMSPanelSet {
    constructor(parentId, childIndex, name, hdf5Group, metas) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "lms";
        self.name = name;
        self.searchedEntries = [];
        document.getElementById(self.parentId).children[childIndex].insertAdjacentHTML("afterEnd", self._generateHTML());
        self.metas = metas;
        self.data = {}
        for(let experiment of hdf5Group.keys) {
            let experimentGroup = hdf5Group.get(experiment);
            let scaled = experimentGroup.get("scaled");
            self.data[experiment] = [...scaled.value];
        }

        self.plot = new Plot("lmsplot");
        self.plot.setDimensions(800, 320, 80, 80, 50, 60);
        self.resetOptions();
        $('#lmsselect1').on('change', () => self.update());
        $('#lmsselect2').on('change', () => self.update());

        $("#lmsselect2").val(Object.keys(self.data)[0]);
        $("#lmsselect1").val(Object.keys(self.data)[1]);

        self.preventUpdates = false;
        self.update();
    }

    addCustomDataset(name, scaled, meta) {
        var self = this;
        self.data[name] = scaled;
        self.metas[name] = meta;
        self.resetOptions();
    }

    resetOptions() {
        var self = this;
        let names = Object.keys(self.data);
        self._setOptions("lmsselect1", names);
        self._setOptions("lmsselect2", names);
    }

    setMultiple(searchedEntries) {
        var self = this;
        self.searchedEntries = searchedEntries;
        self.plot.removeScatterHighlight();
        self.preventUpdates = true;
        let names = Object.keys(self.data);
        let setChart = false;

        let atLeastOneInDataset = new Array(names.length);
        for(let i=0; i<names.length; ++i) {
            atLeastOneInDataset[i] = searchedEntries.some(p => self.metas[names[i]][p.row] != -1);
            $('#lmsselect1').children().eq(i).attr("hidden", !atLeastOneInDataset[i]);
            $('#lmsselect2').children().eq(i).attr("hidden", !atLeastOneInDataset[i]);
        }

        for(let i=0; i<names.length; ++i) {
            let curr1 = names[i];
            for(let j=i+1; !setChart && j<names.length; ++j) {
                let curr2 = names[j];
                if(atLeastOneInDataset[i] && atLeastOneInDataset[j]) {
                    $("#lmsselect2").val(curr1);
                    $("#lmsselect1").val(curr2);
                    setChart = true;
                    break;
                }
            }
        }
        
        self.preventUpdates = false;
        
        if(setChart) {
            self.update();
            $('#' + self.elementId + "panel").show()
            $('#lmsselect1').selectpicker('refresh');
            $('#lmsselect2').selectpicker('refresh');
        } else {
            $('#' + self.elementId + "panel").hide()
        }
    }

    update() {
        var self = this;

        if(self.preventUpdates) return;

        let curr1 = $("#lmsselect1").val();
        let curr2 = $("#lmsselect2").val();
        let data1 = self.data[curr1];
        let data2 = self.data[curr2];
        let plotData = [];
        for(let i=0; i<self.metas[curr1].length; ++i) {
            let meta1 = self.metas[curr1][i];
            let meta2 = self.metas[curr2][i];
            if(meta1 != -1 && meta2 != -1) {
                plotData.push({x: data1[meta1]/*this ends up undefined? meta1 probs out of range?*/, y: data2[meta2]});
            }
        }
        self.plot.updateScatter(plotData, curr1, curr2, "Z-Score Transformed Mean Log2 (Expression)");
        for(var p of self.searchedEntries) {
            let metaIndex1 = self.metas[curr1][p.row];
            let metaIndex2 = self.metas[curr2][p.row];
            if(metaIndex1 >= 0 && metaIndex2 >= 0) {
                self.plot.addScatterHighlight({x: data1[metaIndex1], y: data2[metaIndex2]}, p.label, "#00e04f", "white", 5)
            }
        }
    }

    _setOptions(id, names, defaultName=undefined) {
        $("#" + id).empty();
        if(!defaultName && names.length > 0) defaultName = names[0];
        if(defaultName && !names.includes(defaultName)) names.unshift(defaultName);
        for (let n of names) $('#' + id).append('<option value="' + n + '">' + n + '</option>');

        $("#" + id).selectpicker("refresh");
        if(defaultName) $("#" + id).val(defaultName);
        $("#" + id).selectpicker("refresh");
    }

    
    _generateHTML() {
        return /*html*/`
            <div id="${this.elementId + "panel"}" class="panel-group">
                <div class="panel panel-default">
                    <div id="${this.elementId + "collapse"}" class="panel-collapse collapse in">
                        <div class="panel-body">
                            <div class="panel-description">
                                This section displays pairwise comparisons of circRNA expression in the five datasets. Select the datasets to display on the X and Y axes. Datasets where the circRNA was not detected are blocked-out for selection. The scatterplot displays z-score transformed mean expression values (across all samples in the dataset). Dots represent all circRNAs detected in both datasets. The circRNA of interest is highlighted in orange. 
                            </div>
                            <br>
                            <br>
                            <div class="col-md-2">
                                <div>Select Y Axis</div>
                                <select class="selectpicker" id="lmsselect2"></select><br><br><br>
                                <div>Select X Axis</div>
                                <select class="selectpicker" id="lmsselect1"></select><br><br><br>
                            </div>
                            <div class="col-md-9 col-md-offset-1">
                                <div id="lmsplot"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}