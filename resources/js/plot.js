//D3 plot drawing only
class Plot {
    constructor(elementId, jitterWidth = 50) {
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

    removeScatterHighlight() {
        var self = this;
        if(self.highlight) {
            self.highlight.remove();
            self.highlight = undefined;
        }
    }

    addScatterHighlight(point) {
        var self = this;
        self.highlight = self.svg.selectAll("highlight")
            .data([point])
            .enter()
            .append("circle")
            .attr("cx", function (d) { return (self.x(d.x)) })
            .attr("cy", function (d) { return (self.y(d.y)) })
            .attr("r", 8)
            .style("fill", "#ff9433" )
            .attr("stroke", "white")
    }

    //Expects [{x, y, z=undefined}...] where x and y are numeric, z is optional string for coloring
    updateScatter(data, xName, yName, title = "") {
        var self = this;
        self._update(data, xName, yName, title);

        // Show the X scale
        self.x = d3.scaleLinear()
            .range([self.rangePad, self.width - self.rangePad])
            .domain(data.length == 1 ? [0, 2 * data[0].x] : d3.extent(data, d => d.x))
        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))

        var pointColorScale = undefined;
        var categoriesZ = undefined;
        if (data[0].z) {
            categoriesZ = self._getCategories(data, d => d.z)
            let colors = colorbrewer["Paired"][Math.max(3, categoriesZ.length)];
            if (colors) {
                pointColorScale = d3.scaleOrdinal()
                    .domain(data.map(d => d.z))
                    .range(colors);

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
        }

        // Show scatter plot
        self.svg.selectAll("indPoints")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return (self.x(d.x)) })
            .attr("cy", function (d) { return (self.y(d.y)) })
            .attr("r", 4)
            .style("fill", function (d) { return pointColorScale ? (pointColorScale(d.z)) : "#2b6da4" })
            .on("mouseover", (d) => self._tooltipMouseOver(d))
            .on("mouseleave", (d) => self._tooltipMouseLeave(d))

        if (data[0].z && !pointColorScale) {
            window.alert("Couldn't display " + categoriesZ.length + " categories");
        }

        self._addTooltip();
    }

    //Expects [{x, y}...] where x is string and y is numeric
    updateBox(data, xName, yName, title = "") {
        var self = this;
        self._update(data, xName, yName, title);

        while (self.cachedJitter.length < data.length) self.cachedJitter.push(- self.jitterWidth / 2 + Math.random() * self.jitterWidth);

        let categoriesX = self._getCategories(data, d => d.x)
        let multiplePerCategory = (data.length > categoriesX.length);

        // Show the X scale
        self.x = d3.scaleBand()
            .range([self.rangePad, self.width - self.rangePad])
            .domain(categoriesX)
            .paddingInner(1)
            .paddingOuter(.5)

        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))

        if(multiplePerCategory) {
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
            var boxWidth = (self.width - 2 * self.rangePad) / categoriesX.length - self.boxPadding;
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
        }

        // Add individual points
        self.svg.selectAll("indPoints")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d, i) { return self.x(d.x) + (multiplePerCategory ? self.cachedJitter[i] : 0) }) //TODO per-category jitter/no jitter
            .attr("cy", function (d) { return self.y(d.y) })
            .attr("r", 4)
            .style("fill", multiplePerCategory ? "white" : "#2b6da4")
            .attr("stroke", "black")
            .on("mouseover", (d) => self._tooltipMouseOver(d))
            .on("mouseleave", (d) => self._tooltipMouseLeave(d))

        self._addTooltip();
    }

    //Internal function for shared axis creation
    _update(data, xName, yName, title = "") {
        var self = this;

        //Clear graph already exists
        d3.selectAll("#" + self.elementId + " > svg > g > *").remove();

        //Create y scale
        self.y = d3.scaleLinear()
            .domain(data.length == 1 ? [0, 2 * data[0].y] : d3.extent(data, d => d.y))
            .range([self.height - self.rangePad, self.rangePad])

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
                "translate(" + (self.width / 2) + " ," +
                -self.margin.top / 2 + ")")
            .style("text-anchor", "middle")
            .text(title);
    }

    _addTooltip() {
        //Create tooltip
        var self = this;
        self.tooltip = self.svg.append("text")
            .attr("fill-opacity", 0)
            .attr("font-size", "12px")
            .style("text-anchor", "middle")
    }

    _getCategories(data, func) {
        let dic = {}
        for (let d of data) dic[func(d)] = true
        let ret = Object.keys(dic);
        ret.sort();
        return ret;
    }

    _tooltipMouseOver(d) {
        var self = this;
        self.tooltip
            .attr("fill-opacity", 1)
            .text(d.name)
            .attr("transform",
                "translate(" + (self.x(d.x)) + " ," +
                (self.y(d.y) - 20) + ")")
    }

    _tooltipMouseLeave(d) {
        this.tooltip
            .attr("fill-opacity", 0)
            .attr("transform",
                "translate(" + 0 + " ," +
                0 + ")")
    }
}