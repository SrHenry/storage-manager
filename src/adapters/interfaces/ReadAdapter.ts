export interface ReadAdapter {
    get(path: string, encoding?: BufferEncoding): Promise<string>
    getAsBuffer(path: string): Promise<Buffer>
    getAsBuffers(path: string): Promise<Buffer[]>
    getAsJSON<T = unknown>(
        path: string,
        encoding?: BufferEncoding,
        // biome-ignore lint/suspicious/noExplicitAny: JSON reviver requires any
        reviver?: (this: any, key: string, value: any) => any
    ): Promise<T>
}
