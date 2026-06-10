import type Stream from 'node:stream'

import type { NodeJS_fsWriteOptions } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export function writeStream(
    path: string,
    options?: Stream.WritableOptions | null,
    fsOptions?: NodeJS_fsWriteOptions | null
): Stream.Writable {
    return _getAdapter().writeStream(path, options, fsOptions)
}
