class PanelBoxScatter {
    constructor(plotElementId, controlsElementId, data, plotWidth) {
        var self = this;
        this.elementId = plotElementId;
        this.metaIndexObj = data;

        document.getElementById(controlsElementId).innerHTML = this._generateControlsHTML();

        // set the dimensions and margins of the graph
        this.margin = { top: 50, right: 100, bottom: 100, left: 80 }
        this.width = plotWidth - self.margin.left - self.margin.right,
        this.height = 400 - self.margin.top - self.margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select("#" + this.elementId)
            .append("svg")
            .attr("width", self.width + self.margin.left + self.margin.right)
            .attr("height", self.height + self.margin.top + self.margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + self.margin.left + "," + self.margin.top + ")");

        $('#datasetSelect' + this.elementId).on('change', () => self.updateDataset());
        $('#measureSelect' + this.elementId).on('change', () => self.updateMeasure());
        $('#metadataSelect' + this.elementId).on('change', () => self.updateGraph());
        $('#scaleSelect' + this.elementId).on('change', () => self.updateGraph());
        $('#metadataSelect2' + this.elementId).on('change', () => self.updateGraph());
        $('#zscore' + this.elementId).on('change', () => self.updateGraph());

        this.cachedJitter = [];

        this.updateAvailableDatasets();
    }

    updateAvailableDatasets() {
        $('#datasetSelect' + this.elementId).empty();
        //Set dataset selection dropdown options here
        for (let k of Object.keys(this.metaIndexObj)) {
            if(this.detailsObj) {
                let meta_index = this.detailsObj[this.metaIndexObj[k].db_index_col];
                if(meta_index <= 0) {
                    $('#datasetSelect' + this.elementId).append('<option value="' + k + '" disabled>' + k + '</option>');
                    continue;
                }
            }
            $('#datasetSelect' + this.elementId).append('<option value="' + k + '">' + k + '</option>');
        }

        $('#datasetSelect option:not([disabled]):first').addClass('highlight');
        this.updateDataset();
    }

    updateDataset() {
        this.currentDataset = $('#datasetSelect' + this.elementId).find(":selected").text();
        if(!this.currentDataset) return;

        this.metadata = this.metaIndexObj[this.currentDataset].metadataObj;

        //Reset measure dropdown
        $('#measureSelect' + this.elementId).empty();
        for (let k of Object.keys(this.metaIndexObj[this.currentDataset].matrices)) {
            if(k.endsWith("Obj")) continue;
            $('#measureSelect' + this.elementId).append('<option value="' + k + '">' + k + '</option>');
        }
        $('#measureSelect' + this.elementId).prop('selectedIndex', 0);

        //Reset metadata dropdown
        $('#metadataSelect' + this.elementId).empty();
        for(let k of this.metadata[0].slice(1)) {
            $('#metadataSelect' + this.elementId).append('<option value="' + k + '">' + k + '</option>');
        }
        $('#metadataSelect' + this.elementId).prop('selectedIndex', 0);

        //Reset metadata2 dropdown
        $('#metadataSelect2' + this.elementId).empty();
        $('#metadataSelect2' + this.elementId).append('<option value="None">None</option>');
        for(let i=1; i<this.metadata[0].length; ++i) {
            if ((typeof this.metadata[1][i] === 'string' || this.metadata[1][i] instanceof String) && this.metadata[0][i] != $('#metadataSelect' + this.elementId).find(":selected").text()) {
                $('#metadataSelect2' + this.elementId).append('<option value="' + this.metadata[0][i] + '">' + this.metadata[0][i] + '</option>');
            }
        }
        $('#metadataSelect2' + this.elementId).prop('selectedIndex', 0);
        this.updateMeasure();
    }

    updateMeasure() {
        this.currentMeasure = $('#measureSelect' + this.elementId).find(":selected").text();
        this.data = this.metaIndexObj[this.currentDataset].matrices[this.currentMeasure + "Obj"];
        this.updateCircID();
    }

    setCircID(detailsObj, success, failure) {
        this.detailsObj = detailsObj;
        this.updateAvailableDatasets();

        if(!this.currentDataset) failure();
        else {
            success();
            this.updateCircID();
        }
    }

    updateCircID() {
        if(this.detailsObj) {
            let meta_index = this.detailsObj[this.metaIndexObj[this.currentDataset].db_index_col];

            //Get data specific to this circrna
            this.plotData = []
            if (meta_index >= 0) {
                //Get all samples containing this circrna
                let circsamples = this.data[meta_index + 1];
                for (let i = 1; i < circsamples.length; ++i) {
                    if (circsamples[i] > 0) {
                        //Find entry in samples table
                        let ret = { Expression: circsamples[i] }
                        for (let j = 1; j < this.metadata[0].length; ++j) {
                            if(this.metadata[i]) {
                                ret[this.metadata[0][j]] = this.metadata[i][j]
                            }
                        }
                        this.plotData.push(ret);
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
        var svg = this.svg;
        var data = this.plotData;
        var yName = "Expression";
        var jitterWidth = 50;

        let currMeasure = $('#measureSelect' + this.elementId).find(":selected").text();
        if($('#zscore' + this.elementId).prop('checked')) {
            let sd = d3.deviation(data, d => d[yName]);
            let mean = d3.mean(data, d => d[yName]);
            $('#scaleSelect' + this.elementId).prop('disabled', true);
            $('#scaleSelect' + this.elementId).prop('selectedIndex', 0);
            for(let i=0; i<data.length; ++i) data[i].plotValue = (data[i][yName] - mean) / sd;
        } else { //CPM/TPM etc
            for(let d of data) d.plotValue = d[yName];
            $('#scaleSelect' + this.elementId).prop('disabled', false);
        }

        let categoryName = $('#metadataSelect' + this.elementId).find(":selected").text();
        let categoryName2 = $('#metadataSelect2' + this.elementId).find(":selected").text();

        $('#metadataSelect2' + this.elementId).prop('disabled', (typeof data[0][categoryName] === 'string' || data[0][categoryName] instanceof String));

        let categories = {}
        for (let d of data) categories[d[categoryName]] = true
        let categoryNames = Object.keys(categories);

        let currScale = $('#scaleSelect' + this.elementId).find(":selected").text();

        if(currScale == "Log e") {
            for(let i=0; i<data.length; ++i) data[i].plotValue = Math.log(0.1 + data[i].plotValue);
        } else if(currScale == "Log 10"){
            for(let i=0; i<data.length; ++i) data[i].plotValue = Math.log10(0.1 + data[i].plotValue);
        }

        var y = d3.scaleLinear()
                .domain(data.length == 1 ? [data[0].plotValue/2, data[0].plotValue*2 + 0.1] : d3.extent(data, d => d.plotValue))
                .range([self.height, 0])
            svg.append("g")
                .call(d3.axisLeft(y))

        // Show the Y label
        svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - self.margin.left)
        .attr("x",0 - (self.height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(currMeasure + (currScale == "Linear" ? "" : " (" + currScale + ")"));   
        
        // Show the X label
        svg.append("text")             
        .attr("transform",
                "translate(" + (self.width/2) + " ," + 
                            (self.height + self.margin.top) + ")")
        .style("text-anchor", "middle")
        .text(categoryName);

        let myVar = data[0][categoryName];
        if (typeof myVar === 'string' || myVar instanceof String) {

            while(this.cachedJitter.length < data.length) this.cachedJitter.push(- jitterWidth / 2 + Math.random() * jitterWidth)

            // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
            var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
                .key(function (d) { return d[categoryName]; })
                .rollup(function (d) {
                    let q1 = d3.quantile(d.map(function (g) { return g.plotValue; }).sort(d3.ascending), .25)
                    let median = d3.quantile(d.map(function (g) { return g.plotValue; }).sort(d3.ascending), .5)
                    let q3 = d3.quantile(d.map(function (g) { return g.plotValue; }).sort(d3.ascending), .75)
                    let interQuantileRange = q3 - q1
                    let min = q1 - 1.5 * interQuantileRange
                    let max = q3 + 1.5 * interQuantileRange
                    return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
                })
                .entries(data)

            // Show the X scale
            var x = d3.scaleBand()
                .range([0, self.width])
                .domain(categoryNames)
                .paddingInner(1)
                .paddingOuter(.5)
            svg.append("g")
                .attr("transform", "translate(0," + self.height + ")")
                .call(d3.axisBottom(x))

            // Show the main vertical line
            svg.selectAll("vertLines")
                .data(sumstat)
                .enter()
                .append("line")
                .attr("x1", function (d) { return (x(d.key)) })
                .attr("x2", function (d) { return (x(d.key)) })
                .attr("y1", function (d) { return (Math.min(self.height, y(d.value.min))) })
                .attr("y2", function (d) { return (y(d.value.max)) })
                .attr("stroke", "black")
                .style("width", 40)

            // rectangle for the main box
            var boxPadding = 10;
            var boxWidth = self.width / categoryNames.length - boxPadding;
            svg.selectAll("boxes")
                .data(sumstat)
                .enter()
                .append("rect")
                .attr("x", function (d) { return (x(d.key) - boxWidth / 2) })
                .attr("y", function (d) { return (y(d.value.q3)) })
                .attr("height", function (d) { return (y(d.value.q1) - y(d.value.q3)) })
                .attr("width", boxWidth)
                .attr("stroke", "black")
                .style("fill", "#69b3a2")

            // Show the median
            svg.selectAll("medianLines")
                .data(sumstat)
                .enter()
                .append("line")
                .attr("x1", function (d) { return (x(d.key) - boxWidth / 2) })
                .attr("x2", function (d) { return (x(d.key) + boxWidth / 2) })
                .attr("y1", function (d) { return (y(d.value.median)) })
                .attr("y2", function (d) { return (y(d.value.median)) })
                .attr("stroke", "black")
                .style("width", 80)

            // Add individual points with jitter
            svg.selectAll("indPoints")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", function(d, i) {return (x(d[categoryName]) + (data.length <=1 ? 0 : self.cachedJitter[i]))})
                .attr("cy", function (d) { return (y(d.plotValue)) })
                .attr("r", 4)
                .style("fill", "white")
                .attr("stroke", "black")
        } else {
            // Show the X scale
            var x = d3.scaleLinear()
                .range([0, self.width])
                .domain(data.length == 1 ? [data[0][categoryName]/2, data[0][categoryName]*2 + 0.1] : d3.extent(data, d => d[categoryName]))
            svg.append("g")
                .attr("transform", "translate(0," + self.height + ")")
                .call(d3.axisBottom(x))

            var pointColorScale = undefined;

            if(categoryName2 != "None") {
                let categories2 = {}
                for (let d of data) categories2[d[categoryName2]] = true
                let categoryNames2 = Object.keys(categories2);

                
                pointColorScale = d3.scaleOrdinal()
                .domain(data.map(d => d[categoryName2]))
                .range(colorbrewer["RdBu"][Math.max(3, categoryNames2.length)]);


                var legend = svg.selectAll("legend")
                    .data(categoryNames2)
                    .enter()
                    .append("g")
                    .attr("transform", function(d, i) { return "translate(" + (self.width + 20) + "," + ((28 * i)) + ")"; });

                legend.append("circle")
                    .style("fill", function (d, i){ return pointColorScale(d); })
                    .attr("stroke", "black")
                    .attr("r", 8)

                legend.append("text")
                    .attr("text-anchor", "start")
                    .attr("font-size", "10px")
                    .attr("x", 20)
                    .text(function(d){return d});  
            }

            // Show scatter plot
            svg.selectAll("indPoints")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", function (d) { return (x(d[categoryName])) })
                .attr("cy", function (d) { return (y(d.plotValue)) })
                .attr("r", 4)
                .style("fill", function (d) { return categoryName2 == "None" ? "white" : (pointColorScale(d[categoryName2])) })
                .attr("stroke", "black")
        }
    }

    _generateControlsHTML() {
        return /*html*/`
            <div>Select Dataset</div>
            <select id="datasetSelect${this.elementId}" class="selectpicker">
            </select>
            <br><br>
            <div>Select Measure</div>
            <select id="measureSelect${this.elementId}" class="selectpicker">
            </select>
            <br><br>
            <input type="checkbox" id="zscore${this.elementId}" name="zscore" value="zscore">
            <label for="zscore${this.elementId}">ZScore Transformation</label>
            <br><br>
            <div>Select Metadata Variable</div>
            <select id="metadataSelect${this.elementId}" class="selectpicker">
            </select>
            <br><br>
            <div>Select Scale</div>
            <select id="scaleSelect${this.elementId}" class="selectpicker">
                <option>Linear</option>
                <option>Log e</option>
                <option>Log 10</option>
            </select>
            <br><br>
            <div>Select Second Metadata Variable</div>
            <select id="metadataSelect2${this.elementId}" class="selectpicker">
            </select>
        `
    }
}