import type { FsAdapter } from '../interfaces/FsAdapter'
import { NodeFsAdapter } from './NodeFsAdapter'

export function detectRuntime(): string {
    if (typeof process?.versions?.node === 'string') return 'node'
    return 'unknown'
}

export function resolveAdapter(): FsAdapter | null {
    if (detectRuntime() === 'node') return new NodeFsAdapter()
    return null
}
