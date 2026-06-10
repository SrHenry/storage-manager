export class UnsupportedEnvironmentError extends Error {
    public readonly code = 'ERR_UNSUPPORTED_ENVIRONMENT' as const
    public readonly detectedRuntime: string | null

    constructor(detectedRuntime?: string) {
        const runtime = detectedRuntime ?? 'unknown'
        super(
            `Unsupported environment detected (${runtime}). ` +
                `Call setFS() with a custom FsAdapter before using filesystem methods, ` +
                `or run this library in a supported runtime (Node.js).`
        )
        this.name = 'UnsupportedEnvironmentError'
        this.detectedRuntime = runtime
    }
}
