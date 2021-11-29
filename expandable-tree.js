let data = {} 

///////////////////////////////////////////
//////////////// Constants ////////////////
///////////////////////////////////////////
const width = 1300; 
let height = 1000;
const margin = ({top: 100, right: 120, bottom: 100, left: 150})
const nodeWidth = 250;
const nodeWidthExtra = 135;
const nodeHeight = 38;

// const treeHorizontalStretch = 45
// const treeVerticalStretch = 1
// const dy = 50
// const dx = 45
const dy = width/4
const dx = 45

const linkColour = "#8F9294"
const nodeColour = "#fff" //"#EAEDF0"
const nodeDarkColour = "#8F9294"
const nodeHoverColour = "#BDBDCD"

const textDarkColour = '#76797a'
const textLightColour = '#fff'

const heighLeverageCol = "#448D9A"// original - '#3273B0'; other - "#448D9A"
const uncertainImpactCol = "#F0A63B" // original - '#D4B13B'; other - "#F0A63B"
const longTermCol = "#DD4066"// original - '#33764D'; other - "#DD4066"

// select elements of the pop-up info box for nodes info - will display on node click
// TODO: this should be added and removed because it interferes with interactions otherwise
// const selectedNodeInfo = d3.select(".selected-node-info")
// const selectedNodeInfoTitle = selectedNodeInfo.select("h3")
// const selectedNodeInfoSummary = selectedNodeInfo.select("p")
// const selectedNodeInfoTags = selectedNodeInfo.select('div')

// To add and remove the DOM elements for the pop-up info box on click of nodes
const addNodeInfoBox = () => {
  const selectedNodeInfo = d3.select('body').append('div').classed('selected-node-info', true)
  const selectedNodeInfoTitle = selectedNodeInfo.append('h3')
  const selectedNodeInfoSummary = selectedNodeInfo.append("p")
  const selectedNodeInfoButton = selectedNodeInfo.append('button').append('a').html('Read More')
  const selectedNodeInfoTags = selectedNodeInfo.append('div').classed('selected-node-info__tags', true)
  const selection = {selectedNodeInfo, selectedNodeInfoTitle, selectedNodeInfoSummary, selectedNodeInfoButton, selectedNodeInfoTags}
  return selection
}
const removeNodeInfoBox = () => {
  d3.selectAll('.selected-node-info').remove()
}

///////////////////////////////////////////
//////////// Helper Functions /////////////
///////////////////////////////////////////

// process the data in the name-children format for d3 hierarcy
const processDataForTree = rawData => {
  let processedData = []
  rawData.forEach(d => {
    processedData.push({
      name: d.title,
      children: [...d.subsections]
    })
  })
  // so children also have a 'name' property
  processedData.forEach(d => {
    d.children.forEach(child => {
      child.name = child.title
    })
  })
  data['name'] = 'Application Area'
  data['children'] = [...processedData]
  return data
}

/// Set up the tree functions - call them later /// 
const tree = d3.tree().nodeSize([dx, dy])
const diagonal = d3.linkHorizontal()
  .x(d => d.y-10)
  .y(d => d.x)


///////////////////////////////////////////////////
/////////// Main Graph Wrapper Function ///////////
//////////////////////////////////////////////////
async function graph() {
  const rawData = await d3.json("./data/section-summaries.json");
  const data = processDataForTree(rawData)
  const svg = d3.select("svg")
    //.style('background-color', 'pink')
    .attr("width", width)
    .attr("height", height)
    .style('overflow', 'auto')
    //.attr("viewBox", [-margin.left, -margin.top, 0, 0])

  svg.call(treeGraph, data) 
}


///////////////////////////////////////////////////
/////////////// Tree Graph Function ///////////////
//////////////////////////////////////////////////
function treeGraph (svg, data) {

  const root = d3.hierarchy(data)
  // root.dx = treeHorizontalStretch; // horizontal spread of the nodes 
  // root.dy = width / (root.height + treeVerticalStretch) // vertical spread of the tree (how 'squished' it is)
  root.x0 = dy/2
  root.y0 = 0
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    if (d.depth) d.children = null
  })

  ////////////////////////////
  /////// Glow Filter ////////
  ////////////////////////////
  // from Nadieh Bremer https://www.visualcinnamon.com/2016/06/glow-filter-d3-visualization/ 
  const defs = svg.append("defs");
  const filter = defs.append("filter")
      .attr("id","glow");
  filter.append("feGaussianBlur")
      .attr("stdDeviation","1.5")
      .attr("result","coloredBlur");
  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode")
      .attr("in","coloredBlur");
  feMerge.append("feMergeNode")
      .attr("in","SourceGraphic");


  ////////////////////////////////////
  ////////// Tree Content ///////////
  //////////////////////////////////
  // All the code for the tree that updates dynamically on click 
  // of the nodes, as well as change height based on num nodes to show

  function update(source) {
    const duration = d3.event && d3.event.altKey ? 250 : 250;
    const nodes = root.descendants().reverse();
    const links = root.links();

    // Compute the new tree layout.
    tree(root);

    let left = root;
    let right = root;
    root.eachBefore(node => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    // Control the height of the svg with um nodes
    height = nodes.length*50 // better solution

    const transition = svg.transition()
      .duration(duration)
      .attr('height', height)
      .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
      .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));


    ////////////////////////////
    ////////// Links ///////////
    ////////////////////////////
    // Just the container groups for links 
    const gLink = svg.selectAll(".link-g")
    .data([null])
    .join("g")
    .classed("link-g", true)
      .attr("fill", 'none')
      .attr('stroke', linkColour)
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 1)
      .attr("stroke-dasharray", "2 1")

    //////////////////////////////
    // Links content and update //
    //////////////////////////////
    const link = gLink.selectAll("path")
      .data(links, d => d.target.id)
      .join(
       enter => {
         const enterLink = enter.append('path')
           .attr("d", d => {
             const o = {x: source.x0, y: source.y0}
             return diagonal({source: o, target: o})
           })
         return enterLink
       },
       update => update,
       exit => {
         exit.transition(transition).remove()
           .attr("d", d => {
             const o = {x: source.x, y: source.y}
             return diagonal({source: o, target: o})
           })
       }
     )
     .transition(transition)
       .attr("d", diagonal)

    
    ////////////////////////////
    ////////// Nodes ///////////
    ////////////////////////////
    // Just the container groups for nodes
    const gNode = svg.selectAll(".node-g")
      .data([null])
      .join('g')
      .classed("node-g", true)

    //////////////////////////////
    // Nodes content and update //
    //////////////////////////////
    const node = gNode.selectAll("g")
    .data(nodes, d => d.id)
      .join(
        enter => { //enter new nodes at parent's prev pos
          const nodeEnter = enter.append('g')
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .style("cursor", "pointer")
            .on("click", (e, datum) => {
              datum.children = datum.children ? null : datum._children;
              update(datum)
              //make the pop-up info box visible and populate with info about node
              if (!datum.children && datum.data.title) {
                gNode.attr("opacity", 0.2)
                gLink.attr("opacity", 0.1)

                const {selectedNodeInfo, selectedNodeInfoTitle, selectedNodeInfoSummary, selectedNodeInfoButton, selectedNodeInfoTags} = addNodeInfoBox()
                selectedNodeInfo.classed("visible", true)
                selectedNodeInfoTitle.text(datum.data.title)
                selectedNodeInfoSummary.text(datum.data.summary)
                // add link to the paper section on click of button
                selectedNodeInfoButton.attr('href', `https://www.climatechange.ai/paper#${datum.data.pdf_location}`)
                selectedNodeInfoTags.selectAll("div")
                  .data([...datum.data.topic_keywords, ...datum.data.ml_keywords, ...datum.data.thematic_keywords])
                  .join("div")
                  .text(d => `#${d}`) 
              }
            })
            .on("mouseover", function(e, datum) {
              nodeShape
                .attr('fill', d => d === datum ? nodeHoverColour : d.children ? nodeDarkColour : nodeColour)
              nodeText
                .style('fill', d => d === datum ? '#fff' : d.children ? textLightColour : textDarkColour)
            })
            .on("mouseout", function(e, datum) {
              nodeShape
                .attr("fill", d => d.children ? nodeDarkColour : nodeColour)
              nodeText
                .style("fill", d => d.children ? textLightColour : textDarkColour)
            })
          // Add the rects for boxes on nodes
          const nodeShape = nodeEnter.append('rect')
            .attr("fill", d => d.children ? nodeDarkColour : nodeColour)
            .attr("stroke", linkColour)
            .attr("stroke-linejoin", 'round')
            .attr("stroke-width", 1)
            //.attr("stroke-dasharray", d => d.children? 'none' : "2 1")
            .attr("width", d => d.data.children ? nodeWidth : nodeWidth + nodeWidthExtra)
            .attr("height", nodeHeight)
            .attr("y", -nodeHeight/2)
            .attr("x", d => d.data.children ? -nodeWidth/2 : 0)
            .attr("rx", '5')
            .style("filter", "url(#glow)")
        // Add the text on rects
        const nodeText = nodeEnter.append("text")
            .attr("dy", "0.35em")
            .attr("x", d => d.datachildren ? 0 : 10)
            .attr("text-anchor", d => d.data.children ? "middle" : "start")
            .style("fill", d => d.children ? textLightColour : textDarkColour)
            .text(d => d.data.name)

        // to the right of each node, add rects for each of the tags 
        nodeEnter.selectAll(".node-tag")
          .data(d => d.data.paper_flags ? d.data.paper_flags : [])
          .join("rect")
          .classed("node-tag", true)
            .attr("width", nodeHeight/1.5)
            .attr('height', nodeHeight)
            .attr("fill", d => d == 'High Leverage' ? heighLeverageCol : d == 'Long-term' ? longTermCol : d == 'Uncertain Impact' ? uncertainImpactCol : 'black')
            .attr("x", (d, i) => (nodeWidth + nodeWidthExtra + 2 + i*nodeHeight/1.5))
            .attr("y", -nodeHeight/2)
            .attr("stroke", 'white')
            .attr("stroke-width", 2)
            .attr("rx", '5')

        return nodeEnter
        }, 
        update => update,
        exit => { //transition exiting nodes to the parent's new position 
          exit.transition(transition).remove()
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);
          return exit;
        }
      )
      .transition(transition)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)


      // Stash the old positions for transition.
      root.eachBefore(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      })

      // on click on the selection (currently whole svg), make the whole graph opaque again
      svg.on("click", function(e, datum){
        // check if the click ocurred on the target or not 
        // if it's "false" then the click did not happen on the target 
        if (this == e.target) {
          gNode.attr("opacity", 1)
          gLink.attr("opacity", 1)
          removeNodeInfoBox()
          selectedNodeInfo.classed("visible", false)
        }
      })

  }

  // Call the update function
  update(root)
     
}

graph()

