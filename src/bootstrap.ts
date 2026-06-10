import type { FsAdapter } from './adapters/interfaces/FsAdapter'
import { detectRuntime, resolveAdapter } from './adapters/resolve'
import { UnsupportedEnvironmentError } from './shared/errors/UnsupportedEnvironmentError'

let _adapter: FsAdapter | null = null
let _bootstrapped = false

export function _bootstrap(): void {
    if (_bootstrapped) return
    _bootstrapped = true
    _adapter = resolveAdapter()
}

export function bootstrap(): void {
    _bootstrap()
}

export function setFS(adapter: FsAdapter): void {
    _bootstrapped = true
    _adapter = adapter
}

export function useAdapter(adapter: FsAdapter) {
    return Object.freeze({
        get: adapter.get.bind(adapter),
        put: adapter.put.bind(adapter),
        putStreamed: adapter.putStreamed.bind(adapter),
        append: adapter.append.bind(adapter),
        appendStreamed: adapter.appendStreamed.bind(adapter),
        getAsBuffer: adapter.getAsBuffer.bind(adapter),
        getAsBuffers: adapter.getAsBuffers.bind(adapter),
        getAsJSON: adapter.getAsJSON.bind(adapter),
        rename: adapter.rename.bind(adapter),
        move: adapter.move.bind(adapter),
        copy: adapter.copy.bind(adapter),
        readStream: adapter.readStream.bind(adapter),
        writeStream: adapter.writeStream.bind(adapter),
        duplexStream: adapter.duplexStream.bind(adapter),
        fileStream: adapter.fileStream.bind(adapter),
        exists: adapter.exists.bind(adapter),
        doesntExist: adapter.doesntExist.bind(adapter),
        stats: adapter.stats.bind(adapter),
        isFile: adapter.isFile.bind(adapter),
        isDirectory: adapter.isDirectory.bind(adapter),
        listDirectory: adapter.listDirectory.bind(adapter),
        mkdir: adapter.mkdir.bind(adapter),
        deleteFromStorage: adapter.deleteFromStorage.bind(adapter),
        delete: adapter.delete.bind(adapter),
        constants: adapter.constants,
        path: adapter.path,
    })
}

export function _getAdapter(): FsAdapter {
    _bootstrap()
    if (!_adapter) throw new UnsupportedEnvironmentError(detectRuntime())
    return _adapter
}

export { detectRuntime }
