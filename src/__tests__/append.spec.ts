import { afterEach, describe, expect, it } from 'vitest'
import { StorageManager } from '../StorageManager'
import { cleanup, tmpDir } from './helpers'

describe('StorageManager.append', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('appends to an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/append.txt`
        await StorageManager.put(filePath, 'first')
        await StorageManager.append(filePath, ' second')
        const content = await StorageManager.get(filePath)
        expect(content).toBe('first second')
    })

    it('falls through to put when file does not exist', async () => {
        dir = tmpDir()
        const filePath = `${dir}/new-append.txt`
        await StorageManager.append(filePath, 'created')
        const content = await StorageManager.get(filePath)
        expect(content).toBe('created')
    })

    it('appends a Buffer', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buf-append.txt`
        await StorageManager.put(filePath, 'data')
        await StorageManager.append(filePath, Buffer.from('-more'))
        const content = await StorageManager.get(filePath)
        expect(content).toBe('data-more')
    })
})

describe('StorageManager.appendStreamed', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('appends iterable to existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stream-append.txt`
        await StorageManager.put(filePath, 'start')
        await StorageManager.appendStreamed(filePath, ['+a', '+b'])
        const content = await StorageManager.get(filePath)
        expect(content).toBe('start+a+b')
    })

    it('falls through to putStreamed when file does not exist', async () => {
        dir = tmpDir()
        const filePath = `${dir}/new-stream-append.txt`
        await StorageManager.appendStreamed(filePath, 'fresh')
        const content = await StorageManager.get(filePath)
        expect(content).toBe('fresh')
    })
})
