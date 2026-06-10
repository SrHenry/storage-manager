import { afterEach, describe, expect, it } from 'vitest'
import { exists, doesntExist, stats, isFile, isDirectory, put } from '..'
import { cleanup, tmpDir } from './helpers'

describe('exists', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/exists.txt`
        await put(filePath, 'yes')
        expect(await exists(filePath)).toBe(true)
    })

    it('returns false for a nonexistent file', async () => {
        dir = tmpDir()
        expect(await exists(`${dir}/nope.txt`)).toBe(false)
    })

    it('returns true for an existing directory', async () => {
        dir = tmpDir()
        expect(await exists(dir)).toBe(true)
    })

    it('checks multiple paths with AND logic', async () => {
        dir = tmpDir()
        const fileA = `${dir}/a.txt`
        const fileB = `${dir}/b.txt`
        await put(fileA, 'a')
        await put(fileB, 'b')
        expect(await exists(fileA, fileB)).toBe(true)
        expect(await exists(fileA, `${dir}/missing.txt`)).toBe(false)
    })
})

describe('doesntExist', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for a nonexistent path', async () => {
        dir = tmpDir()
        expect(await doesntExist(`${dir}/ghost.txt`)).toBe(true)
    })

    it('returns false for an existing path', async () => {
        dir = tmpDir()
        const filePath = `${dir}/real.txt`
        await put(filePath, 'real')
        expect(await doesntExist(filePath)).toBe(false)
    })
})

describe('stats', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns stats for an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stat.txt`
        await put(filePath, 'stat me')
        const s = await stats(filePath)
        expect(s.isFile()).toBe(true)
        expect(s.size).toBeGreaterThan(0)
    })

    it('throws ENOENT for nonexistent path', async () => {
        dir = tmpDir()
        await expect(stats(`${dir}/nope.txt`)).rejects.toThrow()
    })
})

describe('isFile', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for a file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/file.txt`
        await put(filePath, 'file')
        expect(await isFile(filePath)).toBe(true)
    })

    it('returns false for a directory', async () => {
        dir = tmpDir()
        expect(await isFile(dir)).toBe(false)
    })

    it('returns false for nonexistent path', async () => {
        dir = tmpDir()
        expect(await isFile(`${dir}/nope.txt`)).toBe(false)
    })
})

describe('isDirectory', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('returns true for a directory', async () => {
        dir = tmpDir()
        expect(await isDirectory(dir)).toBe(true)
    })

    it('returns false for a file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/file.txt`
        await put(filePath, 'file')
        expect(await isDirectory(filePath)).toBe(false)
    })

    it('returns false for nonexistent path', async () => {
        dir = tmpDir()
        expect(await isDirectory(`${dir}/nope`)).toBe(false)
    })
})
