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

        //Sasha Trubetskoy
        //self.colors = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#000000']; 
    
        //P. Green-Armytage
        self.colors = ["#0075DC","#4C005C","#005C31","#2BCE48","#808080","#94FFB5","#8F7C00","#9DCC00","#C20088","#003380","#FFA405","#426600","#FF0010","#5EF1F2","#00998F","#993F00","#740AFF","#990000","#FFFF80","#FF5005", "#F0A3FF", "#E0FF66", "#191919", "#FFCC99", "#FFA8BB", "#FFFF00"]
        self.colorsDarker = self.colors.map(c => d3.rgb(c).darker(1))
    
    }

    setDimensions(width=800, height=400, right=80, left=80, top=50, bottom=60) {
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

    addScatterHighlight(point, title="", fill="#ffbf00", stroke="white", radius=8) {
        var self = this;
        self.highlight = self.svg.selectAll("highlight")
            .data([point])
            .enter()
            .append("circle")
            .style("cursor", "pointer")
            .attr("cx", function (d) { return (self.x(d.x)) })
            .attr("cy", function (d) { return (self.y(d.y)) })
            .attr("r", radius)
            .style("fill",  fill)
            .attr("stroke", stroke)
            .append("svg:title")
            .text(title);
    }

    addYAxisCallback(callback) {
        this.yAxisCallback = callback;
    }

    setTitle(title) {
        this.title = title;
    }

    //Expects [{x, y, z=undefined}...] where x and y are numeric, z is optional string for coloring
    updateScatter(data, xName, yName, dataset, orderZ, shouldCullPoints=false) {
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
            if(orderZ) {
                let orderZDic = {};
                for(let i=0; i<orderZ.length; ++i) orderZDic[orderZ[i]] = i+1;
                let sortZ = (a, b) => ((orderZDic[a]||orderZ.length+1) - (orderZDic[b]||orderZ.length+1));
                categoriesZ.sort(sortZ);
            }

            
            pointColorScale = d3.scaleOrdinal()
                .domain(orderZ ? orderZ : categoriesZ)
                .range(self.colors.map((c, i) => i));

            var legend = self.svg.selectAll("legend")
                .data(categoriesZ)
                .enter()
                .append("g")
                .attr("transform", function (d, i) { return "translate(" + (self.width) + "," + ((20 * i)) + ")"; });

            legend.append("circle")
                .style("fill", function (d, i) { return self.colors[pointColorScale(d)]; })
                .attr("stroke", "black")
                .attr("r", 6.5)

            legend.append("text")
                .attr("text-anchor", "start")
                .attr("font-size", "10px")
                .attr("x", 20)
                .text(function (d) { return d });
        }

        // Show scatter plot
        let defaultColor = "#4b90cc";
        let defaultColorDarker = d3.rgb(defaultColor).darker(1)
        self.svg.selectAll("indPoints")
            .data(shouldCullPoints ? self._filterDenseCircles(data, 3) : data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return (self.x(d.x)) })
            .attr("cy", function (d) { return (self.y(d.y)) })
            .attr("r", 3)
            .style("stroke", function(d) { return pointColorScale ? self.colorsDarker[pointColorScale(d.z)] : defaultColorDarker})
            .attr("stroke-opacity", 1)
            .attr("stroke-width", 0.2)
            .style("fill", function (d) { return pointColorScale ? self.colors[pointColorScale(d.z)] : defaultColor })
            //.on("mouseover", (d) => self._tooltipMouseOver(d))
            //.on("mouseleave", (d) => self._tooltipMouseLeave(d))

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

    //Expects [{x, y}...] where x is string and y is numeric
    updateColumn(data, xName, yName) {
        var self = this;

        let categoriesX = self._getCategories(data, d=>d.x);

        self._update(data, xName, yName);

        // Show the X scale
        self.x = d3.scaleBand()
            .range([self.rangePad, self.width - self.rangePad])
            .domain(categoriesX)
            .paddingInner(1)
            .paddingOuter(.5)

        self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x).tickFormat(d => d.length <= 10 ? d : d.substring(0, 7) + '...'))

        //Show columns
        self.svg.selectAll("boxes")
            .data(data)
            .enter()
            .append('rect')
            .attr('x', d => self.x(d.x) - self.width / categoriesX.length * 0.8 / 2)
            .attr('y', d => self.y(d.y))
            .attr('width', self.width / categoriesX.length * 0.8)
            .attr('height', d => self.y(0) - self.y(d.y))
            .attr('stroke', '#34373b')
            .attr('fill', "#494b4f");
    }

    //Expects [{x, y, z=undefined}...] where x is string and y is numeric, z is optional string for coloring
    updateViolin(data, xName, yName, dataset, orderX, groupLabelsX, groupSizesX, orderZ, bandwidth, shouldCullPoints=false) {
        var self = this;
        
        let multipleColors = (data[data.length-1].z);

        let categoriesX = self._getCategories(data, d => d.x);
        let categoriesZ = !multipleColors ? [] : self._getCategories(data, d=>d.z);

        let maxCategoryLenX = categoriesX.reduce((a, b) => a.length > b.length ? a : b);
        let maxCategoryLenZ = !multipleColors ? "" : " " + categoriesZ.reduce((a, b) => a.length > b.length ? a : b);

        let maxCategoryLen = maxCategoryLenX + maxCategoryLenZ;
        let shouldRotateLabels = (multipleColors ? (categoriesX.length * categoriesZ.length) : categoriesX.length) > 8;

        let rotatedOffset = shouldRotateLabels ? self.computeTextLength(maxCategoryLen) : 0;

        d3.select("#" + self.elementId + " > div > svg").attr("viewBox", `0 0 ${self.width + self.margin.left + self.margin.right} ${self.height + self.margin.top + self.margin.bottom + rotatedOffset}`);
        self._update(data, xName, yName, dataset, rotatedOffset);

        let violinColorScale = d3.scaleOrdinal().domain(orderX ? orderX : categoriesX).range(self.colors);

        //Add indices to data
        for(let i=0; i<data.length; ++i) data[i].i = i;

        var sumstat = undefined; 
        if(!multipleColors) {
            sumstat = d3.nest()
                .key(d => d.x)
                .rollup(d => d)
                .entries(data)
        } else {
            sumstat = d3.nest()
                .key(d => d.x)
                .key(d => d.z)
                .rollup(d => d)
                .entries(data)

            //Sort inner nests Z values
            let orderZDic = {};
            if(orderZ) for(let i=0; i<orderZ.length; ++i) orderZDic[orderZ[i]] = i+1;
            let sortZ = orderZ ? ((a, b) => ((orderZDic[a.key]||orderZ.length+1) - (orderZDic[b.key]||orderZ.length+1))) : ((a, b) => d3.ascending(a.key, b.key));
            for(let entry of sumstat) entry.values.sort(sortZ);
        }
        
        //Sort outer nest X values
        let orderXDic = {};
        if(orderX) for(let i=0; i<orderX.length; ++i) orderXDic[orderX[i]] = i+1;
        let sortX = orderX ? ((a, b) => ((orderXDic[a.key]||orderX.length) - (orderXDic[b.key]||orderX.length))) : ((a, b) => d3.ascending(a.key, b.key));
        sumstat.sort(sortX);

    
        //Flatten if necessary and assign "keyX", used for groups
        let sumstatFlat = undefined;
        if(multipleColors) {
            sumstatFlat = [];
            for(let s1 of sumstat) for(let s2 of s1.values) sumstatFlat.push({key:s1.key + " " + s2.key, keyX: s1.key, value: s2.value});
        } else {
            sumstatFlat = sumstat;
            for(let s1 of sumstatFlat) s1.keyX = s1.key;
        }

        if(groupSizesX) {
            //Make group sizes cumulative
            for(let i=1; i<groupSizesX.length; ++i) groupSizesX[i] += groupSizesX[i-1];

            //We need to fix groupSizes, since sumstat omits empty values
            for(let i=0, j=0; j<groupSizesX.length; ++i) {
                if(i >= sumstatFlat.length || orderXDic[sumstatFlat[i].keyX] > orderXDic[orderX[groupSizesX[j]-1]]) {
                    groupSizesX[j++] = i;
                }
            }
        }

        //Show the X scale
        self.x = d3.scaleBand()
            .range([0, self.width])
            .domain(sumstatFlat.map(s => s.key))
            .padding(0.05)

        let xText = self.svg.append("g")
            .attr("transform", "translate(0," + self.height + ")")
            .call(d3.axisBottom(self.x))
            .selectAll("text")

        //Roatate X labels if there are many categories
        if(shouldRotateLabels) {
            xText.attr("y", 0)
            .attr("x", -9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-90)");
            //.text(d => d.length <= 10 ? d : d.substring(0, 7) + '...');
        }

        let groupColors = ["green", "blue"];
        if(groupLabelsX) {
            let start = self.x(sumstatFlat[0].key);
            let prevShouldDraw = false;
            for(let i=0; i < groupSizesX.length; ++i) {
                let end = (i < groupSizesX.length-1 && groupSizesX[i] < sumstatFlat.length) ? self.x(sumstatFlat[groupSizesX[i]].key) : self.width;
                let plotWidth = end - start;
                let shouldDraw = plotWidth > 0.1;
                if(shouldDraw) {
                    self.svg
                        .append("rect")
                        .attr("x", start)
                        .attr("y", 0)
                        .attr("height", self.height)
                        .attr("width", plotWidth)
                        .attr("stroke", "none")
                        .style("fill", groupColors[i % groupColors.length])
                        .style("fill-opacity", 0.01)
                        .append("svg:title")
                        .text(groupLabelsX[i])

                    if(prevShouldDraw) {
                        //Draw dotted line
                        self.svg
                            .append("line")
                            .attr("x1", start)
                            .attr("x2", start)
                            .attr("y1", 0-self.margin.top/2)
                            .attr("y2", self.height+self.margin.bottom/2)
                            .attr("stroke", "black")
                            .attr("stroke-dasharray", "5,5")
                    }
                }

                start = end;
                prevShouldDraw |= shouldDraw;
            }
        }

        //https://www.d3-graph-gallery.com/graph/density_basic.html
        function kernelDensityEstimator(kernel, X) {
            return function(V) {
                return X.map(function(x) {
                    return [x, d3.mean(V, function(v) { return kernel(x - v); })];
                });
            };
        }
        function kernelEpanechnikov(k) {
            return function(v) {
                return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
            };
        }

        function scottsRule(len, ssd, iqr) {
            var a = Math.min(ssd, iqr / 1.349);
            return 1.059 * a * Math.pow(len, -0.2);
        }

        function median(l, r) {
            var n = r - l + 1;
            n = parseInt((n + 1) / 2) - 1;
            return parseInt(n + l);
        }
 
        function IQR(array) {
            array.sort((a,b)=>a-b);
            var mid_index = median(0, array.length);
            var Q1 = array[median(0, mid_index)];
            var Q3 = array[median(mid_index + 1, array.length)];
            return Q3 - Q1;
        }

        function SD(array) {
            const n = array.length
            const mean = array.reduce((a, b) => a + b) / n
            return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
        }
        
        var violinMax = d3.max(sumstatFlat, d=>d.value.length);
        var violinMin = d3.min(sumstatFlat, d=>d.value.length);
        var violinScale = d3.scaleLinear()
                .range([self.x.bandwidth()/2, self.x.bandwidth()])
                .domain([violinMin,violinMax])

        for(let violin of sumstatFlat) {
            let array = violin.value.map(d => d.y);
            let iqr = IQR(array);
            let sd = SD(array);

            // Compute kernel density estimation
            var kde = kernelDensityEstimator(kernelEpanechnikov(scottsRule(array.length, sd, iqr)), self.y.ticks(40))

            var density = kde(violin.value.map(d => d.y))
            var densityMax = d3.max(density, d=>d[1]);
            
            var scaledBandwidth = violinScale(violin.value.length)/2
            var violinBandwidthScale = d3.scaleLinear()
                .range([self.x.bandwidth()/2 - scaledBandwidth, self.x.bandwidth()/2 + scaledBandwidth])
                .domain([-densityMax,densityMax])
            
            //Remove leading zeros
            let zerosCount = 0;
            for(let i=0; i<density.length && density[i][1] == 0; ++i) ++zerosCount;
            if(zerosCount > 0) density.splice(0, zerosCount-1)

            //Remove trailing zeros
            zerosCount = 0;
            for(let i=density.length-1; i>=0 && density[i][1] == 0; --i) ++zerosCount;
            if(zerosCount > 0) density.splice(-(zerosCount-1), zerosCount-1)

            //Create loop
            var currX = self.x(violin.key);
            var currColor = violinColorScale(violin.value[0].x);
            var currColorDarker = d3.rgb(currColor).darker(0.5);

            var densityBinScale = d3.scaleLinear()
                .range([0, density.length-1])
                .domain(self.y.domain())

            let pointsSVG = self.svg.selectAll("indPoints")
                .data(shouldCullPoints ? self._filterDenseCircles(violin.value, 3) : violin.value)
                .enter()
                .append("circle")
                .attr("cx", function(d) {
                    let densityIndex = densityBinScale(d.y);
                    let random = (2 * Math.random() - 1);
                    return currX + self.x.bandwidth()/2 + random * violinBandwidthScale(d3.interpolateNumber(density[Math.floor(densityIndex)][1], density[Math.ceil(densityIndex)][1])(densityIndex - Math.floor(densityIndex)))/2; 
                })
                .attr("cy", d => self.y(d.y))
                .attr("r", 3)
                .attr("fill", "white")
                .style("fill-opacity", 1)
                .attr("stroke", currColor)
                .attr("stroke-width", 0.2)
                .attr("stroke-opacity", 1)

            let areaSVG = self.svg.append("path")
                .datum(density)
                .attr("fill", "white")
                .style("fill-opacity", 0.001)
                .style("stroke", currColorDarker)
                .attr("stroke-width", 1.5)
                .attr("d", d3.area()
                    .x0(d => currX + violinBandwidthScale(d[1] * 1))
                    .x1(d => currX + violinBandwidthScale(d[1] * -1))
                    .y(d => self.y(d[0]))
                    .curve(d3.curveCatmullRom)
                )
                .style("cursor", "pointer")
                .append("svg:title")
                .text(violin.value.length)
        }

        self._addTooltip();
    }

    updateDisabled(text="No data") {
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
    _update(data, xName, yName, dataset, rotatedOffset=0) {
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
            .attr("transform", "translate(" + (self.width / 2) + " ," + (self.height + self.margin.top + rotatedOffset) + ")")
            .style("text-anchor", "middle")
            .text(xName);

        self._addTitle(dataset);

        self._addDownloadButton(rotatedOffset);
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

    _addDownloadButton(rotatedOffset=0) {
        var self = this;
        self.downloadButton = self.svg.append('g')
        .attr("fill-opacity", self.shouldShowDownloadButton ? 1 : 0)
        .attr("transform",
                "translate(" + (self.width) + " ," +
                (self.height + self.margin.top + rotatedOffset) + ")")
        
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

    computeTextLength(string) {
        var self = this;
        var test = self.svg.append("text").text(string);
        var length = test.node().getComputedTextLength();
        test.remove();
        return length/2; //TODO temporary, too much whitespace due to margin.bottom
    }

    //Remove circles that overlap any other circle by more than (circleOverlapCullThreshold*100) %
    _filterDenseCircles(data, radius, decimalPlaces=2, circleOverlapCullThreshold=0.9) {
        let circleSet = {};
        let filtered = data.filter(d => {
            let circleHash = (d.x / radius * circleOverlapCullThreshold).toFixed(decimalPlaces) + ":" + (d.y / radius * circleOverlapCullThreshold).toFixed(decimalPlaces);
            if(circleSet[circleHash]) return false;
            return circleSet[circleHash] = true;
        });

        console.log((data.length - filtered.length) + " data points culled");
        return filtered;
    }
}
