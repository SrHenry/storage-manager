import type Stream from 'node:stream'

import type {
    FileStreamMode,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsOptionsType,
} from '../shared/types'
import { _getAdapter } from '../bootstrap'

export function fileStream(path: string): Stream.Duplex
export function fileStream(
    path: string,
    mode: 'r',
    options?: FileStreamOptionsType<'r'> | null,
    fsOptions?: NodeJS_fsOptionsType<'r'> | null
): FileStreamType<'r'>
export function fileStream(
    path: string,
    mode: 'w',
    options?: FileStreamOptionsType<'w'> | null,
    fsOptions?: NodeJS_fsOptionsType<'w'> | null
): FileStreamType<'w'>
export function fileStream(
    path: string,
    mode: 'rw',
    options?: FileStreamOptionsType<'rw'> | null,
    fsOptions?: NodeJS_fsOptionsType<'rw'> | null
): FileStreamType<'rw'>
export function fileStream(
    path: string,
    mode: FileStreamMode = 'rw',
    options: FileStreamOptionsType<typeof mode> | null = null,
    fsOptions: NodeJS_fsOptionsType<typeof mode> | null = null
): FileStreamType<typeof mode> {
    return _getAdapter().fileStream(path, mode, options, fsOptions)
}
