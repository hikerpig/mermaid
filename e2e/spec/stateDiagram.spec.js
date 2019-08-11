/* eslint-env jest */
import { imgSnapshotTest } from '../helpers/util.js'
const { toMatchImageSnapshot } = require('jest-image-snapshot')

expect.extend({ toMatchImageSnapshot })

describe('State Diagragm', () => {
  it('should render a simple state diagram', async () => {
    await imgSnapshotTest(page, `
    stateDiagram

    Idle --> Configuring
    Configuring --> Idle : EvConfig
    `,
    {})
  })
})
