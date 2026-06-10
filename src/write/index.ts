import type { Input } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export async function put(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
    return _getAdapter().put(path, value, charset)
}

export async function putStreamed(
    path: string,
    values: AsyncIterable<Input> | Iterable<Input> | Input,
    charset?: BufferEncoding
): Promise<void> {
    return _getAdapter().putStreamed(path, values, charset)
}

export async function append(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
    return _getAdapter().append(path, value, charset)
}

export async function appendStreamed(
    path: string,
    values: AsyncIterable<Input> | Iterable<Input> | Input,
    charset?: BufferEncoding
): Promise<void> {
    return _getAdapter().appendStreamed(path, values, charset)
}
