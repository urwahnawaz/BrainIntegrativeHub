/*
self.metas -> {dataset1: [-1, 1, 2, 3, -1, 4], dataset2: [-1, ...]} #note can be added to for custom datasets
self.names -> [ENGS0343, ENGS38473, ENGS23484...]
self.data -> {dataset1: [0.123, 0.343, 0.3432, 1.232], dataset2: [3.123, 0.12, 0.345]}
self.index -> {dataset1: []} (same length as self.data)
*/

class LMSPanelSet {
    constructor(parentId, childIndex, name, hdf5Group, metas, names) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "lms";
        self.name = name;
        self.searchedEntries = [];
        self.missingData = [];
        document.getElementById(self.parentId).children[childIndex].insertAdjacentHTML("afterEnd", self._generateHTML());
        self.metas = metas;
        self.names = names;
        self.data = {}
        self.index = {}
        for(let experiment of hdf5Group.keys) {
            let experimentGroup = hdf5Group.get(experiment);
            let scaled = experimentGroup.get("scaled");
            self.data[experiment] = [...scaled.value];
            let index = experimentGroup.get("index");
            self.index[experiment] = [...index.value];
        }

        self.plot = new Plot("lmssetplot");
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
        self.preventUpdates = true;
        let setChart = false;
        if(self.searchedEntries.length == 0) {
            setChart = true;
        } else {
            let names = Object.keys(self.data);
            let atLeastOneInDataset = new Array(names.length);
            for(let i=0; i<names.length; ++i) {
                atLeastOneInDataset[i] = searchedEntries.some(p => self.metas[names[i]][p.row] != -1);
                $('#lmsselect1').children().eq(i).attr("hidden", !atLeastOneInDataset[i]);
                $('#lmsselect2').children().eq(i).attr("hidden", !atLeastOneInDataset[i]);
            }

            for(let i=0; !setChart && i<names.length; ++i) {
                let curr1 = names[i];
                for(let j=i+1; j<names.length; ++j) {
                    let curr2 = names[j];
                    if(atLeastOneInDataset[i] && atLeastOneInDataset[j]) {
                        $("#lmsselect2").val(curr1);
                        $("#lmsselect1").val(curr2);
                        setChart = true;
                        break;
                    }
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

        let index1 = self.index[curr1];
        let index2 = self.index[curr2];

        let metas1 = self.metas[curr1];
        let metas2 = self.metas[curr2];
        let plotData = [];

        let entry1, entry2, entry3;
        entry1 = entry2 = entry3 = -1;
        for(let i=0, j=0, k=0, halt=0; i < index1.length && !halt; ++i) {
            let entry1 = index1[i];

            while(entry2 < entry1 && !halt) {
                if(j < index2.length) entry2 = index2[j++];
                else halt=1;
            }
            
            if(self.searchedEntries.length) {
                while(entry3 < entry2) {
                    if(k < self.searchedEntries.length) entry3 = self.searchedEntries[k++].row;
                    else break;
                }
            }
            
            if(entry1 == entry2 && entry1 != entry3) {
                plotData.push({x: data1[metas1[entry1]], y: data2[metas2[entry2]], name: self.names[entry1]});
            }
        }

        self.plot.updateScatter(plotData, curr1, curr2, "Z-Score Transformed Mean Log2 (Expression)", undefined, true);

        plotData = [];
        self.missingData = [];
        for(var p of self.searchedEntries) {
            let metaIndex1 = self.metas[curr1][p.row];
            let metaIndex2 = self.metas[curr2][p.row];
            if(metaIndex1 >= 0 && metaIndex2 >= 0) {
                plotData.push({x: data1[metaIndex1], y: data2[metaIndex2], name: self.names[index1[metaIndex1]]});
            } else {
                self.missingData.push(p.label);
            }
        }

        if(self.searchedEntries.length) {
            document.getElementById("alertMain").style.display = "";
            console.log(self.searchedEntries)
            document.getElementById("alertInfo").innerText = ((self.searchedEntries.length - self.missingData.length) + "/" + (self.searchedEntries.length));
            if(self.missingData.length) {
                document.getElementById("alertMissing").style.display = "";
                document.getElementById("alertMain").classList.remove("alert-info");
                document.getElementById("alertMain").classList.add("alert-warning");

                document.getElementById("alertMissingDownload").href = 'data:text/csv;octet-stream,' + encodeURIComponent(self.missingData.join('\r\n'));
                document.getElementById("alertMissingDownload").download = "missing" + curr1 + "vs" + curr2 + ".csv";
            } else {
                document.getElementById("alertMissing").style.display = "none";
                document.getElementById("alertMain").classList.remove("alert-warning");
                document.getElementById("alertMain").classList.add("alert-info");
            }
        } else {
            document.getElementById("alertMain").style.display = "none";
        }

        self.plot.addScatterHighlights(plotData, "#00e04f", "white", 5);
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
                            <div class="panel-description"></div>
                            <div class="col-md-2">
                                <div>Select Y Axis</div>
                                <select class="selectpicker" id="lmsselect2"></select><br><br><br>
                                <div>Select X Axis</div>
                                <select class="selectpicker" id="lmsselect1"></select><br><br><br>
                                
                                <div id="alertMain" class="alert alert-warning" role="alert" style="display: none;">
                                    <span id="alertInfo">33/35</span> searched terms in intersection<span id="alertMissing"> (<a id="alertMissingDownload">missing</a>)</span>
                                </div>
                            </div>
                            <div class="col-md-10">
                                <div id="lmssetplot"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}