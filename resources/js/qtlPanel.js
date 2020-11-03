class QTLPanel {
    constructor(parentId, childIndex, name, heading) {
        var self = this;
        self.heading = heading;
        self.parentId = parentId;
        self.elementId = self.parentId + "qtl";
        self.name = name;
        document.getElementById(self.parentId).children[childIndex].insertAdjacentHTML("afterEnd", self._generateHTML());
    }

    setData(rows=undefined) {
        var self = this;
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
                            <option>Liu</option>
                            </select>
                        </div>
                        <br><br>
                        <table class="table qtltable" id="${this.elementId + "table"}"></table>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}