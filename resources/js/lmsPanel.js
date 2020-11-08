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

        let names = Object.keys(self.data);
        self._setOptions("lmsselect1", names, "Gokool");
        self._setOptions("lmsselect2", names, "Liu")
        $('#lmsselect1').on('change', () => self.update());
        $('#lmsselect2').on('change', () => self.update());

        self.update();
    }

    setCircIndex(circIndex) {
        var self = this;
        self.plot.removeScatterHighlight();
        self.circIndex = circIndex;
        let curr1 = $("#lmsselect1").val();
        let curr2 = $("#lmsselect2").val();
        let data1 = self.data[curr1];
        let data2 = self.data[curr2];
        let meta1 = self.metas[curr1][circIndex];
        let meta2 = self.metas[curr2][circIndex];
        
        if(meta1 != -1 && meta2 != -1) {
            self.plot.addScatterHighlight({x: data1[meta1], y: data2[meta2]})
        }
    }

    update() {
        var self = this;
        let curr1 = $("#lmsselect1").val();
        let curr2 = $("#lmsselect2").val();
        let data1 = self.data[curr1];
        let data2 = self.data[curr2];
        let plotData = [];
        for(let i=0; i<self.metas[curr1].length; ++i) {
            let meta1 = self.metas[curr1][i];
            let meta2 = self.metas[curr2][i];
            if(meta1 != -1 && meta2 != -1) {
                plotData.push({x: data1[meta1], y: data2[meta2]});
            }
        }
        self.plot.updateScatter(plotData, curr1, curr2);
        if(self.circIndex) {
            self.setCircIndex(self.circIndex);
        }
    }

    _setOptions(id, names, defaultName=undefined) {
        $("#" + id).empty();
        let index = 0;
        if(defaultName) {
            let found = names.indexOf(defaultName);
            if(found == -1) names.unshift(defaultName);
            else index = found;
        }
        for (let n of names) $('#' + id).append('<option value="' + n + '">' + n + '</option>');
        $("#" + id).prop('selectedIndex', index);
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