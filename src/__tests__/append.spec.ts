import { afterEach, describe, expect, it } from 'vitest'
import { append, appendStreamed, get, put } from '..'
import { cleanup, tmpDir } from './helpers'

describe('append', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('appends to an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/append.txt`
        await put(filePath, 'first')
        await append(filePath, ' second')
        const content = await get(filePath)
        expect(content).toBe('first second')
    })

    it('falls through to put when file does not exist', async () => {
        dir = tmpDir()
        const filePath = `${dir}/new-append.txt`
        await append(filePath, 'created')
        const content = await get(filePath)
        expect(content).toBe('created')
    })

    it('appends a Buffer', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buf-append.txt`
        await put(filePath, 'data')
        await append(filePath, Buffer.from('-more'))
        const content = await get(filePath)
        expect(content).toBe('data-more')
    })
})

describe('appendStreamed', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('appends iterable to existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stream-append.txt`
        await put(filePath, 'start')
        await appendStreamed(filePath, ['+a', '+b'])
        const content = await get(filePath)
        expect(content).toBe('start+a+b')
    })

    it('falls through to putStreamed when file does not exist', async () => {
        dir = tmpDir()
        const filePath = `${dir}/new-stream-append.txt`
        await appendStreamed(filePath, 'fresh')
        const content = await get(filePath)
        expect(content).toBe('fresh')
    })
})
