import { afterEach, describe, expect, it } from 'vitest'
import { StorageManager } from '../StorageManager'
import { cleanup, tmpDir } from './helpers'

describe('StorageManager.put', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('writes a string to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/test.txt`
        const result = await StorageManager.put(filePath, 'hello')
        expect(result).toBe(true)
    })

    it('writes a Buffer to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buf.txt`
        const result = await StorageManager.put(filePath, Buffer.from('buffered'))
        expect(result).toBe(true)
    })

    it('writes a JSON object to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/data.txt`
        const result = await StorageManager.put(filePath, { key: 'value' })
        expect(result).toBe(true)
    })

    it('creates parent directories if needed', async () => {
        dir = tmpDir()
        const filePath = `${dir}/a/b/c/deep.txt`
        const result = await StorageManager.put(filePath, 'nested')
        expect(result).toBe(true)
    })

    it('writes with custom encoding', async () => {
        dir = tmpDir()
        const filePath = `${dir}/encoded.txt`
        await StorageManager.put(filePath, 'héllo', 'utf-8')
        const content = await StorageManager.get(filePath)
        expect(content).toBe('héllo')
    })
})

describe('StorageManager.putStreamed', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('writes a single value via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/streamed.txt`
        await StorageManager.putStreamed(filePath, 'streamed data')
        const content = await StorageManager.get(filePath)
        expect(content).toBe('streamed data')
    })

    it('writes an iterable of values via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/iterable.txt`
        await StorageManager.putStreamed(filePath, ['line1', 'line2', 'line3'])
        const content = await StorageManager.get(filePath)
        expect(content).toBe('line1line2line3')
    })

    it('writes an async iterable of values via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/async-iterable.txt`
        async function* gen() {
            yield 'async1'
            yield 'async2'
        }
        await StorageManager.putStreamed(filePath, gen())
        const content = await StorageManager.get(filePath)
        expect(content).toBe('async1async2')
    })
})
