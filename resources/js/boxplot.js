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

        // Read the data and compute summary statistics for each specie
        var self = this;

        $('#metadataSelect').on('change', function () {
            self.setData(self.data);
        });

        $('#scaleSelect').on('change', function () {
            self.setData(self.data);
        });

        $('#measureSelect').on('change', function () {
            self.setData(self.data);
        });

        this.cachedJitter = [];
    }

    setData(data, yName = "Expression", resetHeadings = false) {
        var svg = this.svg;
        var self = this;

        // set the dimensions and margins of the graph
        var margin = { top: 10, right: 30, bottom: 100, left: 100 },
            width = 650 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        if (!this.data) resetHeadings = true;
        else d3.selectAll("#myDistroChart > svg > g > *").remove();

        this.data = data;
        var jitterWidth = 50;

        let currMeasure = $('#measureSelect').find(":selected").text();
        if(currMeasure == "ZScore") {
            let sd = d3.deviation(data, d => d[yName]);
            let mean = d3.mean(data, d => d[yName]);
            $('#scaleSelect').prop('disabled', true);
            $('#scaleSelect').prop('selectedIndex', 0);
            for(let i=0; i<data.length; ++i) data[i].plotValue = (data[i][yName] - mean) / sd;
        } else { //CPM/TPM etc
            for(let d of data) d.plotValue = d[yName];
            $('#scaleSelect').prop('disabled', false);
        }

        if (resetHeadings) {
            $('#metadataSelect').empty();
            for (let k of Object.keys(data[0])) {
                if (k != yName && k != "plotValue") {
                    $('#metadataSelect').append('<option value="' + k + '">' + k + '</option>');
                }
            }
            $('#metadataSelect').prop('selectedIndex', 2);
        }

        let categoryName = $('#metadataSelect').find(":selected").text();

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

            // Show scatter plot
            svg.selectAll("indPoints")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", function (d) { return (x(d[categoryName])) })
                .attr("cy", function (d) { return (y(d.plotValue)) })
                .attr("r", 4)
                .style("fill", "white")
                .attr("stroke", "black")
        }
    }

    _generateHTML() {
        return /*html*/`
        <div class="row">
            <div class="col-md-2">
                <div>Select Dataset</div>
                <select class="selectpicker">
                    <option>Gokool</option>
                </select>
                <br><br>
                <div>Select Metadata Variable</div>
                <select id="metadataSelect" class="selectpicker">
                    <option>Detailed.Diagnosis</option>
                    <option>Age</option>
                    <option>Sex</option>
                </select>
                <br><br>
                <div>Select Expression Type</div>
                <select id="measureSelect" class="selectpicker">
                    <option>CPM</option>
                    <option>ZScore</option>
                </select>
                <br><br>
                <div>Select Scale</div>
                <select id="scaleSelect" class="selectpicker">
                    <option>Linear</option>
                    <option>Log e</option>
                    <option>Log 10</option>
                </select>
            </div>
            <div class="col-md-6 col-md-offset-1">
                <div class="chart-wrapper" id="myDistroChart"></div>
            </div>
        </div>
        `
    }
}