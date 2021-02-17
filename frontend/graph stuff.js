const GENERIC_ERROR_MESSAGE = "An error occured. Please try again in a bit."
const NO_RESPONSE_ERROR_MESSAGE = "Got no response from the server. Please try again in a bit."
var main = async () => {
    const MARGIN = {top:50, right:40, bottom:50, left:55}
    const WIDTH = 1000
    const HEIGHT = 900
    const YAXIS_OFFSET = 15
    const CIRCLE_RADIUS = 5
    const SQUARE_SIZE = 9
    const TOOLTIP_Y_OFFSET = 45
    const TOOLTIP_X_OFFSET = 75
    const TOOLTIP_TEXT_OFFSET = 17
    const TOOLTIP_TEXT_JUMP = 13
    const TOOLTIP_ARROW_OFFSET = 14
    const TOOLTIP_WIDTH = 150
    const TOOLTIP_HEIGHT = 70
    // Get data
    var nameDict = {}
    var data = []
    var rawData = await getData();
    rawData.forEach((d,i)=> {
        if (!d["formatted name"]) {
            return
        }
        if (nameDict[d["formatted name"]] == undefined) {
            nameDict[d["formatted name"]] = Object.values(nameDict).length
            data.push({...d, reviews: 1})
            if (d['formatted name'] == "Mom's Cooking") {
                data[data.length-1].reviews = "∞"
            }
        } else if (d['formatted name'] != "Mom's Cooking") {
            dataIndex = nameDict[d["formatted name"]]
            data[dataIndex].price = (data[dataIndex].price*data[dataIndex].reviews)+d.price;
            data[dataIndex].deliciousness = (data[dataIndex].deliciousness*data[dataIndex].reviews)+d.deliciousness
            data[dataIndex].reviews += 1
            data[dataIndex].price /= data[dataIndex].reviews;
            data[dataIndex].deliciousness /= data[dataIndex].reviews;
        }
    })

    // Scales
    var xValues = d3.scaleLinear().domain([0,d3.max(data, d=>d.price)]).nice().rangeRound([MARGIN.left, WIDTH-MARGIN.right])
    var yValues = d3.scaleLinear().domain([0, d3.max(data, d=>d.deliciousness)]).range([HEIGHT-MARGIN.bottom, MARGIN.top])
    var namePos = d3.scaleLinear().domain([0,d3.max(data, d=>d.price)]).range([2, -2])
    var colorValues = ["#460087","#6e40aa","#7140ab","#743fac","#773fad","#7a3fae","#7d3faf","#803eb0","#833eb0","#873eb1","#8a3eb2","#8d3eb2","#903db2","#943db3","#973db3","#9a3db3","#9d3db3","#a13db3","#a43db3","#a73cb3","#aa3cb2","#ae3cb2","#b13cb2","#b43cb1","#b73cb0","#ba3cb0","#be3caf","#c13dae","#c43dad","#c73dac","#ca3dab","#cd3daa","#d03ea9","#d33ea7","#d53ea6","#d83fa4","#db3fa3","#de3fa1","#e040a0","#e3409e","#e5419c","#e8429a","#ea4298","#ed4396","#ef4494","#f14592","#f34590","#f5468e","#f7478c","#f9488a","#fb4987","#fd4a85","#fe4b83","#ff4d80","#ff4e7e","#ff4f7b","#ff5079","#ff5276","#ff5374","#ff5572","#ff566f","#ff586d","#ff596a","#ff5b68","#ff5d65","#ff5e63","#ff6060","#ff625e","#ff645b","#ff6659","#ff6857","#ff6a54","#ff6c52","#ff6e50","#ff704e","#ff724c","#ff744a","#ff7648","#ff7946","#ff7b44","#ff7d42","#ff8040","#ff823e","#ff843d","#ff873b","#ff893a","#ff8c38","#ff8e37","#fe9136","#fd9334","#fb9633","#f99832","#f89b32","#f69d31","#f4a030","#f2a32f","#f0a52f","#eea82f","#ecaa2e","#eaad2e","#e8b02e","#e6b22e","#e4b52e","#e2b72f","#e0ba2f","#debc30","#dbbf30","#d9c131","#d7c432","#d5c633","#d3c934","#d1cb35","#cece36","#ccd038","#cad239","#c8d53b","#c6d73c","#c4d93e","#c2db40","#c0dd42","#bee044","#bce247","#bae449","#b8e64b","#b6e84e","#b5ea51","#b3eb53","#b1ed56","#b0ef59","#adf05a","#aaf159","#a6f159","#a2f258","#9ef258","#9af357","#96f357","#93f457","#8ff457","#8bf457","#87f557","#83f557","#80f558","#7cf658","#78f659","#74f65a","#71f65b","#6df65c","#6af75d","#66f75e","#63f75f","#5ff761","#5cf662","#59f664","#55f665","#52f667","#4ff669","#4cf56a","#49f56c","#46f46e","#43f470","#41f373","#3ef375","#3bf277","#39f279","#37f17c","#34f07e","#32ef80","#30ee83","#2eed85","#2cec88","#2aeb8a","#28ea8d","#27e98f","#25e892","#24e795","#22e597","#21e49a","#20e29d","#1fe19f","#1edfa2","#1ddea4","#1cdca7","#1bdbaa","#1bd9ac","#1ad7af","#1ad5b1","#1ad4b4","#19d2b6","#19d0b8","#19cebb","#19ccbd","#19cabf","#1ac8c1","#1ac6c4","#1ac4c6","#1bc2c8","#1bbfca","#1cbdcc","#1dbbcd","#1db9cf","#1eb6d1","#1fb4d2","#20b2d4","#21afd5","#22add7","#23abd8","#25a8d9","#26a6db","#27a4dc","#29a1dd","#2a9fdd","#2b9cde","#2d9adf","#2e98e0","#3095e0","#3293e1","#3390e1","#358ee1","#378ce1","#3889e1","#3a87e1","#3c84e1","#3d82e1","#3f80e1","#417de0","#437be0","#4479df","#4676df","#4874de","#4a72dd","#4b70dc","#4d6ddb"]
    var colorScale = d3.scaleLinear().domain([0, Object.values(nameDict).length - 1]).rangeRound([0,colorValues.length-1])

    // Setup
    d3.selectAll("svg").remove()
    const svg = d3.select("#graphContainer").append("svg")
    .attr("class", "graph")
    .attr("viewBox", [0,0,WIDTH,HEIGHT])
    .attr("font-family", "sans-serif")
    .attr("font-size", "10")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("text-anchor", "middle")
    svg.append("g")

    // Point stuff
    const points = g => {
        data.forEach((d,i)=> {
            var point = g.append("g")
                .attr("transform", `translate(${xValues(d.price)},${yValues(d.deliciousness)})`)
            var circle = point.append("circle")
                .attr("fill", getColorForData(d, nameDict, colorScale, colorValues))
                .attr("r", CIRCLE_RADIUS)
                .attr("stroke", "white")
                .attr("stroke-width", 1)
                .attr("cx", 0)
                .attr("cy", 0)
                .on("mouseover", () => {
                    svg.select(`#pointTooltip${i}`).transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity",1)
                    text.transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity", 0)
                    svg.select(`#pointTooltip${i}`).attr("pointer-events", "auto")
                })
                .on("mouseout", () => {
                    svg.select(`#pointTooltip${i}`).transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity",0)
                        .on("end", ()=>svg.select(`#pointTooltip${i}`).attr("pointer-events", "none"))
                    text.transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity", 1)
                })

            var text = point.append("text")
                .attr("fill", "white")
                .attr("x", namePos(d.price)*d['display name'].length)
                .attr("y", -7)
                .attr("opacity", 1)
                .text(d["display name"])
        })
    }

    // This is a separate function so that these can be shown above the points
    const pointTooltips = g => {
        data.forEach((d,i)=>{
            var tooltipContainer = g.append("g")
            .attr("id", `pointTooltip${i}`)
            .attr("transform", `translate(${xValues(d.price)},${yValues(d.deliciousness)})`)
            .attr("opacity", 0)
            .attr("pointer-events", "none")
            // Enable mouseover when point hovered over, and then disable only when fully hidden.
            .on("mouseover", () => {
                tooltipContainer.transition()
                    .duration(250)
                    .ease(d3.easeQuadInOut)
                    .attr("opacity",1)
            })
            .on("mouseout", () => {
                tooltipContainer.transition()
                    .duration(250)
                    .ease(d3.easeQuadInOut)
                    .attr("opacity",0)
                    .on("end", ()=>{tooltipContainer.attr("pointer-events", "none")})
            })
            
            var tooltip = tooltipContainer.append("g")
                .attr("transform", ()=>{
                    var centerX = Math.round(WIDTH/2 + MARGIN.left/2 - MARGIN.right/2)
                    var centerY = Math.round(HEIGHT/2 + MARGIN.top/2 - MARGIN.bottom/2)
                    var xVal = 0
                    var yVal = -TOOLTIP_Y_OFFSET
                    if (xValues(d.price) < centerX) {
                        xVal = TOOLTIP_X_OFFSET
                    } else if (xValues(d.price) > centerX) {
                        xVal = -TOOLTIP_X_OFFSET
                    }
                    if (yValues(d.deliciousness) < centerY) {
                            yVal = TOOLTIP_Y_OFFSET
                        } else if (yValues(d.deliciousness) > centerY) {
                            yVal = -TOOLTIP_Y_OFFSET
                        }
                        return `translate(${xVal},${yVal})`
                    })
                .attr("text-anchor", "start")
            tooltip.append("rect")
                .attr("fill", "#111123")
                .attr("width", TOOLTIP_WIDTH)
                .attr("height", TOOLTIP_HEIGHT)
                .attr("rx", 10)
                .attr("x",-TOOLTIP_WIDTH/2)
                .attr("y",-TOOLTIP_HEIGHT/2)
                .attr("opacity", 0.9)
            tooltip.append("text")
                .attr("fill", "white")
                .attr("x",-65)
                .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*0-(TOOLTIP_HEIGHT/2))
                .text(`Name: ${d['display name']}`)
            tooltip.append("text")
                .attr("fill", "white")
                .attr("x",-65)
                .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*1-(TOOLTIP_HEIGHT/2))
                .text(`Average Price: ${roundToXDecimals(d.price, 2)}`)
            tooltip.append("text")
                .attr("fill", "white")
                .attr("x",-65)
                .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*2-(TOOLTIP_HEIGHT/2))
                .text(`Average Deliciousness: ${roundToXDecimals(d.deliciousness, 2)}`)
            tooltip.append("text")
                .attr("fill", "white")
                .attr("x",-65)
                .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*3-(TOOLTIP_HEIGHT/2))
                .text(`Number of reviews: ${d.reviews}`)
        })
    }
            
    // MultiPoint stuff
    // Get all multiPoints
    multiPointData = []
    for (var i=0; i < data.length; i++) {
        var d = data[i]
        var workingX = xValues(d.price)
        var workingY = yValues(d.deliciousness)
        var multiPoint = {
            "display name": d['display name'],
            price: d.price,
            deliciousness: d.deliciousness,
            points: [d]
        }
        var newData = []
        data.forEach((d2,i2)=>{
            if (i != i2) {
                var xDistance = Math.abs(workingX-xValues(d2.price))
                var yDistance = Math.abs(workingY-yValues(d2.deliciousness))
                if (Math.sqrt(xDistance*xDistance+yDistance*yDistance) < CIRCLE_RADIUS*2) {
                    workingX = (workingX+xValues(d2.price))/2
                    workingY = (workingY+yValues(d2.deliciousness))/2
                    
                    multiPoint['display name'] += " and "+d2['display name']
                    multiPoint.price = (multiPoint.price*multiPoint.points.length + d2.price)/(multiPoint.points.length+1)
                    multiPoint.deliciousness = (multiPoint.deliciousness*multiPoint.points.length + d2.deliciousness)/(multiPoint.points.length+1)
                    multiPoint.points.push(d2)
                } else {
                    newData.push(d2)
                }
            }
        })

        if (multiPoint.points.length > 1) {
            multiPointData.push(multiPoint)
            data = newData
        }
    }
    var multiPoints = g => {
        multiPointData.forEach((d,i)=> {
            var multiPoint = g.append("g")
                .attr("transform", `translate(${xValues(d.price)},${yValues(d.deliciousness)})`)
            var rect = multiPoint.append("rect")
                .attr("fill", getColorForData(d.points[0], nameDict, colorScale, colorValues))
                .attr("width", SQUARE_SIZE)
                .attr("height", SQUARE_SIZE)
                .attr("stroke", "white")
                .attr("stroke-width", 1)
                .attr("x", -4)
                .attr("y", -4)
                .on("mouseover", () => {
                    svg.select(`#multiPointTooltip${i}`).transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity",1)
                    text.transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity", 0)
                    svg.select(`#multiPointTooltip${i}`).attr("pointer-events", "auto")
                })
                .on("mouseout", () => {
                    svg.select(`#multiPointTooltip${i}`).transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity",0)
                        .on("end", ()=>resetMultiPointTooltip(i))
                    text.transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity", 1)
                })

            var text = multiPoint.append("text")
                .attr("fill", "white")
                .attr("x", namePos(d.price)*d['display name'].length)
                .attr("y", -7)
                .attr("opacity", 1)
                .text(d["display name"])
        })
    }
    
    // This is a separate function so that these can all be shown above the points
    var scrollAmount = 0
    const multiPointTooltips = g => {
        // This cuts off everything outside the tooltip so we can scroll by moving the tooltip, like a rolling theater.
        svg.append("clipPath")
            .attr("id", `multiPointTooltipCutOff`)
            .append("rect")
            .attr("width", TOOLTIP_WIDTH+TOOLTIP_ARROW_OFFSET)
            .attr("height", TOOLTIP_HEIGHT)
            .attr("rx", 10)
            .attr("x",-TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
            .attr("y",-TOOLTIP_HEIGHT/2)
        multiPointData.forEach((d,i)=> {
            var multiPointTooltipContainer = g.append("g")
                .attr("id", `multiPointTooltip${i}`)
                .attr("transform", `translate(${xValues(d.price)},${yValues(d.deliciousness)-scrollAmount})`)
                .attr("opacity", 0)
                .attr("pointer-events", "none")
                // Enable mouseover when point hovered over, and then disable only when fully hidden.
                .on("mouseover", () => {
                    multiPointTooltipContainer.transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity",1)
                })
                .on("mouseout", () => {
                    multiPointTooltipContainer.transition()
                        .duration(250)
                        .ease(d3.easeQuadInOut)
                        .attr("opacity",0)
                        .on("end", ()=>resetMultiPointTooltip(i))
                }).on("mousewheel", (e)=> {
                    e.preventDefault()
                    scrollAmount += (TOOLTIP_HEIGHT/4)*e.deltaY/100
                    // Keep scroll in bounds of tooltip
                    if (scrollAmount < 0) {
                        scrollAmount = 0
                    } else if (scrollAmount > TOOLTIP_HEIGHT*(d.points.length-1)) {
                        scrollAmount = TOOLTIP_HEIGHT*(d.points.length-1)
                    }

                    // Check arrow points.
                    if (scrollAmount == 0) {
                        arrowTopLeft.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 0)
                        arrowTopRight.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 0)
                    } else {
                        arrowTopLeft.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 1)
                        arrowTopRight.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 1)
                    }

                    if (scrollAmount == TOOLTIP_HEIGHT*(d.points.length-1)) {
                        arrowBottomLeft.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 0)
                        arrowBottomRight.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 0)
                    } else {
                        arrowBottomLeft.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 1)
                        arrowBottomRight.transition()
                            .duration(100)
                            .ease(d3.easeQuadInOut)
                            .attr("opacity", 1)
                    }

                    // Move all the stuff
                    multiPointTooltip.selectAll("circle").transition()
                        .duration(70)
                        .ease(d3.easeQuadInOut)
                        .attr("transform", `translate(0,${-scrollAmount})`)
                    multiPointTooltip.selectAll("text").transition()
                        .duration(70)
                        .ease(d3.easeQuadInOut)
                        .attr("transform", `translate(0,${-scrollAmount})`)
                })
                
            var multiPointTooltip = multiPointTooltipContainer.append("g")
                    .attr("transform", ()=>{
                        var centerX = Math.round(WIDTH/2 + MARGIN.left/2 - MARGIN.right/2)
                        var centerY = Math.round(HEIGHT/2 + MARGIN.top/2 - MARGIN.bottom/2)
                        var xVal = 0
                        var yVal = -TOOLTIP_Y_OFFSET
                        if (xValues(d.price) < centerX) {
                            xVal = TOOLTIP_X_OFFSET - TOOLTIP_ARROW_OFFSET/2
                        } else if (xValues(d.price) > centerX) {
                            xVal = -TOOLTIP_X_OFFSET - TOOLTIP_ARROW_OFFSET/2
                        }
                        if (yValues(d.deliciousness) < centerY) {
                            yVal = TOOLTIP_Y_OFFSET
                        } else if (yValues(d.deliciousness) > centerY) {
                            yVal = -TOOLTIP_Y_OFFSET
                        }
                        return `translate(${xVal},${yVal})`
                    })
                    .attr("text-anchor", "start")
                    .attr("clip-path", `url(#multiPointTooltipCutOff)`)
            multiPointTooltip.append("rect")
                .attr("fill", "#111123")
                .attr("width", TOOLTIP_WIDTH+TOOLTIP_ARROW_OFFSET)
                .attr("height", TOOLTIP_HEIGHT*d.points.length)
                .attr("rx", 10)
                .attr("x",-TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y",-TOOLTIP_HEIGHT/2)
                .attr("opacity", 0.9)
            
            var arrowTopLeft = multiPointTooltip.append("line")
                .attr("id","arrowTop")
                .attr("stroke", "white")
                .attr("x1", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2-5)
                .attr("y1", 10-TOOLTIP_HEIGHT/2+5)
                .attr("x2", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y2", 10-TOOLTIP_HEIGHT/2)
                .attr("opacity", 0)
            var arrowTopRight = multiPointTooltip.append("line")
                .attr("id","arrowTop")
                .attr("stroke", "white")
                .attr("x1", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2+5)
                .attr("y1", 10-TOOLTIP_HEIGHT/2+5)
                .attr("x2", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y2", 10-TOOLTIP_HEIGHT/2)
                .attr("opacity", 0)
            var arrowMid = multiPointTooltip.append("line")
                .attr("stroke", "white")
                .attr("x1", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y1", 10-TOOLTIP_HEIGHT/2)
                .attr("x2", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y2", TOOLTIP_HEIGHT-10-TOOLTIP_HEIGHT/2)
            var arrowBottomLeft = multiPointTooltip.append("line")
                .attr("id","arrowBottom")
                .attr("stroke", "white")
                .attr("x1", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2-5)
                .attr("y1", TOOLTIP_HEIGHT-10-TOOLTIP_HEIGHT/2-5)
                .attr("x2", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y2", TOOLTIP_HEIGHT-10-TOOLTIP_HEIGHT/2)
                .attr("opacity", 1)
            var arrowBottomRight = multiPointTooltip.append("line")
                .attr("id","arrowBottom")
                .attr("stroke", "white")
                .attr("x1", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2+5)
                .attr("y1", TOOLTIP_HEIGHT-10-TOOLTIP_HEIGHT/2-5)
                .attr("x2", TOOLTIP_WIDTH/2 - TOOLTIP_ARROW_OFFSET/2)
                .attr("y2", TOOLTIP_HEIGHT-10-TOOLTIP_HEIGHT/2)
                .attr("opacity", 1)
            
            d.points.forEach((point, index) => {
                multiPointTooltip.append("circle")
                    .attr("fill", getColorForData(point, nameDict, colorScale, colorValues))
                    .attr("stroke", "white")
                    .attr("stroke-width", 1)
                    .attr("cx", -60-TOOLTIP_ARROW_OFFSET/2)
                    .attr("cy", TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*0-(TOOLTIP_HEIGHT/2)+TOOLTIP_HEIGHT*index-5)
                    .attr("r", CIRCLE_RADIUS)
                multiPointTooltip.append("text")
                    .attr("fill", "white")
                    .attr("x",-50-TOOLTIP_ARROW_OFFSET/2)
                    .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*0-(TOOLTIP_HEIGHT/2)+TOOLTIP_HEIGHT*index)
                    .text(`Name: ${point['display name']}`)
                multiPointTooltip.append("text")
                    .attr("fill", "white")
                    .attr("x",-65-TOOLTIP_ARROW_OFFSET/2)
                    .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*1-(TOOLTIP_HEIGHT/2)+TOOLTIP_HEIGHT*index)
                    .text(`Average Price: ${roundToXDecimals(point.price, 2)}`)
                multiPointTooltip.append("text")
                    .attr("fill", "white")
                    .attr("x",-65-TOOLTIP_ARROW_OFFSET/2)
                    .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*2-(TOOLTIP_HEIGHT/2)+TOOLTIP_HEIGHT*index)
                    .text(`Average Deliciousness: ${roundToXDecimals(point.deliciousness, 2)}`)
                multiPointTooltip.append("text")
                    .attr("fill", "white")
                    .attr("x",-65-TOOLTIP_ARROW_OFFSET/2)
                    .attr("y",TOOLTIP_TEXT_OFFSET+TOOLTIP_TEXT_JUMP*3-(TOOLTIP_HEIGHT/2)+TOOLTIP_HEIGHT*index)
                    .text(`Number of reviews: ${point.reviews}`)
            })
        })
    }

    var resetMultiPointTooltip = (i) => {
        var tooltip = svg.select(`#multiPointTooltip${i}`)
        scrollAmount = 0
        tooltip.attr("pointer-events", "none")
        tooltip.selectAll("circle")
            .attr("transform", `translate(0,${scrollAmount})`)
        tooltip.selectAll("text").transition()
            .attr("transform", `translate(0,${scrollAmount})`)
        
        tooltip.selectAll("#arrowTop").transition()
            .duration(100)
            .ease(d3.easeQuadInOut)
            .attr("opacity", 0)
        tooltip.selectAll("#arrowBottom").transition()
            .duration(100)
            .ease(d3.easeQuadInOut)
            .attr("opacity", 1)
    }
    
    // Ticks
    var xAxis = svg.append("g")
        .attr("transform", `translate(0,${HEIGHT-MARGIN.bottom})`)
        .attr("color", "white")
        .style("font-size", 15)
        .call(d3.axisBottom(xValues))
    var yAxis = svg.append("g")
        .attr("transform", `translate(${MARGIN.left-YAXIS_OFFSET},0)`)
        .attr("color", "white")
        .style("font-size", 15)
        .call(d3.axisLeft(yValues))

    var yTitle = g => {
        g.append("text")
            .attr("font-family", "sans-serif")
            .attr("font-size", 17)
            .attr("y", 20)
            .attr("x", MARGIN.left)
            .attr("fill", "white")
            .text("Delicousness")
        return g
    }
    var xTitle = g => {
        g.append("text")
            .attr("font-family", "sans-serif")
            .attr("font-size", 17)
            .attr("x", WIDTH/2+MARGIN.left/2-MARGIN.right/2)
            .attr("y", HEIGHT-10)
            .attr("fill", "white")
            .text("Price")
        return g
    }
    var grid = g => g
        .attr("stroke", "white")
        .attr("stroke-opacity", 0.1)
        .call(g => g.append("g")
            .selectAll("line")
            .data(xValues.ticks())
            .join("line")
                .attr("x1", d => 0.5 + xValues(d))
                .attr("x2", d => 0.5 + xValues(d))
                .attr("y1", MARGIN.top)
                .attr("y2", HEIGHT-MARGIN.bottom))
        .call(g => g.append("g")
            .selectAll("line")
            .data(yValues.ticks())
            .join("line")
                .attr("y1", d => 0.5 + yValues(d))
                .attr("y2", d => 0.5 + yValues(d))
                .attr("x1", MARGIN.left)
                .attr("x2", WIDTH - MARGIN.right));
    svg.append("g").call(grid)
    svg.call(yTitle)
    svg.call(xTitle)
    svg.append("g").call(points)
    svg.append("g").call(multiPoints)
    svg.append("g").call(pointTooltips)
    svg.append("g").call(multiPointTooltips)
}

function getColorForData(data, nameDict, colorScale, colorValues) {
    if (data["formatted name"] == "Mom's Cooking") {
        return colorValues[0]
    }
    return colorValues[colorScale(nameDict[data["formatted name"]])]
}

function roundToXDecimals(num, decimals){
    return Number(Math.round(num+'e'+decimals)+'e-'+decimals)
}

function formatName(name) {
    // This is in no way perfect, but this is fun.
    var yeOldListOfMomsCookingVariants = [
        "moms cooking",
        "moms cookin",
        "moms burgers",
        "moms hamburgers",
        "mothers cooking",
        "mothers cookin",
        "mothers burgers",
        "mothers hamburgers",
        "my moms cooking",
        "my moms cookin",
        "my moms burgers",
        "my moms hamburgers",
        "my mothers cooking",
        "my mothers cookin",
        "my mothers burgers",
        "my mothers hamburgers",
        "moms cooking",
        "moms cookin",
        "moms burger",
        "moms hamburger",
        "mothers cooking",
        "mothers cookin",
        "mothers burger",
        "mothers hamburger",
        "my moms cooking",
        "my moms cookin",
        "my moms burger",
        "my moms hamburger",
        "my mothers cooking",
        "my mothers cookin",
        "my mothers burger",
        "my mothers hamburger",
    ]
    var formattedName = name.replace(/(?!\s)([\W_])/g, "").toLowerCase()
    formattedName = formattedName.replace(/[\s]+/g, " ").toLowerCase()
    if (yeOldListOfMomsCookingVariants.indexOf(formattedName) != -1) {
        return "Mom's Cooking"
    }
    return formattedName
}

async function checkAndSubmitReview() {
    var name = d3.select("#burgerJointName").property("value").trim()
    var formattedName = formatName(name)
    var rawPrice = d3.select("#burgerJointPrice").property("value")
    var price = parseFloat(rawPrice)
    var rawDeliciousness = d3.select("#burgerJointDeliciousness").property("value")
    var deliciousness = parseFloat(rawDeliciousness)
    var group = localStorage.getItem("group")

    if (!group) {
        alert("You don't currently have a group assigned to you. You should be able to enter your group after reloading.")
        return
    }

    if(await validateGroup(group) == false) {
        return
    }

    if (!name || !rawPrice || !rawDeliciousness) {
        alert("Can't have empty fields")
        return
    } else if (isNaN(price)) {
        alert("Price must be a number")
        return
    } else if (isNaN(deliciousness)) {
        alert("Deliciousness must be a number")
        return
    }

    price = roundToXDecimals(price, 2)
    deliciousness = roundToXDecimals(deliciousness, 2)
    
    if (localStorage.getItem(formattedName) && localStorage.getItem("submitBuffer") == "false") {
        var reviewPhrasing = localStorage.getItem(formattedName)+" reviews"
        if (localStorage.getItem(formattedName) == "1") {
            reviewPhrasing = "a review"
        }
        alert("You already submitted "+reviewPhrasing+" for this place! If you really want to again, you may now do so.")
        localStorage.setItem("submitBuffer", true)
        return
    }
    if (name.length < 3) {
        alert("Name must be 3 or more characters.")
        return
    }
    if (formattedName == "Mom's Cooking" && (price != 0 || deliciousness != 110)) {
        var alertString = "Mom's Cooking shall always be of 0 price and 110 deliciousness. "
        if (deliciousness < 110 || price > 0) {
            alertString += "Thou art a fool, to think I would let you change this. "
        }
        if (price > 0) {
            alertString += "Thou has never given payment for the best burgers. "
        } else if (price < 0) {
            alertString += "Thou shall not take payment for Mom's Cooking. "
        }
        if (deliciousness > 110) {
            alertString += "Thou art noble to try and raise deliciousness. However, deliciousness "
        } else if (deliciousness < 110) {
            alertString += "The truth lies in your heart that no burger is better than Mom's Cooking. Deliciousness "
        } else {
            alertString += "Deliciousness "
        }
        alertString += "is only at 110 to show it is better than the rest, " +
            "as this graph cannot contain the power of Mom's Cooking. " +
            "Call Mom and let her know that she makes the best burgers, and thank her for them."
        alert(alertString)
        return
    }
    if (price < 0) {
        alert("Price must be greater than 0.")
        return
    }
    if (formattedName != "Mom's Cooking" && (deliciousness < 0 || deliciousness > 100)) {
        alert("Deliciousness must be between 0 and 100.")
        return
    }

    // Do the actual submitting.
    var token = await getToken()
    if (token == "") {
        return
    }
    submitRequest(name, formattedName, price, deliciousness, group, token)
    .then(()=>{
        if (localStorage.getItem(formattedName)) {
            localStorage.setItem(formattedName, parseInt(localStorage.getItem(formattedName)) + 1)
        } else {
            localStorage.setItem(formattedName, 1)
        }
        d3.select("#burgerJointName").property("value", "")
        d3.select("#burgerJointPrice").property("value", "")
        d3.select("#burgerJointDeliciousness").property("value", "")
        localStorage.setItem("submitBuffer", false)
        main()
    })
    .catch((error)=>{
        console.log("SubmitReviewError: Error from server ("+error.status+"): "+error.error)
        alert(GENERIC_ERROR_MESSAGE)
    })

}

function submitRequest(name, formattedName, price, deliciousness, group, token) {
    return new Promise((resolve, reject)=>{
        var submitRequest = new XMLHttpRequest()
        submitRequest.onreadystatechange = () => {
            if (submitRequest.readyState == XMLHttpRequest.DONE) {
                if (submitRequest.status == 200) {
                    alert("Your review was received!")
                    resolve(submitRequest.responseText)
                    localStorage.setItem("gotNoResponseAlertOk", true)
                    return
                } else if (submitRequest.status == 0) {
                    if (localStorage.getItem("gotNoResponseAlertOk") == "true") {
                        localStorage.setItem("gotNoResponseAlertOk", false)
                        alert(NO_RESPONSE_ERROR_MESSAGE)
                    }
                    return
                }
                reject({error:submitRequest.responseText, status: submitRequest.status})
                return
            }
        }
        submitRequest.open("POST", window.location.pathname + "api")
        submitRequest.send(`{
            "name": "${name}",
            "formattedName": "${formattedName}",
            "price": ${price},
            "deliciousness": ${deliciousness},
            "group": "${group}",
            "token": "${token}"
        }`)
    })
}

async function validateGroup(group) {
    var isValid = false
    var token = await getToken()
    if (token == "") {
        return
    }
    await groupRequest(group, token)
    .then(()=>{
        d3.select("#groupInputContainer").style("display", "none")
        d3.select("#submitInputContainer").style("display", null)
        d3.select("#groupNameInput").property("value", "")
        localStorage.setItem("group", group)
        isValid = true
    })
    .catch((error)=>{
        console.log("ValidateGroupError: Error from server ("+error.status+"): "+error.error)
        if (error.status == 401) {
            // https://http.cat/401
            if (error.error.includes("group")) {
                alert("Your group is either disabled or doesn't exist. Please try again later.")
                d3.select("#groupInputContainer").style("display", null)
                d3.select("#submitInputContainer").style("display", "none")
                localStorage.removeItem("group")
            }
        }
        alert(GENERIC_ERROR_MESSAGE)
    })
    return isValid
}

function groupRequest(group, token) {
    return new Promise((resolve, reject)=>{
        var groupRequest = new XMLHttpRequest()
        groupRequest.onreadystatechange = () => {
            if (groupRequest.readyState == XMLHttpRequest.DONE) {
                if (groupRequest.status == 200) {
                    resolve(groupRequest.responseText)
                    localStorage.setItem("gotNoResponseAlertOk", true)
                    return
                } else if (groupRequest.status == 0) {
                    if (localStorage.getItem("gotNoResponseAlertOk") == "true") {
                        localStorage.setItem("gotNoResponseAlertOk", false)
                        alert(NO_RESPONSE_ERROR_MESSAGE)
                    }
                    return
                }
                reject({error:groupRequest.responseText, status: groupRequest.status})
                return
            }
        }
        groupRequest.open("PUT", window.location.pathname + "api")
        groupRequest.send(`{"group": "${group}", "token": "${token}"}`)
    })
}

async function getToken() {
    var token = ""
    await getCSRFTokenRequest().then((tokenJSON)=>{
        var parsedToken = JSON.parse(tokenJSON)
        token = parsedToken.token
    }).catch((error) => {
        if (error.status == 429) {
            // https://http.cat/429
            alert("There are too many requests coming from your network. Please try again in a bit.")
        }
        console.log("TokenError: Error from server ("+error.status+"): "+error.error)
        alert(GENERIC_ERROR_MESSAGE)
    })
    return token
}

function getCSRFTokenRequest() {
    return new Promise((resolve, reject)=>{
        var getTokenRequest = new XMLHttpRequest()
        getTokenRequest.onreadystatechange = () => {
            if (getTokenRequest.readyState == XMLHttpRequest.DONE) {
                if (getTokenRequest.status == 200) {
                    resolve(getTokenRequest.responseText)
                    localStorage.setItem("gotNoResponseAlertOk", true)
                    return
                } else if (getTokenRequest.status == 0) {
                    if (localStorage.getItem("gotNoResponseAlertOk") == "true") {
                        localStorage.setItem("gotNoResponseAlertOk", false)
                        alert(NO_RESPONSE_ERROR_MESSAGE)
                    }
                    return
                }
                reject({error:getTokenRequest.responseText, status: getTokenRequest.status})
                return
            }
        }
        getTokenRequest.open("GET", window.location.pathname + "api/tokens")
        getTokenRequest.send()
    })
}

function handleGroupCheck() {
    var groupNameInput = d3.select("#groupNameInput").property("value")
    if (groupNameInput == "") {
        alert("Can't have empty group name.")
        return
    }
    validateGroup(groupNameInput)
}

function handleGroupEnter(e) {
    if (e.key == "Enter" || e.keyCode == 13 || e.code == "Enter") {
        e.preventDefault()
        handleGroupCheck()
    }
}


function handleEnter(e) {
    if (e.key == "Enter" || e.keyCode == 13 || e.code == "Enter") {
        e.preventDefault()
        checkAndSubmitReview()
    }
}

async function getData () {
    return d3.csv(window.location.pathname + "api", d3.autoType).then((data)=>{
        localStorage.setItem("dataGoneAlertOK", true)
        localStorage.setItem("gotNoResponseAlertOk", true)
        return data
    }).catch((error)=>{
        console.log("ERROR", error)
        if (localStorage.getItem("dataGoneAlertOK") == "true") {
            alert("Couldn't get the data. Try reloading in a little bit.")
            localStorage.setItem("dataGoneAlertOK", false)
            localStorage.setItem("gotNoResponseAlertOk", false)
        }
        return []
    })
}

window.onload = () => {
    document.getElementById("submitInputContainer").addEventListener('keydown', handleEnter)
    document.getElementById("groupInputContainer").addEventListener('keydown', handleGroupEnter)
    localStorage.setItem("dataGoneAlertOK", true)
    localStorage.setItem("submitBuffer", false)
    localStorage.setItem("display", false)
    if (localStorage.getItem("group")) {
        validateGroup(localStorage.getItem("group"))
    }
    main()
    setInterval(()=>{
        main()
    },60000)
}