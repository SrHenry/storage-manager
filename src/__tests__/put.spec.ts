import { afterEach, describe, expect, it } from 'vitest'
import { put, putStreamed, get } from '..'
import { cleanup, tmpDir } from './helpers'

describe('put', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('writes a string to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/test.txt`
        const result = await put(filePath, 'hello')
        expect(result).toBe(true)
    })

    it('writes a Buffer to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buf.txt`
        const result = await put(filePath, Buffer.from('buffered'))
        expect(result).toBe(true)
    })

    it('writes a JSON object to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/data.txt`
        const result = await put(filePath, { key: 'value' })
        expect(result).toBe(true)
    })

    it('creates parent directories if needed', async () => {
        dir = tmpDir()
        const filePath = `${dir}/a/b/c/deep.txt`
        const result = await put(filePath, 'nested')
        expect(result).toBe(true)
    })

    it('writes with custom encoding', async () => {
        dir = tmpDir()
        const filePath = `${dir}/encoded.txt`
        await put(filePath, 'héllo', 'utf-8')
        const content = await get(filePath)
        expect(content).toBe('héllo')
    })
})

describe('putStreamed', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('writes a single value via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/streamed.txt`
        await putStreamed(filePath, 'streamed data')
        const content = await get(filePath)
        expect(content).toBe('streamed data')
    })

    it('writes an iterable of values via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/iterable.txt`
        await putStreamed(filePath, ['line1', 'line2', 'line3'])
        const content = await get(filePath)
        expect(content).toBe('line1line2line3')
    })

    it('writes an async iterable of values via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/async-iterable.txt`
        async function* gen() {
            yield 'async1'
            yield 'async2'
        }
        await putStreamed(filePath, gen())
        const content = await get(filePath)
        expect(content).toBe('async1async2')
    })
})
