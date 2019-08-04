import * as d3 from 'd3'

import { logger } from '../../logger'
import { parser } from './parser/stateDiagram'
import stateDb from './stateDb'

parser.yy = stateDb

