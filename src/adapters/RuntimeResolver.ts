import type { FsAdapter } from './interfaces/FsAdapter'

/**
 * A runtime resolver probes the environment and produces an FsAdapter
 * if the runtime is supported. Each adapter implementation provides one.
 */
export interface RuntimeResolver {
    /** Runtime identifier (e.g. 'node', 'bun', 'deno') */
    readonly runtime: string
    /** Check whether the current environment matches this runtime. */
    matchesEnvironment(): boolean
    /** Create a new FsAdapter instance for this runtime. */
    create(): FsAdapter
}
