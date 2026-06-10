import type Stream from 'node:stream'

import type {
    FileStreamMode,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
} from '../shared/types'
import { _getAdapter } from '../bootstrap'

export type {
    FileStreamMode,
    FileStreamOptions,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
    NodeJS_fsOptionsType,
} from '../shared/types'

export function fileStream(
    path: string,
    mode?: FileStreamMode,
    options?: FileStreamOptionsType<FileStreamMode> | null,
    fsOptions?: NodeJS_fsOptionsType<FileStreamMode> | null
): FileStreamType<FileStreamMode> {
    // biome-ignore lint/suspicious/noExplicitAny: generic mode inference requires cast
    return _getAdapter().fileStream(path, mode as any, options as any, fsOptions as any) as any
}

export function readStream(
    path: string,
    options?: Stream.ReadableOptions | null,
    fsOptions?: NodeJS_fsReadOptions | null
): Stream.Readable {
    return _getAdapter().readStream(path, options, fsOptions)
}

export function writeStream(
    path: string,
    options?: Stream.WritableOptions | null,
    fsOptions?: NodeJS_fsWriteOptions | null
): Stream.Writable {
    return _getAdapter().writeStream(path, options, fsOptions)
}

export function duplexStream(
    path: string,
    options?: Stream.DuplexOptions | null,
    readOptions?: NodeJS_fsReadOptions | null,
    writeOptions?: NodeJS_fsWriteOptions | null
): Stream.Duplex {
    return _getAdapter().duplexStream(path, options, readOptions, writeOptions)
}

export const stream = fileStream
