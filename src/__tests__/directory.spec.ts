import { afterEach, describe, expect, it } from 'vitest'
import { DirectoryList } from '../DirectoryList'
import { mkdir, listDirectory, deleteFromStorage, put, exists, isDirectory } from '..'
import { cleanup, tmpDir } from './helpers'

describe('mkdir', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('creates a directory', async () => {
        dir = tmpDir()
        const subDir = `${dir}/new-dir`
        await mkdir(subDir)
        expect(await isDirectory(subDir)).toBe(true)
    })

    it('creates nested directories with recursive', async () => {
        dir = tmpDir()
        const deepDir = `${dir}/a/b/c`
        await mkdir(deepDir, { recursive: true })
        expect(await isDirectory(deepDir)).toBe(true)
    })

    it('resolves when directory already exists (EEXIST)', async () => {
        dir = tmpDir()
        const subDir = `${dir}/existing-dir`
        await mkdir(subDir)
        await expect(mkdir(subDir)).resolves.toBeUndefined()
    })
})

describe('listDirectory', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('lists files in a directory (non-recursive)', async () => {
        dir = tmpDir()
        await put(`${dir}/a.txt`, 'a')
        await put(`${dir}/b.txt`, 'b')
        const list = await listDirectory(dir)
        expect(list).toContain('a.txt')
        expect(list).toContain('b.txt')
    })

    it('returns empty array for nonexistent directory', async () => {
        dir = tmpDir()
        const list = await listDirectory(`${dir}/ghost`)
        expect(list).toEqual([])
    })

    it('lists recursively and returns DirectoryList', async () => {
        dir = tmpDir()
        await put(`${dir}/top.txt`, 'top')
        await mkdir(`${dir}/sub`)
        await put(`${dir}/sub/nested.txt`, 'nested')
        const result = await listDirectory(dir, true)
        expect(result).toBeInstanceOf(DirectoryList)
    })
})

describe('deleteFromStorage', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('deletes a file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/deleteme.txt`
        await put(filePath, 'bye')
        expect(await exists(filePath)).toBe(true)
        await deleteFromStorage(filePath)
        expect(await exists(filePath)).toBe(false)
    })

    it('deletes a directory recursively', async () => {
        dir = tmpDir()
        const subDir = `${dir}/rm-dir`
        await mkdir(subDir, { recursive: true })
        await put(`${subDir}/inner.txt`, 'inner')
        expect(await exists(subDir)).toBe(true)
        await deleteFromStorage(subDir)
        expect(await exists(subDir)).toBe(false)
    })
})
