class Boxplot {
    constructor(element) {
        element.innerHTML = this._generateHTML();

        // set the dimensions and margins of the graph
        var margin = { top: 10, right: 30, bottom: 100, left: 100 },
            width = 650 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select("#myDistroChart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        var self = this;
        $('#datasetSelect').on('change', () => self.updateDataset());
        $('#measureSelect').on('change', () => self.updateMeasure());
        $('#metadataSelect').on('change', () => self.updateGraph());
        $('#scaleSelect').on('change', () => self.updateGraph());
        $('#metadataSelect2').on('change', () => self.updateGraph());
        $('#zscore').on('change', () => self.updateGraph());

        this.cachedJitter = [];
    }

    async initData() {
        let self = this;
        let dir = window.location.href + "resources/data/";

        //Inline function to parse CSV files
        function loadCSV(path) {
            return new Promise(function (complete, error) {
                fetch(path).then(r => r.blob()).then(function (file) {
                    Papa.parse(file, {
                        dynamicTyping: true,
                        complete: function (results) {
                            complete(results.data)
                        }
                    });
                });
            });
        }

        await fetch(dir + "_meta.json").then(r => r.json()).then(async function (obj) {
            self.metaIndexObj = obj;

            //Download all files
            let promises = [];
            for(let entry of Object.keys(obj)) {
                console.log(entry);
                promises.push(loadCSV(dir + obj[entry].metadata).then(o => obj[entry].metadataObj = o));
                for(let matrix of Object.keys(obj[entry].matrices)) {
                    console.log(matrix);
                    promises.push(loadCSV(dir + obj[entry].matrices[matrix]).then(o => obj[entry].matrices[(matrix + "Obj")] = o));
                }
            }
            await Promise.all(promises);

            //Set dataset selection dropdown options here
            for (let k of Object.keys(obj)) {
                $('#datasetSelect').append('<option value="' + k + '">' + k + '</option>');
            }
            $('#datasetSelect').prop('selectedIndex', 0);
            self.updateDataset();
        });
    }

    updateDataset() {
        this.currentDataset = $('#datasetSelect').find(":selected").text();
        this.metadata = this.metaIndexObj[this.currentDataset].metadataObj;

        //Reset measure dropdown
        $('#measureSelect').empty();
        for (let k of Object.keys(this.metaIndexObj[this.currentDataset].matrices)) {
            if(k.endsWith("Obj")) continue;
            $('#measureSelect').append('<option value="' + k + '">' + k + '</option>');
        }
        $('#measureSelect').prop('selectedIndex', 0);

        //Reset metadata dropdown
        $('#metadataSelect').empty();
        for(let k of this.metadata[0].slice(1)) {
            $('#metadataSelect').append('<option value="' + k + '">' + k + '</option>');
        }
        $('#metadataSelect').prop('selectedIndex', 0);

        //Reset metadata2 dropdown
        $('#metadataSelect2').empty();
        $('#metadataSelect2').append('<option value="None">None</option>');
        for(let i=1; i<this.metadata[0].length; ++i) {
            if ((typeof this.metadata[1][i] === 'string' || this.metadata[1][i] instanceof String) && this.metadata[0][i] != $('#metadataSelect').find(":selected").text()) {
                $('#metadataSelect2').append('<option value="' + this.metadata[0][i] + '">' + this.metadata[0][i] + '</option>');
            }
        }
        $('#metadataSelect2').prop('selectedIndex', 0);
        this.updateMeasure();
    }

    updateMeasure() {
        this.currentMeasure = $('#measureSelect').find(":selected").text();
        this.data = this.metaIndexObj[this.currentDataset].matrices[this.currentMeasure + "Obj"];
        this.updateCircID();
    }

    setCircID(detailsObj) {
        this.detailsObj = detailsObj;
        this.updateCircID();
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
                            ret[this.metadata[0][j]] = this.metadata[i][j]
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
        d3.selectAll("#myDistroChart > svg > g > *").remove();
    }

    createGraph() {
        var svg = this.svg;
        var self = this;
        var data = this.plotData;
        var yName = "Expression";

        

        // set the dimensions and margins of the graph
        var margin = { top: 10, right: 30, bottom: 100, left: 100 },
            width = 650 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        
        var jitterWidth = 50;

        let currMeasure = $('#measureSelect').find(":selected").text();
        if($('#zscore').prop('checked')) {
            let sd = d3.deviation(data, d => d[yName]);
            let mean = d3.mean(data, d => d[yName]);
            $('#scaleSelect').prop('disabled', true);
            $('#scaleSelect').prop('selectedIndex', 0);
            for(let i=0; i<data.length; ++i) data[i].plotValue = (data[i][yName] - mean) / sd;
        } else { //CPM/TPM etc
            for(let d of data) d.plotValue = d[yName];
            $('#scaleSelect').prop('disabled', false);
        }

        let categoryName = $('#metadataSelect').find(":selected").text();
        let categoryName2 = $('#metadataSelect2').find(":selected").text();

        console.log(data);
        console.log(categoryName);

        $('#metadataSelect2').prop('disabled', (typeof data[0][categoryName] === 'string' || data[0][categoryName] instanceof String));

        let categories = {}
        for (let d of data) categories[d[categoryName]] = true
        let categoryNames = Object.keys(categories);

        let currScale = $('#scaleSelect').find(":selected").text();

        if(currScale == "Log e") {
            for(let i=0; i<data.length; ++i) data[i].plotValue = Math.log(0.1 + data[i].plotValue);
        } else if(currScale == "Log 10"){
            for(let i=0; i<data.length; ++i) data[i].plotValue = Math.log10(0.1 + data[i].plotValue);
        }

        var y = d3.scaleLinear()
                .domain(d3.extent(data, d => d.plotValue))
                .range([height, 0])
            svg.append("g")
                .call(d3.axisLeft(y))

        // Show the Y label
        svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(currMeasure + (currScale == "Linear" ? "" : " (" + currScale + ")"));   
        
        // Show the X label
        svg.append("text")             
        .attr("transform",
                "translate(" + (width/2) + " ," + 
                            (height + margin.top + margin.bottom/2) + ")")
        .style("text-anchor", "middle")
        .text(categoryName);

        let myVar = data[0][categoryName];
        if (typeof myVar === 'string' || myVar instanceof String) {

            while(this.cachedJitter.length < this.data.length) this.cachedJitter.push(- jitterWidth / 2 + Math.random() * jitterWidth)

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
                .range([0, width])
                .domain(categoryNames)
                .paddingInner(1)
                .paddingOuter(.5)
            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x))

            // Show the main vertical line
            svg.selectAll("vertLines")
                .data(sumstat)
                .enter()
                .append("line")
                .attr("x1", function (d) { return (x(d.key)) })
                .attr("x2", function (d) { return (x(d.key)) })
                .attr("y1", function (d) { return (Math.min(height, y(d.value.min))) })
                .attr("y2", function (d) { return (y(d.value.max)) })
                .attr("stroke", "black")
                .style("width", 40)

            // rectangle for the main box
            var boxPadding = 10;
            var boxWidth = width / categoryNames.length - boxPadding;
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
                .attr("cx", function(d, i) {return (x(d[categoryName]) + self.cachedJitter[i])})
                .attr("cy", function (d) { return (y(d.plotValue)) })
                .attr("r", 4)
                .style("fill", "white")
                .attr("stroke", "black")
        } else {
            // Show the X scale
            var x = d3.scaleLinear()
                .range([0, width])
                .domain(d3.extent(data, d => d[categoryName]))
            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x))

            var pointColorScale = d3.scaleOrdinal()
                .domain(data.map(d => d[categoryName2]))
                .range(colorbrewer.RdBu[9]);

            // Show scatter plot
            console.log(categoryName2);
            console.log(pointColorScale(data[0][categoryName2]));
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

    _generateHTML() {
        return /*html*/`
        <div class="row">
            <div class="col-md-2">
                <div>Select Dataset</div>
                <select id="datasetSelect" class="selectpicker">
                </select>
                <br><br>
                <div>Select Measure</div>
                <select id="measureSelect" class="selectpicker">
                </select>
                <br><br>
                <input type="checkbox" id="zscore" name="zscore" value="zscore">
                <label for="zscore">ZScore Transformation</label>
                <br><br>
                <div>Select Metadata Variable</div>
                <select id="metadataSelect" class="selectpicker">
                </select>
                <br><br>
                <div>Select Scale</div>
                <select id="scaleSelect" class="selectpicker">
                    <option>Linear</option>
                    <option>Log e</option>
                    <option>Log 10</option>
                </select>
                <br><br>
                <div>Select Second Metadata Variable</div>
                <select id="metadataSelect2" class="selectpicker">
                </select>
            </div>
            <div class="col-md-6 col-md-offset-1">
                <div class="chart-wrapper" id="myDistroChart"></div>
            </div>
        </div>
        `
    }
}