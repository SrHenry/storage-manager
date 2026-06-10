import { registerRuntime } from '../resolve'
import { nodeResolver } from './resolver'

registerRuntime(nodeResolver)
