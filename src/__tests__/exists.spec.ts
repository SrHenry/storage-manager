import { afterEach, describe, expect, it } from 'vitest'
import { StorageManager } from '../StorageManager'
import { cleanup, tmpDir } from './helpers'

describe('StorageManager.exists', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/exists.txt`
        await StorageManager.put(filePath, 'yes')
        expect(await StorageManager.exists(filePath)).toBe(true)
    })

    it('returns false for a nonexistent file', async () => {
        dir = tmpDir()
        expect(await StorageManager.exists(`${dir}/nope.txt`)).toBe(false)
    })

    it('returns true for an existing directory', async () => {
        dir = tmpDir()
        expect(await StorageManager.exists(dir)).toBe(true)
    })

    it('checks multiple paths with AND logic', async () => {
        dir = tmpDir()
        const fileA = `${dir}/a.txt`
        const fileB = `${dir}/b.txt`
        await StorageManager.put(fileA, 'a')
        await StorageManager.put(fileB, 'b')
        expect(await StorageManager.exists(fileA, fileB)).toBe(true)
        expect(await StorageManager.exists(fileA, `${dir}/missing.txt`)).toBe(false)
    })
})

describe('StorageManager.doesntExist', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for a nonexistent path', async () => {
        dir = tmpDir()
        expect(await StorageManager.doesntExist(`${dir}/ghost.txt`)).toBe(true)
    })

    it('returns false for an existing path', async () => {
        dir = tmpDir()
        const filePath = `${dir}/real.txt`
        await StorageManager.put(filePath, 'real')
        expect(await StorageManager.doesntExist(filePath)).toBe(false)
    })
})

describe('StorageManager.stats', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns stats for an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stat.txt`
        await StorageManager.put(filePath, 'stat me')
        const stats = await StorageManager.stats(filePath)
        expect(stats.isFile()).toBe(true)
        expect(stats.size).toBeGreaterThan(0)
    })

    it('throws ENOENT for nonexistent path', async () => {
        dir = tmpDir()
        await expect(StorageManager.stats(`${dir}/nope.txt`)).rejects.toThrow()
    })
})

describe('StorageManager.isFile', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for a file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/file.txt`
        await StorageManager.put(filePath, 'file')
        expect(await StorageManager.isFile(filePath)).toBe(true)
    })

    it('returns false for a directory', async () => {
        dir = tmpDir()
        expect(await StorageManager.isFile(dir)).toBe(false)
    })

    it('returns false for nonexistent path', async () => {
        dir = tmpDir()
        expect(await StorageManager.isFile(`${dir}/nope.txt`)).toBe(false)
    })
})

describe('StorageManager.isDirectory', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for a directory', async () => {
        dir = tmpDir()
        expect(await StorageManager.isDirectory(dir)).toBe(true)
    })

    it('returns false for a file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/file.txt`
        await StorageManager.put(filePath, 'file')
        expect(await StorageManager.isDirectory(filePath)).toBe(false)
    })

    it('returns false for nonexistent path', async () => {
        dir = tmpDir()
        expect(await StorageManager.isDirectory(`${dir}/nope`)).toBe(false)
    })
})
