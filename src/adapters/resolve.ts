import type { FsAdapter } from './interfaces/FsAdapter'
import type { RuntimeResolver } from './interfaces/RuntimeResolver'

const registry: RuntimeResolver[] = []

/**
 * Register a runtime resolver. Called by each adapter module on load.
 * Adapters self-register by importing this function and calling it at module scope.
 */
export function registerRuntime(resolver: RuntimeResolver): void {
    registry.push(resolver)
}

/**
 * Detect the current runtime by probing the registry.
 * Returns the runtime identifier of the first resolver that matches the current environment,
 * or 'unknown' if none match.
 */
export function detectRuntime(): string {
    for (const resolver of registry) {
        if (resolver.matchesEnvironment()) return resolver.runtime
    }
    return 'unknown'
}

/**
 * Resolve an FsAdapter for the current runtime.
 * Returns the first adapter whose resolver matches the current environment,
 * or null if no resolver matches.
 */
export function resolveAdapter(): FsAdapter | null {
    for (const resolver of registry) {
        if (resolver.matchesEnvironment()) return resolver.create()
    }
    return null
}
