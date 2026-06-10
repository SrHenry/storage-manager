import type Stream from 'node:stream'

import type { NodeJS_fsReadOptions } from '../shared/types'
import { _getAdapter } from '../bootstrap'

export function readStream(
    path: string,
    options?: Stream.ReadableOptions | null,
    fsOptions?: NodeJS_fsReadOptions | null
): Stream.Readable {
    return _getAdapter().readStream(path, options, fsOptions)
}
