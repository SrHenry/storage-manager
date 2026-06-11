# Rethink Capabilities — Design Spec

**Date:** 2026-06-11
**Package:** `@srhenry/storage-manager`
**Version target:** Cumulative feature for 2.0.0 (not launching 2.0.0 yet)

---

## 1. Package Identity & Architecture Overview

### Identity

`@srhenry/storage-manager` is a **storage abstraction** — store and retrieve data without caring where it lives. Two adapter families coexist as first-class citizens:

- **FsAdapter** — path-based, filesystem semantics
- **BlobAdapter** — key/value, object-store semantics

Neither family is the "default" — both have equal standing in the API surface, documentation, and examples.

### Architecture Layers (bottom-up)

1. **Adapter layer** — Runtime-specific implementations (NodeFsAdapter, future Bun/Deno/S3 adapters). Each adapter is a class using the mixin pattern, implementing only the capability domains it supports.
2. **Capability layer** — 13 domain interfaces + Symbol identifiers + capability checking (`hasCapability()`, type guards). Adapters declare supported capabilities via `static capabilities` / instance `get capabilities()`.
3. **Domain function layer** — Standalone functions (`get()`, `put()`, `exists()`, etc.) that delegate to the resolved adapter. These are the primary consumer API.
4. **Composition layer** — `extend()` for augmenting adapters, `Storage.with().extend().for().build()` builder for explicit instances, `fs` proxy singleton for convenience.
5. **SDK/Utility layer** — Cross-adapter copy/move, sequential batch execution, `throwUnsupportedOperation()`, and other higher-level operations. Subpath-exported at `/sdk`. This is the recommended consumer entry point for composition-level operations.

### Core Principle

Every type in the public API is runtime-agnostic. Node-specific types (`fs.Stats`, `node:stream`, `fs.constants`) are fully abstracted behind portable equivalents (`StorageStats`, `StorageStream`, abstract access flags).

---

## 2. Capability Model

### 13 Capability Domains + 1 Optional

| # | Capability | Symbol | FsAdapter operations | BlobAdapter operations | NodeFsAdapter status |
|---|-----------|--------|---------------------|----------------------|---------------------|
| 1 | Read | `Read` | get, getAsBuffer, getAsJSON | getObject, getAsBuffer | Implemented |
| 2 | Write | `Write` | put, putStreamed, append, appendStreamed, mkdir | putObject, deleteObject | Implemented |
| 3 | Stream | `Stream` | readStream, writeStream, duplexStream (StorageStream) | multipart upload | Implemented |
| 4 | Mutate | `Mutate` | copy, rename, move, delete | blob copy | Implemented |
| 5 | Navigate | `Navigate` | exists, doesntExist, stats, isFile, isDirectory, listDirectory, getPresignedUrl | listObjects, exists, stats, getPresignedUrl | Implemented (getPresignedUrl: UnsupportedOperationError) |
| 6 | Watch | `Watch` | watch (file change events) | blob change events | Implemented (Node 22+ `watch()` API) |
| 7 | Transaction | `Transaction` | batch, commit, rollback | multi-part atomic operations | UnsupportedOperationError |
| 8 | Lock | `Lock` | advisory lock, unlock | conditional write/lease | Implemented (cooperative lock file, cross-platform — see §10.2 for adapter-specific mechanism) |
| 9 | Metadata | `Metadata` | getAttributes, setAttributes | get/set custom metadata (x-amz-meta-*) | Implemented (xattrs POSIX / UnsupportedOperationError Windows — runtime detection) |
| 10 | Versioning | `Versioning` | getByVersion, listVersions | get/put/list by version ID | UnsupportedOperationError |
| 11 | Search | `Search` | query, filter | filter by metadata/pattern | UnsupportedOperationError |
| 12 | Linking | `Linking` | symlink, hardlink, readlink | presigned URL links | Implemented (symlinks + hardlinks, Windows admin caveat documented) |
| 13 | Events | `Events` | on/off (lifecycle events) + AsyncIterable | on/off + AsyncIterable | Implemented |

### Capability Declaration

- `static capabilities: symbol[]` on the adapter class — convenience array for declaration (class-level default)
- `get capabilities(): Set<symbol>` instance getter — returns the `Set<symbol>` used at runtime. Converts the static array to a `Set` by default; can override at runtime (e.g., OS-conditional support removes capabilities from the set)
- Resolution: instance getter shadows static; static is fallback

### Capability Identifiers

Unique symbols via `Symbol.for('storage:read')`, etc. Exported both individually and as a namespace:

```typescript
import { Read, Write, Stream, Mutate, Navigate, Watch, Transaction, Lock, Metadata, Versioning, Search, Linking, Events } from '@srhenry/storage-manager'
import { Capability } from '@srhenry/storage-manager'
// Capability.Read, Capability.Write, etc.
```

### Capability Checking

**Runtime:**

```typescript
adapter.capabilities.has(Read)
hasCapability(adapter, Read)
hasCapability(adapter, Read, { requireEnabled: true })
```

**Type-level:**

`hasCapability()` serves as a TypeScript type guard, narrowing the adapter type to include the domain interface.

**Builder narrowing:**

```typescript
Storage.with(adapter).for(Read, Write).build() // returns type with only Read+Write methods
```

### Three-State Capability Taxonomy

| State | `capabilities` set | `hasCapability()` | `hasCapability(..., { requireEnabled: true })` | Call result |
|---|---|---|---|---|
| Supported | Present | `true` | `true` | Normal execution |
| Disabled | Present | `true` | `false` | `UnsupportedOperationError` with `reason: 'disabled'` |
| Not-implemented | Absent | `false` | `false` | `UnsupportedOperationError` with `reason: 'not-implemented'` |

**Disabled capability contract:**

- `disabled` capabilities **must** still be declared in the adapter's `capabilities` set — they exist in the type surface
- At runtime dispatch, calls route to `throwUnsupportedOperation(..., 'disabled')`
- `hasCapability(adapter, Metadata)` returns `true` even when Metadata is disabled on Windows
- `hasCapability(adapter, Metadata, { requireEnabled: true })` returns `false` when disabled

### Unsupported Operations

Calling a domain method on an adapter that doesn't support it throws `UnsupportedOperationError` with the capability name, operation, adapter, and reason.

The `fs` singleton is typed as having all methods (full surface, runtime error for unsupported operations).

### `hasCapability()` API

```typescript
function hasCapability(adapter: Adapter, capability: symbol): boolean
function hasCapability(adapter: Adapter, capability: symbol, options: { requireEnabled?: boolean }): boolean
// Type guard overload
hasCapability<T extends Adapter>(adapter: T, capability: symbol): adapter is T & CapabilityMap[typeof capability]
```

- Default: `requireEnabled: false` — returns `true` for both supported and disabled capabilities
- `requireEnabled: true` — returns `true` only for supported (not disabled) capabilities

### Recommended Consumer Patterns

```typescript
// Pattern 1: Guard-then-call (safe, no try/catch needed)
if (hasCapability(adapter, Metadata, { requireEnabled: true })) {
    const attrs = await getAttributes(path) // guaranteed to work
}

// Pattern 2: Try/catch with reason discrimination
try {
    const attrs = await getAttributes(path)
} catch (err) {
    if (err instanceof UnsupportedOperationError) {
        if (err.reason === 'disabled') {
            // capability exists but isn't available in this environment
            // fallback or graceful degradation
        } else {
            // 'not-implemented' — capability doesn't exist at all
        }
    }
}

// Pattern 3: Feature detection without calling
if (hasCapability(adapter, Metadata)) {
    // capability is declared (may or may not be disabled)
    if (!hasCapability(adapter, Metadata, { requireEnabled: true })) {
        // specifically disabled — could show config hint or different fallback
    }
}
```

---

## 3. Adapter Interface Architecture (Mixin Pattern)

### Structure

Each capability domain has its own interface file in `src/adapters/interfaces/capabilities/`:

```text
src/adapters/interfaces/capabilities/
  ReadAdapter.ts
  WriteAdapter.ts
  StreamAdapter.ts
  MutateAdapter.ts
  NavigateAdapter.ts
  WatchAdapter.ts
  TransactionAdapter.ts
  LockAdapter.ts
  MetadataAdapter.ts
  VersioningAdapter.ts
  SearchAdapter.ts
  LinkingAdapter.ts
  EventsAdapter.ts
```

### Mixin Pattern

Adapters are classes that implement domain interfaces directly — no base class required. TypeScript intersection types compose the full adapter type:

```typescript
class NodeFsAdapter implements
Adapter, ReadAdapter, WriteAdapter, StreamAdapter, MutateAdapter,
NavigateAdapter, WatchAdapter, LockAdapter, MetadataAdapter,
LinkingAdapter, EventsAdapter {
    static capabilities = [Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events]
    get capabilities(): Set<symbol> { return new Set(NodeFsAdapter.capabilities) }
    // ... implementations
}
```

### Composite Types

`FsAdapter` and `BlobAdapter` are **type aliases**, not interfaces — they compose all 13 domains:

```typescript
type FsAdapter = Adapter & ReadAdapter & WriteAdapter & StreamAdapter & MutateAdapter & NavigateAdapter & WatchAdapter & TransactionAdapter & LockAdapter & MetadataAdapter & VersioningAdapter & SearchAdapter & LinkingAdapter & EventsAdapter
type BlobAdapter = Adapter & ReadAdapter & WriteAdapter & StreamAdapter & MutateAdapter & NavigateAdapter & WatchAdapter & TransactionAdapter & LockAdapter & MetadataAdapter & VersioningAdapter & SearchAdapter & LinkingAdapter & EventsAdapter
```

Consumers use `FsAdapter` when they want to type for "any full filesystem adapter", but the capability system means partial implementations are valid too.

### `Adapter` Base Type

`Adapter` is the primitive base type shared by both `FsAdapter` and `BlobAdapter`. It defines the minimal contract every adapter must satisfy:

```typescript
interface Adapter {
    readonly capabilities: Set<symbol>
}
```

- `capabilities` is a `Set<symbol>` (not array) — enables O(1) `has()` checks and set operations (union, intersection, difference) for composition
- `FsAdapter` and `BlobAdapter` both extend `Adapter` — they are `Adapter &` all 13 domain interfaces
- Partial adapters (implementing only some domains) are also `Adapter` — they just have fewer symbols in their `capabilities` set
- The `static capabilities` array on adapter classes is converted to a `Set` in the constructor/instance getter

### `CapabilityMap` Type

Maps capability symbols to their domain interfaces — used by `hasCapability()` type guard to narrow adapter types:

```typescript
interface CapabilityMap {
    [Read]: ReadAdapter
    [Write]: WriteAdapter
    [Stream]: StreamAdapter
    [Mutate]: MutateAdapter
    [Navigate]: NavigateAdapter
    [Watch]: WatchAdapter
    [Transaction]: TransactionAdapter
    [Lock]: LockAdapter
    [Metadata]: MetadataAdapter
    [Versioning]: VersioningAdapter
    [Search]: SearchAdapter
    [Linking]: LinkingAdapter
    [Events]: EventsAdapter
}
```

**Note:** Symbol keys in interfaces require TypeScript 4.4+ (well within our target). The `CapabilityMap` is used internally by `hasCapability()` — consumers don't need to reference it directly.

### `CompositeAdapter` Type

The result of `extend()` composition — an adapter with merged capabilities from base + extensions:

```typescript
interface CompositeAdapter extends Adapter {
    readonly capabilities: Set<symbol> // merged from base + extensions
    readonly base: Adapter
    readonly extensions: Adapter[]
}
```

- `capabilities` is the union of base + all extension capabilities
- Method resolution: extension overrides base on overlapping capabilities
- Constructed at runtime by `extend()` — not a class, but a proxy/delegate object

### Interface Contract

All interface methods are **required** — no optional methods. Adapters that don't support a method use `throwUnsupportedOperation()`:

```typescript
interface ReadAdapter {
    get(path: StoragePath | string, encoding?: StorageEncoding): Promise<string>
    getAsBuffer(path: StoragePath | string): Promise<Uint8Array>
    getAsJSON<T>(path: StoragePath | string, encoding?: StorageEncoding, reviver?: JSONReviver): Promise<T>
}

interface SearchAdapter {
    query(pattern: string, options?: SearchOptions): Promise<SearchResult[]>
    filter(predicate: SearchPredicate): Promise<SearchResult[]>
}
```

### Adapter Registration

Keeps the current `RuntimeResolver` pattern — each adapter directory has `detect.ts`, `resolver.ts`, `register.ts`, `index.ts`. The `RuntimeResolver` interface gains a `capabilities` field so the registry knows what a resolver will provide before instantiation.

### `extend()` Composition

```typescript
// Standalone utility — always uses global adapter as base
function extend(...extensions: Adapter[]): CompositeAdapter

// Builder method — explicit base
Storage.with(NodeFsAdapter).extend(searchImpl, customLockImpl).build()
```

**Rules:**

- Each extension must implement **at least one full domain** — no partial domain overrides
- If extension provides a capability the base already has, **extension overrides base**
- If two extensions provide the same capability, **throws `CapabilityConflictError`** at composition time
- Result is a `CompositeAdapter` with merged capabilities from base + extensions

---

## 4. Type Abstractions (Replacing Node Leaks)

### 4.1 StoragePath

```typescript
// Construction
const path = p`/foo/${name}/bar`  // Tagged template
const path = p('/foo/bar')        // From plain string

// Plain string input auto-converted/cast to StoragePath internally
// Returned paths are always StoragePath objects

// String interop
sp.toString() // explicit
String(sp) // explicit
`${sp}` // implicit via toString

// Identity
sp.equals(otherPath) // Comparable<StoragePath>
```

**Node interop:** Because `StoragePath` implements `Symbol.toPrimitive` + `valueOf`, it coerces to a plain string when passed to Node's native `fs` functions (e.g., `fs.readFile(sp)`). This is a Node-specific convenience; other runtimes may require explicit `.toString()` for their native APIs.

**Path utilities** exported individually (not `node:path` re-exports — runtime-agnostic implementations):

```typescript
import { join, basename, dirname, extname, normalize, resolve, relative, isAbsolute } from '@srhenry/storage-manager'
```

Adapters translate to their native path semantics internally.

**StoragePath implements** `Serializable<string>`, `Comparable<StoragePath>`.

### 4.2 StorageStats

```typescript
interface StorageStats<T = unknown> {
    // Base fields (every adapter provides)
    size: number | null
    lastModified: Timestamp | null
    isFile: boolean
    isDirectory: boolean
    isSymbolicLink: boolean
    // Adapter-specific extension
    permissions?: T
    mode?: T
    uid?: T
    gid?: T
    etag?: T
    versionId?: T
}
```

- Generic `T` parameter carries adapter-specific extensions
- `FsStorageExtra`: `{ mode: number, uid: number, gid: number, permissions: number }`
- `BlobStorageExtra`: `{ etag: string, versionId?: string, contentType?: string }`
- Consumers type as `StorageStats<FsStorageExtra>` or just `StorageStats` for the common subset

### 4.3 StorageStream

A custom type that is simultaneously:

- **AsyncIterable** — `for await (const chunk of stream) { ... }` with natural backpressure via pull-based iteration
- **Stream API** — `.pause()`, `.resume()`, `.abort(reason?)`, `.pipe(writable)`, `.close()`
- **Flow control** — `.concurrency(n)`, `.buffer(size)` for controlling throughput

```typescript
class StorageStream<T = Uint8Array> implements AsyncIterable<T> {
    [Symbol.asyncIterator](): AsyncIterator<T>
    pause(): void
    resume(): void
    abort(reason?: unknown): void
    close(): void
    pipe(destination: WritableStream | StorageStream | AsyncIterable): StorageStream
    concurrency(n: number): this
    buffer(size: number): this
    readonly closed: boolean
    readonly aborted: boolean
}
```

**Composition utilities** (separate exports):

```typescript
pipe(source, dest, options?)
merge(streamA, streamB, ...)
flatMap(stream, fn)
transform(stream, fn)
```

**Transport abstraction contract:** `StorageStream` is a transport abstraction, not a Node-style stream wrapper. Its contract guarantees:

- Consistent chunk semantics across all backends (`Uint8Array` chunks, not runtime-specific types)
- Backpressure is adapter-agnostic — pull semantics via `AsyncIterable` work identically regardless of source
- Concurrency and integrity verification operate on the `StorageStream` abstraction layer, not on the underlying native stream
- Adapters bridge their native streaming model to `StorageStream` at the boundary — the transport layer never leaks native types

### 4.4 Access Mode Constants

Package-level exports — abstract flags, not Node's `fs.constants`:

```typescript
// Individual exports + barrel object
export const F_OK: number = 0
export const R_OK: number = 4
export const W_OK: number = 2
export const X_OK: number = 1
export const constants = { F_OK, R_OK, W_OK, X_OK } as const

// String enum alternatives
export type AccessModeString = 'exists' | 'readable' | 'writable' | 'executable'
export const AccessMode: Record<AccessModeString, number> = {
    exists: F_OK,
    readable: R_OK,
    writable: W_OK,
    executable: X_OK,
}

// exists() accepts both
exists(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean>
```

Adapters translate these abstract flags to their native equivalents.

### 4.5 Input Types

```typescript
interface Serializable<T = unknown> {
    toJSON(): T
    toString(): string
}

type ValidInput = string | Uint8Array | ArrayBuffer
type Input =
    | ValidInput
    | object
    | Blob
    | ReadableStream
    | Serializable
    | Iterable<ValidInput | Serializable>
    | AsyncIterable<ValidInput | Serializable>
```

Auto-coerced internally:

- `ArrayBuffer` → `new Uint8Array(arrayBuffer)`
- `Blob` → `blob.arrayBuffer()` → `Uint8Array`
- `ReadableStream` → consumed via `StorageStream` bridging
- `Serializable` → `.toJSON()` first, then `JSON.stringify()` → `Uint8Array`
- `object` → checked for `.toJSON()` first; if present, calls `.toJSON()` then `JSON.stringify()`; otherwise `JSON.stringify()` directly → `Uint8Array`
- Serialization order: `Serializable.toJSON()` → object `.toJSON()` → `JSON.stringify()` fallback
- `Iterable` / `AsyncIterable` → consumed chunk-by-chunk via stream operations

**Note on `Buffer`:** `Buffer` is NOT in the `ValidInput` type union — it is a Node-specific type. However, since `Buffer extends Uint8Array` in Node, any `Buffer` instance is accepted at runtime where `Uint8Array` is expected. Non-Node runtimes do not need to provide `Buffer`.

### 4.6 StorageEncoding

```typescript
type StorageEncoding =
    | 'utf-8' | 'utf-16le' | 'ascii' | 'latin1'
    | 'base64' | 'base64url' | 'hex'
```

Package-level encoding type — replaces Node's `BufferEncoding` in all public API signatures. Only includes encodings with cross-runtime meaning. Adapters translate `StorageEncoding` to their native encoding representation internally (e.g., Node adapter maps to `BufferEncoding`, Bun adapter to `Bun.encoding`).

**Parameter naming convention:** All public API parameters use `encoding` (not `charset`). This harmonizes the Read domain (`encoding?`) and Write domain (`charset?`) — the Write domain parameters are renamed from `charset` to `encoding`.

---

## 5. Error Hierarchy

### Base

```typescript
class StorageError extends Error {
    readonly code: string
    readonly adapter?: string
    constructor(message: string, options?: { cause?: Error, code?: string, adapter?: string })
}
```

Each concrete error subclass overrides `code` with a literal string type:

| Error class | `code` value |
|---|---|
| `StorageError` | `'ERR_STORAGE'` |
| `UnsupportedOperationError` | `'ERR_UNSUPPORTED_OPERATION'` |
| `UnsupportedEnvironmentError` | `'ERR_UNSUPPORTED_ENVIRONMENT'` |
| `PathNotFoundError` | `'ERR_PATH_NOT_FOUND'` |
| `PermissionDeniedError` | `'ERR_PERMISSION_DENIED'` |
| `AlreadyExistsError` | `'ERR_ALREADY_EXISTS'` |
| `NotADirectoryError` | `'ERR_NOT_A_DIRECTORY'` |
| `IsDirectoryError` | `'ERR_IS_DIRECTORY'` |
| `TimeoutError` | `'ERR_TIMEOUT'` |
| `ConnectionError` | `'ERR_CONNECTION'` |
| `CapabilityConflictError` | `'ERR_CAPABILITY_CONFLICT'` |
| `TransactionError` | `'ERR_TRANSACTION'` |

### Hierarchy

```text
StorageError
├── UnsupportedOperationError     // capability/method not supported
│   .capability: symbol
│   .operation?: string
│   .adapter?: string
│   .reason: 'not-implemented' | 'disabled'
├── UnsupportedEnvironmentError // no adapter matches runtime (existing)
│ .detectedRuntime: string
├── PathNotFoundError // maps to ENOENT on POSIX, NotFound on blob stores
│ .path: StoragePath
│ .cause: Error
├── PermissionDeniedError // maps to EACCES on POSIX, AccessDenied on blob stores
│ .path: StoragePath
│ .cause: Error
├── AlreadyExistsError // maps to EEXIST on POSIX, ResourceAlreadyExists on blob stores
│ .path: StoragePath
│ .cause: Error
├── NotADirectoryError // maps to ENOTDIR on POSIX
│ .path: StoragePath
│ .cause: Error
├── IsDirectoryError // maps to EISDIR on POSIX
│ .path: StoragePath
│ .cause: Error
├── TimeoutError                  // operation timed out
│   .cause: Error
├── ConnectionError               // adapter disconnected (blob/network)
│   .cause: Error
├── CapabilityConflictError       // two extensions provide same domain in extend()
│ .capabilities: Set<symbol>
└── TransactionError              // batch/transaction failure
    .partialResults: unknown[]
    .completedOps: number
    .totalOps: number
    .cause: Error
```

### Wrapping Rule

All adapter-native errors are **always wrapped** into the appropriate `StorageError` subclass. The native error is available as `.cause` via the standard `Error` constructor options. Consumers always catch our types; they drill into `.cause` for runtime-specific details.

### `throwUnsupportedOperation()` SDK Utility

```typescript
// Overloads
throwUnsupportedOperation(capability: symbol): never
throwUnsupportedOperation(capability: symbol, operation: CapabilityOperation): never
throwUnsupportedOperation(capability: symbol, operation: CapabilityOperation, adapter: Adapter): never
throwUnsupportedOperation(capability: symbol, operation: CapabilityOperation, adapter: Adapter, reason: 'not-implemented' | 'disabled'): never
```

Constructs and throws `UnsupportedOperationError` internally with the correct fields. Adapters use this instead of manually importing and constructing the error class.

### `CapabilityOperation` Derived Type

Extracted from interface method names via TypeScript's `keyof`, not string literals — always stays in sync with interface changes. Encompasses all capability domain method names:

```typescript
type ReadOperations = keyof ReadAdapter
type WriteOperations = keyof WriteAdapter
type StreamOperations = keyof StreamAdapter
type MutateOperations = keyof MutateAdapter
type NavigateOperations = keyof NavigateAdapter
type WatchOperations = keyof WatchAdapter
type TransactionAdapterOperations = keyof TransactionAdapter
type LockOperations = keyof LockAdapter
type MetadataOperations = keyof MetadataAdapter
type VersioningOperations = keyof VersioningAdapter
type SearchOperations = keyof SearchAdapter
type LinkingOperations = keyof LinkingAdapter
type EventsOperations = keyof EventsAdapter

type CapabilityOperation =
    | ReadOperations | WriteOperations | StreamOperations | MutateOperations
    | NavigateOperations | WatchOperations | TransactionAdapterOperations | LockOperations
    | MetadataOperations | VersioningOperations | SearchOperations | LinkingOperations
    | EventsOperations
```

**Note:** `CapabilityOperation` (method names across all domain interfaces) is distinct from `TransactionOperation` (batch operation descriptors used by `TransactionAdapter.batch()` and `sequentialBatch()`).

---

## 6. Bootstrap, Builder & Singleton

### 6.1 Lazy Singleton (Enhanced)

The global `fs` proxy object auto-bootstraps on first call:

- `_bootstrap()` calls `resolveAdapter()` to find a matching runtime resolver
- First resolver whose `matchesEnvironment()` returns true wins → `create()` provides the adapter
- If no resolver matches, throws `UnsupportedEnvironmentError`
- `setFS(adapter)` **always** installs the adapter and sets `_bootstrapped = true`, even if already bootstrapped — allows hot-swapping the global adapter at any point
- `_bootstrapped` flag + retry on failure (if `resolveAdapter()` throws, `_bootstrapped` stays `false` so next call retries)

**`fs` singleton is a Proxy** that dynamically routes calls to the resolved adapter. At the type level, it's typed as having all methods (full surface). At runtime, calling an unsupported operation throws `UnsupportedOperationError`. The proxy also exposes `.capabilities` for runtime introspection.

### 6.2 Builder Pattern — `Storage.with()`

```typescript
// Full usage
Storage.with(adapter)
    .extend(searchImpl, customLockImpl)
    .for(Read, Write, Navigate)
    .build()

// Minimal — auto-discovers all capabilities, no narrowing
Storage.with(adapter).build()

// With extend but no for
Storage.with(NodeFsAdapter).extend(searchAdapter).build()

// With for but no extend
Storage.with(adapter).for(Read, Write).build()
```

**Builder API:**

- `Storage.with(adapter)` — starts builder with a base adapter
- `.extend(...partialAdapters)` — augments base with capability extensions (extension overrides base, conflict on extension-extension)
- `.for(...capabilities)` — narrows the returned type to only those capabilities. Optional — default returns all supported
- `.build()` — produces a frozen object with bound operations (not a Proxy — plain frozen object)

### 6.3 `extend()` Standalone Utility

```typescript
function extend(...extensions: Adapter[]): CompositeAdapter
```

Always uses the global adapter (`_getAdapter()`) as the base. For scoped composition with an explicit base, use the `Storage.with(base).extend(...)` builder (§6.2).

### 6.4 `useAdapter()` (Preserved)

```typescript
useAdapter(adapter) // returns frozen object with all adapter methods bound
```

Remains for quick one-off adapter usage without builder ceremony.

---

## 7. Subpath Exports & Module Organization

### Exports Map

```json
{
    "exports": {
        ".": {
            "types": "./types/index.d.ts",
            "import": "./dist/esm/index.js",
            "require": "./dist/cjs/index.js",
            "default": "./dist/esm/index.js"
        },
        "/fs": {
            "types": "./types/fs/index.d.ts",
            "import": "./dist/esm/fs/index.js",
            "require": "./dist/cjs/fs/index.js",
            "default": "./dist/esm/fs/index.js"
        },
        "/blob": {
            "types": "./types/blob/index.d.ts",
            "import": "./dist/esm/blob/index.js",
            "require": "./dist/cjs/blob/index.js",
            "default": "./dist/esm/blob/index.js"
        },
        "/adapters": {
            "types": "./types/adapters/index.d.ts",
            "import": "./dist/esm/adapters/index.js",
            "require": "./dist/cjs/adapters/index.js",
            "default": "./dist/esm/adapters/index.js"
        },
        "/sdk": {
            "types": "./types/sdk/index.d.ts",
            "import": "./dist/esm/sdk/index.js",
            "require": "./dist/cjs/sdk/index.js",
            "default": "./dist/esm/sdk/index.js"
        },
        "/types": {
            "types": "./types/types/index.d.ts",
            "import": "./dist/esm/types/index.js",
            "require": "./dist/cjs/types/index.js",
            "default": "./dist/esm/types/index.js"
        },
        "/package.json": "./package.json"
    }
}
```

### Source Structure

```text
src/
    index.ts — main entry: re-exports fs/, blob/, adapters/, sdk/, types/ + fs proxy singleton
    bootstrap.ts — lazy singleton _bootstrap(), setFS(), useAdapter(), _getAdapter()
    Storage.ts — Storage class (builder pattern: Storage.with().extend().for().build())

    fs/
        index.ts — FsAdapter family barrel: domain functions, types
        read/
            get.ts
            getAsBuffer.ts
            getAsJSON.ts
        write/
            put.ts
            putStreamed.ts
            append.ts
            appendStreamed.ts
            mkdir.ts
        stream/
            StorageStream.ts
            readStream.ts
            writeStream.ts
            duplexStream.ts
            fileStream.ts
            pipe.ts
            merge.ts
            flatMap.ts
            transform.ts
        mutate/
            copy.ts
            rename.ts
            move.ts
            delete.ts
        navigate/
            exists.ts
            doesntExist.ts
            stats.ts
            isFile.ts
            isDirectory.ts
            listDirectory.ts
            StorageListing.ts
            getPresignedUrl.ts
        watch/
            watch.ts
        lock/
            lock.ts
        metadata/
            getAttributes.ts
            setAttributes.ts
        linking/
            symlink.ts
            hardlink.ts
            readlink.ts
        events/
            on.ts
            off.ts

    blob/
        index.ts — BlobAdapter family barrel: domain functions, types
        read/
        write/
        stream/
        mutate/
        navigate/
        watch/
        lock/
        metadata/
        versioning/
        search/
        linking/
        events/

    adapters/
        index.ts — re-exports interfaces + resolver + auto-register
        interfaces/
            capabilities/
                ReadAdapter.ts
                WriteAdapter.ts
                StreamAdapter.ts
                MutateAdapter.ts
                NavigateAdapter.ts
                WatchAdapter.ts
                TransactionAdapter.ts
                LockAdapter.ts
                MetadataAdapter.ts
                VersioningAdapter.ts
                SearchAdapter.ts
                LinkingAdapter.ts
                EventsAdapter.ts
            FsAdapter.ts — type alias composing Adapter + all 13 domain interfaces
            BlobAdapter.ts — type alias composing Adapter + all 13 domain interfaces
            Adapter.ts — base Adapter interface { capabilities: Set<symbol> }
            CompositeAdapter.ts — CompositeAdapter interface
            CapabilityMap.ts — symbol → domain interface mapping
            RuntimeResolver.ts
        types/
            FsStorageExtra.ts — fs-specific StorageStats extension type
            BlobStorageExtra.ts — blob-specific StorageStats extension type
        capabilities.ts — Symbol definitions for all 13 + Capability namespace object
        resolve.ts — registerRuntime(), detectRuntime(), resolveAdapter()
        auto-register.ts — auto-generated
        node/
            NodeFsAdapter.ts
            detect.ts
            resolver.ts
            register.ts
            index.ts
            lock.ts — cooperative lock file implementation (NodeFsAdapter uses O_EXCL pattern)
            xattrs.ts — xattr read/write (POSIX)
        bun/ — interfaces only for now (FsAdapter covers the interface)
        deno/ — interfaces only for now (FsAdapter covers the interface)

    sdk/
        index.ts
        extend.ts — extend() standalone utility (always uses global adapter as base)
        hasCapability.ts — hasCapability() type guard + runtime check
        crossAdapterCopy.ts — cross-adapter copy/move
        crossAdapterMove.ts — cross-adapter move (copy + delete from source)
        sequentialBatch.ts — best-effort batch for Transaction-unsupported adapters
        throwUnsupportedOperation.ts

    types/
        index.ts — all public type exports
        StoragePath.ts
        StorageStats.ts
        StorageStream.ts
        StorageListing.ts
        Input.ts
        Serializable.ts
        Comparable.ts
        AccessMode.ts
        Timestamp.ts
        MkdirOptions.ts
        StorageStreamOptions.ts
        PresignedUrlOptions.ts
        capabilities.ts — CapabilityOperation derived type
        TransactionOperation.ts — batch operation descriptor type

    shared/
        functions/
            p.ts — StoragePath tagged template factory
            join.ts, basename.ts, dirname.ts, extname.ts, normalize.ts, resolve.ts, relative.ts, isAbsolute.ts — path utilities
        utils/
            isIterable.ts
            isAsyncIterable.ts
            sanitizeInput.ts
        errors/
            StorageError.ts
            UnsupportedOperationError.ts
            UnsupportedEnvironmentError.ts
            PathNotFoundError.ts
            PermissionDeniedError.ts
            AlreadyExistsError.ts
            NotADirectoryError.ts
            IsDirectoryError.ts
            TimeoutError.ts
            ConnectionError.ts
            CapabilityConflictError.ts
            TransactionError.ts
```

**One function per file** preserved. Domain modules live under `fs/` or `blob/` instead of `src/` root.

---

## 8. StorageListing (Universal Listing Type)

Replaces `DirectoryList` with a type that works for both filesystems and blob stores.

```typescript
interface Comparable<T> {
    equals(other: T): boolean
}

class StorageListing implements Serializable<StorageListingJSON>, Comparable<StorageListing> {
    private struct: Array<StoragePath | StorageListing>
    private _name: StoragePath
    private _stats?: StorageStats

    constructor(name: StoragePath | string, struct: Array<StoragePath | StorageListing>, stats?: StorageStats)

    // Identity
    get name(): StoragePath
    get stats(): StorageStats | undefined

    // Serializable<StorageListingJSON>
    toJSON(fullname?: boolean, root?: boolean): StorageListingJSON
    toString(): string

    // Comparable<StorageListing>
    equals(other: StorageListing): boolean

    // Iteration
    *[Symbol.iterator](): Iterator<StoragePath | StorageListing>

    // String representation
    [Symbol.toPrimitive](hint: string): string | undefined

    // Query helpers
    get files(): StoragePath[]
    get directories(): StorageListing[]
    get isEmpty(): boolean
    get depth(): number
    get flat(): StoragePath[]  // all paths recursively flattened
}
```

- Uses `StorageStats` instead of `fs.Stats`
- Path entries are `StoragePath` — `string` inputs coerced to `StoragePath` via `p()` at construction time
- `.name` returns `StoragePath`
- `.files`, `.directories`, `.flat` return `StoragePath[]`
- Works for both filesystem directories and blob prefix hierarchies
- `DirectoryList` alias removed — `StorageListing` is the universal name

---

## 9. Domain Function API Surface

All path parameters accept `StoragePath | string` — strings are auto-coerced to `StoragePath` internally.

### Read

```typescript
get(path: StoragePath | string, encoding?: StorageEncoding): Promise<string>
getAsBuffer(path: StoragePath | string): Promise<Uint8Array>
getAsJSON<T>(path: StoragePath | string, encoding?: StorageEncoding, reviver?: JSONReviver): Promise<T>
```

### Write

```typescript
put(path: StoragePath | string, value: Input, encoding?: StorageEncoding): Promise<boolean>
putStreamed(path: StoragePath | string, values: Input, encoding?: StorageEncoding): Promise<void>
append(path: StoragePath | string, value: Input, encoding?: StorageEncoding): Promise<boolean>
appendStreamed(path: StoragePath | string, values: Input, encoding?: StorageEncoding): Promise<void>
mkdir(path: StoragePath | string, options?: MkdirOptions): Promise<void>
```

### Stream

```typescript
readStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T>
writeStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T>
duplexStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T>
fileStream<T = Uint8Array>(path: StoragePath | string, mode?: FileStreamMode, options?: StorageStreamOptions): StorageStream<T>
```

### Mutate

```typescript
copy(from: StoragePath | string, to: StoragePath | string, as?: string): Promise<void>
rename(path: StoragePath | string, renameTo: StoragePath | string): Promise<void>
move(from: StoragePath | string, to: StoragePath | string, as?: string): Promise<void>
delete(path: StoragePath | string): Promise<void>
```

### Navigate

```typescript
exists(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean>
doesntExist(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean>
stats<T = unknown>(path: StoragePath | string): Promise<StorageStats<T>>
isFile(path: StoragePath | string): Promise<boolean>
isDirectory(path: StoragePath | string): Promise<boolean>
listDirectory(path: StoragePath | string, recursive?: boolean): Promise<string[] | StorageListing>
getPresignedUrl(path: StoragePath | string, options?: PresignedUrlOptions): Promise<string>
```

NodeFsAdapter: `getPresignedUrl` throws `UnsupportedOperationError` with `reason: 'not-implemented'`. `getPresignedUrl` is not in NodeFsAdapter's `capabilities` set.

### Watch

```typescript
watch(path: StoragePath | string, callback?: WatchCallback): WatchHandle
```

### Lock

```typescript
lock(path: StoragePath | string, options?: LockOptions): Promise<LockHandle>
```

### Metadata

```typescript
getAttributes(path: StoragePath | string): Promise<Record<string, unknown>>
setAttributes(path: StoragePath | string, attrs: Record<string, unknown>): Promise<void>
```

### Versioning

```typescript
getByVersion(path: StoragePath | string, versionId: string): Promise<Uint8Array>
listVersions<T = unknown>(path: StoragePath | string): Promise<VersionInfo<T>[]>
```

### Search

```typescript
query<T = unknown>(pattern: string, options?: SearchOptions): Promise<SearchResult<T>[]>
filter<T = unknown>(predicate: SearchPredicate<T>): Promise<SearchResult<T>[]>
```

### Linking

```typescript
symlink(target: StoragePath | string, linkPath: StoragePath | string): Promise<void>
hardlink(target: StoragePath | string, linkPath: StoragePath | string): Promise<void>
readlink(path: StoragePath | string): Promise<StoragePath>
```

### Events

```typescript
on(event: AdapterEventType, handler: EventHandler): void
off(event: AdapterEventType, handler: EventHandler): void
events(): AsyncIterable<AdapterEvent>
```

### Domain Option Types

The following option and utility types are used across domain function signatures:

```typescript
// JSONReviver — references the standard JSON.parse reviver signature
type JSONReviver = (this: unknown, key: string, value: unknown) => unknown

// MkdirOptions — runtime-agnostic directory creation options
interface MkdirOptions {
    recursive?: boolean // default: true
    mode?: number // permissions (e.g., 0o755), adapter translates to native
}

// StorageStreamOptions — portable stream configuration (no Node-specific types)
interface StorageStreamOptions {
    encoding?: StorageEncoding
    start?: number // byte offset to start reading from
    end?: number // byte offset to stop reading at (inclusive)
}

// Adapter-specific stream options are passed through adapter constructors or
// adapter-level option interfaces (e.g., NodeFsStreamOptions extends StorageStreamOptions
// with highWaterMark, autoClose, emitClose). Adapters read their extended options
// from the adapter instance, not from domain function parameters.

// PresignedUrlOptions — carried from BlobStorageAdapter, also used by Navigate domain
interface PresignedUrlOptions {
    expiresIn?: number // seconds until URL expires
    [key: string]: unknown
}
```

---

## 10. Watch & Lock Details

### 10.1 Watch

```typescript
type CreateEventSlug = 'create'
type ModifyEventSlug = 'modify'
type DeleteEventSlug = 'delete'
type RenameEventSlug = 'rename'
type WatchEventSlug = CreateEventSlug | ModifyEventSlug | DeleteEventSlug | RenameEventSlug

interface BaseWatchEvent<T extends WatchEventSlug = WatchEventSlug> {
    type: T
    path: StoragePath
    timestamp: Timestamp<number | bigint>
}

interface CreateEvent extends BaseWatchEvent<CreateEventSlug> {}
interface ModifyEvent extends BaseWatchEvent<ModifyEventSlug> {}
interface DeleteEvent extends BaseWatchEvent<DeleteEventSlug> {}
interface RenameEvent extends BaseWatchEvent<RenameEventSlug> {
    previousPath: StoragePath
}

type WatchEvent = CreateEvent | ModifyEvent | DeleteEvent | RenameEvent

type WatchCallback = (event: WatchEvent) => void

interface WatchHandle extends Disposable, AsyncIterable<WatchEvent> {
    close(): void
    [Symbol.dispose](): void
    [Symbol.asyncIterator](): AsyncIterator<WatchEvent>
}
```

- `WatchHandle` does not expose `.on()`/`.off()` to avoid method-name collision with `EventsAdapter.on(event, handler)`. Use the `watch(path, callback?)` callback parameter or the `AsyncIterable` interface instead.
- NodeFsAdapter uses Node 22+ `watch()` API.

### 10.2 Lock

```typescript
type LockType = 'exclusive' | 'shared'

type LockOptions = {
    type?: LockType
    timeout?: number  // ms, 0 = no wait, Infinity = wait forever
}

interface LockHandle extends Disposable {
    release(): void
    [Symbol.dispose](): void
    readonly type: LockType
    readonly path: StoragePath
    readonly acquired: boolean
}
```

The `LockAdapter` interface is runtime-agnostic. Each adapter translates the agnostic contract to its runtime's available APIs.

**NodeFsAdapter** — cooperative lock file pattern (cross-platform, pure JS, no native addons):

- Uses `fs.open(path, O_CREAT | O_EXCL | O_RDWR)` to atomically create a lock file (`.lock` suffix)
- Lock acquisition: attempts `O_EXCL` create; on `EEXIST`, retries with configurable timeout + backoff
- Lock file contains PID + timestamp for stale lock detection
- Lock release: `fs.unlink()` the lock file
- **Shared vs exclusive**: both use the same mechanism (presence-based). Shared locks use a separate lock file suffix (`.slock`). This is cooperative — only other `@srhenry/storage-manager` consumers respect it.
- `O_EXLOCK` is **not** used (Linux lacks support, creating a cross-platform gap)
- **Windows caveat**: Windows file locking semantics differ — mandatory vs advisory. The cooperative pattern works identically on Windows since it relies on atomic `O_EXCL` creation, not OS-enforced locks.
- No native addons, no `flock()`, no `LockFileEx()` — all pure Node.js `fs` operations
- Lock operations: `fs.open(O_EXCL)` → retry loop → work → `fs.unlink()` on release

**Other adapters** translate differently:
- BunFsAdapter: may use `Bun.file().lock()` or equivalent Bun-specific APIs
- DenoFsAdapter: may use `Deno.flock()` / `Deno.FsFile.lock()` if available
- Adapters that cannot implement locks throw `UnsupportedOperationError` with `reason: 'not-implemented'`

---

## 11. Timestamp Type

```typescript
class Timestamp<T extends number | bigint = number>
    implements Serializable<string>, Comparable<Timestamp<T>> {

    private readonly value: T
    private readonly precision: 'ns' | 'us' | 'ms' | 's'

    constructor(value: T, precision?: 'ns' | 'us' | 'ms' | 's')  // validates integer

    // Getters — return type adapts to T
    get nanoseconds(): T
    get microseconds(): T
    get milliseconds(): T
    get seconds(): T
    get date(): Date

    // Conversion — can change primitive type
    toNanoseconds(): Timestamp<bigint>
    toMicroseconds(): Timestamp<number> | Timestamp<bigint>
    toMilliseconds(): Timestamp<number>
    toSeconds(): Timestamp<number>
    toDate(): Date

    // Serializable<string>
    toJSON(): string  // ISO 8601 with sub-ms precision
    toString(): string

    // Comparable<Timestamp<T>>
    equals(other: Timestamp<T>): boolean
    lessThan(other: Timestamp<T>): boolean
    greaterThan(other: Timestamp<T>): boolean

    // Static factories
    static fromNanoseconds(value: bigint): Timestamp<bigint>
    static fromMicroseconds(value: number | bigint): Timestamp<number | bigint>
    static fromMilliseconds(value: number): Timestamp<number>
    static fromSeconds(value: number): Timestamp<number>
    static fromDate(date: Date): Timestamp<number>
    static now(): Timestamp<bigint>  // highest precision available
}
```

- `value` is always an integer — constructor validates and throws if not
- `precision` tracks the source resolution (ns for inotify, us for some blob event APIs, ms for others)
- Conversions handle precision loss gracefully (ns → ms truncates, ms → ns zero-fills)
- `Timestamp<bigint>` for nanosecond precision (no overflow, no precision loss)
- `Timestamp<number>` for microsecond/millisecond/second (simpler, sufficient for most uses)
- NodeFsAdapter uses `Timestamp<bigint>` (nanosecond inotify/FSEvents)
- Blob adapters may use `Timestamp<number>` (millisecond from S3 lastModified)

### Clock Domain Consistency Contract

All `Timestamp` instances within the same adapter session are sourced from the same clock domain (e.g., `Timestamp.now()` for the default factory, or `process.hrtime.bigint()` for Node-specific adapters). `StorageStats.lastModified`, `AdapterEvent.timestamp`, and `WatchEvent.timestamp` all use `Timestamp` created through the same factory path. Adapters must not mix clock sources (e.g., don't use `Date.now()` for stats but `hrtime` for events) — this is an adapter implementation contract. The `Timestamp` class's `Comparable` methods handle cross-precision comparison safely (ns vs ms).

All `Date` / timestamp fields throughout the design use `Timestamp` instead of `Date`:

- `StorageStats.lastModified` → `Timestamp | null`
- `BlobStats.lastModified` → `Timestamp | null`
- `VersionInfo.lastModified` → `Timestamp`
- `WatchEvent.timestamp` → `Timestamp<number | bigint>`
- `AdapterEvent.timestamp` → `Timestamp`

---

## 12. Events Capability & NodeFsAdapter Lock Implementation

### 12.1 Events Capability

```typescript
type ReadyEventSlug = 'ready'
type ErrorEventSlug = 'error'
type DisconnectEventSlug = 'disconnect'
type ReconnectEventSlug = 'reconnect'
type AdapterEventType = ReadyEventSlug | ErrorEventSlug | DisconnectEventSlug | ReconnectEventSlug

interface BaseAdapterEvent<T extends AdapterEventType = AdapterEventType> {
    type: T
    timestamp: Timestamp
    adapter: string
    detail?: unknown
}

interface ReadyEvent extends BaseAdapterEvent<ReadyEventSlug> {}
interface ErrorEvent extends BaseAdapterEvent<ErrorEventSlug> {
    error: StorageError
}
interface DisconnectEvent extends BaseAdapterEvent<DisconnectEventSlug> {}
interface ReconnectEvent extends BaseAdapterEvent<ReconnectEventSlug> {}

type AdapterEvent = ReadyEvent | ErrorEvent | DisconnectEvent | ReconnectEvent

type EventHandler = (event: AdapterEvent) => void

interface EventsAdapter {
    on(event: AdapterEventType, handler: EventHandler): void
    off(event: AdapterEventType, handler: EventHandler): void
    events(): AsyncIterable<AdapterEvent>
}
```

- `.on()` / `.off()` for imperative handling
- `.events()` returns AsyncIterable for reactive composition
- NodeFsAdapter emits `'ready'` after bootstrap, `'error'` on fs operation failures

### 12.2 Lock — Adapter Translation Pattern

The `LockAdapter` interface is runtime-agnostic. Each adapter translates the contract to its runtime's available APIs:

```typescript
// Agnostic interface (in src/adapters/interfaces/capabilities/LockAdapter.ts)
interface LockAdapter {
    lock(path: StoragePath | string, options?: LockOptions): Promise<LockHandle>
}
```

**NodeFsAdapter** (`src/adapters/node/lock.ts`): Uses cooperative `O_EXCL` lock file pattern (see §10.2 for full details). Pure `fs` operations, no native addons, cross-platform. Future adapters translate differently:

- **BunFsAdapter**: May use `Bun.file().lock()` or equivalent Bun-specific APIs
- **DenoFsAdapter**: May use `Deno.flock()` / `Deno.FsFile.lock()` if available
- Adapters that cannot implement locks at all throw `UnsupportedOperationError` with `reason: 'not-implemented'`

---

## 13. Transaction, Metadata, Versioning, Search Details

### 13.1 Transaction

```typescript
interface TransactionAdapter {
    batch(operations: TransactionOperation[]): TransactionHandle
    commit(handle: TransactionHandle): Promise<TransactionResult>
    rollback(handle: TransactionHandle): Promise<void>
}

type TransactionOperation =
    | { type: 'put', path: StoragePath | string, value: Input }
    | { type: 'delete', path: StoragePath | string }
    | { type: 'copy', from: StoragePath | string, to: StoragePath | string }
    | { type: 'move', from: StoragePath | string, to: StoragePath | string }

interface TransactionHandle {
    readonly id: string
    readonly operations: TransactionOperation[]
    readonly status: 'pending' | 'committed' | 'rolledback'
}

interface TransactionResult {
    readonly handle: TransactionHandle
    readonly results: unknown[]
    readonly succeeded: boolean
}
```

NodeFsAdapter: throws `UnsupportedOperationError`. SDK utility `sequentialBatch()` provides best-effort sequential execution.

### 13.2 Metadata

```typescript
interface MetadataAdapter {
    getAttributes(path: StoragePath | string): Promise<Record<string, unknown>>
    setAttributes(path: StoragePath | string, attrs: Record<string, unknown>): Promise<void>
}
```

NodeFsAdapter: implements via `xattr` operations on POSIX, throws `UnsupportedOperationError` with `reason: 'disabled'` on Windows (runtime OS detection). Metadata is declared in `capabilities` but disabled on Windows.

### 13.3 Versioning

```typescript
interface VersioningAdapter {
    getByVersion(path: StoragePath | string, versionId: string): Promise<Uint8Array>
    listVersions<T = unknown>(path: StoragePath | string): Promise<VersionInfo<T>[]>
}

interface VersionInfo<T = unknown> {
    versionId: string
    path: StoragePath
    lastModified: Timestamp<number | bigint>
    isLatest: boolean
    size: number
    stats?: StorageStats<T>
}
```

NodeFsAdapter: throws `UnsupportedOperationError` with `reason: 'not-implemented'`. Versioning is NOT in NodeFsAdapter's `capabilities` set.

### 13.4 Search

```typescript
interface SearchAdapter {
    query<T = unknown>(pattern: string, options?: SearchOptions): Promise<SearchResult<T>[]>
    filter<T = unknown>(predicate: SearchPredicate<T>): Promise<SearchResult<T>[]>
}

interface SearchOptions {
    maxResults?: number
    recursive?: boolean
}

type SearchPredicate<T = unknown> = (path: StoragePath, stats: StorageStats<T>) => boolean

interface SearchResult<T = unknown> {
    path: StoragePath
    stats: StorageStats<T>
}
}
```

NodeFsAdapter: throws `UnsupportedOperationError` with `reason: 'not-implemented'`. Search is NOT in NodeFsAdapter's `capabilities` set.

---

## 14. Cross-Adapter SDK Utilities & Composition

### 14.1 `extend()` Standalone Utility

```typescript
function extend(...extensions: Adapter[]): CompositeAdapter
```

- Always uses the global adapter as base
- Each extension must implement at least one full capability domain
- Extension overrides base on overlapping capabilities
- Throws `CapabilityConflictError` if two extensions provide the same capability
- Returns a `CompositeAdapter` with merged `capabilities` set
- For scoped composition with an explicit base, use `Storage.with(base).extend(...)` builder

### 14.2 Cross-Adapter Copy/Move

```typescript
function crossAdapterCopy(
    source: { adapter: Adapter, path: StoragePath | string },
    dest: { adapter: Adapter, path: StoragePath | string },
    options?: CrossAdapterOptions
): Promise<void>

function crossAdapterMove(
    source: { adapter: Adapter, path: StoragePath | string },
    dest: { adapter: Adapter, path: StoragePath | string },
    options?: CrossAdapterOptions
): Promise<void>

interface CrossAdapterOptions {
    concurrency?: number
    onProgress?: (transferred: number, total?: number) => void
    verifyIntegrity?: boolean
}
```

- Reads from source adapter via Read capability, writes to dest adapter via Write capability
- Streams data through `StorageStream` with configurable concurrency and optional integrity verification
- Move = copy + delete from source after successful copy
- Both adapters must support Read + Write capabilities respectively
- Throws `UnsupportedOperationError` if either adapter lacks required capabilities

### 14.3 Sequential Batch

```typescript
function sequentialBatch(
    adapter: Adapter,
    operations: TransactionOperation[],
    options?: SequentialBatchOptions
): Promise<SequentialBatchResult>

interface SequentialBatchOptions {
    stopOnError?: boolean       // default: true
    rollbackOnError?: boolean   // attempt to reverse completed ops
    onProgress?: (completed: number, total: number) => void
}

interface SequentialBatchResult {
    completed: number
    total: number
    results: unknown[]
    errors: (StorageError | null)[]  // null for succeeded ops
    partial: boolean                 // true if stopped early
}
```

- Executes operations one by one on a non-Transaction adapter
- `stopOnError: true` (default): stops at first failure
- `rollbackOnError: true`: attempts to reverse completed operations (put→delete, delete→re-put with cached value, copy→delete the copy)
- Best-effort rollback — not all operations are reversible (e.g., overwritten data)
- Result tracks per-operation success/failure and partial completion state

### 14.4 `throwUnsupportedOperation()`

```typescript
throwUnsupportedOperation(capability: symbol): never
throwUnsupportedOperation(capability: symbol, operation: CapabilityOperation): never
throwUnsupportedOperation(capability: symbol, operation: CapabilityOperation, adapter: Adapter): never
throwUnsupportedOperation(capability: symbol, operation: CapabilityOperation, adapter: Adapter, reason: 'not-implemented' | 'disabled'): never
```

All SDK utilities subpath-exported at `/sdk` for tree-shaking.

---

## 15. Testing Strategy

### 15.1 Shared Capability Compliance Suite

Located in `src/__tests__/compliance/` — one test file per capability domain:

```text
src/__tests__/compliance/
  read.compliance.ts
  write.compliance.ts
  stream.compliance.ts
  mutate.compliance.ts
  navigate.compliance.ts
  watch.compliance.ts
  lock.compliance.ts
  metadata.compliance.ts
  versioning.compliance.ts
  search.compliance.ts
  linking.compliance.ts
  events.compliance.ts
  transaction.compliance.ts
```

Each compliance suite:

- Exports a `testCapability(adapter, capability)` function
- Tests the full contract of that domain: return types, error wrapping, edge cases, `StoragePath` coercion, `Timestamp` usage
- Asserts `UnsupportedOperationError` with correct `reason` for unsupported capabilities
  - `reason: 'not-implemented'` → capability NOT in `capabilities` set
  - `reason: 'disabled'` → capability IS in `capabilities` set but operations throw disabled
- Verifies `Serializable` / `Comparable` contracts on returned types (`StorageStats`, `StorageListing`, `StoragePath`, `Timestamp`)

Running compliance per-adapter:

```typescript
import { testReadCompliance } from '../compliance/read.compliance'
import { NodeFsAdapter } from '../../adapters/node'

describe('NodeFsAdapter Read compliance', () => {
    const adapter = new NodeFsAdapter()
    testReadCompliance(adapter)
})
```

### 15.2 Per-Adapter Specific Tests

Located in `src/adapters/node/__tests__/`:

- Node-specific behavior: cooperative O_EXCL lock file pattern, xattr platform detection, symlink Windows caveat
- Platform-conditional tests (POSIX-only, Windows-only) using `process.platform` guards
- Performance characteristics, native error wrapping, `Timestamp` precision validation

### 15.3 SDK/Utility Tests

Located in `src/sdk/__tests__/`:

- `extend()` composition rules (override, conflict detection, always uses global base)
- `crossAdapterCopy/move` with mock adapters
- `sequentialBatch` success, partial failure, best-effort rollback
- `throwUnsupportedOperation()` overloads and error construction

### 15.4 Type-level Tests

Using TypeScript's `Expect` / `Equal` pattern to verify:

- `hasCapability()` narrows types correctly
- `Storage.with().for(Read, Write).build()` returns only Read+Write methods
- `CapabilityOperation` stays in sync with interface changes
- `Timestamp<number>` vs `Timestamp<bigint>` type safety

---

## 16. Migration & Breaking Changes from Current API

### 16.1 Removed Exports

- `StorageManager` class (already removed)
- `DirectoryList` → replaced by `StorageListing`
- `Directory` alias → replaced by `StorageListing`
- `fs.constants` getter → replaced by package-level `constants` export
- `fs.path` getter → replaced by individual path utility exports (`join`, `basename`, etc.)
- `NodeJS_fsReadOptions`, `NodeJS_fsWriteOptions`, `NodeJS_fsDuplexOptions`, `NodeJS_fsOptionsType` → replaced by `StorageStreamOptions`
- `FileStreamOptions` → replaced by `StorageStreamOptions`
- `fs.Stats` return types → `StorageStats`
- `node:stream` return types → `StorageStream`
- `IgnoreUnionType` (internal, removed)
- `getAsBuffers` → removed (use `getAsBuffer` which returns `Uint8Array`)
- `stream` alias (`stream = fileStream`) → removed (use `fileStream` explicitly)
- `deleteFromStorage` → removed (use `delete` directly)
- `number` from `Input` type union → removed (was `string | Buffer | number | object`, now `string | Uint8Array | ArrayBuffer | object | Blob | ReadableStream | Serializable | Iterable | AsyncIterable`)
- `Buffer` from `ValidInput` type union → removed (`Buffer` is Node-specific; accepted at runtime where `Uint8Array` is expected since `Buffer extends Uint8Array`, but not in the type union)
- `BufferEncoding` in all public API signatures → replaced by `StorageEncoding` (cross-runtime encoding type)
- `charset` parameter name on Write domain methods → renamed to `encoding` (harmonized with Read domain)

### 16.2 Changed Signatures

| Before | After | Change |
|---|---|---|
| `exists(...paths: (string \| number)[])` | `exists(path, mode?)` | Single path + mode |
| `get(path, encoding?)` | Same, but path accepts `StoragePath \| string` | StoragePath support |
| `put(path, value: Input)` where `Input = string \| Buffer \| number \| object` | `put(path, value: Input)` universal type | Expanded input types, `number` and `Buffer` removed from type union, `charset` → `encoding` |
| `stats(path)` returns `Promise<fs.Stats>` | `stats<T = unknown>(path)` returns `Promise<StorageStats<T>>` | Abstracted stats with generic |
| `listDirectory(path, recursive)` returns `Promise<string[] \| DirectoryList>` | `listDirectory(path, recursive)` returns `Promise<string[] \| StorageListing>` | Universal listing |
| `fileStream(path, mode, options, fsOptions)` | `readStream/writeStream/duplexStream(path, options)` | Simplified stream API |
| `FsAdapter` (interface extending 5 domains + `constants` + `path`) | `FsAdapter` (type alias: `Adapter &` all 13 domain interfaces) | Capability-based composition, no `constants`/`path` on adapter |
| `BlobStorageAdapter` (interface) | `BlobAdapter` (type alias: `Adapter &` all 13 domain interfaces) | Renamed + restructured to match FsAdapter pattern |
| `fs` object (`Object.freeze({...})`) | `fs` Proxy (dynamic routing + `.capabilities`) | Proxy-based singleton with capability introspection |

### 16.3 New Exports

- `StoragePath`, `p` tagged template, `StorageEncoding` type
- `StorageStats`, `StorageStream`, `StorageListing`, `Timestamp`
- `Serializable<T>`, `Comparable<T>` interfaces
- `Adapter` base interface, `CompositeAdapter` interface, `CapabilityMap` type
- All 13 capability symbols + `Capability` namespace
- `hasCapability()` type guard
- `Storage.with().extend().for().build()` builder
- `extend()` standalone utility
- `throwUnsupportedOperation()` SDK utility
- Cross-adapter SDK: `crossAdapterCopy`, `crossAdapterMove`, `sequentialBatch`
- All new domain functions for Watch, Lock, Metadata, Versioning, Search, Linking, Events, Transaction
- `UnsupportedOperationError`, `CapabilityConflictError`, `TransactionError`, and other new error types
- `constants` + individual flag exports (`F_OK`, `R_OK`, `W_OK`, `X_OK`) + `AccessMode` string enum
- Individual path utilities (`join`, `basename`, `dirname`, etc.)
- `MkdirOptions`, `StorageStreamOptions`, `PresignedUrlOptions`
- `JSONReviver` type alias
- `CapabilityOperation` derived type
- `TransactionOperation` batch operation descriptor type
- `FsStorageExtra`, `BlobStorageExtra` adapter-specific stats extension types

### 16.4 Subpath Export Changes

| Before | After |
|---|---|
| `/read` | `/fs` |
| `/write` | `/fs` |
| `/stream` | `/fs` |
| `/metadata` | `/fs` |
| `/directory` | `/fs` |
| `/adapters` | `/adapters` |
| — | `/blob` |
| — | `/sdk` |
| — | `/types` |

---

## 17. Build & Module System

### 17.1 Build Pipeline

The existing build pipeline is preserved:

```text
generate-adapters → clean → ESM → fix-esm → CJS
```

- `generate-adapters` scans `src/adapters/*/register.ts` — no changes
- ESM build emits extensionless imports → `fix-esm-imports.mjs` adds `.js` extensions
- CJS build creates `dist/cjs/package.json` with `{ "type": "commonjs" }`

### 17.2 Source Structure Impact

- Updated `tsconfig.esm.json` and `tsconfig.cjs.json` `rootDir`/`include` paths for new `src/fs/`, `src/blob/`, `src/sdk/`, `src/types/` directories
- Updated `typedoc.json` entry point
- Updated `vitest.config.ts` for new paths
- `scripts/generate-adapter-registrations.mjs` unchanged

### 17.3 New Build Outputs

```text
/fs     → dist/esm/fs/index.js, dist/cjs/fs/index.js
/blob   → dist/esm/blob/index.js, dist/cjs/blob/index.js
/sdk    → dist/esm/sdk/index.js, dist/cjs/sdk/index.js
/types  → dist/esm/types/index.js, dist/cjs/types/index.js
/adapters → dist/esm/adapters/index.js, dist/cjs/adapters/index.js
```

### 17.4 Package.json Updates

- `exports` map updated to new subpaths
- `description` updated from "A Custom filesystem wrapper for Node.JS" to reflect storage abstraction identity
- `keywords` updated: add `storage`, `abstraction`, `blob`, `capability`
- `engines` unchanged: `^22.0.0 || ^24.0.0 || ^26.0.0`

### 17.5 Zero Runtime Dependencies

Maintained — all new types (`StoragePath`, `StorageStream`, `Timestamp`, `StorageListing`) are self-contained implementations with no external dependencies. Lock implementation uses pure Node.js `fs` operations (cooperative `O_EXCL` lock file pattern, no native addons).

### Build Pipeline Independence Contract

Build remains structural (file paths, module resolution) — never semantic (capability logic, runtime detection). No build-time capability checks or adapter-specific compilation.

### Subpath Exports as Contract Boundary

`/fs`, `/blob`, `/sdk`, `/types` are the stable API surface. Internal reorganization under those subpaths is allowed; the subpath mapping itself is the semver contract.

### Zero-Dependency + Node Behavioral Reliance

While zero external deps is maintained, `StorageStream` (backpressure via `AsyncIterable` + native stream bridging), cross-adapter streaming (chunk boundary consistency), and `Lock` (cooperative `O_EXCL` lock file pattern semantics) all depend on subtle Node runtime guarantees. This is acceptable but means:

- The compliance suite validates behavioral contracts, not just structural ones
- Adapter implementation tests must cover Node version-specific behavior (v22 vs v24 vs v26)
- Any change to Node's native stream/lock semantics in future versions should trigger compliance re-runs

---

## 18. Design Principles & Contracts Summary

### SDK as Primary Usage Model

The `/sdk` subpath is the recommended consumer entry point for higher-level operations (cross-adapter copy, sequential batch, composition). Raw adapter access remains available but is lower-level.

### Adapter Family Parity

Both `/fs` and `/blob` are first-class subpath exports with identical capability domain structure. Neither is the "default" — the main entry (`.`) re-exports both families equally. Documentation, examples, and API surface must reflect this parity.

### Abstraction Break Validation

The `fs.Stats` → `StorageStats` and `node:stream` → `StorageStream` transitions are hard breaks. The compliance suite is the primary guard against semantic drift — every field, every method, every edge case that `fs.Stats` covered must have a `StorageStats` equivalent with documented behavioral differences. Compliance tests explicitly compare adapter output against the abstract type contract, not against Node's native behavior.

### Cumulative Feature

This task produces the architecture and implementation of the capability-based refactor, but 2.0.0 does not launch yet. It accumulates alongside subsequent tasks (multi-runtime adapters, blob adapters, etc.) until everything is ready for the 2.0.0 release.

### 2.0.0 Scope

- NodeFsAdapter fully implemented (all 13 + Events where Node supports it)
- Bun/Deno adapter interfaces ready (implementations in subsequent task)
- BlobAdapter interfaces defined, no implementations
- Full compliance suite
- All SDK utilities
