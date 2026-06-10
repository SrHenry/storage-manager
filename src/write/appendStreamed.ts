import type { Input } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export async function appendStreamed(
    path: string,
    values: AsyncIterable<Input> | Iterable<Input> | Input,
    charset?: BufferEncoding
): Promise<void> {
    return _getAdapter().appendStreamed(path, values, charset)
}
