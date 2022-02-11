//All UI callbacks, links to plot
class PlotControls {
    constructor(elementId, xAxisAlias="X Axis", yAxisAlias="Y Axis", coloringVariableAlias="Metadata Variable") {
        var self = this;

        self.elementId = elementId;
        self.xAxisAlias = xAxisAlias;
        self.yAxisAlias = yAxisAlias;
        self.coloringVariableAlias = coloringVariableAlias;

        document.getElementById(self.elementId).innerHTML = self._generateHTML();

        self.datasetId = "datasetselect" + self.elementId;
        self.xAxisId = "xAxis" + self.elementId;

        $('#datasetselect' + self.elementId).on('change', () => self.onDatasetChange());
        $('#customfilterselect' + self.elementId).on('change', () => self.onChange());
        $('#xaxisselect' + self.elementId).on('change', () => self.onChange());
        $('#yaxisselect' + self.elementId).on('change', () => self.onChange());
        $('#scaleselect' + self.elementId).on('change', () => self.onChange());
        $('#coloringselect' + self.elementId).on('change', () => self.onChange());

        self.onDatasetChange = ()=>{throw "not implimented";};
        self.onChange = ()=>{throw "not implimented";};
    }

    incrimentScale() {
        let count = $('#scaleselect' + this.elementId + ' option').length 
        let curr = $('#scaleselect' + this.elementId).prop('selectedIndex');
        $('#scaleselect' + this.elementId).prop('selectedIndex', (curr + 1) % count);
        $('#scaleselect' + this.elementId).selectpicker("refresh");
        this.onChange();
    }

    setScaleDisabled(value) {
        $('#scaleselect' + this.elementId).attr('disabled', value);
        $('#scaleselect' + this.elementId).selectpicker('refresh');
    }

    setColoringDisabled(value) {
        $('#coloringselect' + this.elementId).attr('disabled', value);
        $('#coloringselect' + this.elementId).selectpicker('refresh');
    }

    setDatasets(obj) {
        if(obj.length == 1) {
            $('#datasetlabel' + this.elementId).text(obj[0].name);
            
        } else {
            $('#datasetlabel' + this.elementId).text("Select Dataset");
            $(`[data-id="${'datasetselect' + this.elementId}"]`).show();
        }
        this._setOptionsToggle('datasetselect' + this.elementId, obj);
        this.onDatasetChange();
    }

    setCustomFilter(title, names) {
        document.getElementById('customfilterlabel' + this.elementId).innerText = "Select " + title;
        this._setOptions('customfilterselect' + this.elementId, names);
        this.onChange();
    }

    setDataset(dataset) {
        this._setOptions('datasetselect' + this.elementId, [dataset], dataset);
        this.onDatasetChange();
    }

    setXAxis(names, defaultName) {
        this._setOptions('xaxisselect' + this.elementId, names, defaultName);
        this.onChange();
        
    }

    setYAxis(names, defaultName) {
        this._setOptions('yaxisselect' + this.elementId, names, defaultName);
        this.onChange();
    }

    setColorings(names, defaultName) {
        this._setOptions('coloringselect' + this.elementId, names, defaultName);
        this.onChange();
    }

    getSelectedDataset() {
        return $('#datasetselect' + this.elementId).val();
    }

    getSelectedCustomFilter() {
        return $('#customfilterselect' + this.elementId).val();
    }

    getSelectedYAxis() {
        return $('#yaxisselect' + this.elementId).val();
    }

    getSelectedXAxis() {
        return $('#xaxisselect' + this.elementId).val();
    }

    getSelectedScale() {
        return $('#scaleselect' + this.elementId).val();
    }

    getSelectedColoring() {
        return $('#coloringselect' + this.elementId).val();
    }

    _hideSingleOptions(id, shouldHide) {
        let hidableParent = $("#" + id).parent().parent('.hidable');
        if(hidableParent) {
            if(shouldHide) {
                $(hidableParent).hide();
            } else {
                $(hidableParent).show(); 
            } 
        }
    }

    _setOptions(id, names, defaultName=undefined) {
        this._hideSingleOptions(id, names.length == 1);
        $("#" + id).empty();
        if(!defaultName && names.length > 0) defaultName = names[0];
        if(defaultName && !names.includes(defaultName)) names.unshift(defaultName);
        for (let n of names) $('#' + id).append('<option value="' + n + '">' + n + '</option>');

        $("#" + id).selectpicker("refresh");
        if(defaultName) $("#" + id).val(defaultName);
        $("#" + id).selectpicker("refresh");
        
    }

    _setOptionsToggle(id, obj) {
        this._hideSingleOptions(id, obj.length == 1);
        $("#" + id).empty();
        for (let o of obj) $('#' + id).append('<option value="' + o.name + '"' + (o.disabled ? 'disabled' : '') + '>' + o.name + '</option>');
        let defaultName = $("#" + id + ' option:not([disabled]):first').val();
        $("#" + id).selectpicker("refresh");
        if(defaultName) $("#" + id).val(defaultName);
        $("#" + id).selectpicker("refresh");
    }

    _generateHTML() {
        return /*html*/`
            <span class="hidable">
                <div id="datasetlabel${this.elementId}">Select Dataset</div>
                <select id="datasetselect${this.elementId}" class="selectpicker"></select>
                <br><br>
            </span>
            <span class="hidable" hidden>
                <div id="customfilterlabel${this.elementId}"></div>
                <select id="customfilterselect${this.elementId}" class="selectpicker"></select>
                <br><br>
            </span>
            <span class="hidable">
                <div>Select ${this.yAxisAlias}</div>
                <select id="yaxisselect${this.elementId}" class="selectpicker">
                </select>
                <br><br>
            </span>
            <span class="hidable">
                <div>Select ${this.xAxisAlias}</div>
                <select id="xaxisselect${this.elementId}" class="selectpicker">
                </select>
                <br><br>
            </span>
            <span class="hidable">
                <div>Select Scale</div>
                <select id="scaleselect${this.elementId}" class="selectpicker">
                    <option>Linear</option>
                    <option>Log e</option>
                    <option>Log 10</option>
                </select>
            <br><br>
            <div>Select ${this.coloringVariableAlias}</div>
            <select id="coloringselect${this.elementId}" class="selectpicker">
            </select>
        `
    }
}