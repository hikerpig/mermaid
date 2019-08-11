/* eslint-env jasmine */
import { parser } from './parser/stateDiagram'
import stateDb from './stateDb'

const FIXTURES = {
  simple: `stateDiagram

  Idle --> Configuring
  Configuring --> Idle : EvConfig
  `,
  withDescription: `stateDiagram

  A: This is state a
  B: This is state b

  A --> B
  `
}

describe('when parsing a stateDiagram', function () {
  beforeEach(function () {
    parser.yy = stateDb
    parser.yy.clear()
  })
  it('it should handle a stateDiagram definition', function () {
    parser.parse(FIXTURES.simple)
    const states = parser.yy.getStates()
    expect(states.Idle.name).toBe('Idle')
    expect(states.Configuring.name).toBe('Configuring')

    const transitions = parser.yy.getTransitions()
    expect(transitions[0]).toMatchObject({ from: 'Configuring', to: 'Idle', description: 'EvConfig' })
    expect(transitions[1]).toMatchObject({ from: 'Idle', to: 'Configuring' })
  })

  it('it should extract state description', function () {
    parser.parse(FIXTURES.withDescription)
    const states = parser.yy.getStates()
    expect(states.A.description).toBe('This is state a')
    expect(states.B.description).toBe('This is state b')
  })

  it('it should handle a composite state', function () {
    const str = `stateDiagram

    S1 --> Composite1: outer transition

    state Composite1 {
      S1 --> S2 : inner transition
    }
    `

    parser.parse(str)
    const states = parser.yy.getStates()
    expect(states.Composite1.name).toBe('Composite1')
    expect(states['Composite1/S1'].name).toBe('S1')
    expect(states['Composite1/S2'].name).toBe('S2')

    const transitions = parser.yy.getTransitions()
    expect(transitions[0]).toMatchObject({ from: 'S1', to: 'Composite1', description: 'outer transition' })
    expect(transitions[1]).toMatchObject({ from: 'Composite1/S1', to: 'Composite1/S2', description: 'inner transition' })
  })
})
