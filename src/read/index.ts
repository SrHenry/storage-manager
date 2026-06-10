import { _getAdapter } from '../bootstrap'

export async function get(path: string, encoding: BufferEncoding = 'utf-8') {
    return _getAdapter().get(path, encoding)
}

export async function getAsBuffer(path: string) {
    return _getAdapter().getAsBuffer(path)
}

export async function getAsBuffers(path: string) {
    return _getAdapter().getAsBuffers(path)
}

export async function getAsJSON(
    path: string,
    encoding: BufferEncoding = 'utf8',
    reviver?: (this: any, key: string, value: any) => any
) {
    return _getAdapter().getAsJSON(path, encoding, reviver)
}
