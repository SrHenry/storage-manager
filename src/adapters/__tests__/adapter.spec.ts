import { describe, expect, it } from 'vitest'
import { NodeFsAdapter } from '../node/NodeFsAdapter'
import { matchesEnvironment as matchesNodeEnvironment } from '../node/detect'
import { nodeResolver } from '../node/resolver'
import '../node/register'
import { detectRuntime, resolveAdapter, registerRuntime } from '../resolve'

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

describe('nodeResolver', () => {
    it('detects Node.js runtime', () => {
        expect(matchesNodeEnvironment()).toBe(true)
        expect(nodeResolver.matchesEnvironment()).toBe(true)
        expect(nodeResolver.runtime).toBe('node')
    })
})

describe('resolveAdapter (registry)', () => {
    it('detects Node.js as current runtime', () => {
        expect(detectRuntime()).toBe('node')
    })

    it('resolves to a NodeFsAdapter', () => {
        const adapter = resolveAdapter()
        expect(adapter).toBeInstanceOf(NodeFsAdapter)
    })

    it('allows registering custom resolvers', () => {
        const customResolver = {
            runtime: 'test',
            matchesEnvironment: () => false,
            create: () => new NodeFsAdapter(),
        }
        registerRuntime(customResolver)

        // Still resolves to Node because test resolver doesn't detect
        expect(detectRuntime()).toBe('node')
    })
})
