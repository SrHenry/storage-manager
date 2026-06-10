export interface ReadAdapter {
    get(path: string, encoding?: BufferEncoding): Promise<string>
    getAsBuffer(path: string): Promise<Buffer>
    getAsBuffers(path: string): Promise<Buffer[]>
    getAsJSON(
        path: string,
        encoding?: BufferEncoding,
        reviver?: (this: any, key: string, value: any) => any
    ): Promise<any>
}
