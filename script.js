// tidy tree code based on: Mike Bostock https://observablehq.com/@d3/tidy-tree 

let data = {} 

///////////////////////////////////////////
//////////////// Constants ////////////////
///////////////////////////////////////////
const width = 1400; 
const height = 4600; 
const treeHorizontalStretch = 48
const treeVerticalStretch = 2

const linkColour = "#8F9294"

const nodeColour = "#fff" //"#EAEDF0"
const nodeDarkColour = "#8F9294"
const nodeHoverColour = "#BDBDCD"

const textDarkColour = '#76797a'
const textLightColour = '#fff'

const heighLeverageCol = "#448D9A"
const uncertainImpactCol = "#F0A63B"
const longTermCol = "#DD4066"

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

// create tree structure for data
const tree = data => {
  const root = d3.hierarchy(data)
  root.dx = treeHorizontalStretch; // horizontal spread of the nodes 
  root.dy = width / (root.height + treeVerticalStretch) // vertical spread of the tree (how 'squished' it is)
  return d3.tree().nodeSize([root.dx, root.dy])(root)
}


///////////////////////////////////////////////////
/////////// Main Graph Wrapper Function ///////////
//////////////////////////////////////////////////
async function graph() {
  const rawData = await d3.json("./data/section-summaries.json");
  const data = processDataForTree(rawData)
  const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height)
  svg.call(treeGraph, data) 
}


///////////////////////////////////////////////////
/////////////// Tree Graph Function ///////////////
//////////////////////////////////////////////////
function treeGraph (selection, data) {

  const root = tree(data);

  let x0 = Infinity;
  let x1 = -x0;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  // container for the whole tree
  const g = selection.selectAll(".tree-g")
    .data([null])
    .join("g")
    .classed("tree-g", true)
      .attr("transform", `translate(${root.dy/3}, ${root.dx - x0})`)

  ////////////////////////////
  /////// Glow Filter ////////
  ////////////////////////////
  // from Nadieh Bremer https://www.visualcinnamon.com/2016/06/glow-filter-d3-visualization/ 
  const defs = selection.append("defs");
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

  ////////////////////////////
  ////////// Links ///////////
  ////////////////////////////
  const linkG = g.selectAll(".link-g")
    .data([null])
    .join("g")
    .classed("link-g", true)
      .attr("fill", 'none')
      .attr('stroke', linkColour)
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 1)
      .attr("stroke-dasharray", "2 1")

  const link = linkG 
    .selectAll("path")
    .data(root.links())
    .join("path")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
      )

  ////////////////////////////
  ////////// Nodes ///////////
  ////////////////////////////
  const nodeG = g.selectAll(".node-g")
    .data([null])
    .join('g')
    .classed("node-g", true)

  const node = nodeG  
    .selectAll(".node")
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")

  const nodeWidth = 250;
  const nodeWidthExtra = 135;
  const nodeHeight = 38;
  const nodeShape = node.selectAll(".node-circle")
    .data(d => [d])
    .join("rect")
    .classed("node-circle", true)
      // .attr("fill", d => d.children 
      //   ? 'plum' 
      //   : d.data.paper_flags.includes('High Leverage') ? 'hotpink' : 'white'
      // )
      .attr("fill", d => d.children ? nodeDarkColour : nodeColour)
      .attr("stroke", linkColour)
      .attr("stroke-linejoin", 'round')
      .attr("stroke-width", 1)
      //.attr("stroke-dasharray", d => d.children? 'none' : "2 1")
      .attr("width", d => d.children ? nodeWidth : nodeWidth + nodeWidthExtra)
      .attr("height", nodeHeight)
      .attr("y", -nodeHeight/2)
      .attr("x", d => d.children ? -nodeWidth/2 : 0)
      .attr("rx", '5')
      .style("filter", "url(#glow)")

  const nodeText = node.selectAll(".node-text")
    .data(d => [d])
    .join("text")
    .classed("node-text", true)
      .attr("dy", "0.35em")
      .attr("x", d => d.children ? 0 : 10)
      .attr("text-anchor", d => d.children ? "middle" : "start")
      //.attr("text-anchor", "middle")
      .style("fill", d => d.children ? textLightColour : textDarkColour)
      .text(d => d.data.name)

  // to the right of each node, add rects for each of the tags 
  const nodeTags = node.selectAll(".node-tag")
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


  /////////////////////////////////////////////////////////
  //////////////////// Interactions //////////////////////
  ////////////////////////////////////////////////////////

  // on mouse over highlight the selected node and de-hightlight on mouse out
  node.on("mouseover", function(e, datum) {
    nodeShape
      .attr('fill', d => d === datum ? nodeHoverColour : d.children ? nodeDarkColour : nodeColour)
    nodeText
      .style('fill', d => d === datum ? '#fff' : d.children ? textLightColour : textDarkColour)
  })

  node.on("mouseout", function(e, datum) {
    nodeShape
      .attr("fill", d => d.children ? nodeDarkColour : nodeColour)
    nodeText
      .style("fill", d => d.children ? textLightColour : textDarkColour)
  })

  // select elements of the pop-up info box for nodes info - will display on node click
  const selectedNodeInfo = d3.select(".selected-node-info")
  const selectedNodeInfoTitle = selectedNodeInfo.select("h3")
  const selectedNodeInfoSummary = selectedNodeInfo.select("p")
  const selectedNodeInfoTags = selectedNodeInfo.select('div')

  // on node click, make the pop-up info box visible and populate with info about node
  node.on('click', function(e, datum) {
    node.attr("opacity", 0.2)
    link.attr("opacity", 0.1)
    selectedNodeInfo.classed("visible", true)
    selectedNodeInfoTitle.text(datum.data.title)
    selectedNodeInfoSummary.text(datum.data.summary)
    selectedNodeInfoTags.selectAll("div")
      .data(datum.data.topic_keywords)
      .join("div")
      .text(d => `#${d}`)
      
  })

  // on click on the selection (currently whole svg), make the whole graph opaque again
  selection.on("click", function(e, datum){
    // check if the click ocurred on the target or not 
    // if it's "false" then the click did not happen on the target 
    if (this == e.target) {
      node.attr("opacity", 1)
      link.attr("opacity", 1)
      selectedNodeInfo.classed("visible", false)
    }
  });
      
}

graph()

