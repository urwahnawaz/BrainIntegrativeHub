/*
self.metas -> {dataset1: [-1, 1, 2, 3, -1, 4], dataset2: [-1, ...]} #note can be added to for custom datasets
self.names -> [ENGS0343, ENGS38473, ENGS23484...]
self.data -> {dataset1: [0.123, 0.343, 0.3432, 1.232], dataset2: [3.123, 0.12, 0.345]}
self.index -> {dataset1: []} (same length as self.data)
*/

class LMSPanelSet {
    constructor(parentId, name, hdf5Group, metas, names) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "lmsset";
        self.name = name;
        self.searchedEntries = [];
        self.missingData = [];
        document.getElementById(self.parentId).insertAdjacentHTML("afterbegin", self._generateHTML());
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

        self.plot = new PlotContainer("lmssetplot");
        self.plot.setDimensions(800, 320, 80, 80, 50, 60);
        self.resetOptions();
        $('#lmssetselect1').on('change', () => self.update());
        $('#lmssetselect2').on('change', () => self.update());

        $("#lmssetselect2").val(Object.keys(self.data)[0]);
        $("#lmssetselect1").val(Object.keys(self.data)[1]);

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
        self._setOptions("lmssetselect1", names);
        self._setOptions("lmssetselect2", names);
    }

    setMultiple(searchedEntries, searchedTotalMatches) {
        var self = this;
        self.searchedEntries = searchedEntries;
        self.searchedTotalMatches = searchedTotalMatches;
        self.preventUpdates = true;
        let setChart = false;
        if(self.searchedEntries.length == 0) {
            setChart = true;
        } else {
            let names = Object.keys(self.data);
            let atLeastOneInDataset = new Array(names.length);
            for(let i=0; i<names.length; ++i) {
                atLeastOneInDataset[i] = searchedEntries.some(p => self.metas[names[i]][p.row] != -1);
                $('#lmssetselect1').children().eq(i).attr("hidden", !atLeastOneInDataset[i]);
                $('#lmssetselect2').children().eq(i).attr("hidden", !atLeastOneInDataset[i]);
            }

            for(let i=0; !setChart && i<names.length; ++i) {
                let curr1 = names[i];
                for(let j=i+1; j<names.length; ++j) {
                    let curr2 = names[j];
                    if(atLeastOneInDataset[i] && atLeastOneInDataset[j]) {
                        $("#lmssetselect2").val(curr1);
                        $("#lmssetselect1").val(curr2);
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
            $('#lmssetselect1').selectpicker('refresh');
            $('#lmssetselect2').selectpicker('refresh');
        } else {
            $('#' + self.elementId + "panel").hide()
        }
    }

    update() {
        var self = this;

        if(self.preventUpdates) return;

        let curr1 = $("#lmssetselect1").val();
        let curr2 = $("#lmssetselect2").val();

        let data1 = self.data[curr1];
        let data2 = self.data[curr2];

        let index1 = self.index[curr1];
        let index2 = self.index[curr2];

        let metas1 = self.metas[curr1];
        let metas2 = self.metas[curr2];
        let plotData = [];

        let entry1, entry2, entry3;
        entry2 = entry3 = -1;
        for(let i=0, j=0, k=0, halt=0; i < index1.length && !halt; ++i) {
            entry1 = index1[i];

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

        let highlightData = [];
        self.missingData = [];
        for(var p of self.searchedEntries) {
            let metaIndex1 = self.metas[curr1][p.row];
            let metaIndex2 = self.metas[curr2][p.row];
            if(metaIndex1 >= 0 && metaIndex2 >= 0) {
                highlightData.push({x: data1[metaIndex1], y: data2[metaIndex2], name: self.names[index1[metaIndex1]]});
            } else {
                self.missingData.push(p.label);
            }
        }

        self.plot.updateScatter("Z-Score Transformed Mean Log2 (Expression)", "", plotData, curr1, curr2, undefined, highlightData, undefined, undefined, 5)

        //Note missingData is specific to the intersection
        //self.searchedEntries.filter(v => v.row != -1) is all missing

        if(self.searchedEntries.length) {
            document.getElementById("alertMain").style.display = "";
            if(self.searchedEntries.length > self.searchedTotalMatches) {
                document.getElementById("alertMissingDownload").innerText = (self.searchedEntries.length - self.searchedTotalMatches) + "/" + self.searchedEntries.length;
                console.log(self.searchedTotalMatches);
                document.getElementById("alertInfo").innerText = self.searchedTotalMatches ? " searched genes are duplicates or not found in any datasets" : " searched genes not found in any datasets";
                document.getElementById("alertMain").classList.remove("alert-info");
                document.getElementById("alertMain").classList.add("alert-warning");
                document.getElementById("alertMissingDownload").href = 'data:text/csv;octet-stream,' + encodeURIComponent(self.searchedEntries.filter(v => v.row == -1).map(v => v.label).join('\r\n'));
                document.getElementById("alertMissingDownload").download = "missing.csv";
            } else {
                document.getElementById("alertMissingDownload").innerText = "";
                document.getElementById("alertInfo").innerText = "All " + self.searchedEntries.length + " searched genes found in at least one dataset.";
                document.getElementById("alertMain").classList.remove("alert-warning");
                document.getElementById("alertMain").classList.add("alert-info");
            }
            if(self.searchedTotalMatches) document.getElementById("alertInfo").innerText += " (" + (self.searchedEntries.length - self.missingData.length) + "/" + self.searchedEntries.length + " in both " + curr1 + " and " + curr2 + ")";
            
            if(self.searchedTotalMatches > 0) {
                document.getElementById("alertRedirect").style.display = "";
            }
        } else {
            document.getElementById("alertMain").style.display = "none";
            document.getElementById("alertRedirect").style.display = "none";
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
                            <div class="panel-description"></div>
                            <div class="col-md-2">
                                <div>Select Y Axis</div>
                                <select class="selectpicker" id="lmssetselect2"></select><br><br><br>
                                <div>Select X Axis</div>
                                <select class="selectpicker" id="lmssetselect1"></select><br><br><br>
                                
                                <div id="alertMain" class="alert alert-warning" role="alert" style="display: none;">
                                    <a id="alertMissingDownload">33/35</a><span id="alertInfo"></span>
                                </div>

                                <div id="alertRedirect" class="alert alert-info" role="alert" style="display: none;">
                                    Scroll down to view metadata
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