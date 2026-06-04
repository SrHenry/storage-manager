import { afterEach, describe, expect, it } from 'vitest'
import { StorageManager } from '../StorageManager'
import { cleanup, tmpDir } from './helpers'

describe('StorageManager.get', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as string', async () => {
        dir = tmpDir()
        const filePath = `${dir}/read.txt`
        await StorageManager.put(filePath, 'read me')
        const content = await StorageManager.get(filePath)
        expect(content).toBe('read me')
    })
})

describe('StorageManager.getAsBuffer', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as a Buffer', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buffer.txt`
        await StorageManager.put(filePath, 'buffered')
        const buf = await StorageManager.getAsBuffer(filePath)
        expect(Buffer.isBuffer(buf)).toBe(true)
        expect(buf.toString()).toBe('buffered')
    })
})

describe('StorageManager.getAsBuffers', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as an array of Buffers', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buffers.txt`
        await StorageManager.put(filePath, 'multi-buffer')
        const bufs = await StorageManager.getAsBuffers(filePath)
        expect(Array.isArray(bufs)).toBe(true)
        expect(bufs.length).toBeGreaterThan(0)
        expect(Buffer.concat(bufs).toString()).toBe('multi-buffer')
    })

    it('throws for nonexistent file', async () => {
        dir = tmpDir()
        await expect(StorageManager.getAsBuffers(`${dir}/nope.txt`)).rejects.toThrow()
    })
})

describe('StorageManager.getAsJSON', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('parses JSON file content', async () => {
        dir = tmpDir()
        const filePath = `${dir}/data.json`
        await StorageManager.put(filePath, JSON.stringify({ name: 'test', value: 42 }))
        const data = await StorageManager.getAsJSON(filePath)
        expect(data).toEqual({ name: 'test', value: 42 })
    })
})
