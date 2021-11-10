import fs from "fs"
import os from "os"
import Stream from "stream"
import Path, { join, basename, dirname } from "path"
import { IgnoreUnionType, isAsyncIterable, isIterable, removeLastElement, LogicGates } from "./utils"
import { lt } from "semver"
import { DirectoryList } from "./DirectoryList"



/** Read mode */
type ReadMode = "r"
/** Write mode */
type WriteMode = "w"
/** Read and write mode */
type DuplexMode = "rw"

/** File modes supported */
export type FileStreamMode = ReadMode | WriteMode | DuplexMode
/** Stream options supported */
export type FileStreamOptions = Stream.ReadableOptions | Stream.WritableOptions | Stream.DuplexOptions

/** Helper to infer Stream type from file mode */
type FileStreamType<T extends FileStreamMode> = T extends ReadMode ? Stream.Readable : T extends WriteMode ? Stream.Writable : T extends DuplexMode ? Stream.Duplex : never
/** Helper to infer StreamOptions type from file mode */
type FileStreamOptionsType<T extends FileStreamMode> = T extends ReadMode ? Stream.ReadableOptions : T extends WriteMode ? Stream.WritableOptions : T extends DuplexMode ? Stream.DuplexOptions : never

/** fs Stream options supported in read mode */
type NodeJS_fsReadOptions = IgnoreUnionType<Parameters<typeof fs.createReadStream>[1], string>
/** fs Stream options supported in write mode */
type NodeJS_fsWriteOptions = IgnoreUnionType<Parameters<typeof fs.createReadStream>[1], string>
/** fs Stream options supported in duplex mode */
type NodeJS_fsDuplexOptions = {
    readOptions?: IgnoreUnionType<NodeJS_fsReadOptions, string> | null
    writeOptions?: IgnoreUnionType<NodeJS_fsWriteOptions, string> | null
}

/** Helper to infer fs stream options from file mode */
type NodeJS_fsOptionsType<T extends FileStreamMode> = T extends ReadMode ? NodeJS_fsReadOptions : T extends WriteMode ? NodeJS_fsWriteOptions : T extends DuplexMode ? NodeJS_fsDuplexOptions : never

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

export function sanitizeInput(input: any): ValidInput
{
    if (Buffer.isBuffer(input) || typeof input === "string")
        return input
    else if (Array.isArray(input) || typeof input === "object")
        return JSON.stringify(input)
    else if ('toString' in input)
        return input.toString()
    else
        return `${input}`
}


/**
 * A filesystem wrapper class
 */
export class StorageManager
{
    /** @internal */
    private constructor() { }

    public static readonly constants = fs.constants

    public static readonly path = Path

    /**
     * Wrapper to write in a given filename.
     * @param path Path to write file.
     * @param value Plain string to insert into file, or Buffer instance, or serializable (as JSON) object.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async put(path: string, value: Input, charset: BufferEncoding = "utf-8")
    {
        if (path.split("/").length > 1)
            await StorageManager.mkdir(dirname(path), { recursive: true })

        return new Promise<boolean>((resolve, reject) =>
        {
            try {
                const stream = StorageManager.fileStream(path, "w")

                stream.write(sanitizeInput(value), charset, err =>
                {
                    stream.end()

                    if (!!err)
                        reject(err)
                    else
                        resolve(true)
                })
            }
            catch (err: unknown) {
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
    public static async putStreamed(path: string, values: AsyncIterable<Input>, charset?: BufferEncoding): Promise<void>
    public static async putStreamed(path: string, values: Iterable<Input>, charset?: BufferEncoding): Promise<void>
    public static async putStreamed(path: string, value: Input, charset?: BufferEncoding): Promise<void>

    public static async putStreamed(path: string, values: AsyncIterable<Input> | Iterable<Input> | Input, charset: BufferEncoding = "utf-8"): Promise<void>
    {
        if (path.split("/").length > 1)
            await StorageManager.mkdir(dirname(path), { recursive: true })

        const writeFactory = (path: string, encoding: BufferEncoding) =>
        {
            const ws = StorageManager.fileStream(path, "w")

            return {
                stream: ws,
                write: (input: Input) => new Promise<boolean>((resolve, reject) =>
                {
                    ws.write(sanitizeInput(input), encoding, err => !!err ? reject(err) : resolve(true))
                })
            }
        }

        if (isIterable(values)) {
            const { stream, write } = writeFactory(path, charset)

            for (const chunk of values)
                await write(chunk)

            stream.end()
        }
        else if (isAsyncIterable(values)) {
            const { stream, write } = writeFactory(path, charset)

            for await (const chunk of values)
                await write(chunk)

            stream.end()
        }
        else {
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
    public static async append(path: string, value: Input, charset: BufferEncoding = "utf-8")
    {
        if (await StorageManager.exists(path)) {
            return new Promise<boolean>((resolve, reject) =>
            {
                const chunk = Buffer.isBuffer(value) ? value : Buffer.from(sanitizeInput(value), charset)
                fs.appendFile(path, chunk, err =>
                {
                    if (!!err)
                        reject(err)
                    else resolve(true)
                })
            })
        }
        else return StorageManager.put(path, value, charset)
    }

    /**
     * Wrapper to append file with data.
     * @param path Path to write file.
     * @param values You can provide an async iterable object to write on demand or a synchronous one to group inputs before write.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async appendStreamed(path: string, values: AsyncIterable<Input>, charset?: BufferEncoding): Promise<void>
    public static async appendStreamed(path: string, values: Iterable<Input>, charset?: BufferEncoding): Promise<void>
    public static async appendStreamed(path: string, value: Input, charset?: BufferEncoding): Promise<void>

    public static async appendStreamed(path: string, values: AsyncIterable<Input> | Iterable<Input>, charset: BufferEncoding = "utf-8")
    {
        if (await StorageManager.exists(path)) {
            for await (const chunk of values) {
                await StorageManager.append(path, chunk, charset)
            }

            const writeFactory = (path: string, encoding: BufferEncoding) =>
            {
                const ws = StorageManager.fileStream(path, "w", null, { flags: "a" })

                return {
                    stream: ws,
                    write: (input: Input) => new Promise<boolean>((resolve, reject) =>
                    {
                        ws.write(sanitizeInput(input), encoding, err => !!err ? reject(err) : resolve(true))
                    })
                }
            }

            if (isIterable(values)) {
                const { stream, write } = writeFactory(path, charset)

                for (const chunk of values)
                    await write(chunk)

                stream.end()
            }
            else if (isAsyncIterable(values)) {
                const { stream, write } = writeFactory(path, charset)

                for await (const chunk of values)
                    await write(chunk)

                stream.end()
            }
            else {
                const { stream, write } = writeFactory(path, charset)

                await write(values)

                stream.end()
            }
        }
        else return StorageManager.putStreamed(path, values, charset)
    }

    /**
     * Wrapper to read file (load all data in string, intended for small files like config. files).
     * @param path Path to read file.
     * @param encoding Optional encoding of string. Default is "utf-8".
     * @returns The string content of the file.
     */
    public static async get(path: string, encoding: BufferEncoding = "utf-8")
    {
        return new Promise<string>((resolve, reject) =>
        {
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
    public static getAsBuffers(path: string)
    {
        return new Promise<Buffer[]>(async (resolve, reject) =>
        {
            if (await StorageManager.exists(path)) {
                const arraybuffer = new Array<Buffer>()
                const readStream = StorageManager.fileStream(path, "r")

                readStream.on('error', reject)

                readStream.on('data', chunk =>
                {
                    if (Buffer.isBuffer(chunk))
                        arraybuffer.push(chunk)
                    else
                        arraybuffer.push(Buffer.from(chunk))
                });

                readStream.on('close', () => resolve(arraybuffer))
            }
            else reject(null)
        })
    }

    /**
     * Wrapper to read file (load all data into a single buffer, intended for small binary files).
     * @param path Path to read file.
     * @returns The array with the binary buffers streamed of the file.
     */
    public static getAsBuffer(path: string)
    {
        return new Promise<Buffer>(async (resolve, reject) =>
        {
            try {
                resolve(Buffer.concat(await StorageManager.getAsBuffers(path)))
            }
            catch (err: unknown) {
                reject(err)
            }
        })
    }

    /**
     * Wrapper to read file as JSON (load all data into a single buffer, intended for small binary files).
     * @param path Path to read JSON file (be careful to do not load huge JSONs, as it will load entire JSON file in string before parsing).
     * @param encoding file encoding to parse, default is "utf-8".
     * @param reviver A function that transforms the results. This function is called for each member of the object.
     * If a member contains nested objects, the nested objects are transformed before the parent object is.
     * @since 1.2.0
     */
    public static async getAsJSON(path: string, encoding: BufferEncoding = "utf8", reviver?: (this: any, key: string, value: any) => any)
    {
        return new Promise(async (resolve, reject) =>
        {
            try {
                resolve(JSON.parse(await StorageManager.get(path, encoding), reviver))
            } catch (err: unknown) {
                reject(err)
            }
        })
    }

    /**
     * Wrapper to rename a file, or directory.
     * @param path Current path.
     * @param renameTo New name to file or directory.
     *
     * @since 1.4.0
     */
    public static async rename(path: string, renameTo: string): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            let dest = dirname(renameTo)
            if (dest === ".")
                dest = join(dirname(path))

            const to = join(dest, basename(renameTo))

            fs.rename(path, to, err =>
            {
                if (err)
                    reject(err)
                else
                    resolve()
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
    public static async move(from: string, to: string, as?: string)
    {
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
    public static async copy(from: string, to: string, as?: string): Promise<void>
    {
        return new Promise(async (resolve, reject) =>
        {
            const stats = await StorageManager.stats(from)
                .catch(err => resolve(err))

            if (stats) {
                const dest = join(to, as ?? basename(from))

                if (stats.isFile()) {
                    await StorageManager.mkdir(to, { recursive: true })

                    fs.copyFile(from, dest, err =>
                    {
                        if (err)
                            reject(err)
                        else
                            resolve()
                    })
                }
                else if (stats.isDirectory()) {
                    await StorageManager.mkdir(dest, { recursive: true })

                    const dir = await StorageManager.listDirectory(from, true)
                    const files = Array.from(dir)
                        .filter((file): file is string => typeof file === "string")

                    const innerDirs = Array.from(dir)
                        .filter((file): file is DirectoryList => file instanceof DirectoryList)

                    for (const file of files)
                        await StorageManager.copy(join(from, file), dest)

                    for (const { name } of innerDirs)
                        await StorageManager.copy(join(name), dest)

                    resolve()
                }
            }
        })
    }

    /**
     * Create a readable stream of file at given path.
     * @param path Path to file
     * @param options Optional {@link Stream.ReadableOptions *node:stream.ReadableOptions*} object to customize stream
     * @param fsOptions Optional settings for underlying fs stream.
     *
     * @returns Readable stream object of file
     */
    public static readStream(path: string, options?: Stream.ReadableOptions | null, fsOptions?: NodeJS_fsReadOptions | null): Stream.Readable
    {
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
    public static writeStream(path: string, options?: Stream.WritableOptions | null, fsOptions?: NodeJS_fsWriteOptions | null): Stream.Writable
    {
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
    public static duplexStream(path: string, options?: Stream.DuplexOptions | null, readOptions?: NodeJS_fsReadOptions | null, writeOptions?: NodeJS_fsWriteOptions | null): Stream.Duplex
    {
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
    public static fileStream(path: string, mode: ReadMode, options?: FileStreamOptionsType<typeof mode> | null, fsOptions?: NodeJS_fsOptionsType<typeof mode> | null): FileStreamType<typeof mode>
    public static fileStream(path: string, mode: WriteMode, options?: FileStreamOptionsType<typeof mode> | null, fsOptions?: NodeJS_fsOptionsType<typeof mode> | null): FileStreamType<typeof mode>
    public static fileStream(path: string, mode: DuplexMode, options?: FileStreamOptionsType<typeof mode> | null, fsOptions?: NodeJS_fsOptionsType<typeof mode> | null): FileStreamType<typeof mode>

    public static fileStream(path: string, mode: FileStreamMode = "rw", options: FileStreamOptionsType<typeof mode> | null = {}, fsOptions: NodeJS_fsOptionsType<typeof mode> | null = {}): FileStreamType<typeof mode>
    {
        options = options ?? {}
        fsOptions = fsOptions ?? {}

        switch (mode ?? "rw") {
            case "r":
                return fs.createReadStream(path, {
                    ...options,
                    ...fsOptions,
                })
                break
            case "w":
                return fs.createWriteStream(path, {
                    ...options,
                    ...fsOptions,
                })
                break
            case "rw":
                const [r, w] = [
                    fs.createReadStream(path, {
                        ...options,
                        ...(fsOptions as NodeJS_fsDuplexOptions)?.readOptions,
                    }),
                    fs.createWriteStream(path, {
                        ...options,
                        ...(fsOptions as NodeJS_fsDuplexOptions)?.writeOptions,
                    })
                ]

                const streamOptions: FileStreamOptionsType<typeof mode> = {
                    read: r.read.bind(r),
                    write: w.write.bind(w),
                }

                for (const [key, value] of Object.entries(options))
                    streamOptions[key as keyof FileStreamOptionsType<typeof mode>] = value

                const stream = new Stream.Duplex(streamOptions)

                return stream
                break
            default:
                throw new Error("Invalid file stream mode!")
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
    public static async exists(path1: string, path2: string, path3: string, mode: number): Promise<boolean>
    public static async exists(path1: string, path2: string, path3: string, path4: string): Promise<boolean>
    public static async exists(path1: string, path2: string, path3: string, path4: string, mode: number): Promise<boolean>

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param paths paths to check in a row
     *
     * @returns A promise of existance check.
     */
    public static async exists(...paths: string[]): Promise<boolean>

    public static async exists(...args: (string | number)[]): Promise<boolean>

    public static async exists(...args: (string | number)[]): Promise<boolean>
    {
        let last = args.pop()
        let mode: number
        let paths = Array.from(args).filter((arg): arg is string => typeof arg === "string")

        if (typeof last === "number")
            mode = last
        else
            mode = fs.constants.F_OK

        if (typeof last === "string")
            paths.push(last)

        return LogicGates.AND(...await Promise.all(paths.map(path => StorageManager._exists(path, mode))))
    }

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param path Path to check avaiability.
     *
     * @returns A promise of existance check.
     */
    private static async _exists(path: string, mode: number = fs.constants.F_OK): Promise<boolean>
    {
        return new Promise(resolve => fs.access(path, mode, err => resolve(!err)))
    }

    /**
     * Wrapper to retrieve stats of a given path
     * @param path Path to retrieve stats.
     * @since 1.4.0
     */
    public static async stats(path: string): Promise<fs.Stats>
    {
        return new Promise(async (resolve, reject) =>
        {
            if (await StorageManager.exists(path)) {
                fs.lstat(path, (err, stats) =>
                {
                    if (err)
                        reject(err)
                    else
                        resolve(stats)
                })
            }
            else {
                const err: NodeJS.ErrnoException = { ...new Error }
                err.code = 'ENOENT'
                err.errno = os.constants.errno.ENOENT
                err.path = path

                Error.captureStackTrace(err)


                reject(err)
            }
        })
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
    public static async doesntExist(path1: string, path2: string, path3: string, mode: number): Promise<boolean>
    public static async doesntExist(path1: string, path2: string, path3: string, path4: string): Promise<boolean>
    public static async doesntExist(path1: string, path2: string, path3: string, path4: string, mode: number): Promise<boolean>

    /**
    * Wrapper to check if a path does not exist in filesystem. Is the oposite of {@link StorageManager.exists exists()} method.
    * @param paths Paths to check in a row.
    *
    * @returns A promise of non-existance check.
    */
    public static async doesntExist(...paths: string[]): Promise<boolean>

    public static async doesntExist(...args: (string | number)[]): Promise<boolean>

    public static async doesntExist(...args: (string | number)[]): Promise<boolean>
    {
        return !(await StorageManager.exists(...args))
    }

    /** Checks if given path corresponds to a file */
    public static async isFile(path: string): Promise<boolean>
    {
        return new Promise(async (resolve, reject) =>
        {
            if (await StorageManager.exists(path))
                fs.lstat(path, (err, stats) =>
                {
                    if (!!err)
                        reject(err)
                    resolve(stats.isFile())
                })
            else resolve(false)
        })
    }

    /** Checks if given path corresponds to a directory */
    public static async isDirectory(path: string): Promise<boolean>
    {
        return new Promise(async (resolve, reject) =>
        {
            if (await StorageManager.exists(path))
                fs.lstat(path, (err, stats) =>
                {
                    if (!!err)
                        reject(err)
                    resolve(stats.isDirectory())
                })
            else resolve(false)
        })
    }

    /**
     * Wrapper to list directory contents
     * @param path Path to list
     * @param recursive Optional flag to list recursively
     */
    public static async listDirectory(path: string): Promise<string[]>
    public static async listDirectory(path: string, recursive: false): Promise<string[]>
    public static async listDirectory(path: string, recursive: true): Promise<DirectoryList>
    public static async listDirectory(path: string, recursive = false): Promise<string[] | DirectoryList>
    {
        return new Promise(async (_return, _throw) =>
        {
            if (await StorageManager.doesntExist(path))
                _return([])
            else if (await StorageManager.isFile(path))
                _return([path])
            else if (!!recursive) {
                fs.readdir(path as string, async (err, list) =>
                {
                    if (!!err)
                        _throw(err)
                    else {
                        type PathTuple = [path: string, fullpath: string]
                        type StatsTuple = [path: string, stats: fs.Stats]

                        const statsPromises = list
                            .map<PathTuple>(node => [node, join(path, node)])
                            .map<Promise<StatsTuple>>(async ([node, _]) => [node, await StorageManager.stats(_)])
                        const stats = await Promise.all(statsPromises)

                        const directories = stats.filter(([, stats]) => stats.isDirectory())
                            .map<PathTuple>(([_]) => [_, join(path, _)])

                        const files = stats.filter(([, stats]) => stats.isFile())
                            .map<PathTuple>(([_]) => [_, join(path, _)])

                        const chainPromise = directories.map(([, fullpath]) => StorageManager.listDirectory(fullpath, true))
                        const chain = await Promise.all(chainPromise)

                        _return(new DirectoryList(path, [...chain, ...files.map(([_]) => _)], await StorageManager.stats(path)))
                    }
                })
            }
            else {
                fs.readdir(path as string, async (err, list) =>
                {
                    if (!!err)
                        _throw(err)
                    else {
                        _return(list)
                    }
                })
            }
        })
    }

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param path Path to check avaiability.
     * @param cb Optional callback to run after async check.
     * @returns A promise of existance check.
     *
     * @deprecated @see {@link StorageManager.exists StorageManager.exists()}
     */
    public static async checkExist(path: string, cb?: (exists?: (boolean | PromiseLike<boolean> | undefined)) => any): Promise<boolean>
    {
        return new Promise((resolve, reject) => fs.access(path, fs.constants.F_OK, err =>
        {
            !!err ? reject(cb ? cb(false) : err) : resolve(cb ? cb(true) : true)
        }))
    }

    /**
     * Wrapper to write files asynchronously in filesystem.
     * @param filePath Path of the file to write in filesystem (overrides if already exists).
     * @param f File data, as ArrayBuffer or UInt8Array.
     * @param encoding Optional encoding of data, default binary.
     *
     * @deprecated @see {@link StorageManager.put StorageManager.put()},
     *  {@link StorageManager.putStreamed StorageManager.putStreamed()},
     *  {@link StorageManager.append StorageManager.append()},
     *  {@link StorageManager.appendStreamed StorageManager.appendStreamed()},
     */
    public static async writeStorage(filePath: string, f: ArrayBuffer | SharedArrayBuffer | Uint8Array, encoding: BufferEncoding = "binary"): Promise<void>
    {
        let buffer = Buffer.from(f)

        // removeLastElement(filePath.split("/"))

        fs.access(removeLastElement(filePath.split("/")).join("/"), fs.constants.F_OK, err =>
        {
            if (err) {
                fs.mkdir(removeLastElement(filePath.split("/")).join("/"), { recursive: true }, (err, _path) =>
                {
                    if (err) {
                        if (err.code !== 'EEXIST')
                            console.error(err)
                        else fs.createWriteStream(filePath).write(buffer, encoding)
                    }
                    else fs.createWriteStream(filePath).write(buffer, encoding)
                })
            }
            else removeLastElement(filePath.split("/")).join("/")
        })
        // return fs.createWriteStream(filePath).write(buffer, encoding);
    }

    /**
     * Wrapper function to directory creation in filesystem (recursive or not).
     * @param path Path to search in filesystem.
     * @param options Filesystem options for mkdir operation.
     * @param cb Optional callback for mkdir async operation.
     * @returns A promise of mkdir operation.
     */
    public static async mkdir(path: string,
        options: fs.MakeDirectoryOptions = { recursive: true },
        cb?: (err: NodeJS.ErrnoException | null, path?: string) => null)
    {
        return new Promise((resolve: (err: NodeJS.ErrnoException | null) => void,
            reject) =>
        {
            const promiseArgs = (first: any, ...args: any[]) => cb ? cb(first, ...args) : first
            const preHandler = (err: NodeJS.ErrnoException | null, path?: string) =>
            {
                if (!!err) {
                    if (err.code !== 'EEXIST')
                        return reject(promiseArgs(err, path))
                    else return resolve(promiseArgs(err, path))
                }
                else return resolve(promiseArgs(null, path))
            }

            StorageManager.checkExist(path)
                .then(async () => preHandler(null, path),
                    async () =>
                    {
                        if (lt(process.versions.node, "10.12.0")) {
                            return path.split("/")
                                .map((v, i, arr) => fs.mkdir(path.split(v)[0].concat(v),
                                    options,
                                    (err: NodeJS.ErrnoException | null) =>
                                    {
                                        if (arr.length - 1 > i) {
                                            if (err && err.code !== 'EEXIST') {
                                                console.error(err)
                                                preHandler(err)
                                            }
                                        }
                                        else preHandler(err)
                                    }))
                        }
                        else return fs.mkdir(path,
                            options,
                            preHandler)
                    })
        })
    }

    /**
     *
     * @param filePath File path to write in filesystem (if parent directory does not exist, create before write the file).
     * @param data File data as ArrayBuffer.
     * @param chunkSize Chunk size of file.
     * @param cb Optional callback called when write operation is finished.
     * @returns A promise of the write operation.
     *
     * @deprecated @see {@link StorageManager.writeStream StorageManager.writeStream()}
     */
    public static async writeFileStream(filePath: string, data: ArrayBuffer, chunkSize: number = 65536, cb?: (err?: Error | null) => void): Promise<boolean>
    {
        return new Promise((resolve, reject) =>
        {
            const parentPath = removeLastElement(filePath.split("/")).join("/")
            StorageManager.mkdir(parentPath, { recursive: true }).then(
                _ =>
                {
                    const wstream = fs.createWriteStream(filePath)

                    wstream.on("error", cb ?? reject)

                    for (let c = 0; c < data.byteLength; c += chunkSize) {
                        const buffer = Buffer.from(data.slice(c, c + chunkSize))
                        wstream.write(buffer, cb ?? (err =>
                        {
                            if (err) {
                                wstream.end()
                                reject(err)
                            }
                        }))
                    }

                    wstream.end(cb)

                    resolve(true)
                },
                reject)
        })
    }

    /**
     * Reads given file asynchronously on-demand and pipe out to given writable stream
     * @deprecated Obsolete and unsafe code using `Stream.pipe(stream: Stream.Writable)`. Prefer `Stream.pipeline(...streams: Stream[, cb: err => void])` implementation at `StorageManager.readFileStream(...)`
     * @param filePath path to the file in default storage
     * @param out writable stream to output retrieved data
     *
     * @deprecated @see {@link StorageManager.readStream StorageManager.readStream()}
     */
    public static async readStorage(filePath: string, out: Stream.Writable): Promise<void>
    {
        let file = fs.createReadStream(filePath)
        file.on('open', () => file.pipe(out))
        file.on('error', err => out.end(err))
    }

    /**
     * Assynchronously reads given file at default storage. Supports Callback syntax and Promise syntax.
     * @param filePath path to the file in default storage.
     * @param cb optional callback to handle output and error. If not provided it resolve as a Promise
     *
     * @deprecated @see {@link StorageManager.getAsBuffers StorageManager.getAsBuffers()}
     */
    public static async getFileContents(filePath: string, cb?: (err: Error | null | undefined, arrayBuffer?: Array<Buffer>) => void): Promise<Buffer[]>
    {
        return new Promise((resolve: (data: Buffer[]) => any, reject) =>
        {
            let arr_buffer = new Array<Buffer>();

            /* const wstream =  */StorageManager.readFileStream(filePath, {
                write: (chunk: Buffer, _encoding: BufferEncoding, next: (err?: Error | null) => void) =>
                {
                    arr_buffer.push(chunk)
                    next()
                }
            }, cb ?? ((err) => err ? reject(err) : resolve(arr_buffer)))

            // wstream.on('close', () => cb? cb(null, arr_buffer) : resolve(arr_buffer))
        })
    }

    /**
     * Creates an Writable stream to transform/process chunk data from a file, piping'em, and returns the writed stream.
     *
     * @deprecated @see {@link StorageManager.readStream StorageManager.readStream()}
     *
     * @param filePath path to the file in default storage.
     * @param opts options to setup the write stream.
     * @param cb optional callback to error handling (default `console.error` output stream).
     */
    public static readFileStream(filePath: string, opts?: Stream.WritableOptions | Stream.Writable, cb?: (err?: Error | null) => void): Stream.Writable
    {
        const f = fs.createReadStream(filePath)
        const tstream = !!((opts as Stream.Writable)?.writable) ? opts as Stream.Writable : new Stream.Writable(opts as Stream.WritableOptions)

        f.on('error', err =>
        {
            tstream.end()
            cb ? cb(err) : console.error(err)
        })

        f.on('close', () => tstream.end())

        Stream.pipeline(f, tstream, cb ?? (err => !!err ? console.error : null))
        return tstream
    }

    /**
     * Wrapper of delete operation in filesystem.
     * @param filePath A path to unlink or delete from filesystem.
     * @param callback Optional callback called after delete operation is finished.
     * @returns A promise of the delete operation.
     */
    public static async deleteFromStorage(filePath: string, callback?: (err: NodeJS.ErrnoException | null) => void | any): Promise<void>
    {
        return new Promise(async (resolve, reject) =>
        {
            const metadata = await StorageManager.stats(filePath)
            if (metadata.isFile() || metadata.isSymbolicLink())
                fs.unlink(filePath, callback ?? (err => err ? reject(err) : resolve()))
            else if (metadata.isDirectory()) {
                if (lt(process.versions.node, "12.10.0 ")) {
                    const dir = await StorageManager.listDirectory(filePath, true)

                    const files = Array.from(dir)
                        .filter((file): file is string => typeof file === "string")

                    const innerDirs = Array.from(dir)
                        .filter((file): file is DirectoryList => file instanceof DirectoryList)


                    for (const file of files)
                        await StorageManager.deleteFromStorage(file)
                    for (const { name } of innerDirs)
                        await StorageManager.deleteFromStorage(name)

                    fs.rmdir(filePath, callback ?? (err => err ? reject(err) : resolve()))
                } else {
                    fs.rmdir(filePath, { recursive: true }, callback ?? (err => err ? reject(err) : resolve()))
                }
            }

        })
    }

    /**
     * Wrapper of delete operation in filesystem.
     * @param filePath A path to unlink or delete from filesystem.
     * @returns A promise of the delete operation.
     */
    public static delete = StorageManager.deleteFromStorage

    /**
     * Wrapper for opening attempts to a path, be file or directory.
     * @param path Path to open a file or list directory.
     * @param ifFile Optional callback called if path leads to a file.
     * @param ifDir Optional callback called if path leads to a directory.
     * @param encoding Optional encoding for files, default utf-8.
     *
     * @deprecated @see {@link StorageManager.stats StorageManager.stats()}
     */
    public static async openFileOrDirectory(path: string,
        ifFile?: (err: NodeJS.ErrnoException | null, data: string) => void,
        ifDir?: (err: NodeJS.ErrnoException | null, files: string[]) => void,
        encoding: BufferEncoding = "utf-8")
    {
        fs.access(path as string, fs.constants.F_OK | fs.constants.R_OK, (err) =>
        {
            if (err) throw ({ message: "no such file or directory!", path: path });
            else
                fs.lstat(path as string, (err, stats) =>
                {
                    if (err) {
                        console.log(err)
                        throw err
                    }
                    else if (stats.isFile())
                        fs.readFile(path, { encoding }, (ifFile ?? (() => null)))
                    else if (stats.isDirectory())
                        fs.readdir(path as string, (ifDir ?? (() => null)))
                    else
                        throw ({ message: `operation not supported! (${path})` })
                });
        });
    }
}

export default StorageManager