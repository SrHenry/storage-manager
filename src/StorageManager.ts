import fs from 'node:fs'
import os from 'node:os'
import Path, { basename, dirname, join } from 'node:path'
import Stream from 'node:stream'

import { DirectoryList } from './DirectoryList'
import { type IgnoreUnionType, isAsyncIterable, isIterable, LogicGates } from './utils'

/** Read mode */
type ReadMode = 'r'
/** Write mode */
type WriteMode = 'w'
/** Read and write mode */
type DuplexMode = 'rw'

/** File modes supported */
export type FileStreamMode = ReadMode | WriteMode | DuplexMode
/** Stream options supported */
export type FileStreamOptions =
    | Stream.ReadableOptions
    | Stream.WritableOptions
    | Stream.DuplexOptions

/** Helper to infer Stream type from file mode */
type FileStreamType<T extends FileStreamMode> = T extends ReadMode
    ? Stream.Readable
    : T extends WriteMode
      ? Stream.Writable
      : T extends DuplexMode
        ? Stream.Duplex
        : never
/** Helper to infer StreamOptions type from file mode */
type FileStreamOptionsType<T extends FileStreamMode> = T extends ReadMode
    ? Stream.ReadableOptions
    : T extends WriteMode
      ? Stream.WritableOptions
      : T extends DuplexMode
        ? Stream.DuplexOptions
        : never

/** fs Stream options supported in read mode */
type NodeJS_fsReadOptions = IgnoreUnionType<Parameters<typeof fs.createReadStream>[1], string>
/** fs Stream options supported in write mode */
type NodeJS_fsWriteOptions = IgnoreUnionType<Parameters<typeof fs.createWriteStream>[1], string>
/** fs Stream options supported in duplex mode */
type NodeJS_fsDuplexOptions = {
    readOptions?: IgnoreUnionType<NodeJS_fsReadOptions, string> | null
    writeOptions?: IgnoreUnionType<NodeJS_fsWriteOptions, string> | null
}

/** Helper to infer fs stream options from file mode */
type NodeJS_fsOptionsType<T extends FileStreamMode> = T extends ReadMode
    ? NodeJS_fsReadOptions
    : T extends WriteMode
      ? NodeJS_fsWriteOptions
      : T extends DuplexMode
        ? NodeJS_fsDuplexOptions
        : never

/*

type JSONParameters = Omit<Parameters<typeof JSON.parse>, "text">
type RemoveFromTuple<T extends Iterable<any>, U> = {
    [K in keyof T]: K extends U ? never : T[K]
}

*/

/** Supported input types for underlying API (node/fs) */
export type ValidInput = string | Buffer

/** Supported input types for {@link StorageManager} filesystem wrapper */
export type Input = ValidInput | number | object

/**
 * Wrapper to sanitize input of filesystem input wrappers.
 * @param input Input data to sanitize.
 * @returns a string or buffer representing the input data
 *
 * @since 1.2.0
 */
export function sanitizeInput(input: Buffer): Buffer
export function sanitizeInput(input: string): string
export function sanitizeInput(input: object): string
export function sanitizeInput<T = unknown>(input: T[]): string
export function sanitizeInput<T = unknown>(input: T): string

export function sanitizeInput(input: any): ValidInput {
    if (Buffer.isBuffer(input) || typeof input === 'string') return input
    else if (Array.isArray(input) || typeof input === 'object') return JSON.stringify(input)
    else if ('toString' in input) return input.toString()
    else return `${input}`
}

/**
 * A filesystem wrapper class
 */
export class StorageManager {
    /** @internal */
    private constructor() {}

    public static readonly constants = fs.constants

    public static readonly path = Path

    /**
     * Wrapper to write in a given filename.
     * @param path Path to write file.
     * @param value Plain string to insert into file, or Buffer instance, or serializable (as JSON) object.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async put(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
        if (path.split('/').length > 1)
            await StorageManager.mkdir(dirname(path), { recursive: true })

        return new Promise<boolean>((resolve, reject) => {
            try {
                const stream = StorageManager.fileStream(path, 'w')

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

    /**
     * Wrapper to write in a given filename.
     * @param path Path to write file.
     * @param values You can provide an async iterable object to write on demand or a synchronous one to group inputs before write.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async putStreamed(
        path: string,
        values: AsyncIterable<Input>,
        charset?: BufferEncoding
    ): Promise<void>
    public static async putStreamed(
        path: string,
        values: Iterable<Input>,
        charset?: BufferEncoding
    ): Promise<void>
    public static async putStreamed(
        path: string,
        value: Input,
        charset?: BufferEncoding
    ): Promise<void>

    public static async putStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset: BufferEncoding = 'utf-8'
    ): Promise<void> {
        if (path.split('/').length > 1)
            await StorageManager.mkdir(dirname(path), { recursive: true })

        const writeFactory = (path: string, encoding: BufferEncoding) => {
            const ws = StorageManager.fileStream(path, 'w')

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

            for (const chunk of values) await write(chunk)

            stream.end()
        } else if (isAsyncIterable(values)) {
            const { stream, write } = writeFactory(path, charset)

            for await (const chunk of values) await write(chunk)

            stream.end()
        } else {
            const { stream, write } = writeFactory(path, charset)

            await write(values)

            stream.end()
        }
    }

    /**
     * Wrapper to append file with data.
     * @param path Path to write file.
     * @param value Plain string to append to file, or Buffer instance, or serializable (as JSON) object.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async append(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
        if (await StorageManager.exists(path)) {
            return new Promise<boolean>((resolve, reject) => {
                const chunk = Buffer.isBuffer(value)
                    ? value
                    : Buffer.from(sanitizeInput(value), charset)
                fs.appendFile(path, chunk, err => {
                    if (err) reject(err)
                    else resolve(true)
                })
            })
        } else return StorageManager.put(path, value, charset)
    }

    /**
     * Wrapper to append file with data.
     * @param path Path to write file.
     * @param values You can provide an async iterable object to write on demand or a synchronous one to group inputs before write.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async appendStreamed(
        path: string,
        values: AsyncIterable<Input>,
        charset?: BufferEncoding
    ): Promise<void>
    public static async appendStreamed(
        path: string,
        values: Iterable<Input>,
        charset?: BufferEncoding
    ): Promise<void>
    public static async appendStreamed(
        path: string,
        value: Input,
        charset?: BufferEncoding
    ): Promise<void>

    public static async appendStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input>,
        charset: BufferEncoding = 'utf-8'
    ) {
        if (await StorageManager.exists(path)) {
            // for await (const chunk of values) {
            //     await StorageManager.append(path, chunk, charset)
            // }

            const writeFactory = (path: string, encoding: BufferEncoding) => {
                const ws = StorageManager.fileStream(path, 'w', null, { flags: 'a' })

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

                for (const chunk of values) await write(chunk)

                stream.end()
            } else if (isAsyncIterable(values)) {
                const { stream, write } = writeFactory(path, charset)

                for await (const chunk of values) await write(chunk)

                stream.end()
            } else {
                const { stream, write } = writeFactory(path, charset)

                await write(values)

                stream.end()
            }
        } else return StorageManager.putStreamed(path, values, charset)
    }

    /**
     * Wrapper to read file (load all data in string, intended for small files like config. files).
     * @param path Path to read file.
     * @param encoding Optional encoding of string. Default is "utf-8".
     * @returns The string content of the file.
     */
    public static async get(path: string, encoding: BufferEncoding = 'utf-8') {
        return new Promise<string>((resolve, reject) => {
            StorageManager.getAsBuffer(path)
                .then(buffer => resolve(buffer.toString(encoding)))
                .catch(reject)
        })
    }

    /**
     * Wrapper to read file (load all data into array of buffers, intended for small binary files).
     * @param path Path to read file.
     * @returns The array with the binary buffers streamed of the file.
     */
    public static async getAsBuffers(path: string) {
        if (!(await StorageManager.exists(path))) throw null
        return new Promise<Buffer[]>(resolve => {
            const arraybuffer: Buffer[] = []
            const readStream = StorageManager.fileStream(path, 'r')

            readStream.on('error', () => resolve([]))

            readStream.on('data', chunk => {
                if (Buffer.isBuffer(chunk)) arraybuffer.push(chunk)
                else arraybuffer.push(Buffer.from(chunk))
            })

            readStream.on('close', () => resolve(arraybuffer))
        })
    }

    /**
     * Wrapper to read file (load all data into a single buffer, intended for small binary files).
     * @param path Path to read file.
     * @returns The array with the binary buffers streamed of the file.
     */
    public static async getAsBuffer(path: string) {
        return Buffer.concat(await StorageManager.getAsBuffers(path))
    }

    /**
     * Wrapper to read file as JSON (load all data into a single buffer, intended for small binary files).
     * @param path Path to read JSON file (be careful to do not load huge JSONs, as it will load entire JSON file in string before parsing).
     * @param encoding file encoding to parse, default is "utf-8".
     * @param reviver A function that transforms the results. This function is called for each member of the object.
     * If a member contains nested objects, the nested objects are transformed before the parent object is.
     * @since 1.2.0
     */
    public static async getAsJSON(
        path: string,
        encoding: BufferEncoding = 'utf8',
        reviver?: (this: any, key: string, value: any) => any
    ) {
        return JSON.parse(await StorageManager.get(path, encoding), reviver)
    }

    /**
     * Wrapper to rename a file, or directory.
     * @param path Current path.
     * @param renameTo New name to file or directory.
     *
     * @since 1.4.0
     */
    public static async rename(path: string, renameTo: string): Promise<void> {
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

    /**
     * Wrapper to move a file, or directory.
     * @param from Current path.
     * @param to New path.
     * @param as Optional renaming.
     *
     * @since 1.4.0
     */
    public static async move(from: string, to: string, as?: string) {
        return StorageManager.rename(from, join(to, as ?? basename(from)))
    }

    /**
     * Wrapper to copy a file or a directory to a given directory.
     * @param from Path to a file or directory.
     * @param to Path of new directory to copy (input will be put inside this path).
     * @param as Optional new name of file or directory.
     *
     * @since 1.4.0
     */
    public static async copy(from: string, to: string, as?: string): Promise<void> {
        const stats = await StorageManager.stats(from).catch(err => {
            throw err
        })

        if (stats) {
            const dest = join(to, as ?? basename(from))

            if (stats.isFile()) {
                await StorageManager.mkdir(to, { recursive: true })

                return new Promise((resolve, reject) => {
                    fs.copyFile(from, dest, err => {
                        if (err) reject(err)
                        else resolve()
                    })
                })
            } else if (stats.isDirectory()) {
                await StorageManager.mkdir(dest, { recursive: true })

                const dir = await StorageManager.listDirectory(from, true)
                const files = Array.from(dir).filter(
                    (file): file is string => typeof file === 'string'
                )

                const innerDirs = Array.from(dir).filter(
                    (file): file is DirectoryList => file instanceof DirectoryList
                )

                for (const file of files) await StorageManager.copy(join(from, file), dest)

                for (const { name } of innerDirs) await StorageManager.copy(join(name), dest)
            }
        }
    }

    /**
     * Create a readable stream of file at given path.
     * @param path Path to file
     * @param options Optional {@link Stream.ReadableOptions *node:stream.ReadableOptions*} object to customize stream
     * @param fsOptions Optional settings for underlying fs stream.
     *
     * @returns Readable stream object of file
     */
    public static readStream(
        path: string,
        options?: Stream.ReadableOptions | null,
        fsOptions?: NodeJS_fsReadOptions | null
    ): Stream.Readable {
        return StorageManager.fileStream(path, 'r', options, fsOptions)
    }

    /**
     * Create a writable stream of file at given path.
     * @param path Path to file
     * @param options Optional {@link Stream.WritableOptions *node:stream.WritableOptions*} object to customize stream
     * @param fsOptions Optional settings for underlying fs stream.
     *
     * @returns Writable stream object of file
     */
    public static writeStream(
        path: string,
        options?: Stream.WritableOptions | null,
        fsOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Writable {
        return StorageManager.fileStream(path, 'w', options, fsOptions)
    }

    /**
     * Create a Duplex (both Readable and Writable) stream of file at given path.
     * @param path Path to file
     * @param options Optional {@link Stream.DuplexOptions *node:stream.DuplexOptions*} object to customize stream
     * @param fsOptions Optional settings for underlying fs stream.
     *
     * @returns Duplex stream object of file
     */
    public static duplexStream(
        path: string,
        options?: Stream.DuplexOptions | null,
        readOptions?: NodeJS_fsReadOptions | null,
        writeOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Duplex {
        return StorageManager.fileStream(path, 'rw', options, {
            readOptions,
            writeOptions,
        })
    }

    /**
     * Create a stream of file at given path.
     * @param path Path to file
     * @param mode file stream mode, defaults 'rw'
     * @param options Optional {@link Stream.StreamOptions *node:stream.StreamOptions*} object to customize stream
     * @param fsOptions Optional *node:fs.StreamOptions* object to customize stream
     *
     * @returns Stream object of file
     */
    public static fileStream(path: string): Stream.Duplex
    public static fileStream(
        path: string,
        mode: ReadMode,
        options?: FileStreamOptionsType<typeof mode> | null,
        fsOptions?: NodeJS_fsOptionsType<typeof mode> | null
    ): FileStreamType<typeof mode>
    public static fileStream(
        path: string,
        mode: WriteMode,
        options?: FileStreamOptionsType<typeof mode> | null,
        fsOptions?: NodeJS_fsOptionsType<typeof mode> | null
    ): FileStreamType<typeof mode>
    public static fileStream(
        path: string,
        mode: DuplexMode,
        options?: FileStreamOptionsType<typeof mode> | null,
        fsOptions?: NodeJS_fsOptionsType<typeof mode> | null
    ): FileStreamType<typeof mode>

    public static fileStream(
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

    public static stream = StorageManager.fileStream
    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param path Path to check avaiability.
     *
     * @returns A promise of existance check.
     */
    public static async exists(path: string): Promise<boolean>

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param path Path to check avaiability.
     * @param mode Optional access mode flags to check avaiability (see: {@link fs.constants NodeJS.fs.constants}).
     *
     * @returns A promise of existance check.
     */
    public static async exists(path: string, mode: number): Promise<boolean>

    public static async exists(path1: string, path2: string): Promise<boolean>
    public static async exists(path1: string, path2: string, mode: number): Promise<boolean>
    public static async exists(path1: string, path2: string, path3: string): Promise<boolean>
    public static async exists(
        path1: string,
        path2: string,
        path3: string,
        mode: number
    ): Promise<boolean>
    public static async exists(
        path1: string,
        path2: string,
        path3: string,
        path4: string
    ): Promise<boolean>
    public static async exists(
        path1: string,
        path2: string,
        path3: string,
        path4: string,
        mode: number
    ): Promise<boolean>

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param paths paths to check in a row
     *
     * @returns A promise of existance check.
     */
    public static async exists(...paths: string[]): Promise<boolean>

    public static async exists(...args: (string | number)[]): Promise<boolean>

    public static async exists(...args: (string | number)[]): Promise<boolean> {
        const last = args.pop()
        let mode: number
        const paths = Array.from(args).filter((arg): arg is string => typeof arg === 'string')

        if (typeof last === 'number') mode = last
        else mode = fs.constants.F_OK

        if (typeof last === 'string') paths.push(last)

        return LogicGates.AND(
            ...(await Promise.all(paths.map(path => StorageManager._exists(path, mode))))
        )
    }

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param path Path to check avaiability.
     *
     * @returns A promise of existance check.
     */
    private static async _exists(path: string, mode: number = fs.constants.F_OK): Promise<boolean> {
        return new Promise(resolve => fs.access(path, mode, err => resolve(!err)))
    }

    /**
     * Wrapper to retrieve stats of a given path
     * @param path Path to retrieve stats.
     * @since 1.4.0
     */
    public static async stats(path: string): Promise<fs.Stats> {
        if (await StorageManager.exists(path)) {
            return new Promise((resolve, reject) => {
                fs.lstat(path, (err, stats) => {
                    if (err) reject(err)
                    else resolve(stats)
                })
            })
        } else {
            const err: NodeJS.ErrnoException = { ...new Error() }
            err.code = 'ENOENT'
            err.errno = os.constants.errno.ENOENT
            err.path = path

            Error.captureStackTrace(err)

            throw err
        }
    }

    /**
     * Wrapper to check if a path does not exist in filesystem. Is the oposite of {@link StorageManager.exists exists()} method.
     * @param path Path to check unavaiability.
     * @returns A promise of non-existance check.
     */
    public static async doesntExist(path: string): Promise<boolean>

    /**
     * Wrapper to check if a path does not exist in filesystem. Is the oposite of {@link StorageManager.exists exists()} method.
     * @param path Path to check unavaiability.
     * @param mode Optional access mode flags to check unavaiability (see: {@link fs.constants NodeJS.fs.constants}).
     *
     * @returns A promise of non-existance check.
     */
    public static async doesntExist(path: string, mode: number): Promise<boolean>

    public static async doesntExist(path1: string, path2: string): Promise<boolean>
    public static async doesntExist(path1: string, path2: string, mode: number): Promise<boolean>
    public static async doesntExist(path1: string, path2: string, path3: string): Promise<boolean>
    public static async doesntExist(
        path1: string,
        path2: string,
        path3: string,
        mode: number
    ): Promise<boolean>
    public static async doesntExist(
        path1: string,
        path2: string,
        path3: string,
        path4: string
    ): Promise<boolean>
    public static async doesntExist(
        path1: string,
        path2: string,
        path3: string,
        path4: string,
        mode: number
    ): Promise<boolean>

    /**
     * Wrapper to check if a path does not exist in filesystem. Is the oposite of {@link StorageManager.exists exists()} method.
     * @param paths Paths to check in a row.
     *
     * @returns A promise of non-existance check.
     */
    public static async doesntExist(...paths: string[]): Promise<boolean>

    public static async doesntExist(...args: (string | number)[]): Promise<boolean>

    public static async doesntExist(...args: (string | number)[]): Promise<boolean> {
        return !(await StorageManager.exists(...args))
    }

    /** Checks if given path corresponds to a file */
    public static async isFile(path: string): Promise<boolean> {
        if (await StorageManager.exists(path)) {
            return new Promise((resolve, reject) => {
                fs.lstat(path, (err, stats) => {
                    if (err) reject(err)
                    resolve(stats.isFile())
                })
            })
        } else return false
    }

    /** Checks if given path corresponds to a directory */
    public static async isDirectory(path: string): Promise<boolean> {
        if (await StorageManager.exists(path)) {
            return new Promise((resolve, reject) => {
                fs.lstat(path, (err, stats) => {
                    if (err) reject(err)
                    resolve(stats.isDirectory())
                })
            })
        } else return false
    }

    /**
     * Wrapper to list directory contents
     * @param path Path to list
     * @param recursive Optional flag to list recursively
     */
    public static async listDirectory(path: string): Promise<string[]>
    public static async listDirectory(path: string, recursive: false): Promise<string[]>
    public static async listDirectory(path: string, recursive: true): Promise<DirectoryList>
    public static async listDirectory(
        path: string,
        recursive = false
    ): Promise<string[] | DirectoryList> {
        if (await StorageManager.doesntExist(path)) return []
        else if (await StorageManager.isFile(path)) return [path]
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
                            >(async ([node, _]) => [node, await StorageManager.stats(_)])
                        const stats = await Promise.all(statsPromises)

                        const directories = stats
                            .filter(([, stats]) => stats.isDirectory())
                            .map<PathTuple>(([_]) => [_, join(path, _)])

                        const files = stats
                            .filter(([, stats]) => stats.isFile())
                            .map<PathTuple>(([_]) => [_, join(path, _)])

                        const chainPromise = directories.map(([, fullpath]) =>
                            StorageManager.listDirectory(fullpath, true)
                        )
                        const chain = await Promise.all(chainPromise)

                        resolve(
                            new DirectoryList(
                                path,
                                [...chain, ...files.map(([_]) => _)],
                                await StorageManager.stats(path)
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

    /**
     * Wrapper function to directory creation in filesystem (recursive or not).
     * @param path Path to search in filesystem.
     * @param options Filesystem options for mkdir operation.
     * @param cb Optional callback for mkdir async operation.
     * @returns A promise of mkdir operation.
     */
    public static async mkdir(
        path: string,
        options: fs.MakeDirectoryOptions = { recursive: true },
        cb?: (err: NodeJS.ErrnoException | null, path?: string) => null
    ) {
        return new Promise((resolve: (err: NodeJS.ErrnoException | null) => void, reject) => {
            const promiseArgs = (first: any, ...args: any[]) => (cb ? cb(first, ...args) : first)
            const preHandler = (err: NodeJS.ErrnoException | null, path?: string) => {
                if (err) {
                    if (err.code !== 'EEXIST') return reject(promiseArgs(err, path))
                    else return resolve(promiseArgs(err, path))
                } else return resolve(promiseArgs(null, path))
            }

            StorageManager.exists(path).then(exists => {
                if (exists) return preHandler(null, path)
                return fs.mkdir(path, options, preHandler)
            })
        })
    }

    /**
     * Wrapper of delete operation in filesystem.
     * @param filePath A path to unlink or delete from filesystem.
     * @param callback Optional callback called after delete operation is finished.
     * @returns A promise of the delete operation.
     */
    public static async deleteFromStorage(
        filePath: string,
        callback?: (err: NodeJS.ErrnoException | null) => undefined | any
    ): Promise<void> {
        const metadata = await StorageManager.stats(filePath)
        if (metadata.isFile() || metadata.isSymbolicLink())
            return new Promise((resolve, reject) => {
                const done = (err: NodeJS.ErrnoException | null) => {
                    callback?.(err)
                    if (err) reject(err)
                    else resolve()
                }
                fs.unlink(filePath, done)
            })
        else if (metadata.isDirectory()) {
            return new Promise<void>((resolve, reject) => {
                const done = (err: NodeJS.ErrnoException | null) => {
                    callback?.(err)
                    if (err) reject(err)
                    else resolve()
                }
                fs.rm(filePath, { recursive: true, force: true }, done)
            })
        }
    }

    /**
     * Wrapper of delete operation in filesystem.
     * @param filePath A path to unlink or delete from filesystem.
     * @returns A promise of the delete operation.
     */
    public static delete = StorageManager.deleteFromStorage
}

export default StorageManager
