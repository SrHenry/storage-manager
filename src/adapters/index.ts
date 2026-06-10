export * from './interfaces'
export type { RuntimeResolver } from './interfaces/RuntimeResolver'
export { registerRuntime, detectRuntime, resolveAdapter } from './resolve'

// Adapter registrations — side-effect imports trigger self-registration
import './node/register'

export { NodeFsAdapter } from './node/NodeFsAdapter'
