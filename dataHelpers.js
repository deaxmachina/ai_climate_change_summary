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

export { processDataForTree }