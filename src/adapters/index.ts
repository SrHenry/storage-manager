export * from './interfaces'
export type { RuntimeResolver } from './interfaces/RuntimeResolver'
export { registerRuntime, detectRuntime, resolveAdapter } from './resolve'

// Adapter registrations — auto-generated from src/adapters/*/register.ts
import './auto-register'

export { NodeFsAdapter } from './node/NodeFsAdapter'
