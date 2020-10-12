class PanelScatter {
    constructor(plotElementId, controlsElementId, data, plotWidth, title="") {
        var self = this;
        this.elementId = plotElementId;
        this.title = title;
        this.metaIndexObj = data;
        document.getElementById(controlsElementId).innerHTML = this._generateControlsHTML(controlsElementId);

        this.margin = { top: 50, right: 100, bottom: 100, left: 80 }
        this.width = plotWidth - self.margin.left - self.margin.right,
        this.height = 400 - self.margin.top - self.margin.bottom;

        this.svg = d3.select("#" + self.elementId)
            .append("svg")
            .attr("width", self.width + self.margin.left + self.margin.right)
            .attr("height", self.height + self.margin.top + self.margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + self.margin.left + "," + self.margin.top + ")");

        $('#measureSelect1' + self.elementId).on('change', () => self.updateMeasure());
        $('#measureSelect2' + self.elementId).on('change', () => self.updateMeasure());

        //TODO: There's only one dataset, hacky
        this.currentDataset = $('#datasetSelect' + self.elementId).find(":selected").text();
        this.metadata = this.metaIndexObj[this.currentDataset].metadataObj;

        //Reset measure dropdown
        for (let k of Object.keys(this.metaIndexObj[this.currentDataset].matrices)) {
            if(k.endsWith("Obj")) continue;
            $('#measureSelect1' + self.elementId).append('<option value="' + k + '">' + k + '</option>');
            $('#measureSelect2' + self.elementId).append('<option value="' + k + '">' + k + '</option>');
        }
        $('#measureSelect1' + self.elementId).prop('selectedIndex', 0);
        $('#measureSelect2' + self.elementId).prop('selectedIndex', 1);
        this.updateMeasure();
    }

    updateMeasure() {
        this.currMeasure1 = $('#measureSelect1' + this.elementId).find(":selected").text();
        this.data1 = this.metaIndexObj[this.currentDataset].matrices[this.currMeasure1 + "Obj"];

        this.currMeasure2 = $('#measureSelect2' + this.elementId).find(":selected").text();
        this.data2 = this.metaIndexObj[this.currentDataset].matrices[this.currMeasure2 + "Obj"];

        this.updateCircID();
    }

    setCircID(detailsObj, success, failure) {
        this.detailsObj = detailsObj;

        if(this.detailsObj[this.metaIndexObj[this.currentDataset].db_index_col] <= 0) failure();
        else success();

        this.updateCircID();
    }

    updateCircID() {
        if(this.detailsObj) {
            let meta_index = this.detailsObj[this.metaIndexObj[this.currentDataset].db_index_col];

            //Get data specific to this circrna
            this.plotData = []
            if (meta_index >= 0) {
                //Get all samples containing this circrna
                let circsamples1 = this.data1[meta_index + 1];
                let circsamples2 = this.data2[meta_index + 1];
                for (let i = 1; i < circsamples1.length; ++i) {
                    if(circsamples1[i] > 0 || circsamples2[i] > 0) {
                        this.plotData.push({Expression1: circsamples1[i], Expression2: circsamples2[i]});
                    }
                }
            } else {
                this.plotData = undefined;
            }
        }
        this.updateGraph();
    }

    updateGraph() {
        this.clearGraph();
        if(this.plotData) {
            this.createGraph();
        }
    }

    clearGraph() {
        d3.selectAll("#" + this.elementId + " > svg > g > *").remove();
    }

    createGraph() {
        var self = this;

        var y = d3.scaleLinear()
                .range([self.height, 0])
                .domain(d3.extent(self.plotData, d => d.Expression1))
                
        this.svg.append("g")
                .call(d3.axisLeft(y))

        // Show title
        this.svg.append("text")             
        .attr("transform",
                "translate(" + (self.width/2) + " ," + 
                           -self.margin.top/2 + ")")
        .style("text-anchor", "middle")
        .text(self.title);

        // Show the Y label
        this.svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - self.margin.left)
        .attr("x",0 - (self.height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(self.currMeasure1);   
        
        // Show the X label
        this.svg.append("text")             
        .attr("transform",
                "translate(" + (self.width/2) + " ," + 
                            (self.height + self.margin.top) + ")")
        .style("text-anchor", "middle")
        .text(self.currMeasure2);

        // Show the X scale
        var x = d3.scaleLinear()
            .range([0, self.width])
            .domain(d3.extent(self.plotData, d => d.Expression2))
        this.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(x))

        // Show scatter plot
        this.svg.selectAll("indPoints")
            .data(self.plotData)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return (x(d.Expression2)) })
            .attr("cy", function (d) { return (y(d.Expression1)) })
            .attr("r", 4)
            .style("fill", "white")
            .attr("stroke", "black");
    }

    _generateControlsHTML() {
        return /*html*/`
        <div>Select Dataset</div>
        <select id="datasetSelect${this.elementId}" class="selectpicker">
            <option>gokool</option>
        </select>
        <br><br>
        <div>Select Y Axis</div>
        <select id="measureSelect1${this.elementId}" class="selectpicker">
        </select>
        <br><br>
        <div>Select X Axis</div>
        <select id="measureSelect2${this.elementId}" class="selectpicker">
        </select>
        `
    }
}