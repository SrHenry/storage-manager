import type { Input } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export async function append(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
    return _getAdapter().append(path, value, charset)
}
