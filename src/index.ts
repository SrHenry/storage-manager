// Domain function exports
export { get, getAsBuffer, getAsBuffers, getAsJSON } from './read'
export { put, putStreamed, append, appendStreamed } from './write'
export { fileStream, readStream, writeStream, duplexStream, stream } from './stream'
export type {
    FileStreamMode,
    FileStreamOptions,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
    NodeJS_fsOptionsType,
} from './stream'
export { exists, doesntExist, stats, isFile, isDirectory } from './metadata'
export { mkdir, listDirectory, copy, rename, move, deleteFromStorage } from './directory'
export { deleteFile as delete } from './directory'

// Adapter exports
export type {
    ReadAdapter,
    WriteAdapter,
    StreamAdapter,
    DirAdapter,
    MetaAdapter,
    FsAdapter,
    BlobStorageAdapter,
    BlobPutOptions,
    BlobPutResult,
    BlobGetOptions,
    BlobGetResult,
    BlobDeleteOptions,
    BlobDeleteResult,
    BlobListOptions,
    BlobListResult,
    PresignedUrlOptions,
    BlobStats,
} from './adapters'
export { NodeFsAdapter } from './adapters'
export { detectRuntime, resolveAdapter, registerRuntime } from './adapters'
export type { RuntimeResolver } from './adapters'

// Bootstrap & configuration exports
export { bootstrap, setFS, useAdapter } from './bootstrap'

// Error exports
export { UnsupportedEnvironmentError } from './shared/errors'

// Type exports
export type { ValidInput, Input } from './shared/types'
export type { RecursiveType, DirectoryListJSONContent, DirectoryListJSON } from './shared/types'

// Domain class exports
export { DirectoryList, Directory } from './directory/DirectoryList'

// fs convenience object (default + named export)
import { get, getAsBuffer, getAsBuffers, getAsJSON } from './read'
import { put, putStreamed, append, appendStreamed } from './write'
import { fileStream, readStream, writeStream, duplexStream, stream } from './stream'
import { exists, doesntExist, stats, isFile, isDirectory } from './metadata'
import { mkdir, listDirectory, copy, rename, move, deleteFromStorage } from './directory'
import { deleteFile } from './directory'
import { _getAdapter } from './bootstrap'

export const fs = Object.freeze({
    get,
    getAsBuffer,
    getAsBuffers,
    getAsJSON,
    put,
    putStreamed,
    append,
    appendStreamed,
    fileStream,
    readStream,
    writeStream,
    duplexStream,
    stream,
    exists,
    doesntExist,
    stats,
    isFile,
    isDirectory,
    mkdir,
    listDirectory,
    copy,
    rename,
    move,
    deleteFromStorage,
    delete: deleteFile,
    get constants() {
        return _getAdapter().constants
    },
    get path() {
        return _getAdapter().path
    },
})

export default fs
