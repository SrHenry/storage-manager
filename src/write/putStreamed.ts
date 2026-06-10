import type { Input } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export async function putStreamed(
    path: string,
    values: AsyncIterable<Input> | Iterable<Input> | Input,
    charset?: BufferEncoding
): Promise<void> {
    return _getAdapter().putStreamed(path, values, charset)
}
