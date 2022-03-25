/*
Plotly limitations:

Sub-heading cannot be made smaller
ScatterGl SVG exports are technically an image, not editable (maybe only use webgl for >1000 points)
Cannot jitter points inside violin

*/

let highlightDataGlobal = [];

let svgIcon = {
    'width': 512,
    'height': 512,
    'path': "M416 32C433.7 32 448 46.33 448 64V128C448 145.7 433.7 160 416 160V352C433.7 352 448 366.3 448 384V448C448 465.7 433.7 480 416 480H352C334.3 480 320 465.7 320 448H128C128 465.7 113.7 480 96 480H32C14.33 480 0 465.7 0 448V384C0 366.3 14.33 352 32 352V160C14.33 160 0 145.7 0 128V64C0 46.33 14.33 32 32 32H96C113.7 32 128 46.33 128 64H320C320 46.33 334.3 32 352 32H416zM368 80V112H400V80H368zM96 160V352C113.7 352 128 366.3 128 384H320C320 366.3 334.3 352 352 352V160C334.3 160 320 145.7 320 128H128C128 145.7 113.7 160 96 160zM48 400V432H80V400H48zM400 432V400H368V432H400zM80 112V80H48V112H80z",
}

let csvIcon = {
    'width': 512,
    'height': 512,
    'path': "M256 0v128h128L256 0zM224 128L224 0H48C21.49 0 0 21.49 0 48v416C0 490.5 21.49 512 48 512h288c26.51 0 48-21.49 48-48V160h-127.1C238.3 160 224 145.7 224 128zM128 280C128 284.4 124.4 288 120 288H112C103.1 288 96 295.1 96 304v32C96 344.9 103.1 352 112 352h8C124.4 352 128 355.6 128 360v16C128 380.4 124.4 384 120 384H112C85.5 384 64 362.5 64 336v-32C64 277.5 85.5 256 112 256h8C124.4 256 128 259.6 128 264V280zM172.3 384H160c-4.375 0-8-3.625-8-8v-16C152 355.6 155.6 352 160 352h12.25c6 0 10.38-3.5 10.38-6.625c0-1.25-.75-2.625-2.125-3.875l-21.88-18.75C150.3 315.5 145.4 305.3 145.4 294.6C145.4 273.4 164.4 256 187.8 256H200c4.375 0 8 3.625 8 8v16C208 284.4 204.4 288 200 288H187.8c-6 0-10.38 3.5-10.38 6.625c0 1.25 .75 2.625 2.125 3.875l21.88 18.75c8.375 7.25 13.25 17.5 13.25 28.12C214.6 366.6 195.6 384 172.3 384zM288 284.8V264C288 259.6 291.6 256 296 256h16C316.4 256 320 259.6 320 264v20.75c0 35.5-12.88 69-36.25 94.13C280.8 382.1 276.5 384 272 384s-8.75-1.875-11.75-5.125C236.9 353.8 224 320.3 224 284.8V264C224 259.6 227.6 256 232 256h16C252.4 256 256 259.6 256 264v20.75c0 20.38 5.75 40.25 16 56.88C282.3 325 288 305.1 288 284.8z",
}

class PlotContainer {
    constructor(elementId) {
        this.elementId = elementId;
        this.plot = undefined;
    }

    updateBar(heading, subHeading, data, xName, yName)  {
        this.plot = new PlotBar(this.elementId, heading, subHeading, data, xName, yName);
        this.resize();
    }

    updateScatter(heading, subHeading, data, xName, yName, orderZ, highlightData=[], highlightFill="#ffbf00", highlightStroke="white", highlightRadius=8) {
        this.plot = new PlotScatter(this.elementId, heading, subHeading, data, xName, yName, orderZ, highlightData, highlightFill, highlightStroke, highlightRadius);
        this.resize();
    }

    updateViolin(heading, subHeading, data, xName, yName, orderX, groupLabelsX, groupSizesX, orderZ, overrideColors=undefined) {
        this.plot = new PlotViolin(this.elementId, heading, subHeading, data, xName, yName, orderX, groupLabelsX, groupSizesX, orderZ, overrideColors);
        this.resize();
    }
    
    updateDisabled(message) {
        this.plot = new PlotEmpty(this.elementId, message);
        this.resize();
    }

    resize() {
        let self = this;
        document.getElementById(this.elementId).on('plotly_afterplot', function() {
            Plotly.Plots.resize(self.elementId);
        });
    }

    //TEMP
    addYAxisCallback() {}
    setDimensions(width, height, right, left, top, bottom){}
    addTitles() {}
}

class PlotBase {
    constructor(elementId) {
        this.elementId = elementId;
        this.colors = ["#0075DC","#4C005C","#005C31","#2BCE48","#808080","#94FFB5","#8F7C00","#9DCC00","#C20088","#003380","#FFA405","#426600","#FF0010","#5EF1F2","#00998F","#993F00","#740AFF","#990000","#FFFF80","#FF5005", "#F0A3FF", "#E0FF66", "#191919", "#FFCC99", "#FFA8BB", "#FFFF00"]
    }

    _saveCSV(data, highlightData, currYName, currXName) {
        var csv = 'data:text/csv;charset=utf-8,';
    
        let includeHighlight = highlightData && highlightData.length;
        let includeData = data && data.length;
        let includeNames = (!includeHighlight || highlightData[0].name) || (!includeData || data[0].name);
        let includeDataZ = includeData && data[0].z;
    
        csv += encodeURIComponent(`name,${currYName},${currXName}${includeHighlight ? ",highlighted" : ""}${includeDataZ ? "," : ""}\n`) //TODO pass currZName
        for(let [i, source] of [highlightData, data].entries()) {
            if(source && source.length) {
                for(let d of source) {
                    csv += encodeURIComponent(`${includeNames && d.name ? d.name : ""},${d.y},${d.x}${includeHighlight ? "," + (i==0) : ""}${includeDataZ ? "," + d.z : ""}\n`);
                }
            }
        }
        this._save(csv, "csv");
    }
    
    _save(blobString, extension) {
        var downloadLink = document.createElement("a");
        downloadLink.href = blobString;
        downloadLink.download = "chart." + extension;
        downloadLink.click();
        downloadLink.remove();
    }
}

class PlotEmpty extends PlotBase {
    constructor(elementId, message) {
        super(elementId);

        let layout = {
            autosize: true,
            xaxis: {
                zeroline:false,
                showticklabels:false
            }, 
            yaxis: {
                zeroline: false, 
                showticklabels:false
            },
            annotations: [
                {
                  x: 0.5,
                  y: 0.5,
                  xref: 'paper',
                  yref: 'paper',
                  text: message,
                  font: {
                    color: "grey",
                    size: 12
                  },
                  showarrow: false
                }
            
              ]
        }

        let config = {
            responsive: true,
            displaylogo: false,
            staticPlot: true,
        }

        Plotly.react(this.elementId, [], layout, config);
    }
}

class PlotBar extends PlotBase {
    constructor(elementId, heading, subHeading, data, xName, yName) {
        super(elementId);

        let self = this;

        let plotlyData = [{
            type: 'bar',
            x: data.map(d => d.y),
            y: data.map(d => d.x),
            orientation: 'v'
        }];

        var layout = { 
            title: {
                text: heading + "<br>" + subHeading,
                font: {
                    family: "Times New Roman",
                    size: 24
                },
            },
            xaxis: {
                automargin: true,
                title: {
                    text: yName,
                    font: {
                        family: 'Times New Roman',
                        size: 18,
                        color: '#7f7f7f'
                    }
                },
            },
            yaxis: {
                automargin: true,
                title: {
                    text: xName,
                    font: {
                        family: 'Times New Roman',
                        size: 18,
                        color: '#7f7f7f'
                    }
                }
            },
        };

        var config = {
            responsive: true,
            displaylogo: false,
            modeBarButtons: [
                ['autoScale2d', 'zoomIn2d', 'zoomOut2d', 'pan2d', 'zoom2d'],
                [{
                    name: 'Download plot as a svg',
                    icon: svgIcon,
                    click: function(gd) {
                      Plotly.downloadImage(gd, {format: 'svg'})
                    }
                }, 
                {
                    name: 'Download plot as a png', //toImage without notifications
                    icon: Plotly.Icons.camera,
                    click: function(gd) {
                      Plotly.downloadImage(gd, {format: 'png'})
                    }
                },
                {
                    name: 'Download plot as a csv',
                    icon: csvIcon,
                    click: function(gd) {
                        self._saveCSV(data, undefined, yName, xName);
                    }
                }],
            ]
        }
        Plotly.react(this.elementId, plotlyData, layout, config);
    }
}

class PlotScatter extends PlotBase {
    constructor(elementId, heading, subHeading, data, xName, yName, orderZ, highlightData, highlightFill, highlightStroke, highlightRadius) {
        super(elementId);

        let self = this;

        let plotlyData = [];
        
        if(data[0].z) {

            let catZSet = new Set(data.map(d => d.z));
            let catZDic = {};
            for(let i=0; i<data.length; ++i)  catZDic[data[i].z] = true;
            let catZ = orderZ ? orderZ.filter(v => v in catZDic) : [...catZSet];

            let k=0;
            for(let cat of catZ) {
                let filtered = data.filter(d => d.z == cat);
                plotlyData.push({
                    type: "scattergl",
                    mode: 'markers+text',
                    name: cat,
                    hovertext: data[0].name ? data.map(d => d.name) : undefined,
                    hoverinfo: "x+y+text+name",
                    /*marker: {
                        //color: this.colors[k++ % this.colors.length],
                        line: {
                            width: 0.5,
                            color: 'grey'
                        }
                    },*/
                    x: filtered.map(d => d.x),
                    y: filtered.map(d => d.y),
                    //text: data[0].label ? filtered.map(d => d.label) : undefined
                });
            }

        } else {
            plotlyData.push({
                type: "scattergl",
                mode: "markers",
                name: "All",
                hovertext: data[0].name ? data.map(d => d.name) : undefined,
                hoverinfo: "x+y+text", //highlightData.length ? 'skip': undefined, //"text"
                /*marker: {
                    color: "#4b90cc",
                    line: {
                        width: 0.5,
                        color: '#346691'
                    }
                },*/
                x: data.map(d => d.x),
                y: data.map(d => d.y),
                //text: data[0].label ? data.map(d => d.label) : undefined
            })

            if(highlightData.length) {//TODO Coupled Hover Events
                plotlyData.push({
                    type: "scattergl",
                    mode: "markers",
                    name: "Highlighted",
                    hovertext: highlightData.map(d => d.name),
                    hoverinfo: "x+y+text",
                    marker: {
                        color: highlightFill,
                        size: 15,
                        line: {
                            width: 1,
                            color: "white"
                        }
                    },
                    x: highlightData.map(d => d.x),
                    y: highlightData.map(d => d.y),
                    //text: highlightData[0].label ? highlightData.map(d => d.label) : undefined
                })
            }
        }

        var layout = { 
            autosize: true,
            title: {
                text: heading + "<br>" + subHeading,
                font: {
                    family: "Times New Roman",
                    size: 24
                },
            },
            xaxis: {
                automargin: true,
                zeroline: false, //TODO only turn off zeroline for zscores
                title: {
                    text: xName,
                    font: {
                        family: 'Times New Roman',
                        size: 18,
                        color: '#7f7f7f'
                    }
                },
            },
            yaxis: {
                automargin: true,
                zeroline: false,
                title: {
                    text: yName,
                    font: {
                        family: 'Times New Roman',
                        size: 18,
                        color: '#7f7f7f'
                    }
                }
            },
            showlegend: highlightData.length || data[0].z
        };

        //TODO: for some reason, highlightData becomes empty when copied or passed to config even though data is fine
        highlightDataGlobal = highlightData;

        var config = {
            responsive: true,
            displaylogo: false,
            modeBarButtons: [
                ['autoScale2d', 'zoomIn2d', 'zoomOut2d', 'pan2d', 'zoom2d'],
                [{
                    name: 'Download plot as a svg',
                    icon: svgIcon,
                    click: function(gd) {
                      Plotly.downloadImage(gd, {format: 'svg'})
                    }
                }, 
                {
                    name: 'Download plot as a png', //toImage without notifications
                    icon: Plotly.Icons.camera,
                    click: function(gd) {
                      Plotly.downloadImage(gd, {format: 'png'})
                    }
                },
                {
                    name: 'Download plot as a csv',
                    icon: csvIcon,
                    click: function(gd) {
                        self._saveCSV(data, highlightDataGlobal, yName, xName);
                    }
                }],
            ]
        }
        Plotly.react(this.elementId, plotlyData, layout, config);
    }
}

class PlotViolin extends PlotBase {
    constructor(elementId, heading, subHeading, data, xName, yName, orderX, groupLabelsX, groupSizesX, orderZ, overrideColors) {
        super(elementId);

        let self = this;

        if(!orderX) orderX = [...new Set(data.map(d => d.x))];
        if(!orderZ) orderZ = data[0].z ? [...new Set(data.map(d => d.z))] : [];

        let orderXDic = {};
        for(let i=0; i<orderX.length; ++i) orderXDic[orderX[i]] = i+1;
        let orderZDic = {};
        for(let i=0; i<orderZ.length; ++i) orderZDic[orderZ[i]] = i+1;

        let sortX = (a, b) => ((orderXDic[a.x]||orderX.length+1) - (orderXDic[b.x]||orderX.length+1));
        let sortZ = (a, b) => ((orderZDic[a.z]||orderZ.length+1) - (orderZDic[b.z]||orderZ.length+1));
        let sortCombined = (a, b) => sortZ(a, b) || sortX(a, b); 

        data.sort(sortCombined);
        
        let groupShapes = [];
        let groupAnnotations = [];

        let existingXDic = {};
        for(let i=0; i<data.length; ++i) existingXDic[data[i].x] = true;
        let existingMap = [...orderX];
        
        for(let i=existingMap.length-1; i>=0; --i) {
            if(existingXDic[existingMap[i]]) {
                existingMap[existingMap.length-1] = existingMap[i];
                break;
            }
        }
        for(let i=existingMap.length-2; i>=0; --i) if(!existingXDic[existingMap[i]]) existingMap[i] = existingMap[i+1];

        let existingX = [];
        for(let i=0; i<orderX.length; ++i) if(existingXDic[orderX[i]]) existingX.push(orderX[i]);

        let orderExistingXDic = {};
        for(let i=0; i<existingX.length; ++i) orderExistingXDic[existingX[i]] = i;

        if(groupLabelsX) {
            let groupColors = ["green", "blue"];
            for(let i=0, j=0, curr, next; i<groupLabelsX.length; j+=groupSizesX[i], ++i) {
                let last = (i+1) == groupLabelsX.length;

                curr = orderExistingXDic[existingMap[j]] - 0.5;
                next = orderExistingXDic[existingMap[Math.min(existingMap.length-1, j+groupSizesX[i])]] + (last ? 0.5 : -0.5);

                groupShapes.push({
                    type: 'rect',
                    xref: 'x',
                    yref: 'paper',
                    x0: curr,
                    y0: 0,
                    x1: next,
                    y1: 1,
                    fillcolor: groupColors[i % groupColors.length],
                    opacity: 0.03,
                    line: {
                        width: 1
                    }
                });

                if(!last) {
                    groupShapes.push({
                        type: 'line',
                        xref: 'x',
                        yref: 'paper',
                        x0: next,
                        y0: 0,
                        x1: next,
                        y1: 1,
                        line: {
                            color: 'black',
                            width: 2,
                            dash: 'dashdot'
                        }
                    });
                }

                if(curr != next) {
                        groupAnnotations.push({
                            text: groupLabelsX[i],
                            xref: 'x',
                            yref: 'paper',
                            x: next,
                            xanchor: 'right',
                            y: 1,
                            yanchor: 'top',
                            showarrow: false,
                            opacity: 0.25,
                            borderwidth: 10,
                    });
                }
            }
        }
        
        let plotlyData = [];
        let cumulativeY = [data[0].y];
        let cumulativeX = [data[0].x];
        let cumulativeName = [data[0].name];
        
        //Since it's sorted by (Z || X), changes in Z are the major group dividers
        for(let i=1, k=0; i<data.length; ++i) {
            let last = (i==(data.length-1));
            let changed = data[i-1].z != data[i].z;

            if(!changed || last) {
                cumulativeY.push(data[i].y);
                cumulativeX.push(data[i].x);
                cumulativeName.push(data[i].name);
            } 
            
            if(changed || last) {
                let group = data[i-1].z; 
                plotlyData.push({
                    type: 'violin',
                    x: existingX.concat(cumulativeX),
                    y: new Array(existingX.length).fill(NaN).concat(cumulativeY),
                    hovertext: cumulativeName,
                    hoverinfo: "y+text",
                    jitter: 0.5,
                    legendgroup: group,
                    name: group,
                    box: {
                        visible: true
                    },
                    line: {
                        //color: this.colors[k++ % this.colors.length],
                    },
                    meanline: {
                        visible: true
                    },
                });

                cumulativeY = [data[i].y];
                cumulativeX = [data[i].x];
                cumulativeName = [data[i].name]
            }
        }

        var layout = {
            violinmode: 'group',
            title: {
                text: heading + "<br>" + subHeading,
                font: {
                    family: "Times New Roman",
                    size: 24
                },
            },
            xaxis: {
                automargin: true,
                zeroline: false,
                title: {
                    text: xName,
                    font: {
                        family: 'Times New Roman',
                        size: 18,
                        color: '#7f7f7f'
                    }
                },
            },
            yaxis: {
                automargin: true,
                zeroline: false,
                title: {
                    text: yName,
                    font: {
                        family: 'Times New Roman',
                        size: 18,
                        color: '#7f7f7f'
                    }
                }
            },
            shapes: groupShapes,
            annotations: groupAnnotations
        }

        var config = {
            responsive: true,
            displaylogo: false,
            modeBarButtons: [
                ['autoScale2d', 'zoomIn2d', 'zoomOut2d', 'pan2d', 'zoom2d'],
                [{
                    name: 'Download plot as a svg',
                    icon: svgIcon,
                    click: function(gd) {
                      Plotly.downloadImage(gd, {format: 'svg'})
                    }
                }, 
                {
                    name: 'Download plot as a png', //toImage without notifications
                    icon: Plotly.Icons.camera,
                    click: function(gd) {
                      Plotly.downloadImage(gd, {format: 'png'})
                    }
                },
                {
                    name: 'Download plot as a csv',
                    icon: csvIcon,
                    click: function(gd) {
                        self._saveCSV(data, undefined, yName, xName);
                    }
                }],
            ]
        }
        Plotly.react(this.elementId, plotlyData, layout, config);
    }
}
