import type { RuntimeResolver } from '../RuntimeResolver'
import { NodeFsAdapter } from './NodeFsAdapter'
import { matchesEnvironment } from './detect'

export const nodeResolver: RuntimeResolver = {
    runtime: 'node',
    matchesEnvironment,
    create: () => new NodeFsAdapter(),
}
