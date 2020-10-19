//D3 plot drawing only
class Plot {
    constructor(elementId, jitterWidth=50) {
        var self = this;

        self.elementId = elementId;
        self.x = undefined;
        self.y = undefined;
        self.cachedJitter = [];
        self.jitterWidth = jitterWidth;
        self.rangePad = 20;
        self.boxPadding = 10;

        // set the dimensions and margins of the graph
        self.margin = { top: 50, right: 100, bottom: 100, left: 80 };
        self.width = 800 - self.margin.left - self.margin.right
        self.height = 400 - self.margin.top - self.margin.bottom

        // append the svg object to the body of the page
        self.svg = d3.select("#" + self.elementId)
            .append("svg")
            .attr("width", self.width + self.margin.left + self.margin.right)
            .attr("height", self.height + self.margin.top + self.margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + self.margin.left + "," + self.margin.top + ")");
    }

    //Expects [{x, y, z=undefined}...] where x and y are numeric, z is optional string for coloring
    updateScatter(data, xName, yName, title = "") {
        var self = this;
        self._update(data, xName, yName, title);

        // Show the X scale
        self.x = d3.scaleLinear()
            .range([self.rangePad, self.width-self.rangePad])
            .domain(data.length == 1 ? [0, 2*data[0].x] : d3.extent(data, d => d.y))
        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))

        var pointColorScale;
        if (data[0].z) {
            let categoriesZ = self._getCategories(data, d=>d.z)

            pointColorScale = d3.scaleOrdinal()
                .domain(data.map(d => d.z))
                .range(colorbrewer["Paired"][Math.max(3, categoriesZ.length)]);

            var legend = self.svg.selectAll("legend")
                .data(categoriesZ)
                .enter()
                .append("g")
                .attr("transform", function (d, i) { return "translate(" + (self.width + 20) + "," + ((28 * i)) + ")"; });

            legend.append("circle")
                .style("fill", function (d, i) { return pointColorScale(d); })
                .attr("stroke", "black")
                .attr("r", 8)

            legend.append("text")
                .attr("text-anchor", "start")
                .attr("font-size", "10px")
                .attr("x", 20)
                .text(function (d) { return d });
        }

        // Show scatter plot
        self.svg.selectAll("indPoints")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return (self.x(d.x)) })
            .attr("cy", function (d) { return (self.y(d.y)) })
            .attr("r", 4)
            .style("fill", function (d) { return data[0].z ? (pointColorScale(d.z)) : "#2b6da4"})
            .attr("stroke", "black")
    }

    //Expects [{x, y}...] where x is string and y is numeric
    updateBox(data, xName, yName, title = "") {
        var self = this;
        self._update(data, xName, yName, title);

        while(self.cachedJitter.length < data.length) self.cachedJitter.push(- self.jitterWidth / 2 + Math.random() * self.jitterWidth);

        // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
        var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
            .key(function (d) { return d.x; })
            .rollup(function (d) {
                let q1 = d3.quantile(d.map(function (g) { return g.y; }).sort(d3.ascending), .25)
                let median = d3.quantile(d.map(function (g) { return g.y; }).sort(d3.ascending), .5)
                let q3 = d3.quantile(d.map(function (g) { return g.y; }).sort(d3.ascending), .75)
                let interQuantileRange = q3 - q1
                let min = q1 - 1.5 * interQuantileRange
                let max = q3 + 1.5 * interQuantileRange
                return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
            })
            .entries(data)

        let categoriesX = self._getCategories(data, d=>d.x)

        // Show the X scale
        self.x = d3.scaleBand()
            .range([self.rangePad, self.width-self.rangePad])
            .domain(categoriesX)
            .paddingInner(1)
            .paddingOuter(.5)

        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))

        // Show the main vertical line
        self.svg.selectAll("vertLines")
            .data(sumstat)
            .enter()
            .append("line")
            .attr("x1", function (d) { return (self.x(d.key)) })
            .attr("x2", function (d) { return (self.x(d.key)) })
            .attr("y1", function (d) { return (Math.min(self.height, self.y(d.value.min))) })
            .attr("y2", function (d) { return (self.y(d.value.max)) })
            .attr("stroke", "black")
            .style("width", 40)

        // rectangle for the main box
        var boxWidth = (self.width - 2*self.rangePad) / categoriesX.length - self.boxPadding;
        self.svg.selectAll("boxes")
            .data(sumstat)
            .enter()
            .append("rect")
            .attr("x", function (d) { return (self.x(d.key) - boxWidth / 2) })
            .attr("y", function (d) { return (self.y(d.value.q3)) })
            .attr("height", function (d) { return (self.y(d.value.q1) - self.y(d.value.q3)) })
            .attr("width", boxWidth)
            .attr("stroke", "black")
            .style("fill", "#2b6da4")//#69b3a2

        // Show the median
        self.svg.selectAll("medianLines")
            .data(sumstat)
            .enter()
            .append("line")
            .attr("x1", function (d) { return (self.x(d.key) - boxWidth / 2) })
            .attr("x2", function (d) { return (self.x(d.key) + boxWidth / 2) })
            .attr("y1", function (d) { return (self.y(d.value.median)) })
            .attr("y2", function (d) { return (self.y(d.value.median)) })
            .attr("stroke", "black")
            .style("width", 80)

        // Add individual points
        self.svg.selectAll("indPoints")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d, i) { return self.x(d.x) + (data.length <=1 ? 0 : self.cachedJitter[i]) })
            .attr("cy", function (d) { return self.y(d.y) })
            .attr("r", 4)
            .style("fill", "white")
            .attr("stroke", "black")
    }

    //Internal function for shared axis creation
    _update(data, xName, yName, title = "") {
        var self = this;

        //Clear graph already exists
        d3.selectAll("#" + self.elementId + " > svg > g > *").remove();

        //Create y scale
        console.log();
        self.y = d3.scaleLinear()
            .domain(data.length == 1 ? [0, 2*data[0].y] : d3.extent(data, d => d.y))
            .range([self.height-self.rangePad, self.rangePad])

        self.svg.append("g").call(d3.axisLeft(self.y))

        // Show the Y label
        self.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - self.margin.left)
            .attr("x", 0 - (self.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yName);

        // Show the X label
        self.svg.append("text")
            .attr("transform", "translate(" + (self.width / 2) + " ," + (self.height + self.margin.top) + ")")
            .style("text-anchor", "middle")
            .text(xName);

        // Show title
        self.svg.append("text")             
        .attr("transform",
                "translate(" + (self.width/2) + " ," + 
                           -self.margin.top/2 + ")")
        .style("text-anchor", "middle")
        .text(title);
    }

    _getCategories(data, func) {
        let ret = {}
        for (let d of data) ret[func(d)] = true
        return Object.keys(ret);
    }
}