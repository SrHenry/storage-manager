import { _getAdapter } from '../bootstrap'

export async function getAsJSON<T = unknown>(
    path: string,
    encoding: BufferEncoding = 'utf8',
    // biome-ignore lint/suspicious/noExplicitAny: JSON reviver requires any
    reviver?: (this: any, key: string, value: any) => any
): Promise<T> {
    return _getAdapter().getAsJSON(path, encoding, reviver)
}
