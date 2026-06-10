# Refactor: Split StorageManager into Domain Modules + Adapter Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic `StorageManager` static class into domain modules with per-domain ISP adapter interfaces, a composite `FsAdapter`, standalone function exports, subpath scoped imports, and a frozen `fs` convenience object.

**Architecture:** Domain modules delegate to a lazily-bootstrapped `FsAdapter` via module-level state. Adapter interfaces follow ISP (one per domain). `NodeFsAdapter` implements the composite. `BlobStorageAdapter` is interface-only. `StorageManager` class is removed entirely — all API is standalone functions.

**Tech Stack:** TypeScript (strict, ES2024), Vitest, Node.js 22+, Yarn 1.x

**Spec:** `docs/superpowers/specs/2026-06-08-refactor-split-modules-design.md`

---

## File Structure

### New files to create

| File                                               | Responsibility                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/shared/types/Input.ts`                        | `ValidInput`, `Input` types                                                       |
| `src/shared/types/FileStreamMode.ts`               | Stream mode types, option types, fs option types, inference helpers               |
| `src/shared/types/DirectoryListTypes.ts`           | `RecursiveType`, `DirectoryListJSONContent`, `DirectoryListJSON`                  |
| `src/shared/types/index.ts`                        | Re-exports all types                                                              |
| `src/shared/errors/UnsupportedEnvironmentError.ts` | `UnsupportedEnvironmentError` class                                               |
| `src/shared/errors/index.ts`                       | Re-exports all errors                                                             |
| `src/shared/utils/isIterable.ts`                   | `isIterable` function                                                             |
| `src/shared/utils/isAsyncIterable.ts`              | `isAsyncIterable` function                                                        |
| `src/shared/utils/IgnoreUnionType.ts`              | `IgnoreUnionType` type                                                            |
| `src/shared/utils/sanitizeInput.ts`                | `sanitizeInput` function (internal)                                               |
| `src/shared/utils/index.ts`                        | Re-exports all utils                                                              |
| `src/shared/index.ts`                              | Re-exports types/, errors/, utils/                                                |
| `src/adapters/interfaces/ReadAdapter.ts`           | `ReadAdapter` interface                                                           |
| `src/adapters/interfaces/WriteAdapter.ts`          | `WriteAdapter` interface                                                          |
| `src/adapters/interfaces/StreamAdapter.ts`         | `StreamAdapter` interface                                                         |
| `src/adapters/interfaces/DirAdapter.ts`            | `DirAdapter` interface                                                            |
| `src/adapters/interfaces/MetaAdapter.ts`           | `MetaAdapter` interface                                                           |
| `src/adapters/interfaces/FsAdapter.ts`             | Composite `FsAdapter` interface                                                   |
| `src/adapters/interfaces/BlobStorageAdapter.ts`    | `BlobStorageAdapter` interface + option/result types                              |
| `src/adapters/interfaces/index.ts`                 | Re-exports all interfaces                                                         |
| `src/adapters/node/NodeFsAdapter.ts`               | Node.js adapter implementation                                                    |
| `src/adapters/node/resolve.ts`                     | `detectRuntime()` + `resolveAdapter()`                                            |
| `src/adapters/index.ts`                            | Re-exports interfaces + NodeFsAdapter + resolve                                   |
| `src/read/index.ts`                                | `get`, `getAsBuffer`, `getAsBuffers`, `getAsJSON`                                 |
| `src/write/index.ts`                               | `put`, `putStreamed`, `append`, `appendStreamed`                                  |
| `src/stream/index.ts`                              | `fileStream`, `readStream`, `writeStream`, `duplexStream`, `stream` alias + types |
| `src/metadata/index.ts`                            | `exists`, `doesntExist`, `stats`, `isFile`, `isDirectory`                         |
| `src/directory/index.ts`                           | `mkdir`, `listDirectory`, `copy`, `rename`, `move`, `deleteFromStorage`, `delete` |
| `src/adapters/__tests__/adapter.spec.ts`           | Adapter wiring tests                                                              |
| `src/__tests__/bootstrap.spec.ts`                  | Bootstrap behavior tests                                                          |

### Files to modify

| File                              | Change                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/index.ts`                    | Complete rewrite — new main entry with `fs` object, `bootstrap`, `setFS`, `useAdapter`, default export |
| `src/__tests__/put.spec.ts`       | `StorageManager.put` → `put`                                                                           |
| `src/__tests__/get.spec.ts`       | `StorageManager.get` → `get`                                                                           |
| `src/__tests__/append.spec.ts`    | `StorageManager.append` → `append`                                                                     |
| `src/__tests__/exists.spec.ts`    | `StorageManager.exists` → `exists`                                                                     |
| `src/__tests__/directory.spec.ts` | `StorageManager.mkdir` → `mkdir`                                                                       |
| `src/__tests__/file-ops.spec.ts`  | `StorageManager.rename` → `rename`                                                                     |
| `package.json`                    | Update `exports` map for subpath entries                                                               |

### Files to delete

| File                    | Reason                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `src/StorageManager.ts` | Replaced by domain modules + adapter layer                            |
| `src/utils.ts`          | Split into `src/shared/utils/` individual files, `LogicGates` removed |

---

## Task 1: Shared types

**Files:**

- Create: `src/shared/types/Input.ts`
- Create: `src/shared/types/FileStreamMode.ts`
- Create: `src/shared/types/DirectoryListTypes.ts`
- Create: `src/shared/types/index.ts`

- [ ] **Step 1: Create `src/shared/types/Input.ts`**

```ts
/** Supported input types for underlying API (node/fs) */
export type ValidInput = string | Buffer

/** Supported input types for filesystem wrapper */
export type Input = ValidInput | number | object
```

- [ ] **Step 2: Create `src/shared/types/FileStreamMode.ts`**

Move all stream type machinery from the top of `StorageManager.ts` (lines 10-58):

```ts
import type Stream from 'node:stream'

import type { IgnoreUnionType } from './IgnoreUnionType'
import fs from 'node:fs'

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
export type FileStreamType<T extends FileStreamMode> = T extends ReadMode
    ? Stream.Readable
    : T extends WriteMode
      ? Stream.Writable
      : T extends DuplexMode
        ? Stream.Duplex
        : never

/** Helper to infer StreamOptions type from file mode */
export type FileStreamOptionsType<T extends FileStreamMode> = T extends ReadMode
    ? Stream.ReadableOptions
    : T extends WriteMode
      ? Stream.WritableOptions
      : T extends DuplexMode
        ? Stream.DuplexOptions
        : never

/** fs Stream options supported in read mode */
export type NodeJS_fsReadOptions = IgnoreUnionType<
    Parameters<typeof fs.createReadStream>[1],
    string
>
/** fs Stream options supported in write mode */
export type NodeJS_fsWriteOptions = IgnoreUnionType<
    Parameters<typeof fs.createWriteStream>[1],
    string
>
/** fs Stream options supported in duplex mode */
export type NodeJS_fsDuplexOptions = {
    readOptions?: IgnoreUnionType<NodeJS_fsReadOptions, string> | null
    writeOptions?: IgnoreUnionType<NodeJS_fsWriteOptions, string> | null
}

/** Helper to infer fs stream options from file mode */
export type NodeJS_fsOptionsType<T extends FileStreamMode> = T extends ReadMode
    ? NodeJS_fsReadOptions
    : T extends WriteMode
      ? NodeJS_fsWriteOptions
      : T extends DuplexMode
        ? NodeJS_fsDuplexOptions
        : never

export type { ReadMode, WriteMode, DuplexMode }
```

Note: This file imports from `./IgnoreUnionType` which will be created in Task 2. That's okay — both tasks are in the same plan and TypeScript doesn't need them to exist until `tsc --noEmit`.

- [ ] **Step 3: Create `src/shared/types/DirectoryListTypes.ts`**

```ts
export type RecursiveType<T> = T | RecursiveType<T>[]

export type DirectoryListJSONContent = Array<string | DirectoryListJSON>

export type DirectoryListJSON = {
    [name: string]: Array<string | DirectoryListJSON>
}
```

- [ ] **Step 4: Create `src/shared/types/index.ts`**

```ts
export type { ValidInput, Input } from './Input'
export type {
    FileStreamMode,
    FileStreamOptions,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
    NodeJS_fsOptionsType,
    ReadMode,
    WriteMode,
    DuplexMode,
} from './FileStreamMode'
export type {
    RecursiveType,
    DirectoryListJSONContent,
    DirectoryListJSON,
} from './DirectoryListTypes'
```

- [ ] **Step 5: Run typecheck to verify**

Run: `npx tsc --noEmit`

Expected: Errors about missing `IgnoreUnionType` (not yet created) — this is expected. Will resolve after Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/
git commit -S -m "refactor(shared): add shared type modules"
```

---

## Task 2: Shared utils + errors

**Files:**

- Create: `src/shared/utils/isIterable.ts`
- Create: `src/shared/utils/isAsyncIterable.ts`
- Create: `src/shared/utils/IgnoreUnionType.ts`
- Create: `src/shared/utils/sanitizeInput.ts`
- Create: `src/shared/utils/index.ts`
- Create: `src/shared/errors/UnsupportedEnvironmentError.ts`
- Create: `src/shared/errors/index.ts`
- Create: `src/shared/index.ts`

- [ ] **Step 1: Create `src/shared/utils/isIterable.ts`**

```ts
/** Check if given input is Iterable */
export function isIterable(obj: any): obj is Iterable<any> {
    return typeof obj[Symbol.iterator] === 'function'
}
```

- [ ] **Step 2: Create `src/shared/utils/isAsyncIterable.ts`**

```ts
/** Check if given input is AsyncIterable */
export function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
    return typeof obj[Symbol.asyncIterator] === 'function'
}
```

- [ ] **Step 3: Create `src/shared/utils/IgnoreUnionType.ts`**

```ts
/** Omit a subtype from given type */
export type IgnoreUnionType<T, U = unknown> = T extends U ? never : T
```

- [ ] **Step 4: Create `src/shared/utils/sanitizeInput.ts`**

```ts
import type { ValidInput, Input } from '../types'

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
```

- [ ] **Step 5: Create `src/shared/utils/index.ts`**

```ts
export { isIterable } from './isIterable'
export { isAsyncIterable } from './isAsyncIterable'
export type { IgnoreUnionType } from './IgnoreUnionType'
export { sanitizeInput } from './sanitizeInput'
```

- [ ] **Step 6: Create `src/shared/errors/UnsupportedEnvironmentError.ts`**

```ts
export class UnsupportedEnvironmentError extends Error {
    public readonly code = 'ERR_UNSUPPORTED_ENVIRONMENT' as const
    public readonly detectedRuntime: string | null

    constructor(detectedRuntime?: string) {
        const runtime = detectedRuntime ?? 'unknown'
        super(
            `Unsupported environment detected (${runtime}). ` +
                `Call setFS() with a custom FsAdapter before using filesystem methods, ` +
                `or run this library in a supported runtime (Node.js).`
        )
        this.name = 'UnsupportedEnvironmentError'
        this.detectedRuntime = runtime
    }
}
```

- [ ] **Step 7: Create `src/shared/errors/index.ts`**

```ts
export { UnsupportedEnvironmentError } from './UnsupportedEnvironmentError'
```

- [ ] **Step 8: Create `src/shared/index.ts`**

```ts
export * from './types'
export * from './errors'
export * from './utils'
```

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Should pass now that `IgnoreUnionType` exists. May still have errors from old `src/utils.ts` imports — those are expected until Task 8 deletes it.

- [ ] **Step 10: Commit**

```bash
git add src/shared/
git commit -S -m "refactor(shared): add shared utils, errors, and barrel exports"
```

---

## Task 3: Adapter interfaces

**Files:**

- Create: `src/adapters/interfaces/ReadAdapter.ts`
- Create: `src/adapters/interfaces/WriteAdapter.ts`
- Create: `src/adapters/interfaces/StreamAdapter.ts`
- Create: `src/adapters/interfaces/DirAdapter.ts`
- Create: `src/adapters/interfaces/MetaAdapter.ts`
- Create: `src/adapters/interfaces/FsAdapter.ts`
- Create: `src/adapters/interfaces/BlobStorageAdapter.ts`
- Create: `src/adapters/interfaces/index.ts`

- [ ] **Step 1: Create `src/adapters/interfaces/ReadAdapter.ts`**

```ts
import type { Stats } from 'node:fs'

export interface ReadAdapter {
    get(path: string, encoding?: BufferEncoding): Promise<string>
    getAsBuffer(path: string): Promise<Buffer>
    getAsBuffers(path: string): Promise<Buffer[]>
    getAsJSON(
        path: string,
        encoding?: BufferEncoding,
        reviver?: (this: any, key: string, value: any) => any
    ): Promise<any>
}
```

- [ ] **Step 2: Create `src/adapters/interfaces/WriteAdapter.ts`**

```ts
import type { Input } from '../../shared/types'

export interface WriteAdapter {
    put(path: string, value: Input, charset?: BufferEncoding): Promise<boolean>
    putStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset?: BufferEncoding
    ): Promise<void>
    append(path: string, value: Input, charset?: BufferEncoding): Promise<boolean>
    appendStreamed(
        path: string,
        values: AsyncIterable<Input> | Iterable<Input> | Input,
        charset?: BufferEncoding
    ): Promise<void>
}
```

- [ ] **Step 3: Create `src/adapters/interfaces/StreamAdapter.ts`**

```ts
import type Stream from 'node:stream'

import type {
    FileStreamMode,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
} from '../../shared/types'

export interface StreamAdapter {
    fileStream(
        path: string,
        mode?: FileStreamMode,
        options?: FileStreamOptionsType<FileStreamMode> | null,
        fsOptions?: NodeJS_fsOptionsType<FileStreamMode> | null
    ): FileStreamType<FileStreamMode>
    readStream(
        path: string,
        options?: Stream.ReadableOptions | null,
        fsOptions?: NodeJS_fsReadOptions | null
    ): Stream.Readable
    writeStream(
        path: string,
        options?: Stream.WritableOptions | null,
        fsOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Writable
    duplexStream(
        path: string,
        options?: Stream.DuplexOptions | null,
        readOptions?: NodeJS_fsReadOptions | null,
        writeOptions?: NodeJS_fsWriteOptions | null
    ): Stream.Duplex
}
```

- [ ] **Step 4: Create `src/adapters/interfaces/DirAdapter.ts`**

```ts
import type fs from 'node:fs'

import type { DirectoryList } from '../../DirectoryList'

export interface DirAdapter {
    mkdir(path: string, options?: fs.MakeDirectoryOptions): Promise<void>
    listDirectory(path: string, recursive?: false): Promise<string[]>
    listDirectory(path: string, recursive: true): Promise<DirectoryList>
    listDirectory(path: string, recursive?: boolean): Promise<string[] | DirectoryList>
    copy(from: string, to: string, as?: string): Promise<void>
    rename(path: string, renameTo: string): Promise<void>
    move(from: string, to: string, as?: string): Promise<void>
    deleteFromStorage(filePath: string): Promise<void>
    delete(filePath: string): Promise<void>
}
```

- [ ] **Step 5: Create `src/adapters/interfaces/MetaAdapter.ts`**

```ts
import type fs from 'node:fs'

export interface MetaAdapter {
    exists(...args: (string | number)[]): Promise<boolean>
    doesntExist(...args: (string | number)[]): Promise<boolean>
    stats(path: string): Promise<fs.Stats>
    isFile(path: string): Promise<boolean>
    isDirectory(path: string): Promise<boolean>
}
```

- [ ] **Step 6: Create `src/adapters/interfaces/FsAdapter.ts`**

```ts
import fs from 'node:fs'
import Path from 'node:path'

import type { ReadAdapter } from './ReadAdapter'
import type { WriteAdapter } from './WriteAdapter'
import type { StreamAdapter } from './StreamAdapter'
import type { DirAdapter } from './DirAdapter'
import type { MetaAdapter } from './MetaAdapter'

export interface FsAdapter
    extends ReadAdapter, WriteAdapter, StreamAdapter, DirAdapter, MetaAdapter {
    readonly constants: typeof fs.constants
    readonly path: typeof Path
}
```

- [ ] **Step 7: Create `src/adapters/interfaces/BlobStorageAdapter.ts`**

```ts
import type { Input } from '../../shared/types'

/** Options for putObject */
export interface BlobPutOptions {
    [key: string]: unknown
}

/** Result of putObject */
export interface BlobPutResult {
    key: string
    etag?: string
    versionId?: string
}

/** Options for getObject */
export interface BlobGetOptions {
    [key: string]: unknown
}

/** Result of getObject */
export interface BlobGetResult {
    data: Buffer | string
    metadata?: Record<string, string>
}

/** Options for deleteObject */
export interface BlobDeleteOptions {
    [key: string]: unknown
}

/** Result of deleteObject */
export interface BlobDeleteResult {
    key: string
    versionId?: string
}

/** Options for listObjects */
export interface BlobListOptions {
    maxKeys?: number
    [key: string]: unknown
}

/** Result of listObjects */
export interface BlobListResult {
    keys: string[]
    isTruncated: boolean
    nextContinuationToken?: string
}

/** Options for getPresignedUrl */
export interface PresignedUrlOptions {
    expiresIn?: number
    [key: string]: unknown
}

/** Stats for a blob object */
export interface BlobStats {
    key: string
    size: number
    lastModified?: Date
    etag?: string
}

/** Blob storage adapter interface for external storage providers (S3, R2, etc.) */
export interface BlobStorageAdapter {
    putObject(key: string, data: Input, options?: BlobPutOptions): Promise<BlobPutResult>
    getObject(key: string, options?: BlobGetOptions): Promise<BlobGetResult>
    deleteObject(key: string, options?: BlobDeleteOptions): Promise<BlobDeleteResult>
    listObjects(prefix: string, options?: BlobListOptions): Promise<BlobListResult>
    getPresignedUrl(key: string, options?: PresignedUrlOptions): Promise<string>
    exists(key: string): Promise<boolean>
    stats(key: string): Promise<BlobStats>
}
```

- [ ] **Step 8: Create `src/adapters/interfaces/index.ts`**

```ts
export type { ReadAdapter } from './ReadAdapter'
export type { WriteAdapter } from './WriteAdapter'
export type { StreamAdapter } from './StreamAdapter'
export type { DirAdapter } from './DirAdapter'
export type { MetaAdapter } from './MetaAdapter'
export type { FsAdapter } from './FsAdapter'
export type {
    BlobStorageAdapter,
    BlobPutOptions,
    BlobPutResult,
    BlobGetOptions,
    BlobGetResult,
    BlobDeleteOptions,
    BlobDeleteResult,
    BlobListOptions,
    BlobListResult,
    PresignedUrlOptions,
    BlobStats,
} from './BlobStorageAdapter'
```

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`

Expected: May still have errors from old code — adapter interfaces are new, they don't conflict yet.

- [ ] **Step 10: Commit**

```bash
git add src/adapters/interfaces/
git commit -S -m "refactor(adapters): add per-domain ISP adapter interfaces"
```

---

## Task 4: NodeFsAdapter + runtime resolution

**Files:**

- Create: `src/adapters/node/NodeFsAdapter.ts`
- Create: `src/adapters/node/resolve.ts`
- Create: `src/adapters/index.ts`

This is the largest single task — the NodeFsAdapter must implement every method from FsAdapter by extracting the implementation logic from the current `StorageManager.ts`.

- [ ] **Step 1: Create `src/adapters/node/resolve.ts`**

```ts
import type { FsAdapter } from '../interfaces/FsAdapter'

import { NodeFsAdapter } from './NodeFsAdapter'

export function detectRuntime(): string {
    if (typeof process?.versions?.node === 'string') return 'node'
    return 'unknown'
}

export function resolveAdapter(): FsAdapter | null {
    if (detectRuntime() === 'node') return new NodeFsAdapter()
    return null
}
```

- [ ] **Step 2: Create `src/adapters/node/NodeFsAdapter.ts`**

This file extracts all method implementations from `src/StorageManager.ts` and adapts them to the `FsAdapter` interface. Key changes from the original:

- All methods use `this._exists()` instead of `StorageManager._exists()`
- `LogicGates.AND(...)` replaced with `Array.every()`
- Callbacks removed from `mkdir` and `deleteFromStorage`
- `sanitizeInput` imported from `../../shared/utils`

```ts
import fs from 'node:fs'
import os from 'node:os'
import Path, { basename, dirname, join } from 'node:path'
import Stream from 'node:stream'

import type { FsAdapter } from '../interfaces/FsAdapter'
import type { DirectoryList } from '../../DirectoryList'
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

import { sanitizeInput } from '../../shared/utils/sanitizeInput'

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

        if (this._isIterable(values)) {
            const { stream, write } = writeFactory(path, charset)

            for (const chunk of values as Iterable<Input>) await write(chunk)

            stream.end()
        } else if (this._isAsyncIterable(values)) {
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

            if (this._isIterable(values)) {
                const { stream, write } = writeFactory(path, charset)

                for (const chunk of values as Iterable<Input>) await write(chunk)

                stream.end()
            } else if (this._isAsyncIterable(values)) {
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
            err.errno = os.constants.errno.ENOENT
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

    private _isIterable(obj: any): obj is Iterable<any> {
        return typeof obj[Symbol.iterator] === 'function'
    }

    private _isAsyncIterable(obj: any): obj is AsyncIterable<any> {
        return typeof obj[Symbol.asyncIterator] === 'function'
    }
}
```

- [ ] **Step 3: Create `src/adapters/index.ts`**

```ts
export * from './interfaces'
export { NodeFsAdapter } from './node/NodeFsAdapter'
export { detectRuntime, resolveAdapter } from './node/resolve'
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Passes for new adapter files. Old `StorageManager.ts` still exists but is not imported by the new code.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/
git commit -S -m "refactor(adapters): add NodeFsAdapter and runtime resolution"
```

---

## Task 5: Domain modules (read, write, stream, metadata, directory)

**Files:**

- Create: `src/read/index.ts`
- Create: `src/write/index.ts`
- Create: `src/stream/index.ts`
- Create: `src/metadata/index.ts`
- Create: `src/directory/index.ts`

Each domain module exports standalone functions that delegate to the bootstrapped adapter. They all import from a shared bootstrap state module.

We need a central bootstrap state file first.

- [ ] **Step 1: Create `src/bootstrap.ts`**

This file holds the module-level adapter state and the bootstrap/setFS/useAdapter logic. All domain modules import `_adapter` and `_bootstrap` from here.

```ts
import type { FsAdapter } from './adapters/interfaces/FsAdapter'

import { detectRuntime, resolveAdapter } from './adapters/node/resolve'
import { UnsupportedEnvironmentError } from './shared/errors/UnsupportedEnvironmentError'

let _adapter: FsAdapter | null = null
let _bootstrapped = false

export function _bootstrap(): void {
    if (_bootstrapped) return
    _bootstrapped = true
    _adapter = resolveAdapter()
}

export function bootstrap(): void {
    _bootstrap()
}

export function setFS(adapter: FsAdapter): void {
    _bootstrapped = true
    _adapter = adapter
}

export function useAdapter(adapter: FsAdapter) {
    return Object.freeze({
        get: adapter.get.bind(adapter),
        put: adapter.put.bind(adapter),
        putStreamed: adapter.putStreamed.bind(adapter),
        append: adapter.append.bind(adapter),
        appendStreamed: adapter.appendStreamed.bind(adapter),
        getAsBuffer: adapter.getAsBuffer.bind(adapter),
        getAsBuffers: adapter.getAsBuffers.bind(adapter),
        getAsJSON: adapter.getAsJSON.bind(adapter),
        rename: adapter.rename.bind(adapter),
        move: adapter.move.bind(adapter),
        copy: adapter.copy.bind(adapter),
        readStream: adapter.readStream.bind(adapter),
        writeStream: adapter.writeStream.bind(adapter),
        duplexStream: adapter.duplexStream.bind(adapter),
        fileStream: adapter.fileStream.bind(adapter),
        exists: adapter.exists.bind(adapter),
        doesntExist: adapter.doesntExist.bind(adapter),
        stats: adapter.stats.bind(adapter),
        isFile: adapter.isFile.bind(adapter),
        isDirectory: adapter.isDirectory.bind(adapter),
        listDirectory: adapter.listDirectory.bind(adapter),
        mkdir: adapter.mkdir.bind(adapter),
        deleteFromStorage: adapter.deleteFromStorage.bind(adapter),
        delete: adapter.delete.bind(adapter),
        constants: adapter.constants,
        path: adapter.path,
    })
}

export function _getAdapter(): FsAdapter {
    _bootstrap()
    if (!_adapter) throw new UnsupportedEnvironmentError(detectRuntime())
    return _adapter
}

export { detectRuntime }
```

- [ ] **Step 2: Create `src/read/index.ts`**

```ts
import type { BufferEncoding } from 'node:fs'

import { _getAdapter } from '../bootstrap'

export async function get(path: string, encoding: BufferEncoding = 'utf-8') {
    return _getAdapter().get(path, encoding)
}

export async function getAsBuffer(path: string) {
    return _getAdapter().getAsBuffer(path)
}

export async function getAsBuffers(path: string) {
    return _getAdapter().getAsBuffers(path)
}

export async function getAsJSON(
    path: string,
    encoding: BufferEncoding = 'utf8',
    reviver?: (this: any, key: string, value: any) => any
) {
    return _getAdapter().getAsJSON(path, encoding, reviver)
}
```

- [ ] **Step 3: Create `src/write/index.ts`**

```ts
import type { BufferEncoding } from 'node:fs'

import type { Input } from '../shared/types'

import { _getAdapter } from '../bootstrap'

export async function put(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
    return _getAdapter().put(path, value, charset)
}

export async function putStreamed(
    path: string,
    values: AsyncIterable<Input> | Iterable<Input> | Input,
    charset?: BufferEncoding
): Promise<void> {
    return _getAdapter().putStreamed(path, values, charset)
}

export async function append(path: string, value: Input, charset: BufferEncoding = 'utf-8') {
    return _getAdapter().append(path, value, charset)
}

export async function appendStreamed(
    path: string,
    values: AsyncIterable<Input> | Iterable<Input> | Input,
    charset?: BufferEncoding
): Promise<void> {
    return _getAdapter().appendStreamed(path, values, charset)
}
```

- [ ] **Step 4: Create `src/stream/index.ts`**

```ts
import type Stream from 'node:stream'

import type {
    FileStreamMode,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
} from '../shared/types'

import { _getAdapter } from '../bootstrap'

export type {
    FileStreamMode,
    FileStreamOptions,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
    NodeJS_fsOptionsType,
} from '../shared/types'

export function fileStream(
    path: string,
    mode?: FileStreamMode,
    options?: FileStreamOptionsType<FileStreamMode> | null,
    fsOptions?: NodeJS_fsOptionsType<FileStreamMode> | null
): FileStreamType<FileStreamMode> {
    return _getAdapter().fileStream(path, mode as any, options as any, fsOptions as any) as any
}

export function readStream(
    path: string,
    options?: Stream.ReadableOptions | null,
    fsOptions?: NodeJS_fsReadOptions | null
): Stream.Readable {
    return _getAdapter().readStream(path, options, fsOptions)
}

export function writeStream(
    path: string,
    options?: Stream.WritableOptions | null,
    fsOptions?: NodeJS_fsWriteOptions | null
): Stream.Writable {
    return _getAdapter().writeStream(path, options, fsOptions)
}

export function duplexStream(
    path: string,
    options?: Stream.DuplexOptions | null,
    readOptions?: NodeJS_fsReadOptions | null,
    writeOptions?: NodeJS_fsWriteOptions | null
): Stream.Duplex {
    return _getAdapter().duplexStream(path, options, readOptions, writeOptions)
}

export const stream = fileStream
```

- [ ] **Step 5: Create `src/metadata/index.ts`**

```ts
import type fs from 'node:fs'

import { _getAdapter } from '../bootstrap'

export async function exists(...args: (string | number)[]): Promise<boolean> {
    return _getAdapter().exists(...args)
}

export async function doesntExist(...args: (string | number)[]): Promise<boolean> {
    return _getAdapter().doesntExist(...args)
}

export async function stats(path: string): Promise<fs.Stats> {
    return _getAdapter().stats(path)
}

export async function isFile(path: string): Promise<boolean> {
    return _getAdapter().isFile(path)
}

export async function isDirectory(path: string): Promise<boolean> {
    return _getAdapter().isDirectory(path)
}
```

- [ ] **Step 6: Create `src/directory/index.ts`**

```ts
import type fs from 'node:fs'

import type { DirectoryList } from '../DirectoryList'

import { _getAdapter } from '../bootstrap'

export async function mkdir(
    path: string,
    options: fs.MakeDirectoryOptions = { recursive: true },
): Promise<void> {
    return _getAdapter().mkdir(path, options)
}

export async function listDirectory(path: string, recursive?: false): Promise<string[]>
export async function listDirectory(path: string, recursive: true): Promise<DirectoryList>
export async function listDirectory(
    path: string,
    recursive?: boolean,
): Promise<string[] | DirectoryList> {
    return _getAdapter().listDirectory(path, recursive as any)
}

export async function copy(from: string, to: string, as?: string): Promise<void> {
    return _getAdapter().copy(from, to, as)
}

export async function rename(path: string, renameTo: string): Promise<void> {
    return _getAdapter().rename(path, renameTo)
}

export async function move(from: string, to: string, as?: string): Promise<void> {
    return _getAdapter().move(from, to, as)
}

export async function deleteFromStorage(filePath: string): Promise<void> {
    return _getAdapter().deleteFromStorage(filePath)
}

export async function delete(filePath: string): Promise<void> {
    return _getAdapter().delete(filePath)
}
```

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Old `StorageManager.ts` and `utils.ts` still exist but are not imported by new code. New code should typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/bootstrap.ts src/read/ src/write/ src/stream/ src/metadata/ src/directory/
git commit -S -m "refactor: add domain modules with adapter delegation"
```

---

## Task 6: New main entry (`src/index.ts`) + delete old files

**Files:**

- Modify: `src/index.ts` — complete rewrite
- Delete: `src/StorageManager.ts`
- Delete: `src/utils.ts`

- [ ] **Step 1: Rewrite `src/index.ts`**

Replace the entire file with:

```ts
// Domain function exports
export { get, getAsBuffer, getAsBuffers, getAsJSON } from './read'
export { put, putStreamed, append, appendStreamed } from './write'
export { fileStream, readStream, writeStream, duplexStream, stream } from './stream'
export type {
    FileStreamMode,
    FileStreamOptions,
    FileStreamType,
    FileStreamOptionsType,
    NodeJS_fsReadOptions,
    NodeJS_fsWriteOptions,
    NodeJS_fsDuplexOptions,
    NodeJS_fsOptionsType,
} from './stream'
export { exists, doesntExist, stats, isFile, isDirectory } from './metadata'
export { mkdir, listDirectory, copy, rename, move, deleteFromStorage, delete } from './directory'

// Adapter exports
export type {
    ReadAdapter,
    WriteAdapter,
    StreamAdapter,
    DirAdapter,
    MetaAdapter,
    FsAdapter,
    BlobStorageAdapter,
    BlobPutOptions,
    BlobPutResult,
    BlobGetOptions,
    BlobGetResult,
    BlobDeleteOptions,
    BlobDeleteResult,
    BlobListOptions,
    BlobListResult,
    PresignedUrlOptions,
    BlobStats,
} from './adapters'
export { NodeFsAdapter } from './adapters'
export { detectRuntime, resolveAdapter } from './adapters'

// Bootstrap & configuration exports
export { bootstrap, setFS, useAdapter } from './bootstrap'

// Error exports
export { UnsupportedEnvironmentError } from './shared/errors'

// Type exports
export type { ValidInput, Input } from './shared/types'
export type { RecursiveType, DirectoryListJSONContent, DirectoryListJSON } from './shared/types'

// Domain class exports
export { DirectoryList, Directory } from './DirectoryList'

// fs convenience object (default + named export)
import { get, getAsBuffer, getAsBuffers, getAsJSON } from './read'
import { put, putStreamed, append, appendStreamed } from './write'
import { fileStream, readStream, writeStream, duplexStream, stream } from './stream'
import { exists, doesntExist, stats, isFile, isDirectory } from './metadata'
import { mkdir, listDirectory, copy, rename, move, deleteFromStorage, delete } from './directory'
import { _getAdapter } from './bootstrap'

export const fs = Object.freeze({
    get,
    getAsBuffer,
    getAsBuffers,
    getAsJSON,
    put,
    putStreamed,
    append,
    appendStreamed,
    fileStream,
    readStream,
    writeStream,
    duplexStream,
    stream,
    exists,
    doesntExist,
    stats,
    isFile,
    isDirectory,
    mkdir,
    listDirectory,
    copy,
    rename,
    move,
    deleteFromStorage,
    delete,
    get constants() {
        return _getAdapter().constants
    },
    get path() {
        return _getAdapter().path
    },
})

export default fs
```

- [ ] **Step 2: Delete `src/StorageManager.ts`**

```bash
rm src/StorageManager.ts
```

- [ ] **Step 3: Delete `src/utils.ts`**

```bash
rm src/utils.ts
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Errors in existing test files that still import from `../StorageManager` and `../utils`. That's expected — Task 7 fixes them.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts && git rm src/StorageManager.ts src/utils.ts
git commit -S -m "refactor: replace StorageManager with domain module exports"
```

---

## Task 7: Migrate existing tests

**Files:**

- Modify: `src/__tests__/put.spec.ts`
- Modify: `src/__tests__/get.spec.ts`
- Modify: `src/__tests__/append.spec.ts`
- Modify: `src/__tests__/exists.spec.ts`
- Modify: `src/__tests__/directory.spec.ts`
- Modify: `src/__tests__/file-ops.spec.ts`

All test files change `import { StorageManager } from '../StorageManager'` to import standalone functions from the domain modules. All `StorageManager.method(...)` calls become bare `method(...)` calls.

- [ ] **Step 1: Rewrite `src/__tests__/put.spec.ts`**

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { put, putStreamed, get } from '..'
import { cleanup, tmpDir } from './helpers'

describe('put', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('writes a string to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/test.txt`
        const result = await put(filePath, 'hello')
        expect(result).toBe(true)
    })

    it('writes a Buffer to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buf.txt`
        const result = await put(filePath, Buffer.from('buffered'))
        expect(result).toBe(true)
    })

    it('writes a JSON object to file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/data.txt`
        const result = await put(filePath, { key: 'value' })
        expect(result).toBe(true)
    })

    it('creates parent directories if needed', async () => {
        dir = tmpDir()
        const filePath = `${dir}/a/b/c/deep.txt`
        const result = await put(filePath, 'nested')
        expect(result).toBe(true)
    })

    it('writes with custom encoding', async () => {
        dir = tmpDir()
        const filePath = `${dir}/encoded.txt`
        await put(filePath, 'héllo', 'utf-8')
        const content = await get(filePath)
        expect(content).toBe('héllo')
    })
})

describe('putStreamed', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('writes a single value via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/streamed.txt`
        await putStreamed(filePath, 'streamed data')
        const content = await get(filePath)
        expect(content).toBe('streamed data')
    })

    it('writes an iterable of values via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/iterable.txt`
        await putStreamed(filePath, ['line1', 'line2', 'line3'])
        const content = await get(filePath)
        expect(content).toBe('line1line2line3')
    })

    it('writes an async iterable of values via stream', async () => {
        dir = tmpDir()
        const filePath = `${dir}/async-iterable.txt`
        async function* gen() {
            yield 'async1'
            yield 'async2'
        }
        await putStreamed(filePath, gen())
        const content = await get(filePath)
        expect(content).toBe('async1async2')
    })
})
```

- [ ] **Step 2: Rewrite `src/__tests__/get.spec.ts`**

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { get, getAsBuffer, getAsBuffers, getAsJSON, put } from '..'
import { cleanup, tmpDir } from './helpers'

describe('get', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as string', async () => {
        dir = tmpDir()
        const filePath = `${dir}/read.txt`
        await put(filePath, 'read me')
        const content = await get(filePath)
        expect(content).toBe('read me')
    })
})

describe('getAsBuffer', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as a Buffer', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buffer.txt`
        await put(filePath, 'buffered')
        const buf = await getAsBuffer(filePath)
        expect(Buffer.isBuffer(buf)).toBe(true)
        expect(buf.toString()).toBe('buffered')
    })
})

describe('getAsBuffers', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('reads file content as an array of Buffers', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buffers.txt`
        await put(filePath, 'multi-buffer')
        const bufs = await getAsBuffers(filePath)
        expect(Array.isArray(bufs)).toBe(true)
        expect(bufs.length).toBeGreaterThan(0)
        expect(Buffer.concat(bufs).toString()).toBe('multi-buffer')
    })

    it('throws for nonexistent file', async () => {
        dir = tmpDir()
        await expect(getAsBuffers(`${dir}/nope.txt`)).rejects.toThrow()
    })
})

describe('getAsJSON', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('parses JSON file content', async () => {
        dir = tmpDir()
        const filePath = `${dir}/data.json`
        await put(filePath, JSON.stringify({ name: 'test', value: 42 }))
        const data = await getAsJSON(filePath)
        expect(data).toEqual({ name: 'test', value: 42 })
    })
})
```

- [ ] **Step 3: Rewrite `src/__tests__/append.spec.ts`**

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { append, appendStreamed, get, put } from '..'
import { cleanup, tmpDir } from './helpers'

describe('append', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('appends to an existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/append.txt`
        await put(filePath, 'first')
        await append(filePath, ' second')
        const content = await get(filePath)
        expect(content).toBe('first second')
    })

    it('falls through to put when file does not exist', async () => {
        dir = tmpDir()
        const filePath = `${dir}/new-append.txt`
        await append(filePath, 'created')
        const content = await get(filePath)
        expect(content).toBe('created')
    })

    it('appends a Buffer', async () => {
        dir = tmpDir()
        const filePath = `${dir}/buf-append.txt`
        await put(filePath, 'data')
        await append(filePath, Buffer.from('-more'))
        const content = await get(filePath)
        expect(content).toBe('data-more')
    })
})

describe('appendStreamed', () => {
    let dir: string
    afterEach(() => cleanup(dir))

    it('appends iterable to existing file', async () => {
        dir = tmpDir()
        const filePath = `${dir}/stream-append.txt`
        await put(filePath, 'start')
        await appendStreamed(filePath, ['+a', '+b'])
        const content = await get(filePath)
        expect(content).toBe('start+a+b')
    })

    it('falls through to putStreamed when file does not exist', async () => {
        dir = tmpDir()
        const filePath = `${dir}/new-stream-append.txt`
        await appendStreamed(filePath, 'fresh')
        const content = await get(filePath)
        expect(content).toBe('fresh')
    })
})
```

- [ ] **Step 4: Rewrite `src/__tests__/exists.spec.ts`**

```ts
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
```

- [ ] **Step 5: Rewrite `src/__tests__/directory.spec.ts`**

```ts
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
```

Note: The EEXIST test changes from `resolves.toBeNull()` to `resolves.toBeUndefined()` because the callback-free `mkdir` returns `Promise<void>` (no return value on success).

- [ ] **Step 6: Rewrite `src/__tests__/file-ops.spec.ts`**

```ts
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
```

- [ ] **Step 7: Run tests**

Run: `yarn test`

Expected: All 47 tests pass (same logic, new imports).

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Passes clean.

- [ ] **Step 9: Commit**

```bash
git add src/__tests__/
git commit -S -m "refactor(tests): migrate from StorageManager to standalone function imports"
```

---

## Task 8: New tests — bootstrap + adapter wiring

**Files:**

- Create: `src/__tests__/bootstrap.spec.ts`
- Create: `src/adapters/__tests__/adapter.spec.ts`

- [ ] **Step 1: Create `src/__tests__/bootstrap.spec.ts`**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootstrap, setFS, useAdapter, _bootstrap, _getAdapter } from '../bootstrap'
import type { FsAdapter } from '../adapters/interfaces/FsAdapter'
import { UnsupportedEnvironmentError } from '../shared/errors'

describe('bootstrap', () => {
    afterEach(() => {
        vi.resetModules()
    })

    it('is idempotent — runs only once', async () => {
        const { bootstrap, _bootstrap } = await import('../bootstrap' as any)
        const spy = vi.fn()
        const original = _bootstrap

        bootstrap()
        bootstrap()
        bootstrap()

        expect(spy).not.toHaveBeenCalled()
    })

    it('setFS short-circuits bootstrap', async () => {
        const { setFS, _getAdapter } = await import('../bootstrap' as any)
        const mockAdapter = {} as FsAdapter
        setFS(mockAdapter)
        expect(_getAdapter()).toBe(mockAdapter)
    })
})

describe('useAdapter', () => {
    it('returns a frozen object with all FS methods', async () => {
        const mockAdapter = {
            get: vi.fn(),
            put: vi.fn(),
            putStreamed: vi.fn(),
            append: vi.fn(),
            appendStreamed: vi.fn(),
            getAsBuffer: vi.fn(),
            getAsBuffers: vi.fn(),
            getAsJSON: vi.fn(),
            rename: vi.fn(),
            move: vi.fn(),
            copy: vi.fn(),
            readStream: vi.fn(),
            writeStream: vi.fn(),
            duplexStream: vi.fn(),
            fileStream: vi.fn(),
            exists: vi.fn(),
            doesntExist: vi.fn(),
            stats: vi.fn(),
            isFile: vi.fn(),
            isDirectory: vi.fn(),
            listDirectory: vi.fn(),
            mkdir: vi.fn(),
            deleteFromStorage: vi.fn(),
            delete: vi.fn(),
            constants: {},
            path: {},
        } as unknown as FsAdapter

        const scoped = useAdapter(mockAdapter)
        expect(Object.isFrozen(scoped)).toBe(true)
        expect(typeof scoped.get).toBe('function')
        expect(typeof scoped.put).toBe('function')
        expect(typeof scoped.mkdir).toBe('function')
    })

    it('does not mutate the global adapter', async () => {
        const { setFS, _getAdapter, useAdapter } = await import('../bootstrap' as any)
        const globalAdapter = {} as FsAdapter
        const scopedAdapter = {} as FsAdapter

        setFS(globalAdapter)
        const before = _getAdapter()
        useAdapter(scopedAdapter)
        const after = _getAdapter()

        expect(before).toBe(globalAdapter)
        expect(after).toBe(globalAdapter)
    })
})

describe('UnsupportedEnvironmentError', () => {
    it('has correct code and name', () => {
        const err = new UnsupportedEnvironmentError('test-runtime')
        expect(err.name).toBe('UnsupportedEnvironmentError')
        expect(err.code).toBe('ERR_UNSUPPORTED_ENVIRONMENT')
        expect(err.detectedRuntime).toBe('test-runtime')
    })

    it('defaults to unknown runtime', () => {
        const err = new UnsupportedEnvironmentError()
        expect(err.detectedRuntime).toBe('unknown')
    })

    it('is instanceof Error', () => {
        const err = new UnsupportedEnvironmentError()
        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(UnsupportedEnvironmentError)
    })
})
```

Note: Testing the actual "throws when no adapter" path is tricky because Node.js auto-bootstraps in test environment. The test verifies the error class itself and the `setFS`/`useAdapter` mechanics. The full "unsupported environment" throw path will be exercised naturally when Bun/Deno adapters are added.

- [ ] **Step 2: Create `src/adapters/__tests__/adapter.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { NodeFsAdapter } from '../node/NodeFsAdapter'
import { detectRuntime, resolveAdapter } from '../node/resolve'

describe('NodeFsAdapter', () => {
    it('implements FsAdapter interface', () => {
        const adapter = new NodeFsAdapter()
        expect(typeof adapter.get).toBe('function')
        expect(typeof adapter.put).toBe('function')
        expect(typeof adapter.append).toBe('function')
        expect(typeof adapter.fileStream).toBe('function')
        expect(typeof adapter.exists).toBe('function')
        expect(typeof adapter.stats).toBe('function')
        expect(typeof adapter.mkdir).toBe('function')
        expect(typeof adapter.deleteFromStorage).toBe('function')
        expect(typeof adapter.listDirectory).toBe('function')
        expect(typeof adapter.copy).toBe('function')
        expect(typeof adapter.rename).toBe('function')
        expect(typeof adapter.move).toBe('function')
        expect(typeof adapter.isFile).toBe('function')
        expect(typeof adapter.isDirectory).toBe('function')
        expect(typeof adapter.readStream).toBe('function')
        expect(typeof adapter.writeStream).toBe('function')
        expect(typeof adapter.duplexStream).toBe('function')
        expect(typeof adapter.putStreamed).toBe('function')
        expect(typeof adapter.appendStreamed).toBe('function')
        expect(typeof adapter.getAsBuffer).toBe('function')
        expect(typeof adapter.getAsBuffers).toBe('function')
        expect(typeof adapter.getAsJSON).toBe('function')
        expect(typeof adapter.doesntExist).toBe('function')
        expect(typeof adapter.delete).toBe('function')
    })

    it('exposes constants and path', () => {
        const adapter = new NodeFsAdapter()
        expect(adapter.constants).toBeDefined()
        expect(adapter.path).toBeDefined()
    })
})

describe('resolveAdapter', () => {
    it('detects Node.js runtime', () => {
        expect(detectRuntime()).toBe('node')
    })

    it('returns a NodeFsAdapter for Node.js', () => {
        const adapter = resolveAdapter()
        expect(adapter).toBeInstanceOf(NodeFsAdapter)
    })
})
```

- [ ] **Step 3: Run tests**

Run: `yarn test`

Expected: All tests pass — original 47 + new bootstrap/adapter tests.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/bootstrap.spec.ts src/adapters/__tests__/adapter.spec.ts
git commit -S -m "test: add bootstrap and adapter wiring tests"
```

---

## Task 9: Update package.json exports map + vitest config

**Files:**

- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Update `package.json` exports map**

Add subpath entries for `/read`, `/write`, `/stream`, `/metadata`, `/directory`, `/adapters` after the existing `"."` entry. Keep `"./package.json": "./package.json"`.

The new `exports` field:

```json
"exports": {
    ".": {
        "types": "./types/index.d.ts",
        "import": "./dist/esm/index.js",
        "require": "./dist/cjs/index.js",
        "default": "./dist/esm/index.js"
    },
    "./read": {
        "types": "./types/read/index.d.ts",
        "import": "./dist/esm/read/index.js",
        "require": "./dist/cjs/read/index.js",
        "default": "./dist/esm/read/index.js"
    },
    "./write": {
        "types": "./types/write/index.d.ts",
        "import": "./dist/esm/write/index.js",
        "require": "./dist/cjs/write/index.js",
        "default": "./dist/esm/write/index.js"
    },
    "./stream": {
        "types": "./types/stream/index.d.ts",
        "import": "./dist/esm/stream/index.js",
        "require": "./dist/cjs/stream/index.js",
        "default": "./dist/esm/stream/index.js"
    },
    "./metadata": {
        "types": "./types/metadata/index.d.ts",
        "import": "./dist/esm/metadata/index.js",
        "require": "./dist/cjs/metadata/index.js",
        "default": "./dist/esm/metadata/index.js"
    },
    "./directory": {
        "types": "./types/directory/index.d.ts",
        "import": "./dist/esm/directory/index.js",
        "require": "./dist/cjs/directory/index.js",
        "default": "./dist/esm/directory/index.js"
    },
    "./adapters": {
        "types": "./types/adapters/index.d.ts",
        "import": "./dist/esm/adapters/index.js",
        "require": "./dist/cjs/adapters/index.js",
        "default": "./dist/esm/adapters/index.js"
    },
    "./package.json": "./package.json"
}
```

- [ ] **Step 2: Validate package.json with Prettier**

Run: `npx prettier --check package.json`

If formatting needed: `npx prettier --write package.json`

- [ ] **Step 3: Update `vitest.config.ts`**

The test `include` glob should still match the new test file locations:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/__tests__/*.spec.ts'],
        globals: true,
    },
    resolve: {
        alias: [
            {
                find: /^(\.\.\/.*)\.js$/,
                replacement: '$1',
            },
            {
                find: /^(\.\/.*)\.js$/,
                replacement: '$1',
            },
        ],
    },
})
```

No changes needed — `src/**/__tests__/*.spec.ts` already covers `src/adapters/__tests__/adapter.spec.ts`.

- [ ] **Step 4: Run full build**

Run: `yarn build`

Expected: ESM build outputs to `dist/esm/`, CJS build outputs to `dist/cjs/`, types to `types/`. The `fix-esm-imports.mjs` script adds `.js` extensions to ESM imports.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Passes clean.

- [ ] **Step 6: Run all tests**

Run: `yarn test`

Expected: All tests pass.

- [ ] **Step 7: Run QA**

Run: `yarn qa`

Expected: Typecheck passes, lint passes (may have pre-existing warnings), format passes.

- [ ] **Step 8: Commit**

```bash
git add package.json vitest.config.ts
git commit -S -m "refactor: add subpath exports for domain modules"
```

---

## Task 10: Verify build output + final QA

**Files:** None — verification only

- [ ] **Step 1: Clean build**

Run: `yarn build`

- [ ] **Step 2: Verify ESM output structure**

Run: `ls -R dist/esm/ | head -50`

Expected: Directory structure mirrors `src/` — `adapters/`, `read/`, `write/`, `stream/`, `metadata/`, `directory/`, `shared/`, `bootstrap.js`, `index.js`, `DirectoryList.js`

- [ ] **Step 3: Verify CJS output structure**

Run: `ls -R dist/cjs/ | head -50`

Expected: Same structure as ESM. `dist/cjs/package.json` contains `{"type":"commonjs"}`.

- [ ] **Step 4: Verify types output**

Run: `ls -R types/ | head -50`

Expected: `.d.ts` files mirroring the source structure.

- [ ] **Step 5: Verify ESM imports have .js extensions**

Run: `grep -r "from '\.\." dist/esm/read/index.js | head -5`

Expected: Relative imports have `.js` extensions (added by `fix-esm-imports.mjs`).

- [ ] **Step 6: Run full test suite**

Run: `yarn test`

Expected: All tests pass.

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`

Expected: Passes clean.

- [ ] **Step 8: Final commit (if any build artifacts or fixes needed)**

Only if something needed fixing in previous steps.
