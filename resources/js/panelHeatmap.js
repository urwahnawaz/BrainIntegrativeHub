class PanelHeatmap {
    constructor(element) {
        element.innerHTML = this._generateHTML();

        var margin = { top: 30, right: 150, bottom: 100, left: 100 },
            width = 1000 - margin.left - margin.right,
            height = 250 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        this.svg = d3.select("#myHeatmapD3")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
    }

    setData(data) {
        d3.selectAll("#myHeatmapD3 > svg > g > *").remove(); 
        var svg = this.svg;

        svg.append("circle").attr("cx",760).attr("cy",0).attr("r", 6).style("fill", "#69b3a2").attr("stroke", "black")
        svg.append("text").attr("x", 780).attr("y", 0).text("Present").style("font-size", "15px").attr("alignment-baseline","middle")
        
        svg.append("circle").attr("cx",760).attr("cy",20).attr("r", 6).style("fill", "lightcoral").attr("stroke", "black")
        svg.append("text").attr("x", 780).attr("y", 20).text("Absent").style("font-size", "15px").attr("alignment-baseline","middle")

        svg.append("circle").attr("cx",760).attr("cy",40).attr("r", 6).style("fill", "lightgrey").attr("stroke", "black")
        svg.append("text").attr("x", 780).attr("y", 40).text("Unknown").style("font-size", "15px").attr("alignment-baseline","middle")

        var margin = { top: 30, right: 150, bottom: 100, left: 100 },
            width = 1000 - margin.left - margin.right,
            height = 250 - margin.top - margin.bottom;

        //group,variable,value
        //A,v1,30
        var myGroups = ["Expression"]
        var myVars = ["Lung", "Adipose", "Foreskin", "Bone Marrow", "Brain", "Bone", "Colon", "Blood", "Fibroblast", "Embryo", "Heart", "Kidney", "Cervix", "Liver", "Skeletal Muscle", "Umbilical Cord", "Bone Marrow"]//Object.keys(data);

        // Build X scales and axis:
        var x = d3.scaleBand()
            .range([0, width])
            .domain(myVars)
            .padding(0.01);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")  
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.5em")
            .attr("transform", "rotate(-65)");

        // Build X scales and axis:
        
        var y = d3.scaleBand()
            .range([height, 0])
            //.domain(myGroups)
            .padding(0.01);
        svg.append("g")
            .call(d3.axisLeft(y))
            .call(g => g.select(".domain").remove())

        //Read the data
        for(let v of myVars) if(data[v] === undefined) data[v] = -1
        var data2 = d3.entries(data)
        svg.selectAll()
            .data(data2, function (d) { return d.key + ':' + d.value; })
            .enter()
            .append("rect")
            .attr("x", function (d) { return x(d.key) })
            .attr("y", function (d) { return y(d.value) })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", function (d) { return d3.color(d.value == -1 ? "lightgrey" : (d.value == 0 ? "lightcoral" : "#69b3a2"))})
        console.log("done")
    }

    _generateHTML() {
        return /*html*/`
            <div id="myHeatmapD3" class="col-md-6 col-md-offset-2"></div>
        `;
    }
}