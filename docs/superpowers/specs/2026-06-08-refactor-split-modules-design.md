# Refactor: Split StorageManager into Domain Modules + Adapter Architecture

**Date:** 2026-06-08
**Task ID:** refactor-split-modules (+ merged rethink-api-design)
**Approach:** Domain Modules + Adapter Layer (Approach A)

---

## 1. Summary

Split the monolithic `StorageManager` static class (863 lines) into domain-focused modules with subdirectory-per-domain organization. Introduce per-domain ISP adapter interfaces, a composite `FsAdapter`, and a `BlobStorageAdapter` interface for external storage. Replace the static class API with standalone function exports, subpath scoped imports, and a frozen `fs` convenience object. Remove `StorageManager` class entirely (clean break — 2.0.0 is unreleased). Remove `LogicGates` and internalize `sanitizeInput`. Remove callback params from `mkdir` and `deleteFromStorage`.

---

## 2. Public API Surface

### 2.1 Before

```ts
import { StorageManager } from '@srhenry/storage-manager'
await StorageManager.put('/tmp/file.txt', 'hello')
```

### 2.2 After

```ts
// Named imports (tree-shakeable)
import { put, get } from '@srhenry/storage-manager'
await put('/tmp/file.txt', 'hello')

// Bundle import
import * as Storage from '@srhenry/storage-manager'
await Storage.put('/tmp/file.txt', 'hello')

// fs convenience object (default export + named)
import fs from '@srhenry/storage-manager'
await fs.put('/tmp/file.txt', 'hello')

// Scoped subpath imports
import { get, getAsJSON } from '@srhenry/storage-manager/read'
import { put, append } from '@srhenry/storage-manager/write'
import { fileStream, readStream } from '@srhenry/storage-manager/stream'
import { exists, stats } from '@srhenry/storage-manager/metadata'
import { mkdir, copy } from '@srhenry/storage-manager/directory'
import { ReadAdapter, BlobStorageAdapter } from '@srhenry/storage-manager/adapters'
```

### 2.3 Removed from public API

- `StorageManager` class/namespace — clean break, no deprecated shim
- `sanitizeInput` — internal-only, no longer exported
- `LogicGates` namespace — removed entirely (replaced by `Array.every()` in `exists`)
- Callback parameters on `mkdir` and `deleteFromStorage` — Promise-only

### 2.4 Added to public API

- `fs` — frozen object literal with all FS functions (`Object.freeze({ get, put, append, ... })`). Also the default export.
- `setFS(adapter: FsAdapter): void` — inject a custom adapter into the global/static functions
- `useAdapter(adapter: FsAdapter)` — returns a scoped frozen `fs`-like object with all methods bound to that adapter (no global mutation)
- `bootstrap(): void` — explicitly triggers environment detection and adapter selection. Runs once, memoized.
- `detectRuntime(): string` — returns the detected runtime identifier (`'node'`, `'unknown'`, future: `'bun'`, `'deno'`). Useful for debugging adapter issues.
- `UnsupportedEnvironmentError` — exported class, thrown when no adapter is set and runtime is unsupported. Has `code: 'ERR_UNSUPPORTED_ENVIRONMENT'` and `detectedRuntime: string | null`.

---

## 3. Adapter Architecture

### 3.1 Per-domain ISP interfaces

Each domain has its own interface. Signatures mirror the current API (exact params/returns to be refined in a future API refinement task).

**`ReadAdapter`** (`src/adapters/interfaces/ReadAdapter.ts`):

- `get(path, encoding?)` → `Promise<string>`
- `getAsBuffer(path)` → `Promise<Buffer>`
- `getAsBuffers(path)` → `Promise<Buffer[]>`
- `getAsJSON(path, encoding?, reviver?)` → `Promise<any>`

**`WriteAdapter`** (`src/adapters/interfaces/WriteAdapter.ts`):

- `put(path, value, charset?)` → `Promise<boolean>`
- `putStreamed(path, values, charset?)` → `Promise<void>`
- `append(path, value, charset?)` → `Promise<boolean>`
- `appendStreamed(path, values, charset?)` → `Promise<void>`

**`StreamAdapter`** (`src/adapters/interfaces/StreamAdapter.ts`):

- `fileStream(path, mode?, options?, fsOptions?)` → `FileStreamType<mode>`
- `readStream(path, options?, fsOptions?)` → `Stream.Readable`
- `writeStream(path, options?, fsOptions?)` → `Stream.Writable`
- `duplexStream(path, options?, readOptions?, writeOptions?)` → `Stream.Duplex`

**`DirAdapter`** (`src/adapters/interfaces/DirAdapter.ts`):

- `mkdir(path, options?)` → `Promise<void>`
- `listDirectory(path, recursive?)` → `Promise<string[] | DirectoryList>`
- `copy(from, to, as?)` → `Promise<void>`
- `rename(path, renameTo)` → `Promise<void>`
- `move(from, to, as?)` → `Promise<void>` (delegates to `rename`)
- `deleteFromStorage(filePath)` → `Promise<void>`
- `delete(filePath)` → `Promise<void>` (alias for `deleteFromStorage`)

**`MetaAdapter`** (`src/adapters/interfaces/MetaAdapter.ts`):

- `exists(...args)` → `Promise<boolean>` (overloads preserved as-is, deferred to API refinement)
- `doesntExist(...args)` → `Promise<boolean>`
- `stats(path)` → `Promise<fs.Stats>`
- `isFile(path)` → `Promise<boolean>`
- `isDirectory(path)` → `Promise<boolean>`

### 3.2 Composite FsAdapter

```ts
// src/adapters/interfaces/FsAdapter.ts
export interface FsAdapter
    extends ReadAdapter, WriteAdapter, StreamAdapter, DirAdapter, MetaAdapter {
    readonly constants: typeof fs.constants
    readonly path: typeof Path
}
```

Single composite per runtime. Runtime detection picks one `FsAdapter`.

### 3.3 BlobStorageAdapter

Interface + types only. No implementations. Designed for third-party adapters (S3, R2, etc.).

**`BlobStorageAdapter`** (`src/adapters/interfaces/BlobStorageAdapter.ts`):

- `putObject(key, data, options?)` → `Promise<BlobPutResult>`
- `getObject(key, options?)` → `Promise<BlobGetResult>`
- `deleteObject(key, options?)` → `Promise<BlobDeleteResult>`
- `listObjects(prefix, options?)` → `Promise<BlobListResult>`
- `getPresignedUrl(key, options?)` → `Promise<string>`
- `exists(key)` → `Promise<boolean>`
- `stats(key)` → `Promise<BlobStats>`

Corresponding option/result types defined in the same file. Exact shape to be refined in API refinement task — this design just establishes the interface as public SDK surface.

### 3.4 NodeFsAdapter

```ts
// src/adapters/node/NodeFsAdapter.ts
export class NodeFsAdapter implements FsAdapter {
    readonly constants = fs.constants
    readonly path = Path
    // ...implements all methods by delegating to node:fs / node:fs/promises
}
```

Only adapter implemented in this refactor. Bun/Deno adapters come in the `multi-runtime-fs` task.

### 3.5 Runtime resolution

```ts
// src/adapters/resolve.ts
export function detectRuntime(): string {
    if (typeof process?.versions?.node === 'string') return 'node'
    // Future: if (typeof Bun !== 'undefined') return 'bun'
    // Future: if (typeof Deno !== 'undefined') return 'deno'
    return 'unknown'
}

export function resolveAdapter(): FsAdapter | null {
    if (detectRuntime() === 'node') return new NodeFsAdapter()
    return null
}
```

The `detectRuntime()` function is exported for use by `UnsupportedEnvironmentError` — when bootstrap fails to find an adapter, the error receives `detectRuntime()` so it reports what runtime was detected (e.g. `"unknown"` for unsupported environments).

### 3.6 Wiring

```ts
// Module-level state (in src/index.ts or a dedicated state module)
let _adapter: FsAdapter | null = null
let _bootstrapped = false

function _bootstrap(): void {
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
        // ...all methods bound to this adapter
    })
}

// Every exported function delegates via _bootstrap + _adapter
export function get(path: string, encoding?: BufferEncoding): Promise<string> {
    _bootstrap()
    if (!_adapter) throw new UnsupportedEnvironmentError(detectRuntime())
    return _adapter.get(path, encoding)
}
```

---

## 4. Bootstrap Behavior

1. **Module load time:** Nothing happens. `_adapter` is null, `_bootstrapped` is false.
2. **`bootstrap()` call:** Triggers `_bootstrap()` — runs `resolveAdapter()` once, memoizes result, sets `_bootstrapped = true`. Subsequent calls are no-ops.
3. **`setFS(adapter)` call:** Sets `_bootstrapped = true` and `_adapter = adapter`. Short-circuits any lazy bootstrap since the user has explicitly taken control.
4. **First FS function call:** If not bootstrapped, triggers `_bootstrap()` first. Then checks `_adapter` — if null, throws `UnsupportedEnvironmentError`.
5. **Lazy singleton:** Bootstrap runs at most once ever. Whether triggered by `bootstrap()` or by the first FS call, it never re-runs.

---

## 5. Directory Structure

```
src/
    adapters/
        interfaces/
            ReadAdapter.ts
            WriteAdapter.ts
            StreamAdapter.ts
            DirAdapter.ts
            MetaAdapter.ts
            FsAdapter.ts
            BlobStorageAdapter.ts
            index.ts          — re-exports all interfaces
        node/
            NodeFsAdapter.ts  — Node.js implementation
            resolve.ts        — runtime detection + adapter selection
        index.ts              — re-exports interfaces + NodeFsAdapter + resolveAdapter
    read/
        index.ts              — get, getAsBuffer, getAsBuffers, getAsJSON
    write/
        index.ts              — put, putStreamed, append, appendStreamed
    stream/
        index.ts              — fileStream, readStream, writeStream, duplexStream, stream alias + stream types
    metadata/
        index.ts              — exists, doesntExist, stats, isFile, isDirectory
    directory/
        index.ts              — mkdir, listDirectory, copy, rename, move, deleteFromStorage, delete
    shared/
        types/
            Input.ts — Input, ValidInput
            FileStreamMode.ts — ReadMode, WriteMode, DuplexMode, FileStreamMode, FileStreamOptions, etc.
            DirectoryListTypes.ts — RecursiveType, DirectoryListJSONContent, DirectoryListJSON
            index.ts — re-exports all types
        errors/
            UnsupportedEnvironmentError.ts
            index.ts          — re-exports all errors
        utils/
            isIterable.ts
            isAsyncIterable.ts
            IgnoreUnionType.ts
            sanitizeInput.ts  — internal helper, NOT in public exports
            index.ts          — re-exports all utils
        index.ts              — re-exports types/, errors/, utils/
    DirectoryList.ts          — unchanged (127 lines)
    index.ts                  — main entry: re-exports all functions + fs object + setFS/useAdapter/bootstrap + default export
```

### 5.1 package.json exports map

```json
{
    "exports": {
        ".": {
            "import": "./dist/esm/index.js",
            "require": "./dist/cjs/index.js",
            "types": "./types/index.d.ts",
            "default": "./dist/esm/index.js"
        },
        "./read": {
            "import": "./dist/esm/read/index.js",
            "require": "./dist/cjs/read/index.js",
            "types": "./types/read/index.d.ts",
            "default": "./dist/esm/read/index.js"
        },
        "./write": {
            "import": "./dist/esm/write/index.js",
            "require": "./dist/cjs/write/index.js",
            "types": "./types/write/index.d.ts",
            "default": "./dist/esm/write/index.js"
        },
        "./stream": {
            "import": "./dist/esm/stream/index.js",
            "require": "./dist/cjs/stream/index.js",
            "types": "./types/stream/index.d.ts",
            "default": "./dist/esm/stream/index.js"
        },
        "./metadata": {
            "import": "./dist/esm/metadata/index.js",
            "require": "./dist/cjs/metadata/index.js",
            "types": "./types/metadata/index.d.ts",
            "default": "./dist/esm/metadata/index.js"
        },
        "./directory": {
            "import": "./dist/esm/directory/index.js",
            "require": "./dist/cjs/directory/index.js",
            "types": "./types/directory/index.d.ts",
            "default": "./dist/esm/directory/index.js"
        },
        "./adapters": {
            "import": "./dist/esm/adapters/index.js",
            "require": "./dist/cjs/adapters/index.js",
            "types": "./types/adapters/index.d.ts",
            "default": "./dist/esm/adapters/index.js"
        }
    }
}
```

---

## 6. Error Handling

### UnsupportedEnvironmentError

```ts
export class UnsupportedEnvironmentError extends Error {
    public readonly code = 'ERR_UNSUPPORTED_ENVIRONMENT'
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

Exported for third-party `instanceof` checks.

---

## 7. Testing Strategy

### 7.1 Test migration

- Existing specs (47 tests across 6 files): update from `StorageManager.get(...)` → `get(...)`. Import paths change, logic unchanged.
- All existing tests continue to pass against `NodeFsAdapter` (default).

### 7.2 New tests

- **`src/__tests__/bootstrap.spec.ts`** — lazy bootstrap (no detection until first call), idempotency (runs once ever), `setFS()` short-circuits bootstrap, `bootstrap()` is a no-op on second call
- **`src/adapters/__tests__/adapter.spec.ts`** — `setFS()` replaces adapter, `useAdapter()` returns scoped frozen object that doesn't mutate global adapter, `UnsupportedEnvironmentError` thrown when no adapter is available

### 7.3 Mock adapter

Tests use a simple mock implementing `FsAdapter` for verification. No mock adapter is built into the published library — that's consumer territory.

---

## 8. Out of Scope

- **API refinement** — exact params/returns per function redesigned in a future task. Adapter interfaces mirror current signatures.
- **Bun/Deno adapters** — only `NodeFsAdapter` implemented. `resolveAdapter()` returns null for non-Node runtimes.
- **BlobStorageAdapter implementations** — interface + types only. No S3/R2/any impl.
- **`exists` overload simplification** — kept as-is, deferred to API refinement.
- **`fs` object method list finalization** — mirrors current API. May change during API refinement.
- **Version bump** — stays at 2.0.0, no bump until launch.
- **Build system changes** — dual ESM+CJS build stays the same. Only `package.json` `exports` map gets updated for subpath entries. `fix-esm-imports.mjs` continues handling `.js` extensions post-build.
- **Performance optimization** — no changes to how streams or file operations work internally.
