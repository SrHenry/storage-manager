import type { Input } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export async function put(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
    return _getAdapter().put(path, value, charset)
}
