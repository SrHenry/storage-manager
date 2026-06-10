import type { Input } from '../../shared/types'

export interface WriteAdapter {
    put(path: string, value: Input, charset?: BufferEncoding): Promise<boolean>
    putStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset?: BufferEncoding
    ): Promise<void>
    append(path: string, value: Input, charset?: BufferEncoding): Promise<boolean>
    appendStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset?: BufferEncoding
    ): Promise<void>
}
