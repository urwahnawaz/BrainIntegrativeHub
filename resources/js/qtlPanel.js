class QTLPanel {
    constructor(parentId, uniqueId, hdf5Group, name) {
        var self = this;

        self.parentId = parentId;
        self.elementId = uniqueId;
        self.hdf5Group = hdf5Group;
        self.name = name;

        //Force first group only for now
        self.dataset = hdf5Group.keys[0];
        self.hdf5QTL = hdf5Group.get(hdf5Group.keys[0]);
        self.hdf5QTLDS = self.hdf5QTL.get("QTL");
        self.heading = self.hdf5QTLDS.attrs.heading.split(",");
        self.indices = [...self.hdf5QTL.get("indices").value];

        document.getElementById(self.parentId).insertAdjacentHTML("beforeend", self._generateHTML());
    }

    setCircId(circId, metaObj) {
        var self = this;

        let rows = undefined;
        let index = metaObj[self.dataset];
        if(index >= 0) {
            let qtlCalcIndex = self.indices[index]
            if(qtlCalcIndex >= 0) {
                let end = -1;
                for(let i = index + 1; i < self.indices.length; ++i) {
                    if(self.indices[i] >= 0) {
                        end = self.indices[i];
                        break;
                    }
                }
                rows = self.hdf5QTLDS.value.slice(qtlCalcIndex, (end == -1 ? self.hdf5QTLDS.shape[0] : end));
                for(let i=0; i<rows.length; ++i) rows[i] = rows[i].split(",");
            }
        }

        if(rows) {
            let qtlContents = "";
            qtlContents += '<thead>';
            qtlContents += "<tr>";
            for(let h of self.heading) qtlContents += `<th>${h}</th>`
            qtlContents += "</tr>";
            qtlContents += '</thead>';
            qtlContents += '<tbody>';
            for(let r of rows) {
                qtlContents += "<tr>";
                for(let v of r) qtlContents += `<td>${v}</td>`
                qtlContents += "</tr>";
            }
            qtlContents += '</tbody>';
            document.getElementById(self.elementId + "table").innerHTML = qtlContents;
            $('#' + this.elementId + "panel").show()
        } else {
            $('#' + this.elementId + "panel").hide()
        } 
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
                            <select class="selectpicker">
                            <option>${this.dataset}</option>
                            </select>
                        </div>
                        <br><br><br>
                        <table class="table qtltable" id="${this.elementId + "table"}"></table>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}