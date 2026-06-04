import { afterEach, describe, expect, it } from 'vitest'
import { StorageManager } from '../StorageManager'
import { cleanup, tmpDir } from './helpers'

describe('StorageManager.rename', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('renames a file', async () => {
        dir = tmpDir()
        const oldPath = `${dir}/old.txt`
        const newPath = `${dir}/new.txt`
        await StorageManager.put(oldPath, 'rename me')
        await StorageManager.rename(oldPath, newPath)
        expect(await StorageManager.exists(oldPath)).toBe(false)
        expect(await StorageManager.exists(newPath)).toBe(true)
        expect(await StorageManager.get(newPath)).toBe('rename me')
    })
})

describe('StorageManager.move', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('moves a file to another directory', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await StorageManager.mkdir(srcDir, { recursive: true })
        await StorageManager.mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/move.txt`
        await StorageManager.put(filePath, 'move me')
        await StorageManager.move(filePath, destDir)
        expect(await StorageManager.exists(filePath)).toBe(false)
        expect(await StorageManager.exists(`${destDir}/move.txt`)).toBe(true)
    })

    it('moves a file with renaming', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await StorageManager.mkdir(srcDir, { recursive: true })
        await StorageManager.mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/orig.txt`
        await StorageManager.put(filePath, 'move+rename')
        await StorageManager.move(filePath, destDir, 'renamed.txt')
        expect(await StorageManager.exists(`${destDir}/renamed.txt`)).toBe(true)
        const content = await StorageManager.get(`${destDir}/renamed.txt`)
        expect(content).toBe('move+rename')
    })
})

describe('StorageManager.copy', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('copies a file to another directory', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await StorageManager.mkdir(srcDir, { recursive: true })
        await StorageManager.mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/copy.txt`
        await StorageManager.put(filePath, 'copy me')
        await StorageManager.copy(filePath, destDir)
        expect(await StorageManager.exists(filePath)).toBe(true)
        expect(await StorageManager.exists(`${destDir}/copy.txt`)).toBe(true)
        expect(await StorageManager.get(`${destDir}/copy.txt`)).toBe('copy me')
    })

    it('copies a file with renaming', async () => {
        dir = tmpDir()
        const srcDir = `${dir}/src`
        const destDir = `${dir}/dest`
        await StorageManager.mkdir(srcDir, { recursive: true })
        await StorageManager.mkdir(destDir, { recursive: true })
        const filePath = `${srcDir}/orig.txt`
        await StorageManager.put(filePath, 'copy+rename')
        await StorageManager.copy(filePath, destDir, 'dup.txt')
        expect(await StorageManager.exists(`${destDir}/dup.txt`)).toBe(true)
    })
})

describe('StorageManager.fileStream', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('creates a writable stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stream.txt`
        const ws = StorageManager.fileStream(filePath, 'w')
        expect(ws.writable).toBe(true)
        ws.end('streamed')
        await new Promise<void>(resolve => ws.on('finish', resolve))
        expect(await StorageManager.get(filePath)).toBe('streamed')
    })

    it('creates a readable stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/read-stream.txt`
        await StorageManager.put(filePath, 'readable')
        const rs = StorageManager.fileStream(filePath, 'r')
        expect(rs.readable).toBe(true)
        const chunks: Buffer[] = []
        rs.on('data', (chunk: Buffer) => chunks.push(chunk))
        await new Promise<void>(resolve => rs.on('end', resolve))
        expect(Buffer.concat(chunks).toString()).toBe('readable')
    })
})
