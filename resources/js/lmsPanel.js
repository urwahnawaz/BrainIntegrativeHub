class LMSPanel {
    constructor(parentId, childIndex, name, hdf5Group, metas, names) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "lms";
        self.name = name;
        self.circIndex = -1;
        document.getElementById(self.parentId).children[childIndex].insertAdjacentHTML("afterbegin", self._generateHTML());
        self.metas = metas;
        self.names = names;
        self.data = {};
        self.index = {};
        for(let experiment of hdf5Group.keys) {
            let experimentGroup = hdf5Group.get(experiment);
            let scaled = experimentGroup.get("scaled");
            self.data[experiment] = [...scaled.value];
            let index = experimentGroup.get("index");
            self.index[experiment] = [...index.value];
        }

        self.plot = new PlotContainer("lmsplot");
        self.resetOptions();
        $('#lmsselect1').on('change', () => self.update());
        $('#lmsselect2').on('change', () => self.update());

        self.preventUpdates = false;
        self.update();
    }

    addCustomDataset(name, scaled, meta, index) {
        var self = this;
        self.data[name] = scaled;
        self.metas[name] = meta;
        self.index[name] = index;
        self.resetOptions();
    }

    resetOptions() {
        var self = this;
        let names = Object.keys(self.data);
        self._setOptions("lmsselect1", names);
        self._setOptions("lmsselect2", names);
    }

    setCircId(circId, circIndex) {
        var self = this;
        self.preventUpdates = true;
        self.currCircId = circId;
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
            //$('#' + self.elementId + "panel").hide()
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

        let index1 = self.index[curr1];
        let index2 = self.index[curr2];

        let metas1 = self.metas[curr1];
        let metas2 = self.metas[curr2];

        let plotData = [];
        let entry1, entry2;
        entry1 = entry2 = -1;
        for(let i=0, j=0, k=0, halt=0; i < index1.length && !halt; ++i) {
            let entry1 = index1[i];

            while(entry2 < entry1 && !halt) {
                if(j < index2.length) entry2 = index2[j++];
                else halt=1;
            }
            
            if(entry1 == entry2 && entry1 != self.circIndex) {
                plotData.push({x: data1[metas1[entry1]], y: data2[metas2[entry2]], name: self.names[entry1]});
            }
        }
        
        self.plot.updateScatter("Z-Score Transformed Mean Log2 (Expression)", self.currCircId, plotData, curr1, curr2, undefined, [{x: data1[self.metas[curr1][self.circIndex]], y: data2[self.metas[curr2][self.circIndex]], name: self.names[self.circIndex]}]);
        //self.plot.addTitles("Z-Score Transformed Mean Log2 (Expression)", self.currCircId);
    }

    _setOptions(id, names, defaultName=undefined) {
        $("#" + id).empty();
        if(!defaultName && names.length > 0) defaultName = names[0];
        else if(defaultName && !names.includes(defaultName)) names.unshift(defaultName);
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
                                
                            </div>
                            <br>
                            <br>
                            <div class="col-md-2">
                                <div>Select Y Axis</div>
                                <select class="selectpicker" id="lmsselect2"></select><br><br><br>
                                <div>Select X Axis</div>
                                <select class="selectpicker" id="lmsselect1"></select><br><br><br>
                            </div>
                            <div class="col-md-10">
                                <div id="lmsplot"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}