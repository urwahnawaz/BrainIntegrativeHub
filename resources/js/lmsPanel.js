class LMSPanel {
    constructor(parentId, childIndex, name, hdf5Group, metas) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "lms";
        self.name = name;
        self.circIndex = -1;
        document.getElementById(self.parentId).children[childIndex].insertAdjacentHTML("afterEnd", self._generateHTML());
        self.metas = metas;
        self.data = {}
        for(let experiment of hdf5Group.keys) {
            let experimentGroup = hdf5Group.get(experiment);
            let scaled = experimentGroup.get("scaled");
            self.data[experiment] = [...scaled.value];
        }

        self.plot = new Plot("lmsplot");
        self.resetOptions();
        $('#lmsselect1').on('change', () => self.update());
        $('#lmsselect2').on('change', () => self.update());
        $('#showpinned').on('change', () => self.update());

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

    setCircIndex(circIndex, pinned=undefined) {
        var self = this;
        self.pinned = pinned;
        self.plot.removeScatterHighlight();
        self.preventUpdates = true;
        self.circIndex = circIndex;
        let names = Object.keys(self.data);
        let setChart = false;
        for(let i=0; i<names.length; ++i) {
            let curr1 = names[i];
            let meta1 = self.metas[curr1][circIndex];
            $('#lmsselect1').children().eq(i).attr("hidden",meta1 == -1);
            $('#lmsselect2').children().eq(i).attr("hidden",meta1 == -1);

            for(let j=i+1; !setChart && j<names.length; ++j) {
                let curr2 = names[j];
                let meta2 = self.metas[curr2][circIndex];

                if(meta1 != -1 && meta2 != -1) {
                    $("#lmsselect2").val(curr1);
                    $("#lmsselect1").val(curr2);
                    setChart = true;
                    break;
                }
            }
        }
        if(!setChart) self.circIndex = -1;
        
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
        if(self.circIndex == -1) return;

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
        if(pinned && document.getElementById("showpinned").checked) {
            for(var p of pinned) {
                let metaIndex = self.metas[curr1][p.row];
                if(metaIndex >= 0) {
                    let metaIndex = self.metas[curr1][p.row];
                    self.plot.addScatterHighlight({x: data1[self.metas[curr1][metaIndex]], y: data2[self.metas[curr2][metaIndex]]}, p.ensembl_id, "#00e04f", "white", 5)
                }
            }
        }
        self.plot.addScatterHighlight({x: data1[self.metas[curr1][self.circIndex]], y: data2[self.metas[curr2][self.circIndex]]})
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
                    <div class="panel-heading">
                        <h4 class="panel-title">
                            <a data-toggle="collapse" href="#${this.elementId + "collapse"}">${this.name}</a>
                        </h4>
                    </div>
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
                                <div>Show Pinned</div>
                                <input id="showpinned" type="checkbox" checked>
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