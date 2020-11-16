class LMSPanel {
    constructor(parentId, childIndex, name, hdf5Group, metas) {
        var self = this;

        self.parentId = parentId;
        self.elementId = self.parentId + "lms";
        self.name = name;
        document.getElementById(self.parentId).children[childIndex].insertAdjacentHTML("afterEnd", self._generateHTML());
        self.metas = metas;
        self.data = {}
        for(let type of ["charts", "tables"]) {
            let typeGroup = hdf5Group.get(type);
            for(let panel of typeGroup.keys) {
                let panelGroup = typeGroup.get(panel);
                for(let experiment of panelGroup.keys) {
                    let experimentGroup = panelGroup.get(experiment)
                    let scaled = experimentGroup.get("scaled");
                    self.data[experiment] = [...scaled.value];
                }
            }
        }

        self.plot = new Plot("lmsplot");
        self.resetOptions();
        $('#lmsselect1').on('change', () => self.update());
        $('#lmsselect2').on('change', () => self.update());

        self.preventUpdates = false;
        self.update();
    }

    addCustomDataset(name, scaled, meta) {
        var self = this;
        self.data[name] = scaled;
        self.metas[name] = meta;
        self.resetOptions();
        console.log("added dataset " + name)
    }

    resetOptions() {
        var self = this;
        let names = Object.keys(self.data);
        console.log("resetting options")
        console.log(names);
        self._setOptions("lmsselect1", names, "Gokool");
        self._setOptions("lmsselect2", names, "Liu")
    }

    setCircIndex(circIndex) {
        var self = this;
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
        if(!setChart) self.circIndex = undefined;
        
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
        if(!self.circIndex) return;

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
        self.plot.updateScatter(plotData, curr1, curr2);
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
                            <div class="col-md-2">
                                <div>Select Y Axis</div>
                                <select class="selectpicker" id="lmsselect2"></select><br><br>
                                <div>Select X Axis</div>
                                <select class="selectpicker" id="lmsselect1"></select><br><br>
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