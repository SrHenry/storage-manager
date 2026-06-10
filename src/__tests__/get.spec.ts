import { afterEach, describe, expect, it } from 'vitest'
import { get, getAsBuffer, getAsBuffers, getAsJSON, put } from '..'
import { cleanup, tmpDir } from './helpers'

describe('get', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as string', async () => {
        dir = tmpDir()
        const filePath = `${dir}/read.txt`
        await put(filePath, 'read me')
        const content = await get(filePath)
        expect(content).toBe('read me')
    })
})

describe('getAsBuffer', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as a Buffer', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buffer.txt`
        await put(filePath, 'buffered')
        const buf = await getAsBuffer(filePath)
        expect(Buffer.isBuffer(buf)).toBe(true)
        expect(buf.toString()).toBe('buffered')
    })
})

describe('getAsBuffers', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as an array of Buffers', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buffers.txt`
        await put(filePath, 'multi-buffer')
        const bufs = await getAsBuffers(filePath)
        expect(Array.isArray(bufs)).toBe(true)
        expect(bufs.length).toBeGreaterThan(0)
        expect(Buffer.concat(bufs).toString()).toBe('multi-buffer')
    })

    it('throws for nonexistent file', async () => {
        dir = tmpDir()
        await expect(getAsBuffers(`${dir}/nope.txt`)).rejects.toThrow()
    })
})

describe('getAsJSON', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('parses JSON file content', async () => {
        dir = tmpDir()
        const filePath = `${dir}/data.json`
        await put(filePath, JSON.stringify({ name: 'test', value: 42 }))
        const data = await getAsJSON(filePath)
        expect(data).toEqual({ name: 'test', value: 42 })
    })
})
