import { afterEach, describe, expect, it } from 'vitest'
import { rename, move, copy, fileStream, put, get, exists, mkdir } from '..'
import { cleanup, tmpDir } from './helpers'

describe('rename', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('renames a file', async () => {
        dir = tmpDir()
        const oldPath = `${dir}/old.txt`
        const newPath = `${dir}/new.txt`
        await put(oldPath, 'rename me')
        await rename(oldPath, newPath)
        expect(await exists(oldPath)).toBe(false)
        expect(await exists(newPath)).toBe(true)
        expect(await get(newPath)).toBe('rename me')
    })
})

describe('move', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('moves a file to another directory', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await mkdir(srcDir, { recursive: true })
        await mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/move.txt`
        await put(filePath, 'move me')
        await move(filePath, destDir)
        expect(await exists(filePath)).toBe(false)
        expect(await exists(`${destDir}/move.txt`)).toBe(true)
    })

    it('moves a file with renaming', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await mkdir(srcDir, { recursive: true })
        await mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/orig.txt`
        await put(filePath, 'move+rename')
        await move(filePath, destDir, 'renamed.txt')
        expect(await exists(`${destDir}/renamed.txt`)).toBe(true)
        const content = await get(`${destDir}/renamed.txt`)
        expect(content).toBe('move+rename')
    })
})

describe('copy', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('copies a file to another directory', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await mkdir(srcDir, { recursive: true })
        await mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/copy.txt`
        await put(filePath, 'copy me')
        await copy(filePath, destDir)
        expect(await exists(filePath)).toBe(true)
        expect(await exists(`${destDir}/copy.txt`)).toBe(true)
        expect(await get(`${destDir}/copy.txt`)).toBe('copy me')
    })

    it('copies a file with renaming', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await mkdir(srcDir, { recursive: true })
        await mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/orig.txt`
        await put(filePath, 'copy+rename')
        await copy(filePath, destDir, 'dup.txt')
        expect(await exists(`${destDir}/dup.txt`)).toBe(true)
    })
})

describe('fileStream', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('creates a writable stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stream.txt`
        const ws = fileStream(filePath, 'w')
        expect(ws.writable).toBe(true)
        ws.end('streamed')
        await new Promise<void>(resolve => ws.on('finish', resolve))
        expect(await get(filePath)).toBe('streamed')
    })

    it('creates a readable stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/read-stream.txt`
        await put(filePath, 'readable')
        const rs = fileStream(filePath, 'r')
        expect(rs.readable).toBe(true)
        const chunks: Buffer[] = []
        rs.on('data', (chunk: Buffer) => chunks.push(chunk))
        await new Promise<void>(resolve => rs.on('end', resolve))
        expect(Buffer.concat(chunks).toString()).toBe('readable')
    })
})
