import type Stream from 'node:stream'

import type { NodeJS_fsReadOptions, NodeJS_fsWriteOptions } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export function duplexStream(
    path: string,
    options?: Stream.DuplexOptions | null,
    readOptions?: NodeJS_fsReadOptions | null,
    writeOptions?: NodeJS_fsWriteOptions | null
): Stream.Duplex {
    return _getAdapter().duplexStream(path, options, readOptions, writeOptions)
}
