import { describe, expect, it } from 'vitest'
import { NodeFsAdapter } from '../node/NodeFsAdapter'
import { detectRuntime, resolveAdapter } from '../node/resolve'

describe('NodeFsAdapter', () => {
    it('implements FsAdapter interface', () => {
        const adapter = new NodeFsAdapter()

        expect(typeof adapter.get).toBe('function')
        expect(typeof adapter.put).toBe('function')
        expect(typeof adapter.append).toBe('function')
        expect(typeof adapter.fileStream).toBe('function')
        expect(typeof adapter.exists).toBe('function')
        expect(typeof adapter.stats).toBe('function')
        expect(typeof adapter.mkdir).toBe('function')
        expect(typeof adapter.deleteFromStorage).toBe('function')
        expect(typeof adapter.listDirectory).toBe('function')
        expect(typeof adapter.copy).toBe('function')
        expect(typeof adapter.rename).toBe('function')
        expect(typeof adapter.move).toBe('function')
        expect(typeof adapter.isFile).toBe('function')
        expect(typeof adapter.isDirectory).toBe('function')
        expect(typeof adapter.readStream).toBe('function')
        expect(typeof adapter.writeStream).toBe('function')
        expect(typeof adapter.duplexStream).toBe('function')
        expect(typeof adapter.putStreamed).toBe('function')
        expect(typeof adapter.appendStreamed).toBe('function')
        expect(typeof adapter.getAsBuffer).toBe('function')
        expect(typeof adapter.getAsBuffers).toBe('function')
        expect(typeof adapter.getAsJSON).toBe('function')
        expect(typeof adapter.doesntExist).toBe('function')
        expect(typeof adapter.delete).toBe('function')
    })

    it('exposes constants and path', () => {
        const adapter = new NodeFsAdapter()
        expect(adapter.constants).toBeDefined()
        expect(adapter.path).toBeDefined()
    })
})

describe('resolveAdapter', () => {
    it('detects Node.js runtime', () => {
        expect(detectRuntime()).toBe('node')
    })

    it('returns a NodeFsAdapter for Node.js', () => {
        const adapter = resolveAdapter()
        expect(adapter).toBeInstanceOf(NodeFsAdapter)
    })
})
