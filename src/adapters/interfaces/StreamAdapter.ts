import type Stream from 'node:stream'
import type {
    FileStreamMode,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
} from '../../shared/types'

export interface StreamAdapter {
    fileStream(
        path: string,
        mode?: FileStreamMode,
        options?: FileStreamOptionsType<FileStreamMode> | null,
        fsOptions?: NodeJS_fsOptionsType<FileStreamMode> | null
    ): FileStreamType<FileStreamMode>
    readStream(
        path: string,
        options?: Stream.ReadableOptions | null,
        fsOptions?: NodeJS_fsReadOptions | null
    ): Stream.Readable
    writeStream(
        path: string,
        options?: Stream.WritableOptions | null,
        fsOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Writable
    duplexStream(
        path: string,
        options?: Stream.DuplexOptions | null,
        readOptions?: NodeJS_fsReadOptions | null,
        writeOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Duplex
}
