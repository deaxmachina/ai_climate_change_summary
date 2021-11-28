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

/// Set up the tree functions - call them later /// 
const tree = d3.tree().nodeSize([dx, dy])
const diagonal = d3.linkHorizontal()
  .x(d => d.y)
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
    //let height = right.x - left.x + margin.top + margin.bottom;
    // console.log(nodes)
    // if (nodes.length < 30) {
    //   height = 900
    // } else if (nodes.length < 40) {
    //   height = 2200
    // } else {
    //   height = 3500
    // }
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

    ////////////////////////////
    ////////// Nodes ///////////
    ////////////////////////////
    // Just the container groups for nodes
    const gNode = svg.selectAll(".node-g")
      .data([null])
      .join('g')
      .classed("node-g", true)

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
            .on("click", (e, d) => {
              console.log('node was clicked', d)
              d.children = d.children ? null : d._children;
              update(d);
            })
          // Add the rects for boxes on nodes
          nodeEnter.append('rect')
            .attr("fill", d => d.data.children ? nodeDarkColour : nodeColour)
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
        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .attr("x", d => d.datachildren ? 0 : 10)
            .attr("text-anchor", d => d.data.children ? "middle" : "start")
            .style("fill", d => d.data.children ? textLightColour : textDarkColour)
            .text(d => d.data.name)

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
  }

  // Call the update function
  update(root)
     
}

graph()

