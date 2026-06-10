import { _getAdapter } from '../bootstrap'

export async function get(path: string, encoding: BufferEncoding = 'utf-8') {
    return _getAdapter().get(path, encoding)
}
