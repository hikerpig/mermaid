export const LINETYPE = {
  SOLID: 0,
  DOTTED: 1,
  NOTE: 2,
  SOLID_CROSS: 3,
  DOTTED_CROSS: 4,
  SOLID_OPEN: 5,
  DOTTED_OPEN: 6
}

/**
 * @typedef {Object} State
 * @property {String} id
 * @property {String} name
 * @property {String} description
 */

/**
 * @type {{[ key: string ]: State}}
 */
let states = {}

let transitions = []

/**
 * @type {String[]}
 */
let stateStack = []

export const manipStateStack = function (type, name) {
  // console.log('manip', type, name)
  switch (type) {
    case 'pop':
      stateStack.pop()
      break
    case 'push':
      stateStack.push(name)
      break
  }
}

const STATE_NAME_DELIMITER = '/'

function formStateId (name) {
  return [...stateStack, name].join(STATE_NAME_DELIMITER)
}

export const addState = function (name, desc) {
  const id = formStateId(name)
  // console.log(`addState id: ${id}`, name, desc)
  const old = states[id]
  if (old && name === old.name && desc === old.description) return
  const description = desc || (old ? old.description : '')
  states[id] = { name, description, id }
}

export const getStates = function () {
  return states
}

/**
 * get parent state id
 * @param {State} state
 * @return {String|null}
 */
export const getParentStateId = function (state) {
  const segs = state.id.split(STATE_NAME_DELIMITER)
  segs.pop()
  if (!segs.length) return null
  return segs.join(STATE_NAME_DELIMITER)
}

export const addTransition = function (from, to, description) {
  const fromId = formStateId(from)
  const toId = formStateId(to)
  transitions.push({ from: fromId, to: toId, description: description || '' })
}

export const getTransitions = function () {
  return transitions
}

export const apply = function (param) {
  // console.log('apply', param)
  if (param instanceof Array) {
    param.forEach(function (item) {
      apply(item)
    })
  } else {
    switch (param.type) {
      case 'addState':
        addState(param.name, param.description)
        break
      case 'addTransition':
        addTransition(param.from, param.to, param.description)
        break
    }
  }
}

export const clear = function () {
  states = {}
  transitions = []
}

export default {
  LINETYPE,
  manipStateStack,
  getStates,
  getTransitions,
  apply,
  clear
}
