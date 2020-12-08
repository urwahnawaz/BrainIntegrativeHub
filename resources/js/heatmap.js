//Url heatmap
class Heatmap {
    constructor(elementId) {
        var self = this;

        self.elementId = elementId;
        
        // set the dimensions and margins of the heatmap
        self.margin = { top: 50, right: 100, bottom: 10, left: 100 }
        self.width = 800 - self.margin.left - self.margin.right,
        self.height = 250 - self.margin.top - self.margin.bottom;
    
        // append the svg object to the body of the page
        self.svg = d3.select("#" + self.elementId)
            .append("div")
            // Container class to make it responsive.
            .classed("svg-container", true) 
            .append("svg")
            // Responsive SVG needs these 2 attributes and no width and height attr.
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${self.width + self.margin.left + self.margin.right} ${ self.height + self.margin.top + self.margin.bottom}`)
            // Class to make it responsive.
            .classed("svg-content-responsive", true)
            .append("g")
            .attr("transform",
                "translate(" + self.margin.left + "," + self.margin.top + ")");
    }

    update(data) {
        let self = this;

        //Clear graph already exists
        d3.selectAll("#" + self.elementId + " > div > svg > g > *").remove();

        // Show the X label
        /*self.svg.append("text")
            .attr("transform", "translate(" + (self.width / 2) + " ," + (self.height + self.margin.top) + ")")
            .style("text-anchor", "middle")
            .text(xName);*/

        //Read the data
        let numBoxes = data.length;
        let boxWidth = self.width / numBoxes;
        let boxes = self.svg.selectAll("g")
            .data(data)
            .enter()
            .append('g')
            .attr("transform", (d, i) => `translate(${boxWidth * (i)},${self.height / 2})`);

        boxes.append("text")
            .attr("fill", "black")
            .attr("transform", `translate(${boxWidth/2},-10)rotate(-90)`)
            .text(d => d.name);
            

        boxes.append("rect")
            .attr("width", boxWidth-4)
            .attr("height", boxWidth-4)
            .style("fill", function (d) { return d3.color(!d.present ? "whitesmoke" : (d.datasetType == 1 ? "#ffbe33" : (d.datasetType == 2 ? "#ff9433" : "#2b6da4")))})
            .on("mouseover", function(d,i) {
                if(!d.url) {
                    d3.select(this)
                        .style("cursor", "default")
                    return;
                }

                let selected = this;
                boxes.selectAll("rect")
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

                boxes.selectAll("rect")
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