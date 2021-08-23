import fs from "fs"
import Stream from "stream"
import Path from "path"
import { removeLastElement } from "./utils"
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


/**
 * A filesystem wrapper class
 */
export class StorageManager
{
    /**
     * Wrapper to write in a given filename.
     * @param path Path to write file.
     * @param value Plain string to insert into file, or Buffer instance. You can provide an array if you prefer to chunk data before write.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async put(path: string, value: string | Buffer, charset?: BufferEncoding): Promise<void>
    public static async put(path: string, values: (string | Buffer)[], charset?: BufferEncoding): Promise<void>
    public static async put(path: string, value: (string | Buffer) | (string | Buffer)[], charset?: BufferEncoding): Promise<void>

    public static async put(path: string, value: (string | Buffer) | (string | Buffer)[], charset: BufferEncoding = "utf-8")
    {
        if (path.split("/").length > 1)
            await StorageManager.mkdir(Path.dirname(path), { recursive: true })

        if (Array.isArray(value)) {
            const wstream = StorageManager.fileStream(path, "w")
            await Promise.all(value.map(chunk => new Promise((resolve, reject) => wstream.write(value, charset, err => !!err ? reject(err) : resolve(true)))))
        } else {
            await new Promise((resolve, reject) => StorageManager.fileStream(path, "w").write(value, charset, err => !!err ? reject(err) : resolve(true)))
        }
    }

    /**
     * Wrapper to write in a given filename.
     * @param path Path to write file.
     * @param value Plain string to insert into file, or Buffer instance. You can provide an array if you prefer to chunk data before write.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async putStreamed(path: string, values: AsyncIterable<string | Buffer>, charset: BufferEncoding = "utf-8"): Promise<void>
    {
        if (path.split("/").length > 1)
            await StorageManager.mkdir(Path.dirname(path), { recursive: true })

        for await (const chunk of values)
            await new Promise((resolve, reject) => StorageManager.fileStream(path, "w").write(chunk, charset, err => !!err ? reject(err) : resolve(true)))
    }

    /**
     * Wrapper to append file with data.
     * @param path Path to write file.
     * @param value Plain string to append to file, or Buffer instance. You can provide an array if you prefer to chunk data before write.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async append(path: string, value: string | Buffer, charset?: BufferEncoding): Promise<void>
    public static async append(path: string, values: (string | Buffer)[], charset?: BufferEncoding): Promise<void>
    public static async append(path: string, values: (string | Buffer) | (string | Buffer)[], charset?: BufferEncoding): Promise<void>

    public static async append(path: string, value: (string | Buffer) | (string | Buffer)[], charset: BufferEncoding = "utf-8")
    {
        if (StorageManager.exists(path)) {
            if (Array.isArray(value)) {
                for (const inner of value) {
                    await new Promise<void>((resolve, reject) =>
                    {
                        const chunk = Buffer.isBuffer(inner) ? inner : Buffer.from(inner, charset)
                        fs.appendFile(path, chunk, err =>
                        {
                            if (!!err)
                                reject(err)
                            else resolve()
                        })
                    })
                }
            }
            else {
                await new Promise<void>((resolve, reject) =>
                {
                    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value, charset)
                    fs.appendFile(path, chunk, err =>
                    {
                        if (!!err)
                            reject(err)
                        else resolve()
                    })
                })

            }
        }
        else return StorageManager.put(path, value, charset)
    }

    /**
     * Wrapper to append file with data.
     * @param path Path to write file.
     * @param values A.
     * @param charset Optional charset of data. Default is "utf-8".
     */
    public static async appendStreamed(path: string, values: AsyncIterable<string | Buffer>, charset: BufferEncoding = "utf-8")
    {
        if (StorageManager.exists(path))
            for await (const chunk of values) {
                await StorageManager.append(path, chunk, charset)
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
            resolve(Buffer.concat(await StorageManager.getAsBuffers(path)))
        })
    }

    /**
     * Create a readable stream of file at given path.
     * @param path Path to file
     * @param options Optional options object to customize stream
     *
     * @returns Readable stream object of file
     */
    public static readStream(path: string, options?: Stream.ReadableOptions): Stream.Readable
    {
        return StorageManager.fileStream(path, 'r', options)
    }

    /**
     * Create a writable stream of file at given path.
     * @param path Path to file
     * @param options Optional options object to customize stream
     *
     * @returns Writable stream object of file
     */
    public static writeStream(path: string, options?: Stream.WritableOptions): Stream.Writable
    {
        return StorageManager.fileStream(path, 'w', options)
    }

    /**
     * Create a Duplex (both Readable and Writable) stream of file at given path.
     * @param path Path to file
     * @param options Optional options object to customize stream
     *
     * @returns Duplex stream object of file
     */
    public static duplexStream(path: string, options?: Stream.ReadableOptions): Stream.Duplex
    {
        return StorageManager.fileStream(path, 'rw', options)
    }

    /**
     * Create a stream of file at given path.
     * @param path Path to file
     * @param mode file stream mode, defaults 'rw'
     * @param options Optional StreamOptions object to customize stream
     *
     * @returns Stream object of file
     */
    public static fileStream(path: string): Stream.Duplex
    public static fileStream(path: string, mode: ReadMode, options?: FileStreamOptionsType<typeof mode>): FileStreamType<typeof mode>
    public static fileStream(path: string, mode: WriteMode, options?: FileStreamOptionsType<typeof mode>): FileStreamType<typeof mode>
    public static fileStream(path: string, mode: DuplexMode, options?: FileStreamOptionsType<typeof mode>): FileStreamType<typeof mode>

    public static fileStream(path: string, mode: FileStreamMode = "rw", options: FileStreamOptionsType<typeof mode> = {}): FileStreamType<typeof mode>
    {
        switch (mode ?? "rw") {
            case "r":
                return fs.createReadStream(path, options)
                break
            case "w":
                return fs.createWriteStream(path, options)
                break
            case "rw":
                const [r, w] = [
                    fs.createReadStream(path, options),
                    fs.createWriteStream(path, options)
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

    /**
     * Wrapper to check if a path already exists in filesystem.
     * @param path Path to check avaiability.
     * @returns A promise of existance check.
     */
    public static exists(path: string): Promise<boolean>
    {
        return new Promise(resolve => fs.access(path, fs.constants.F_OK, err => resolve(!err)))
    }

    public static isFile(path: string): Promise<boolean>
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

    public static isDirectory(path: string): Promise<boolean>
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
    public static listDirectory(path: string): Promise<string[]>
    public static listDirectory(path: string, recursive: false): Promise<string[]>
    public static listDirectory(path: string, recursive: true): Promise<DirectoryList>
    public static listDirectory(path: string, recursive = false): Promise<string[] | DirectoryList>
    {
        return new Promise(async (_return, _throw) =>
        {
            if (await StorageManager.isFile(path))
                _return([path])
            else if (!!recursive) {
                fs.readdir(path as string, async (err, list) =>
                {
                    if (!!err)
                        _throw(err)
                    else {
                        const directories = await Promise.all(list.map(node => Path.join(path, node)).map(StorageManager.isDirectory))
                        const files = list.filter((_, i) => !directories[i])

                        const innerDirectories = list.filter((_, i) => directories[i])

                        const dirlist = await Promise.all(innerDirectories.map(file => StorageManager.listDirectory(Path.join(path, file), true)))

                        _return(new DirectoryList(path, [...dirlist, ...files]))
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
    public static checkExist(path: string, cb?: (exists?: (boolean | PromiseLike<boolean> | undefined)) => any): Promise<boolean>
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
                fs.mkdir(removeLastElement(filePath.split("/")).join("/"), { recursive: true }, (err, path) =>
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
    public static mkdir(path: string,
        options: fs.MakeDirectoryOptions = { recursive: false },
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
                .then(async () => resolve(promiseArgs(null, path)),
                    async () =>
                    {
                        if (lt(process.versions.node, "10.12.0")) {
                            return path.split("/")
                                .map((v, i, arr) => fs.mkdir(path.split(v)[0].concat(v),
                                    options,
                                    (err: NodeJS.ErrnoException | null) =>
                                    {
                                        if (arr.length - 1 > i)
                                            if (err && err.code !== 'EEXIST')
                                                console.error(err)
                                            else return null
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
    public static writeFileStream(filePath: string, data: ArrayBuffer, chunkSize: number = 65536, cb?: (err?: Error | null) => void): Promise<boolean>
    {
        return new Promise((resolve, reject) =>
        {
            const parentPath = removeLastElement(filePath.split("/")).join("/")
            StorageManager.mkdir(parentPath, { recursive: true }).then(
                err =>
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
    public static getFileContents(filePath: string, cb?: (err: Error | null | undefined, arrayBuffer?: Array<Buffer>) => void): Promise<Buffer[]>
    {
        return new Promise((resolve: (data: Buffer[]) => any, reject) =>
        {
            let arr_buffer = new Array<Buffer>();

            const wstream = StorageManager.readFileStream(filePath, {
                write: (chunk: Buffer, encoding: BufferEncoding, next: (err?: Error | null) => void) =>
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
    public static deleteFromStorage(filePath: string, callback?: (err: NodeJS.ErrnoException | null) => void | any)
    {
        return new Promise((resolve, reject) => fs.unlink(filePath, callback ?? (err => err ? reject : resolve)))
    }

    /**
     * Wrapper of delete operation in filesystem.
     * @param filePath A path to unlink or delete from filesystem.
     * @returns A promise of the delete operation.
     */
    public static delete(path: string)
    {
        return StorageManager.deleteFromStorage(path)
    }

    /**
     * Wrapper for opening attempts to a path, be file or directory.
     * @param path Path to open a file or list directory.
     * @param ifFile Optional callback called if path leads to a file.
     * @param ifDir Optional callback called if path leads to a directory.
     * @param encoding Optional encoding for files, default utf-8.
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

export default StorageManager;
