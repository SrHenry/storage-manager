/**
 * Check whether the current environment is Node.js.
 * Probes for the presence of process.versions.node.
 */
export function matchesEnvironment(): boolean {
    return typeof process?.versions?.node === 'string'
}
