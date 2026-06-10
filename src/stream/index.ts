export { fileStream } from './fileStream'
export { readStream } from './readStream'
export { writeStream } from './writeStream'
export { duplexStream } from './duplexStream'

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

import { fileStream } from './fileStream'
export const stream = fileStream
