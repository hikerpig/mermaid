import * as d3 from 'd3'
import graphlib from 'graphlibrary'
import dagre from 'dagre-layout'
import dagreD3 from 'dagre-d3-renderer'

import { logger } from '../../logger'
import { parser } from './parser/stateDiagram'
import stateDb, { getParentStateId } from './stateDb'

parser.yy = stateDb

const conf = {
  diagramMarginX: 50,
  diagramMarginY: 30,
  // Margin between states
  stateMargin: 50,
  // Width of state boxes
  width: 150,
  // Height of state boxes
  height: 65,
  stateFontSize: 14,
  stateFontFamily: '"Open-Sans", "sans-serif"',
  // Margin around loop boxes
  boxMargin: 10,
  boxTextMargin: 5,
  noteMargin: 10
}

function formatElementId (id) {
  return id.replace(/\//g, '__')
}

/**
 * Setup arrow head and define the marker. The result is appended to the svg.
 */
function insertArrowHead (elem) {
  elem
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('refX', 5)
    .attr('refY', 2)
    .attr('markerWidth', 6)
    .attr('markerHeight', 4)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 0,0 V 4 L6,2 Z') // this is actual shape for arrowhead
}

function createLine (edge, points) {
  const line = d3.line()
    .x(function (d) { return d.x })
    .y(function (d) { return d.y })

  line.curve(edge.curve || d3.curveLinear)

  return line(points)
}

/**
 * Draw state box
 */
function drawState (diagram, id, state) {
  // console.log('drawState', id, state)
  const stateInfo = {
    id,
    elementId: formatElementId(id),
    // label: state.name,
    labelType: 'html',
    label: `<div>
      <div class="state__name">${state.name}</div>
      <div class="state__description">${state.description}</div>
    </div>`,
    clusterLabelPos: 'top',
    class: 'state'
  }
  return stateInfo
}

/**
 * Draws a state diagram in the tag with id: id based on the graph definition in text.
 * @param text
 * @param id
 */
export const draw = function (text, id) {
  parser.yy.clear()
  parser.parse(text + '\n')

  window.d3 = d3

  const diagram = d3.select(`[id='${id}']`)

  // setup some elements
  insertArrowHead(diagram)

  // Create the renderer
  const renderGraph = new dagreD3.render() // eslint-disable-line

  // Fetch data from the parsing
  const states = parser.yy.getStates()
  const transitions = parser.yy.getTransitions()

  // Layout graph, Create a new directed graph
  const graph = new graphlib.Graph({
    directed: true,
    compound: true,
    multigraph: true
  })
  graph.setGraph({
    isMultiGraph: true
  })

  const stateKeys = Object.keys(states).sort((a, b) => { return a.length - b.length })
  const stateInfoCache = {}
  for (let i = 0; i < stateKeys.length; i++) {
    const key = stateKeys[i]
    const state = states[key]
    const stateInfo = drawState(diagram, key, state)
    graph.setNode(key, stateInfo)

    const parentId = getParentStateId(state)
    const parentInfo = parentId ? stateInfoCache[parentId] : null
    if (parentInfo) {
      if (!parentInfo.children) parentInfo.children = []
      parentInfo.children.push(stateInfo)
      graph.setParent(key, parentInfo.id)
    }

    stateInfoCache[key] = stateInfo
  }

  // Due to draw edge error while in composite node, https://github.com/dagrejs/dagre-d3/issues/319
  // needs to draw edges after dagre rendering done
  const extraEdgeInfos = []

  transitions.forEach(transition => {
    const fromInfo = stateInfoCache[transition.from]
    const toInfo = stateInfoCache[transition.to]
    if ((fromInfo && toInfo) && (fromInfo.children || toInfo.children)) {
      extraEdgeInfos.push({
        transition,
        fromInfo,
        toInfo
      })
      return
    }
    graph.setEdge(transition.from, transition.to, {
      id: [transition.from, transition.to].join('-'),
      class: 'state__line',
      labelType: 'text',
      label: transition.description,
      arrowhead: 'normal'
    })
  })

  graph.nodes().forEach(function (id) {
    const node = graph.node(id)
    if (id && typeof node !== 'undefined') {
      d3.select('#' + node.elementId).attr(
        'transform',
        'translate(' +
          (node.x - node.width / 2) +
          ',' +
          (node.y - node.height / 2) +
          ' )'
      )
    }
  })

  // Run the renderer. This is what draws the final graph.
  const element = d3.select('#' + id + ' g').attr('class', 'state-diagram')
  renderGraph(element, graph)

  console.log('element', element)
  // const outerLines = d3.create('g').attr('class', 'outerLines')
  const outerLines = element.select('g')
    .append('g')
    .attr('class', 'outerLines')

  extraEdgeInfos.forEach(({ transition, fromInfo, toInfo }) => {
    const fromBox = element.select(`#${fromInfo.elementId}`).node(0).getBBox()
    const toBox = element.select(`#${toInfo.elementId}`).node(0).getBBox()
    const fromCenter = { x: fromInfo.x, y: fromInfo.y }
    const toCenter = { x: toInfo.x, y: toInfo.y }
    const tangent = (toCenter.y - fromCenter.y ) / (toCenter.x - fromCenter.x)

    const lineFromX = fromCenter.x + fromBox.width * 0.5 * (toCenter.x > fromCenter.x ? 1: -1)
    const lineFromY = fromCenter.y + tangent * (lineFromX - fromCenter.x)
    const lineFrom = { x: lineFromX, y: lineFromY }

    const lineToX = toCenter.x + toBox.width * 0.5 * (toCenter.x > fromCenter.x ? -1: 1)
    const lineToY = fromCenter.y + tangent * (lineToX - fromCenter.x)
    const lineTo = { x: lineToX, y: lineToY }
    const line = createLine({}, [lineFrom, lineTo])
    outerLines
      .append('g').attr('class', 'edgePath')
      .append('path')
      .attr('class', 'path')
      .attr('d', line)
    // console.log('fromEle', fromEle)
  })

  const diagramBox = diagram.node().getBBox()
  diagram.attr('height', '100%')
  diagram.attr('width', '100%')
  diagram.attr(
    'viewBox',
    '0 0 ' + (diagramBox.width + 20) + ' ' + (diagramBox.height + 20)
  )
}

export default {
  draw
}
