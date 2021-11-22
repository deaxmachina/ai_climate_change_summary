let data = {} 


///////////////////////////////////////////
//////////////// Constants ////////////////
///////////////////////////////////////////
const width = 900; 
const height = 800; 
const margin = ({top: 10, right: 120, bottom: 10, left: 100})
const dy = width/6
const dx = 10 

const tree = d3.tree().nodeSize([dx, dy])
const diagonal = d3.linkHorizontal()
  .x(d => d.y)
  .y(d => d.x)

///////////////////////////////////////////////////
/////////// Main Graph Wrapper Function ///////////
//////////////////////////////////////////////////
async function graph() {
  const rawData = await d3.json("./data/flare-2.json");
  const data = rawData
  const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-margin.left, -margin.top, width, dx])
    .style("font", "10px sans-serif")
    .style("user-select", "none")
    .style('background-color', 'pink')
  svg.call(treeGraph, data) 
}

///////////////////////////////////////////////////
/////////////// Tree Graph Function ///////////////
//////////////////////////////////////////////////
function treeGraph (svg, data) {

  // Data processing 
  const root = d3.hierarchy(data)
  root.x0 = dy/2
  root.y0 = 0
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    //if (d.depth && d.data.name.length !== 7) d.children = null
    if (d.depth) d.children = null
  })

  // container for the whole tree
  // const g = svg.selectAll(".tree-g")
  //   .data([null])
  //   .join("g")
  //   .classed("tree-g", true)
  //     .attr('transform', `translate(${width/4}, ${height/2})`)

  const gLink = svg.append('g')
    .attr('fill', 'none')
    .attr('stroke', '#555')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', 1.5)

  const gNode = svg.append('g')
    .attr('cursor', 'pointer')
    .attr('pointer-events', 'all')

  function update(source) {
      const duration = d3.event && d3.event.altKey ? 2500 : 250;
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
  
      const height = right.x - left.x + margin.top + margin.bottom;
  
      const transition = svg.transition()
        .duration(duration)
        .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
        .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

      // const transition = g.transition()
      //     .duration(duration)
      //     .tween("resize", window.ResizeObserver ? null : () => () => g.dispatch("toggle"))

      // Update the nodes…
      const node = gNode.selectAll("g")
        .data(nodes, d => d.id)
        .join(
          enter => { //enter new nodes at parent's prev pos
            const nodeEnter = enter.append('g')
              .attr("transform", d => `translate(${source.y0},${source.x0})`)
              .attr("fill-opacity", 0)
              .attr("stroke-opacity", 0)
              // .on("click", (e, d) => {
              //   console.log('node was clicked', d)
              //   d.children = d.children ? null : d._children;
              //   update(d);
              // });

            nodeEnter.append('circle')
              .attr("r", 5)
              .attr("fill", d => d._children ? "#555" : "#999")
              .attr("stroke-width", 10)
              .on("click", (e, d) => {
                console.log('node was clicked', d)
                d.children = d.children ? null : d._children;
                update(d);
              });

            nodeEnter.append("text")
              .attr("dy", "0.31em")
              .attr("x", d => d._children ? -6 : 6)
              .attr("text-anchor", d => d._children ? "end" : "start")
              .text(d => d.data.name)
            .clone(true).lower()
              .attr("stroke-linejoin", "round")
              .attr("stroke-width", 3)
              .attr("stroke", "white")

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


      // Update the links…
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

      // Stash the old positions for transition.
      root.eachBefore(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      })
    }
    update(root);
  
}

// call the graph 
graph()