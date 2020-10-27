//Url heatmap
class Heatmap {
    constructor(elementId) {
        var self = this;

        self.elementId = elementId;
        
        // set the dimensions and margins of the heatmap
        self.margin = { top: 10, right: 0, bottom: 100, left: 0 }
        self.width = 1000 - self.margin.left - self.margin.right,
        self.height = 250 - self.margin.top - self.margin.bottom;
    
        // append the svg object to the body of the page
        self.svg = d3.select("#" + self.elementId)
            .append("svg")
            .attr("width", self.width + self.margin.left + self.margin.right)
            .attr("height", self.height + self.margin.top + self.margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + self.margin.left + "," + self.margin.top + ")");
    }

    update(data) {
        let self = this;

        //Clear graph already exists
        d3.selectAll("#" + self.elementId + " > svg > g > *").remove();

        // Show the X label
        /*self.svg.append("text")
            .attr("transform", "translate(" + (self.width / 2) + " ," + (self.height + self.margin.top) + ")")
            .style("text-anchor", "middle")
            .text(xName);*/

        //Read the data
        let numBoxes = data.length;
        let boxWidth = self.width / numBoxes;
        let boxes = self.svg.selectAll("boxes")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", function (d, i) { return boxWidth * (i)})
            .attr("y", self.height / 2)
            .attr("width", boxWidth-4)
            .attr("height", boxWidth-4)
            .style("fill", function (d) { return d3.color(!d.present ? "whitesmoke" : (d.isDataset ? "#ff9433" : "#2b6da4"))})
            .on("mouseover", function(d,i) {
                if(!d.url) {
                    d3.select(this)
                        .style("cursor", "default")
                    return;
                }

                let selected = this;
                boxes
                .interrupt()
                .transition()
                .filter(function() {return this != selected;})
                .duration(250)
                .style("opacity", 0.5)

                d3.select(this)
                .style("cursor", "pointer")
                .interrupt()
                .transition()
                .duration(100)
                .style("opacity", 1.0)
                
            })
            .on("mouseout", function(d, i) {
                let selected = this;

                d3.select(this)
                .style("cursor", "default")

                boxes
                .interrupt()
                .transition()
                .filter(function() {return this != selected;})
                .duration(100)
                .style("opacity", 1.0)
            })
            .on("click", function(d, i) {
                if(!d.url) return;
                window.open(d.url, '_blank')
            })
    }
}