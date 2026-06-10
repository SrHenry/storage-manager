import type Stream from 'node:stream'
import type { IgnoreUnionType } from '../utils/IgnoreUnionType'
import type fs from 'node:fs'

/** Read mode */
type ReadMode = 'r'

/** Write mode */
type WriteMode = 'w'

/** Read and write mode */
type DuplexMode = 'rw'

/** File modes supported */
export type FileStreamMode = ReadMode | WriteMode | DuplexMode

/** Stream options supported */
export type FileStreamOptions =
    | Stream.ReadableOptions
    | Stream.WritableOptions
    | Stream.DuplexOptions

/** Helper to infer Stream type from file mode */
export type FileStreamType<T extends FileStreamMode> = T extends ReadMode
    ? Stream.Readable
    : T extends WriteMode
      ? Stream.Writable
      : T extends DuplexMode
        ? Stream.Duplex
        : never

/** Helper to infer StreamOptions type from file mode */
export type FileStreamOptionsType<T extends FileStreamMode> = T extends ReadMode
    ? Stream.ReadableOptions
    : T extends WriteMode
      ? Stream.WritableOptions
      : T extends DuplexMode
        ? Stream.DuplexOptions
        : never

/** fs Stream options supported in read mode */
export type NodeJS_fsReadOptions = IgnoreUnionType<
    Parameters<typeof fs.createReadStream>[1],
    string
>

/** fs Stream options supported in write mode */
export type NodeJS_fsWriteOptions = IgnoreUnionType<
    Parameters<typeof fs.createWriteStream>[1],
    string
>

/** fs Stream options supported in duplex mode */
export type NodeJS_fsDuplexOptions = {
    readOptions?: IgnoreUnionType<NodeJS_fsReadOptions, string> | null
    writeOptions?: IgnoreUnionType<NodeJS_fsWriteOptions, string> | null
}

/** Helper to infer fs stream options from file mode */
export type NodeJS_fsOptionsType<T extends FileStreamMode> = T extends ReadMode
    ? NodeJS_fsReadOptions
    : T extends WriteMode
      ? NodeJS_fsWriteOptions
      : T extends DuplexMode
        ? NodeJS_fsDuplexOptions
        : never

export type { ReadMode, WriteMode, DuplexMode }
