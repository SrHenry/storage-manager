import { afterEach, describe, expect, it } from 'vitest'
import { StorageManager } from '../StorageManager'
import { DirectoryList } from '../DirectoryList'
import { cleanup, tmpDir } from './helpers'

describe('StorageManager.mkdir', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('creates a directory', async () => {
        dir = tmpDir()
        const subDir = `${dir}/new-dir`
        await StorageManager.mkdir(subDir)
        expect(await StorageManager.isDirectory(subDir)).toBe(true)
    })

    it('creates nested directories with recursive', async () => {
        dir = tmpDir()
        const deepDir = `${dir}/a/b/c`
        await StorageManager.mkdir(deepDir, { recursive: true })
        expect(await StorageManager.isDirectory(deepDir)).toBe(true)
    })
})

describe('StorageManager.listDirectory', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('lists files in a directory (non-recursive)', async () => {
        dir = tmpDir()
        await StorageManager.put(`${dir}/a.txt`, 'a')
        await StorageManager.put(`${dir}/b.txt`, 'b')
        const list = await StorageManager.listDirectory(dir)
        expect(list).toContain('a.txt')
        expect(list).toContain('b.txt')
    })

    it('returns empty array for nonexistent directory', async () => {
        dir = tmpDir()
        const list = await StorageManager.listDirectory(`${dir}/ghost`)
        expect(list).toEqual([])
    })

    it('lists recursively and returns DirectoryList', async () => {
        dir = tmpDir()
        await StorageManager.put(`${dir}/top.txt`, 'top')
        await StorageManager.mkdir(`${dir}/sub`)
        await StorageManager.put(`${dir}/sub/nested.txt`, 'nested')
        const result = await StorageManager.listDirectory(dir, true)
        expect(result).toBeInstanceOf(DirectoryList)
    })
})

describe('StorageManager.deleteFromStorage', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('deletes a file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/deleteme.txt`
        await StorageManager.put(filePath, 'bye')
        expect(await StorageManager.exists(filePath)).toBe(true)
        await StorageManager.deleteFromStorage(filePath)
        expect(await StorageManager.exists(filePath)).toBe(false)
    })

    it('deletes a directory recursively', async () => {
        dir = tmpDir()
        const subDir = `${dir}/rm-dir`
        await StorageManager.mkdir(subDir, { recursive: true })
        await StorageManager.put(`${subDir}/inner.txt`, 'inner')
        expect(await StorageManager.exists(subDir)).toBe(true)
        await StorageManager.deleteFromStorage(subDir)
        expect(await StorageManager.exists(subDir)).toBe(false)
    })
})
