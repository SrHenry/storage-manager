import fs from 'node:fs'
import os from 'node:os'
import Path, { basename, dirname, join } from 'node:path'
import Stream from 'node:stream'

import type { FsAdapter } from '../interfaces/FsAdapter'
import { DirectoryList } from '../../DirectoryList'
import type {
    FileStreamMode,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
    Input,
} from '../../shared/types'
import { sanitizeInput, isIterable, isAsyncIterable } from '../../shared/utils'

export class NodeFsAdapter implements FsAdapter {
    readonly constants = fs.constants
    readonly path = Path

    public async put(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
        if (path.split('/').length > 1) await this.mkdir(dirname(path), { recursive: true })
        return new Promise<boolean>((resolve, reject) => {
            try {
                const stream = this.fileStream(path, 'w')
                stream.write(sanitizeInput(value), charset, err => {
                    stream.end()
                    if (err) reject(err)
                    else resolve(true)
                })
            } catch (err: unknown) {
                reject(err)
            }
        })
    }

    public async putStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset: BufferEncoding = 'utf-8'
    ): Promise<void> {
        if (path.split('/').length > 1) await this.mkdir(dirname(path), { recursive: true })

        const writeFactory = (path: string, encoding: BufferEncoding) => {
            const ws = this.fileStream(path, 'w')
            return {
                stream: ws,
                write: (input: Input) =>
                    new Promise<boolean>((resolve, reject) => {
                        ws.write(sanitizeInput(input), encoding, err =>
                            err ? reject(err) : resolve(true)
                        )
                    }),
            }
        }

        if (isIterable(values)) {
            const { stream, write } = writeFactory(path, charset)
            for (const chunk of values as Iterable<Input>) await write(chunk)
            stream.end()
        } else if (isAsyncIterable(values)) {
            const { stream, write } = writeFactory(path, charset)
            for await (const chunk of values as AsyncIterable<Input>) await write(chunk)
            stream.end()
        } else {
            const { stream, write } = writeFactory(path, charset)
            await write(values)
            stream.end()
        }
    }

    public async append(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
        if (await this.exists(path)) {
            return new Promise<boolean>((resolve, reject) => {
                const chunk = Buffer.isBuffer(value)
                    ? value
                    : Buffer.from(sanitizeInput(value), charset)
                fs.appendFile(path, chunk, err => {
                    if (err) reject(err)
                    else resolve(true)
                })
            })
        } else return this.put(path, value, charset)
    }

    public async appendStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset: BufferEncoding = 'utf-8'
    ) {
        if (await this.exists(path)) {
            const writeFactory = (path: string, encoding: BufferEncoding) => {
                const ws = this.fileStream(path, 'w', null, { flags: 'a' })
                return {
                    stream: ws,
                    write: (input: Input) =>
                        new Promise<boolean>((resolve, reject) => {
                            ws.write(sanitizeInput(input), encoding, err =>
                                err ? reject(err) : resolve(true)
                            )
                        }),
                }
            }

            if (isIterable(values)) {
                const { stream, write } = writeFactory(path, charset)
                for (const chunk of values as Iterable<Input>) await write(chunk)
                stream.end()
            } else if (isAsyncIterable(values)) {
                const { stream, write } = writeFactory(path, charset)
                for await (const chunk of values as AsyncIterable<Input>) await write(chunk)
                stream.end()
            } else {
                const { stream, write } = writeFactory(path, charset)
                await write(values)
                stream.end()
            }
        } else return this.putStreamed(path, values, charset)
    }

    public async get(path: string, encoding: BufferEncoding = 'utf-8') {
        return new Promise<string>((resolve, reject) => {
            this.getAsBuffer(path)
                .then(buffer => resolve(buffer.toString(encoding)))
                .catch(reject)
        })
    }

    public async getAsBuffers(path: string) {
        if (!(await this.exists(path))) throw null
        return new Promise<Buffer[]>(resolve => {
            const arraybuffer: Buffer[] = []
            const readStream = this.fileStream(path, 'r')
            readStream.on('error', () => resolve([]))
            readStream.on('data', chunk => {
                if (Buffer.isBuffer(chunk)) arraybuffer.push(chunk)
                else arraybuffer.push(Buffer.from(chunk))
            })
            readStream.on('close', () => resolve(arraybuffer))
        })
    }

    public async getAsBuffer(path: string) {
        return Buffer.concat(await this.getAsBuffers(path))
    }

    public async getAsJSON(
        path: string,
        encoding: BufferEncoding = 'utf8',
        // biome-ignore lint/suspicious/noExplicitAny: JSON reviver requires any
        reviver?: (this: any, key: string, value: any) => any
    ) {
        return JSON.parse(await this.get(path, encoding), reviver)
    }

    public async rename(path: string, renameTo: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let dest = dirname(renameTo)
            if (dest === '.') dest = join(dirname(path))
            const to = join(dest, basename(renameTo))
            fs.rename(path, to, err => {
                if (err) reject(err)
                else resolve()
            })
        })
    }

    public async move(from: string, to: string, as?: string) {
        return this.rename(from, join(to, as ?? basename(from)))
    }

    public async copy(from: string, to: string, as?: string): Promise<void> {
        const stats = await this.stats(from).catch(err => {
            throw err
        })
        if (stats) {
            const dest = join(to, as ?? basename(from))
            if (stats.isFile()) {
                await this.mkdir(to, { recursive: true })
                return new Promise((resolve, reject) => {
                    fs.copyFile(from, dest, err => {
                        if (err) reject(err)
                        else resolve()
                    })
                })
            } else if (stats.isDirectory()) {
                await this.mkdir(dest, { recursive: true })
                const dir = await this.listDirectory(from, true)
                const files = Array.from(dir).filter(
                    (file): file is string => typeof file === 'string'
                )
                const innerDirs = Array.from(dir).filter(
                    (file): file is DirectoryList => file instanceof DirectoryList
                )
                for (const file of files) await this.copy(join(from, file), dest)
                for (const { name } of innerDirs) await this.copy(join(name), dest)
            }
        }
    }

    public readStream(
        path: string,
        options?: Stream.ReadableOptions | null,
        fsOptions?: NodeJS_fsReadOptions | null
    ): Stream.Readable {
        return this.fileStream(path, 'r', options, fsOptions)
    }

    public writeStream(
        path: string,
        options?: Stream.WritableOptions | null,
        fsOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Writable {
        return this.fileStream(path, 'w', options, fsOptions)
    }

    public duplexStream(
        path: string,
        options?: Stream.DuplexOptions | null,
        readOptions?: NodeJS_fsReadOptions | null,
        writeOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Duplex {
        return this.fileStream(path, 'rw', options, {
            readOptions,
            writeOptions,
        })
    }

    public fileStream(path: string): Stream.Duplex
    public fileStream(
        path: string,
        mode: 'r',
        options?: FileStreamOptionsType<'r'> | null,
        fsOptions?: NodeJS_fsOptionsType<'r'> | null
    ): FileStreamType<'r'>
    public fileStream(
        path: string,
        mode: 'w',
        options?: FileStreamOptionsType<'w'> | null,
        fsOptions?: NodeJS_fsOptionsType<'w'> | null
    ): FileStreamType<'w'>
    public fileStream(
        path: string,
        mode: 'rw',
        options?: FileStreamOptionsType<'rw'> | null,
        fsOptions?: NodeJS_fsOptionsType<'rw'> | null
    ): FileStreamType<'rw'>
    public fileStream(
        path: string,
        mode: FileStreamMode = 'rw',
        options: FileStreamOptionsType<typeof mode> | null = {},
        fsOptions: NodeJS_fsOptionsType<typeof mode> | null = {}
    ): FileStreamType<typeof mode> {
        options = options ?? {}
        fsOptions = fsOptions ?? {}

        switch (mode ?? 'rw') {
            case 'r':
                return fs.createReadStream(path, {
                    ...options,
                    ...fsOptions,
                } as Parameters<typeof fs.createReadStream>[1])
            case 'w':
                return fs.createWriteStream(path, {
                    ...options,
                    ...fsOptions,
                } as Parameters<typeof fs.createWriteStream>[1])
            case 'rw': {
                const [r, w] = [
                    fs.createReadStream(path, {
                        ...options,
                        ...(fsOptions as NodeJS_fsDuplexOptions)?.readOptions,
                    } as Parameters<typeof fs.createReadStream>[1]),
                    fs.createWriteStream(path, {
                        ...options,
                        ...(fsOptions as NodeJS_fsDuplexOptions)?.writeOptions,
                    } as Parameters<typeof fs.createWriteStream>[1]),
                ]
                const streamOptions: FileStreamOptionsType<typeof mode> = {
                    read: r.read.bind(r),
                    write: w.write.bind(w),
                }
                for (const [key, value] of Object.entries(options))
                    streamOptions[key as keyof FileStreamOptionsType<typeof mode>] = value
                const stream = new Stream.Duplex(streamOptions)
                return stream
            }
            default:
                throw new Error('Invalid file stream mode!')
        }
    }

    public stream = this.fileStream

    public async exists(...args: (string | number)[]): Promise<boolean> {
        const last = args.pop()
        let mode: number
        const paths = Array.from(args).filter((arg): arg is string => typeof arg === 'string')
        if (typeof last === 'number') mode = last
        else mode = fs.constants.F_OK
        if (typeof last === 'string') paths.push(last)

        const results = await Promise.all(paths.map(path => this._exists(path, mode)))
        return results.every(Boolean)
    }

    public async doesntExist(...args: (string | number)[]): Promise<boolean> {
        return !(await this.exists(...args))
    }

    private async _exists(path: string, mode: number = fs.constants.F_OK): Promise<boolean> {
        return new Promise(resolve => fs.access(path, mode, err => resolve(!err)))
    }

    public async stats(path: string): Promise<fs.Stats> {
        if (await this.exists(path)) {
            return new Promise((resolve, reject) => {
                fs.lstat(path, (err, stats) => {
                    if (err) reject(err)
                    else resolve(stats)
                })
            })
        } else {
            const err: NodeJS.ErrnoException = { ...new Error() }
            err.code = 'ENOENT'
            // biome-ignore lint/suspicious/noExplicitAny: errno is not on ErrnoException type
            ;(err as any).errno = os.constants.errno.ENOENT
            err.path = path
            Error.captureStackTrace(err)
            throw err
        }
    }

    public async isFile(path: string): Promise<boolean> {
        if (await this.exists(path)) {
            return new Promise((resolve, reject) => {
                fs.lstat(path, (err, stats) => {
                    if (err) reject(err)
                    resolve(stats.isFile())
                })
            })
        } else return false
    }

    public async isDirectory(path: string): Promise<boolean> {
        if (await this.exists(path)) {
            return new Promise((resolve, reject) => {
                fs.lstat(path, (err, stats) => {
                    if (err) reject(err)
                    resolve(stats.isDirectory())
                })
            })
        } else return false
    }

    public async listDirectory(path: string): Promise<string[]>
    public async listDirectory(path: string, recursive: false): Promise<string[]>
    public async listDirectory(path: string, recursive: true): Promise<DirectoryList>
    public async listDirectory(path: string, recursive = false): Promise<string[] | DirectoryList> {
        if (await this.doesntExist(path)) return []
        else if (await this.isFile(path)) return [path]
        else if (recursive) {
            return new Promise((resolve, reject) => {
                fs.readdir(path as string, async (err, list) => {
                    if (err) reject(err)
                    else {
                        type PathTuple = [path: string, fullpath: string]
                        type StatsTuple = [path: string, stats: fs.Stats]

                        const statsPromises = list
                            .map<PathTuple>(node => [node, join(path, node)])
                            .map<
                                Promise<StatsTuple>
                            >(async ([node, _]) => [node, await this.stats(_)])

                        const stats = await Promise.all(statsPromises)

                        const directories = stats
                            .filter(([, stats]) => stats.isDirectory())
                            .map<PathTuple>(([_]) => [_, join(path, _)])
                        const files = stats
                            .filter(([, stats]) => stats.isFile())
                            .map<PathTuple>(([_]) => [_, join(path, _)])

                        const chainPromise = directories.map(([, fullpath]) =>
                            this.listDirectory(fullpath, true)
                        )
                        const chain = await Promise.all(chainPromise)

                        resolve(
                            new DirectoryList(
                                path,
                                [...chain, ...files.map(([_]) => _)],
                                await this.stats(path)
                            )
                        )
                    }
                })
            })
        } else {
            return new Promise((resolve, reject) => {
                fs.readdir(path as string, (err, list) => {
                    if (err) reject(err)
                    else {
                        resolve(list)
                    }
                })
            })
        }
    }

    public async mkdir(
        path: string,
        options: fs.MakeDirectoryOptions = { recursive: true }
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.exists(path).then(exists => {
                if (exists) {
                    resolve()
                } else {
                    fs.mkdir(path, options, err => {
                        if (err) {
                            if (err.code !== 'EEXIST') reject(err)
                            else resolve()
                        } else resolve()
                    })
                }
            })
        })
    }

    public async deleteFromStorage(filePath: string): Promise<void> {
        const metadata = await this.stats(filePath)
        if (metadata.isFile() || metadata.isSymbolicLink())
            return new Promise((resolve, reject) => {
                fs.unlink(filePath, err => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        else if (metadata.isDirectory()) {
            return new Promise<void>((resolve, reject) => {
                fs.rm(filePath, { recursive: true, force: true }, err => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        }
    }

    public delete = this.deleteFromStorage
}
