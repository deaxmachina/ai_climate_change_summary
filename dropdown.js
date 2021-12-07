const mlKeywords = [
  "causal inference",
  "computer vision",
  "generative models",
  "interpretable ML",
  "natural language processing",
  "recommender systems",
  "reinforcement learning",
  "time-series",
  "transfer learning",
  "uncertainty quantification",
  "unsupervised learning",
]

const dropdownML = d3.select('.dropdown-menu')

const dropdownMLContainer = dropdownML.selectAll('div')
  .data(mlKeywords)
  .join('div')

dropdownMLContainer.append('input')
  .attr('type', 'checkbox')
  .attr('name', d =>d )
  .attr('value', d => d)
  .classed('checkbox-item', true)

dropdownMLContainer.append('label')
. classed('checkbox-label', true)
  .attr('for', d => d)
  .html(d => d)


let allCheckBox = document.querySelectorAll('.checkbox-item')

// const selectedValues = []
// allCheckBox.forEach((checkbox) => { 
//   checkbox.addEventListener('change', (event) => {
//     if (event.target.checked) {
//       selectedValues.push(event.target.value)
//     } else {
//       const index = selectedValues.indexOf(event.target.value);
//       if (index > -1) {
//         selectedValues.splice(index, 1);
//       }
//     }
//     console.log(selectedValues)
//     graph(selectedValues)
//   })
// })

// To just get the last selected value of a checkbox and draw graph with 
// filter for that value; we want to do that with an array of selected values 
let selectedValue
allCheckBox.forEach((checkbox) => { 
  checkbox.addEventListener('change', (event) => {
    if (event.target.checked) {
      selectedValue = event.target.value
    } 
    console.log(selectedValue)
    graph(filtered=true, selectedValue)
  })
})

// Useful code for intersection of arrays
// let intersection = ['one', 'two', 'three'].filter(x => ['one', 'two'].includes(x));
// console.log(intersection)
