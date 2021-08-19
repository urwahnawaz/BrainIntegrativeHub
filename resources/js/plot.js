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

        self.setDimensions();

        self.zeroCountNum = 0
        self.title = "";
        self.shouldShowDownloadButton = false;
    }

    setDimensions(width=800, height=400, right=80, left=80, top=50, bottom=100) {
        var self = this;

        self._removeAll();

        // set the dimensions and margins of the graph
        self.margin = { top: top, right: right, bottom: bottom, left: left };
        self.width = width - self.margin.left - self.margin.right;
        self.height = height - self.margin.top - self.margin.bottom;

        // append the svg object to the body of the page
        self.svg = d3.select("#" + self.elementId)
            .append("div")
            // Container class to make it responsive.
            .classed("svg-container", true) 
            .append("svg")
            // Responsive SVG needs these 2 attributes and no width and height attr.
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${width} ${height}`)
            // Class to make it responsive.
            .classed("svg-content-responsive", true)
            .append("g")
            .attr("transform",
                "translate(" + self.margin.left + "," + self.margin.top + ")")

            d3.select("#" + self.elementId)
                .on("mouseenter", () => self._setDownloadButtonVisibility(true))
                .on("mouseleave", () => self._setDownloadButtonVisibility(false))
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

    addYAxisCallback(callback) {
        this.yAxisCallback = callback;
    }

    setTitle(title) {
        this.title = title;
    }

    //Expects [{x, y, z=undefined}...] where x and y are numeric, z is optional string for coloring
    updateScatter(data, xName, yName, dataset) {
        var self = this;
        self._update(data, xName, yName, dataset);

        // Show the X scale
        self.x = d3.scaleLinear()
            .range([self.rangePad, self.width - self.rangePad])
            .domain(data.length == 1 ? [0, 2 * data[0].x] : d3.extent(data, d => d.x))
        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))

        var pointColorScale = undefined;
        var categoriesZ = undefined;

        if (data[data.length-1].z) {
            categoriesZ = self._getCategories(data, d => d.z)
            let colors = ["#377eb8","#4daf4a","#ff7f00","#ffff33","#a65628","#984ea3", "#f781bf","#999999", "#e41a1c"];
            if (colors) {
                pointColorScale = d3.scaleOrdinal()
                    .domain(data.map(d => d.z))
                    .range(colors);

                var legend = self.svg.selectAll("legend")
                    .data(categoriesZ)
                    .enter()
                    .append("g")
                    .attr("transform", function (d, i) { return "translate(" + (self.width) + "," + ((28 * i)) + ")"; });

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
            .style("cursor", "pointer")
            .attr("cx", function (d) { return (self.x(d.x)) })
            .attr("cy", function (d) { return (self.y(d.y)) })
            .attr("r", 4)
            .style("fill", function (d) { return pointColorScale ? (pointColorScale(d.z)) : "#2b6da4" })
            .on("mouseover", (d) => self._tooltipMouseOver(d))
            .on("mouseleave", (d) => self._tooltipMouseLeave(d))

        if (data[0].z && !pointColorScale) {
            window.alert("Couldn't display " + categoriesZ.length + " categories");
        }

        for(let d of data) if(d.x == 0 && d.y == 0) ++self.zeroCountNum;

        self._addTooltip();
        self._addZeroCount();
    }

    //Expects [{x, y}...] where x is string and y is numeric
    updateBox(data, xName, yName, dataset) {
        var self = this;
        self._update(data, xName, yName, dataset);

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
            .style("cursor", "pointer")
            .attr("cx", function (d, i) { return self.x(d.x) + (multiplePerCategory ? self.cachedJitter[i] : 0) }) //TODO per-category jitter/no jitter
            .attr("cy", function (d) { return self.y(d.y) })
            .attr("r", 4)
            .style("fill", multiplePerCategory ? "white" : "#2b6da4")
            .attr("stroke", "black")
            .on("mouseover", (d) => self._tooltipMouseOver(d))
            .on("mouseleave", (d) => self._tooltipMouseLeave(d))

        self._addTooltip();
    }

    updateDisabled(text="No Data") {
        var self = this;

        //Clear graph already exists
        self._removePlot();

        // Show the disabled label
        self.svg.append("text")
            .attr("transform", "translate(" + (self.width / 2) + " ," + (self.height / 2) + ")")
            .style("text-anchor", "middle")
            .text(text);

        // Show dummy axis
        self.y = d3.scaleLinear().range([self.height - self.rangePad, self.rangePad])
        self.svg.append("g").call(d3.axisLeft(self.y));

        self.x = d3.scaleLinear().range([self.rangePad, self.width - self.rangePad])
        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))

        self._addTitle();
    }

    _removeAll() {
        this._removePlot();
        d3.selectAll("#" + this.elementId + " > *").remove();
    }

    _removePlot() {
        d3.selectAll("#" + this.elementId + " > div > svg > g > *").remove();
        this.downloadButton = undefined;
        this.currData = undefined;
        this.currXName = undefined;
        this.currYName = undefined;
    }

    //Internal function for shared axis creation
    _update(data, xName, yName, dataset) {
        var self = this;

        //Clear graph already exists
        self._removePlot();
        self.currData = data;
        self.currXName = xName;
        self.currYName = yName;

        //Create y scale
        self.y = d3.scaleLinear()
            .domain(data.length == 1 ? [0, 2 * data[0].y] : d3.extent(data, d => d.y))
            .range([self.height - self.rangePad, self.rangePad])

        self.svg.append("g").call(d3.axisLeft(self.y));

        // Show the Y label
        let yScale = self.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - self.margin.left)
            .attr("x", 0 - (self.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yName);

        if(self.yAxisCallback) {
            yScale
                .style("cursor", "pointer")
                .on("click", () => self.yAxisCallback())
        }

        // Show the X label
        self.svg.append("text")
            .attr("transform", "translate(" + (self.width / 2) + " ," + (self.height + self.margin.top) + ")")
            .style("text-anchor", "middle")
            .text(xName);

        self._addTitle(dataset);

        self._addDownloadButton();
    }

    _addTitle(dataset) {
        var self = this;
        // Show title
        self.svg.append("text")
            .attr("transform",
                "translate(" + (self.width / 2) + " ," +
                -self.margin.top / 2 + ")")
            .style("text-anchor", "middle")
            .text(self.title ? self.title : dataset);
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
        if(d.x == 0 && d.y == 0) self._zeroCountMouseOver();
    }

    _tooltipMouseLeave(d) {
        var self = this;
        self.tooltip
            .attr("fill-opacity", 0)
            .attr("transform",
                "translate(" + 0 + " ," +
                0 + ")")
        if(d.x == 0 && d.y == 0) self._zeroCountMouseLeave();
    }

    _zeroCountMouseOver() {
        var self = this;
        if(self.zeroCountNum <= 1) return;
        self.zeroCountText
            .attr("fill-opacity", 1)
            .text("(" + self.zeroCountNum + " null points)")
    }

    _zeroCountMouseLeave() {
        this.zeroCountText.attr("fill-opacity", 0)
    }

    _addZeroCount() {
        var self = this;
        self.zeroCountText = self.svg.append("text")
            .attr("font-size", "12px")
            .attr("fill-opacity", 0)
            .attr("text-anchor", "start")
            .attr("transform",
                "translate(" + (-self.margin.left/2) + " ," +
                (self.height + self.margin.bottom/2) + ")")
    }

    _addDownloadButton() {
        var self = this;
        self.downloadButton = self.svg.append('g')
        .attr("fill-opacity", self.shouldShowDownloadButton ? 1 : 0)
        .attr("transform",
                "translate(" + (self.width) + " ," +
                (self.height + self.margin.bottom/2) + ")")
        
        //PNG
        self.downloadButton.append('text')
            .attr('font-family', 'FontAwesome')
            .attr('font-size', "20px")
            .text(function(d) { return '\uf1c5' })
            .style("cursor", "pointer")
            .attr("transform",
                "translate(" + -90 + " ," +
                0 + ")")
            .on("click", () => self._savePNG()) 


        //SVG
        self.downloadButton.append('text')
            .attr('font-family', 'FontAwesome')
            .attr('font-size', "20px")
            .text(function(d) { return '\uf5cb' })
            .style("cursor", "pointer")
            .attr("transform",
                "translate(" + -60 + " ," +
                0 + ")")
            .on("click", () => self._saveSVG())

        //CSV
        self.downloadButton.append('text')
            .attr('font-family', 'FontAwesome')
            .attr('font-size', "20px")
            .text(function(d) { return '\uf6dd' })
            .style("cursor", "pointer")
            .attr("transform",
                "translate(" + -30 + " ," +
                0 + ")")
            .on("click", () => self._saveCSV())
    }

    _setDownloadButtonVisibility(value) {
        var self = this;
        self.shouldShowDownloadButton = value;
        if(self.downloadButton) self.downloadButton.attr("fill-opacity", value ? 1 : 0)
    }

    _saveSVG() {
        var self = this;
        let svg = self._toSVG();
        self._save(svg, "svg");
    }

    _savePNG() { //TODO: this method does not work in firefox
        var self = this;
        var canvas = document.createElement( "canvas" );
        canvas.width = 1920; //full HD regardless of window size
	    canvas.height = canvas.width * ((self.height + self.margin.top + self.margin.bottom) / (self.width + self.margin.left + self.margin.right));
        var ctx = canvas.getContext( "2d" );
        var img = document.createElement( "img" );
        img.setAttribute( "src", self._toSVG());
        img.onload = function() {
            ctx.clearRect ( 0, 0, canvas.width, canvas.height );
		    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            self._save(canvas.toDataURL( "image/png" ), "png");
        };
    }

    _toSVG() {
        var self = this;
        self.downloadButton.remove() //Remove since we don't want this in image
        var xml = new XMLSerializer().serializeToString(this.svg.node().parentNode);
        self._addDownloadButton(); //Re-add
        return 'data:image/svg+xml;base64,' + btoa(xml);
    }

    _saveCSV() {
        var self = this;
        var csv = 'data:text/csv;charset=utf-8,';
        if(self.currData.length) {
            if(self.currData[0].name) {
                csv += `,${self.currYName},${self.currXName}\r\n`
                for(let d of self.currData) {
                    csv += `${d.name},${d.y},${d.x}\r\n`;
                }
            } else {
                csv += `${self.currYName},${self.currXName}\r\n`
                for(let d of self.currData) {
                    csv += `${d.y},${d.x}\r\n`;
                }
            }
        }
        self._save(csv.replace(/\n/g, "%0D%0A"), "csv");
    }

    _save(blobString, extension) {
        var downloadLink = document.createElement("a");
        downloadLink.href = blobString;
        downloadLink.download = "chart." + extension;
        downloadLink.click();
        downloadLink.remove();
    }
}