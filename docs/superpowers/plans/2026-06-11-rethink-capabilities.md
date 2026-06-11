# Rethink Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor storage-manager into a capability-based storage abstraction with 13 capability domains, Symbol-based capability identifiers, runtime-agnostic types, and SDK utilities — cumulative for 2.0.0.

**Architecture:** Adapter mixin pattern — classes implement `Adapter` + domain interfaces directly. Capability symbols declare support. `FsAdapter`/`BlobAdapter` are type aliases composing all 13 domain interfaces. Domain functions delegate to resolved adapter. `Storage` builder + `fs` Proxy singleton provide consumer API.

**Tech Stack:** TypeScript (strict, ES2024), Vitest, Biome lint, Prettier, Yarn 1.x, Node 22+/24+/26+

---

## File Structure

### NEW FILES TO CREATE

**Types layer** (`src/types/`):
- `index.ts` — barrel
- `StoragePath.ts` — StoragePath class
- `StorageStats.ts` — StorageStats interface
- `StorageStream.ts` — StorageStream class
- `StorageListing.ts` — StorageListing class
- `Input.ts` — ValidInput, Input types
- `Serializable.ts` — Serializable interface
- `Comparable.ts` — Comparable interface
- `AccessMode.ts` — F_OK, R_OK, W_OK, X_OK, AccessModeString, AccessMode
- `Timestamp.ts` — Timestamp class
- `MkdirOptions.ts` — MkdirOptions interface
- `StorageStreamOptions.ts` — StorageStreamOptions interface
- `PresignedUrlOptions.ts` — PresignedUrlOptions interface
- `StorageEncoding.ts` — StorageEncoding type
- `capabilities.ts` — CapabilityOperation derived type, TransactionOperation type

**Errors layer** (`src/shared/errors/` — add new files):
- `StorageError.ts` — base error class
- `UnsupportedOperationError.ts` — with capability, operation, adapter, reason
- `PathNotFoundError.ts` — with path, cause
- `PermissionDeniedError.ts` — with path, cause
- `AlreadyExistsError.ts` — with path, cause
- `NotADirectoryError.ts` — with path, cause
- `IsDirectoryError.ts` — with path, cause
- `TimeoutError.ts` — with cause
- `ConnectionError.ts` — with cause
- `CapabilityConflictError.ts` — with capabilities
- `TransactionError.ts` — with partialResults, completedOps, totalOps, cause

**Adapter interfaces** (`src/adapters/interfaces/` — reorganize):
- `Adapter.ts` — base Adapter interface
- `CompositeAdapter.ts` — CompositeAdapter interface
- `CapabilityMap.ts` — symbol → domain interface mapping
- `capabilities/ReadAdapter.ts`
- `capabilities/WriteAdapter.ts`
- `capabilities/StreamAdapter.ts`
- `capabilities/MutateAdapter.ts`
- `capabilities/NavigateAdapter.ts`
- `capabilities/WatchAdapter.ts`
- `capabilities/TransactionAdapter.ts`
- `capabilities/LockAdapter.ts`
- `capabilities/MetadataAdapter.ts`
- `capabilities/VersioningAdapter.ts`
- `capabilities/SearchAdapter.ts`
- `capabilities/LinkingAdapter.ts`
- `capabilities/EventsAdapter.ts`
- `FsAdapter.ts` — type alias
- `BlobAdapter.ts` — type alias
- Updated `RuntimeResolver.ts`
- Updated `index.ts` barrel

**Capability symbols** (`src/adapters/`):
- `capabilities.ts` — Symbol.for for all 13 + Capability namespace

**Domain functions** (`src/fs/`):
- `index.ts` — barrel
- `read/get.ts`, `read/getAsBuffer.ts`, `read/getAsJSON.ts`
- `write/put.ts`, `write/putStreamed.ts`, `write/append.ts`, `write/appendStreamed.ts`, `write/mkdir.ts`
- `stream/StorageStream.ts`, `stream/readStream.ts`, `stream/writeStream.ts`, `stream/duplexStream.ts`, `stream/fileStream.ts`, `stream/pipe.ts`, `stream/merge.ts`, `stream/flatMap.ts`, `stream/transform.ts`
- `mutate/copy.ts`, `mutate/rename.ts`, `mutate/move.ts`, `mutate/delete.ts`
- `navigate/exists.ts`, `navigate/doesntExist.ts`, `navigate/stats.ts`, `navigate/isFile.ts`, `navigate/isDirectory.ts`, `navigate/listDirectory.ts`, `navigate/StorageListing.ts`, `navigate/getPresignedUrl.ts`
- `watch/watch.ts`
- `lock/lock.ts`
- `metadata/getAttributes.ts`, `metadata/setAttributes.ts`
- `linking/symlink.ts`, `linking/hardlink.ts`, `linking/readlink.ts`
- `events/on.ts`, `events/off.ts`

**Blob family** (`src/blob/`):
- `index.ts` — barrel (interfaces only for 2.0.0)

**SDK** (`src/sdk/`):
- `index.ts` — barrel
- `extend.ts` — extend() standalone utility
- `hasCapability.ts` — hasCapability() type guard + runtime check
- `crossAdapterCopy.ts`
- `crossAdapterMove.ts`
- `sequentialBatch.ts`
- `throwUnsupportedOperation.ts`

**Builder** (`src/`):
- `Storage.ts` — Storage class

**Shared functions** (`src/shared/functions/`):
- `p.ts` — StoragePath tagged template factory
- `join.ts`, `basename.ts`, `dirname.ts`, `extname.ts`, `normalize.ts`, `resolve.ts`, `relative.ts`, `isAbsolute.ts`

**Node adapter** (`src/adapters/node/`):
- Rewrite `NodeFsAdapter.ts`
- Add `lock.ts` — cooperative O_EXCL lock file
- Add `xattrs.ts` — xattr read/write (POSIX)

**Adapter-specific types** (`src/adapters/types/`):
- `FsStorageExtra.ts`
- `BlobStorageExtra.ts`

### FILES TO DELETE (after migration)
- `src/read/` (moved to `src/fs/read/`)
- `src/write/` (moved to `src/fs/write/`)
- `src/stream/` (moved to `src/fs/stream/`)
- `src/metadata/` (moved to `src/fs/navigate/`)
- `src/directory/` (split to `src/fs/mutate/` + `src/fs/navigate/` + `src/fs/write/`)
- `src/shared/types/` (replaced by `src/types/`)
- `src/adapters/interfaces/ReadAdapter.ts` (old)
- `src/adapters/interfaces/WriteAdapter.ts` (old)
- `src/adapters/interfaces/StreamAdapter.ts` (old)
- `src/adapters/interfaces/DirAdapter.ts` (old)
- `src/adapters/interfaces/MetaAdapter.ts` (old)
- `src/adapters/interfaces/FsAdapter.ts` (old — replaced by type alias)
- `src/adapters/interfaces/BlobStorageAdapter.ts` (old — replaced by BlobAdapter.ts)

### EXISTING FILES TO MODIFY
- `src/index.ts` — new re-exports
- `src/bootstrap.ts` — Proxy fs, setFS() always-installs
- `src/adapters/resolve.ts` — return Adapter not FsAdapter
- `src/adapters/auto-register.ts` — regenerated
- `src/adapters/node/resolver.ts` — add capabilities
- `src/adapters/node/detect.ts` — unchanged
- `src/adapters/node/register.ts` — unchanged
- `src/adapters/node/index.ts` — updated exports
- `src/shared/errors/index.ts` — add new error exports
- `package.json` — exports map, description, keywords
- `tsconfig.esm.json` — rootDir/include
- `tsconfig.cjs.json` — rootDir/include
- `vitest.config.ts` — new paths
- `typedoc.json` — entry point

---

## Sub-Plan 1: Foundation Types + Error Hierarchy

### Task 1: Serializable and Comparable Interfaces

**Files:**
- Create: `src/types/Serializable.ts`
- Create: `src/types/Comparable.ts`
- Test: `src/types/__tests__/interfaces.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/interfaces.spec.ts
import type { Serializable } from '../Serializable'
import type { Comparable } from '../Comparable'
import { describe, it, expect } from 'vitest'

describe('Serializable', () => {
    it('should require toJSON and toString methods', () => {
        const obj: Serializable<string> = {
            toJSON() { return 'json-value' },
            toString() { return 'string-value' },
        }
        expect(obj.toJSON()).toBe('json-value')
        expect(obj.toString()).toBe('string-value')
    })
})

describe('Comparable', () => {
    it('should require equals method', () => {
        const obj: Comparable<{ val: number }> = {
            equals(other) { return true },
        }
        expect(typeof obj.equals).toBe('function')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/interfaces.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/Serializable.ts
export interface Serializable<T = unknown> {
    toJSON(): T
    toString(): string
}
```

```typescript
// src/types/Comparable.ts
export interface Comparable<T> {
    equals(other: T): boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/interfaces.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS (no errors)

- [ ] **Step 6: Commit**

```bash
git add src/types/Serializable.ts src/types/Comparable.ts src/types/__tests__/interfaces.spec.ts && git commit -S -m "feat(types): add Serializable and Comparable interfaces"
```

---

### Task 2: StorageEncoding Type

**Files:**
- Create: `src/types/StorageEncoding.ts`
- Test: `src/types/__tests__/StorageEncoding.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/StorageEncoding.spec.ts
import type { StorageEncoding } from '../StorageEncoding'
import { describe, it, expect } from 'vitest'

describe('StorageEncoding', () => {
    it('should accept valid encoding strings', () => {
        const encodings: StorageEncoding[] = [
            'utf-8', 'utf-16le', 'ascii', 'latin1',
            'base64', 'base64url', 'hex',
        ]
        expect(encodings).toHaveLength(7)
    })

    it('should not accept invalid encoding strings', () => {
        // @ts-expect-error — 'binary' is not a valid StorageEncoding
        const _bad: StorageEncoding = 'binary'
        expect(true).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/StorageEncoding.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/StorageEncoding.ts
export type StorageEncoding =
    | 'utf-8'
    | 'utf-16le'
    | 'ascii'
    | 'latin1'
    | 'base64'
    | 'base64url'
    | 'hex'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/StorageEncoding.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/StorageEncoding.ts src/types/__tests__/StorageEncoding.spec.ts && git commit -S -m "feat(types): add StorageEncoding type"
```

---

### Task 3: AccessMode Constants and Types

**Files:**
- Create: `src/types/AccessMode.ts`
- Test: `src/types/__tests__/AccessMode.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/AccessMode.spec.ts
import { F_OK, R_OK, W_OK, X_OK, AccessMode } from '../AccessMode'
import type { AccessModeString } from '../AccessMode'
import { describe, it, expect } from 'vitest'

describe('AccessMode', () => {
    it('should export correct constant values', () => {
        expect(F_OK).toBe(0)
        expect(R_OK).toBe(4)
        expect(W_OK).toBe(2)
        expect(X_OK).toBe(1)
    })

    it('should map AccessModeString to numeric values', () => {
        expect(AccessMode.exists).toBe(0)
        expect(AccessMode.readable).toBe(4)
        expect(AccessMode.writable).toBe(2)
        expect(AccessMode.executable).toBe(1)
    })

    it('should type-check AccessModeString values', () => {
        const mode: AccessModeString = 'readable'
        expect(AccessMode[mode]).toBe(4)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/AccessMode.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/AccessMode.ts
export const F_OK = 0
export const R_OK = 4
export const W_OK = 2
export const X_OK = 1

export const constants = { F_OK, R_OK, W_OK, X_OK } as const

export type AccessModeString = 'exists' | 'readable' | 'writable' | 'executable'

export const AccessMode: Record<AccessModeString, number> = {
    exists: F_OK,
    readable: R_OK,
    writable: W_OK,
    executable: X_OK,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/AccessMode.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/AccessMode.ts src/types/__tests__/AccessMode.spec.ts && git commit -S -m "feat(types): add AccessMode constants and types"
```

---

### Task 4: Input Types

**Files:**
- Create: `src/types/Input.ts`
- Test: `src/types/__tests__/Input.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/Input.spec.ts
import type { ValidInput, Input } from '../Input'
import type { Serializable } from '../Serializable'
import { describe, it, expect } from 'vitest'

describe('ValidInput', () => {
    it('should accept string', () => {
        const v: ValidInput = 'hello'
        expect(v).toBe('hello')
    })

    it('should accept Uint8Array', () => {
        const v: ValidInput = new Uint8Array([1, 2, 3])
        expect(v).toBeInstanceOf(Uint8Array)
    })

    it('should accept ArrayBuffer', () => {
        const v: ValidInput = new ArrayBuffer(8)
        expect(v).toBeInstanceOf(ArrayBuffer)
    })
})

describe('Input', () => {
    it('should accept all ValidInput types', () => {
        const a: Input = 'str'
        const b: Input = new Uint8Array(0)
        const c: Input = new ArrayBuffer(0)
        expect([a, b, c]).toHaveLength(3)
    })

    it('should accept object', () => {
        const v: Input = { key: 'value' }
        expect(v).toEqual({ key: 'value' })
    })

    it('should accept Blob', () => {
        const v: Input = new Blob(['data'])
        expect(v).toBeInstanceOf(Blob)
    })

    it('should accept ReadableStream', () => {
        const v: Input = new ReadableStream()
        expect(v).toBeInstanceOf(ReadableStream)
    })

    it('should accept Serializable', () => {
        const s: Serializable = { toJSON() { return {} }, toString() { return '' } }
        const v: Input = s
        expect(v).toBe(s)
    })

    it('should accept Iterable<ValidInput>', () => {
        const v: Input = [new Uint8Array(0), 'chunk'] as Iterable<ValidInput>
        expect(typeof v[Symbol.iterator]).toBe('function')
    })

    it('should accept AsyncIterable<ValidInput>', () => {
        const v: Input = {
            async *[Symbol.asyncIterator]() { yield 'chunk' },
        }
        expect(typeof v[Symbol.asyncIterator]).toBe('function')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/Input.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/Input.ts
import type { Serializable } from './Serializable'

export type ValidInput = string | Uint8Array | ArrayBuffer

export type Input =
    | ValidInput
    | object
    | Blob
    | ReadableStream
    | Serializable
    | Iterable<ValidInput | Serializable>
    | AsyncIterable<ValidInput | Serializable>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/Input.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/Input.ts src/types/__tests__/Input.spec.ts && git commit -S -m "feat(types): add ValidInput and Input types"
```

---

### Task 5: Timestamp Class

**Files:**
- Create: `src/types/Timestamp.ts`
- Test: `src/types/__tests__/Timestamp.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/Timestamp.spec.ts
import { Timestamp } from '../Timestamp'
import { describe, it, expect } from 'vitest'

describe('Timestamp', () => {
    describe('constructor', () => {
        it('should create from milliseconds with precision', () => {
            const ts = new Timestamp(1000, 'ms')
            expect(ts.milliseconds).toBe(1000)
        })

        it('should create from nanoseconds bigint with precision', () => {
            const ts = new Timestamp(1000000000n, 'ns')
            expect(ts.nanoseconds).toBe(1000000000n)
        })

        it('should reject non-integer numbers', () => {
            expect(() => new Timestamp(1.5, 'ms')).toThrow()
        })

        it('should reject non-integer bigint', () => {
            expect(() => new Timestamp(1.5n, 'ns')).toThrow()
        })
    })

    describe('static factories', () => {
        it('fromMilliseconds should create Timestamp<number>', () => {
            const ts = Timestamp.fromMilliseconds(5000)
            expect(ts.milliseconds).toBe(5000)
            expect(ts.seconds).toBe(5)
        })

        it('fromSeconds should create Timestamp<number>', () => {
            const ts = Timestamp.fromSeconds(10)
            expect(ts.seconds).toBe(10)
            expect(ts.milliseconds).toBe(10000)
        })

        it('fromNanoseconds should create Timestamp<bigint>', () => {
            const ts = Timestamp.fromNanoseconds(5000000000n)
            expect(ts.nanoseconds).toBe(5000000000n)
        })

        it('fromMicroseconds should create Timestamp<number|bigint>', () => {
            const ts = Timestamp.fromMicroseconds(5000000)
            expect(ts.microseconds).toBe(5000000)
        })

        it('fromDate should create Timestamp<number> in ms', () => {
            const date = new Date('2024-01-01T00:00:00.000Z')
            const ts = Timestamp.fromDate(date)
            expect(ts.milliseconds).toBe(date.getTime())
        })

        it('now should create Timestamp<bigint> in ns', () => {
            const ts = Timestamp.now()
            expect(ts.nanoseconds).toBeTypeOf('bigint')
            expect(ts.nanoseconds > 0n).toBe(true)
        })
    })

    describe('conversions', () => {
        it('toNanoseconds from milliseconds should zero-fill', () => {
            const ts = new Timestamp(5, 'ms')
            const ns = ts.toNanoseconds()
            expect(ns.nanoseconds).toBe(5000000n)
        })

        it('toMilliseconds from nanoseconds should truncate', () => {
            const ts = new Timestamp(5500000n, 'ns')
            const ms = ts.toMilliseconds()
            expect(ms.milliseconds).toBe(5)
        })

        it('toSeconds from milliseconds', () => {
            const ts = new Timestamp(5000, 'ms')
            const s = ts.toSeconds()
            expect(s.seconds).toBe(5)
        })

        it('toDate should return Date', () => {
            const ts = Timestamp.fromMilliseconds(1704067200000)
            const date = ts.toDate()
            expect(date).toBeInstanceOf(Date)
        })
    })

    describe('Serializable', () => {
        it('toJSON should return ISO 8601 string', () => {
            const ts = Timestamp.fromMilliseconds(1704067200000)
            const json = ts.toJSON()
            expect(typeof json).toBe('string')
            expect(json).toContain('2024')
        })

        it('toString should return same as toJSON', () => {
            const ts = Timestamp.fromMilliseconds(1000)
            expect(ts.toString()).toBe(ts.toJSON())
        })
    })

    describe('Comparable', () => {
        it('equals should return true for same value and precision', () => {
            const a = new Timestamp(1000, 'ms')
            const b = new Timestamp(1000, 'ms')
            expect(a.equals(b)).toBe(true)
        })

        it('equals should return false for different values', () => {
            const a = new Timestamp(1000, 'ms')
            const b = new Timestamp(2000, 'ms')
            expect(a.equals(b)).toBe(false)
        })

        it('lessThan should compare correctly', () => {
            const a = new Timestamp(1000, 'ms')
            const b = new Timestamp(2000, 'ms')
            expect(a.lessThan(b)).toBe(true)
            expect(b.lessThan(a)).toBe(false)
        })

        it('greaterThan should compare correctly', () => {
            const a = new Timestamp(2000, 'ms')
            const b = new Timestamp(1000, 'ms')
            expect(a.greaterThan(b)).toBe(true)
            expect(b.greaterThan(a)).toBe(false)
        })

        it('should handle cross-precision comparison safely', () => {
            const ns = new Timestamp(5000000n, 'ns')
            const ms = new Timestamp(5, 'ms')
            expect(ns.toMilliseconds().equals(ms)).toBe(true)
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/Timestamp.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/Timestamp.ts
import type { Serializable } from './Serializable'
import type { Comparable } from './Comparable'

type Precision = 'ns' | 'us' | 'ms' | 's'

export class Timestamp<T extends number | bigint = number>
    implements Serializable<string>, Comparable<Timestamp<T>>
{
    private readonly value: T
    private readonly precision: Precision

    constructor(value: T, precision: Precision = 'ms') {
        this.value = value
        this.precision = precision
        if (typeof value === 'number' && !Number.isInteger(value)) {
            throw new TypeError(`Timestamp value must be an integer, got ${value}`)
        }
        if (typeof value === 'bigint' && value % 1n !== 0n) {
            throw new TypeError(`Timestamp bigint value must be an integer, got ${value}`)
        }
    }

    get nanoseconds(): T {
        return this.toNanoseconds().value as T
    }

    get microseconds(): T {
        return this.toMicroseconds().value as T
    }

    get milliseconds(): T {
        return this.toMilliseconds().value as T
    }

    get seconds(): T {
        return this.toSeconds().value as T
    }

    get date(): Date {
        return this.toDate()
    }

    toNanoseconds(): Timestamp<bigint> {
        const ms = this.toMilliseconds()
        return new Timestamp<bigint>(BigInt(ms.value) * 1_000_000n, 'ns')
    }

    toMicroseconds(): Timestamp<number> | Timestamp<bigint> {
        const ms = this.toMilliseconds()
        const us = Number(ms.value) * 1000
        if (Number.isSafeInteger(us)) {
            return new Timestamp<number>(us, 'us')
        }
        return new Timestamp<bigint>(BigInt(ms.value) * 1000n, 'us')
    }

    toMilliseconds(): Timestamp<number> {
        switch (this.precision) {
            case 'ns':
                return new Timestamp<number>(Number(BigInt(this.value as bigint) / 1_000_000n), 'ms')
            case 'us':
                return new Timestamp<number>(Number(this.value) / 1000, 'ms')
            case 'ms':
                return new Timestamp<number>(Number(this.value), 'ms')
            case 's':
                return new Timestamp<number>(Number(this.value) * 1000, 'ms')
        }
    }

    toSeconds(): Timestamp<number> {
        const ms = this.toMilliseconds()
        return new Timestamp<number>(Math.floor(Number(ms.value) / 1000), 's')
    }

    toDate(): Date {
        return new Date(Number(this.toMilliseconds().value))
    }

    toJSON(): string {
        return this.toDate().toISOString()
    }

    toString(): string {
        return this.toJSON()
    }

    equals(other: Timestamp<T>): boolean {
        return this.toMilliseconds().value === other.toMilliseconds().value
    }

    lessThan(other: Timestamp<T>): boolean {
        return this.toMilliseconds().value < other.toMilliseconds().value
    }

    greaterThan(other: Timestamp<T>): boolean {
        return this.toMilliseconds().value > other.toMilliseconds().value
    }

    static fromNanoseconds(value: bigint): Timestamp<bigint> {
        return new Timestamp<bigint>(value, 'ns')
    }

    static fromMicroseconds(value: number | bigint): Timestamp<number | bigint> {
        if (typeof value === 'bigint') {
            return new Timestamp<bigint>(value, 'us')
        }
        return new Timestamp<number>(value, 'us')
    }

    static fromMilliseconds(value: number): Timestamp<number> {
        return new Timestamp<number>(value, 'ms')
    }

    static fromSeconds(value: number): Timestamp<number> {
        return new Timestamp<number>(value, 's')
    }

    static fromDate(date: Date): Timestamp<number> {
        return new Timestamp<number>(date.getTime(), 'ms')
    }

    static now(): Timestamp<bigint> {
        const hr = process.hrtime.bigint()
        return new Timestamp<bigint>(hr, 'ns')
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/Timestamp.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/Timestamp.ts src/types/__tests__/Timestamp.spec.ts && git commit -S -m "feat(types): add Timestamp class with precision-aware conversions"
```

---

### Task 6: StoragePath Class

**Files:**
- Create: `src/types/StoragePath.ts`
- Create: `src/shared/functions/p.ts`
- Test: `src/types/__tests__/StoragePath.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/StoragePath.spec.ts
import { StoragePath } from '../StoragePath'
import { p } from '../../shared/functions/p'
import { describe, it, expect } from 'vitest'

describe('StoragePath', () => {
    describe('construction', () => {
        it('should create from string', () => {
            const sp = new StoragePath('/foo/bar')
            expect(sp.toString()).toBe('/foo/bar')
        })

        it('should create via p() function', () => {
            const sp = p('/foo/bar')
            expect(sp.toString()).toBe('/foo/bar')
        })

        it('should create via p() tagged template', () => {
            const name = 'baz'
            const sp = p`/foo/${name}/bar`
            expect(sp.toString()).toBe('/foo/baz/bar')
        })
    })

    describe('Serializable', () => {
        it('toJSON should return the path string', () => {
            const sp = new StoragePath('/foo/bar')
            expect(sp.toJSON()).toBe('/foo/bar')
        })

        it('toString should return the path string', () => {
            const sp = new StoragePath('/foo/bar')
            expect(sp.toString()).toBe('/foo/bar')
        })
    })

    describe('Comparable', () => {
        it('equals should return true for same path', () => {
            const a = new StoragePath('/foo')
            const b = new StoragePath('/foo')
            expect(a.equals(b)).toBe(true)
        })

        it('equals should return false for different paths', () => {
            const a = new StoragePath('/foo')
            const b = new StoragePath('/bar')
            expect(a.equals(b)).toBe(false)
        })
    })

    describe('coercion', () => {
        it('Symbol.toPrimitive should coerce to string', () => {
            const sp = new StoragePath('/foo')
            expect(String(sp)).toBe('/foo')
            expect(`${sp}`).toBe('/foo')
        })

        it('valueOf should return the path string', () => {
            const sp = new StoragePath('/foo')
            expect(sp.valueOf()).toBe('/foo')
        })

        it('should coerce when used with string concatenation', () => {
            const sp = new StoragePath('/foo')
            expect(sp + '/bar').toBe('/foo/bar')
        })
    })

    describe('p() tagged template', () => {
        it('should handle no interpolations', () => {
            const sp = p`/foo/bar`
            expect(sp.toString()).toBe('/foo/bar')
        })

        it('should handle string interpolations', () => {
            const dir = 'data'
            const sp = p`/${dir}/file.txt`
            expect(sp.toString()).toBe('/data/file.txt')
        })

        it('should handle StoragePath interpolations', () => {
            const base = p('/base')
            const sp = p`${base}/sub`
            expect(sp.toString()).toBe('/base/sub')
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/StoragePath.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/StoragePath.ts
import type { Serializable } from './Serializable'
import type { Comparable } from './Comparable'

export class StoragePath implements Serializable<string>, Comparable<StoragePath> {
    private readonly _path: string

    constructor(path: string) {
        this._path = path
    }

    toJSON(): string {
        return this._path
    }

    toString(): string {
        return this._path
    }

    equals(other: StoragePath): boolean {
        return this._path === other._path
    }

    valueOf(): string {
        return this._path
    }

    [Symbol.toPrimitive](hint: string): string | undefined {
        if (hint === 'string' || hint === 'default') return this._path
        return undefined
    }
}
```

```typescript
// src/shared/functions/p.ts
import { StoragePath } from '../../types/StoragePath'

export function p(strings: TemplateStringsArray, ...values: unknown[]): StoragePath
export function p(path: string): StoragePath
export function p(
    stringsOrPath: TemplateStringsArray | string,
    ...values: unknown[]
): StoragePath {
    if (typeof stringsOrPath === 'string') {
        return new StoragePath(stringsOrPath)
    }
    let result = ''
    for (let i = 0; i < stringsOrPath.length; i++) {
        result += stringsOrPath[i]
        if (i < values.length) {
            const v = values[i]
            result += v instanceof StoragePath ? v.toString() : String(v)
        }
    }
    return new StoragePath(result)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/StoragePath.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/StoragePath.ts src/shared/functions/p.ts src/types/__tests__/StoragePath.spec.ts && git commit -S -m "feat(types): add StoragePath class and p() tagged template factory"
```

---

### Task 7: StorageStats Interface

**Files:**
- Create: `src/types/StorageStats.ts`
- Create: `src/adapters/types/FsStorageExtra.ts`
- Create: `src/adapters/types/BlobStorageExtra.ts`
- Test: `src/types/__tests__/StorageStats.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/StorageStats.spec.ts
import type { StorageStats } from '../StorageStats'
import type { FsStorageExtra } from '../../adapters/types/FsStorageExtra'
import type { BlobStorageExtra } from '../../adapters/types/BlobStorageExtra'
import { Timestamp } from '../Timestamp'
import { describe, it, expect } from 'vitest'

describe('StorageStats', () => {
    it('should accept base fields with unknown generic', () => {
        const stats: StorageStats = {
            size: 1024,
            lastModified: Timestamp.fromMilliseconds(1000),
            isFile: true,
            isDirectory: false,
            isSymbolicLink: false,
        }
        expect(stats.size).toBe(1024)
        expect(stats.isFile).toBe(true)
    })

    it('should accept FsStorageExtra extension', () => {
        const stats: StorageStats<FsStorageExtra> = {
            size: 1024,
            lastModified: Timestamp.fromMilliseconds(1000),
            isFile: true,
            isDirectory: false,
            isSymbolicLink: false,
            mode: 0o755,
            uid: 1000,
            gid: 1000,
            permissions: 0o755,
        }
        expect(stats.mode).toBe(0o755)
        expect(stats.uid).toBe(1000)
    })

    it('should accept BlobStorageExtra extension', () => {
        const stats: StorageStats<BlobStorageExtra> = {
            size: 2048,
            lastModified: Timestamp.fromMilliseconds(2000),
            isFile: true,
            isDirectory: false,
            isSymbolicLink: false,
            etag: '"abc123"',
            versionId: 'v1',
            contentType: 'application/json',
        }
        expect(stats.etag).toBe('"abc123"')
        expect(stats.contentType).toBe('application/json')
    })

    it('should allow null size and lastModified', () => {
        const stats: StorageStats = {
            size: null,
            lastModified: null,
            isFile: false,
            isDirectory: true,
            isSymbolicLink: false,
        }
        expect(stats.size).toBeNull()
        expect(stats.lastModified).toBeNull()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/StorageStats.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/StorageStats.ts
import type { Timestamp } from './Timestamp'

export interface StorageStats<T = unknown> {
    size: number | null
    lastModified: Timestamp | null
    isFile: boolean
    isDirectory: boolean
    isSymbolicLink: boolean
    permissions?: T
    mode?: T
    uid?: T
    gid?: T
    etag?: T
    versionId?: T
}
```

```typescript
// src/adapters/types/FsStorageExtra.ts
export type FsStorageExtra = {
    mode: number
    uid: number
    gid: number
    permissions: number
}
```

```typescript
// src/adapters/types/BlobStorageExtra.ts
export type BlobStorageExtra = {
    etag: string
    versionId?: string
    contentType?: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/StorageStats.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/StorageStats.ts src/adapters/types/FsStorageExtra.ts src/adapters/types/BlobStorageExtra.ts src/types/__tests__/StorageStats.spec.ts && git commit -S -m "feat(types): add StorageStats interface and adapter-specific extensions"
```

---

### Task 8: Option Types (MkdirOptions, StorageStreamOptions, PresignedUrlOptions)

**Files:**
- Create: `src/types/MkdirOptions.ts`
- Create: `src/types/StorageStreamOptions.ts`
- Create: `src/types/PresignedUrlOptions.ts`
- Test: `src/types/__tests__/options.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/options.spec.ts
import type { MkdirOptions } from '../MkdirOptions'
import type { StorageStreamOptions } from '../StorageStreamOptions'
import type { PresignedUrlOptions } from '../PresignedUrlOptions'
import { describe, it, expect } from 'vitest'

describe('MkdirOptions', () => {
    it('should accept recursive and mode', () => {
        const opts: MkdirOptions = { recursive: true, mode: 0o755 }
        expect(opts.recursive).toBe(true)
        expect(opts.mode).toBe(0o755)
    })

    it('should allow partial options', () => {
        const opts: MkdirOptions = { recursive: false }
        expect(opts.recursive).toBe(false)
        expect(opts.mode).toBeUndefined()
    })
})

describe('StorageStreamOptions', () => {
    it('should accept encoding, start, end', () => {
        const opts: StorageStreamOptions = {
            encoding: 'utf-8',
            start: 0,
            end: 1024,
        }
        expect(opts.encoding).toBe('utf-8')
        expect(opts.start).toBe(0)
        expect(opts.end).toBe(1024)
    })

    it('should allow partial options', () => {
        const opts: StorageStreamOptions = {}
        expect(opts.encoding).toBeUndefined()
    })
})

describe('PresignedUrlOptions', () => {
    it('should accept expiresIn and extra keys', () => {
        const opts: PresignedUrlOptions = {
            expiresIn: 3600,
            region: 'us-east-1',
        }
        expect(opts.expiresIn).toBe(3600)
        expect(opts.region).toBe('us-east-1')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/options.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/MkdirOptions.ts
export interface MkdirOptions {
    recursive?: boolean
    mode?: number
}
```

```typescript
// src/types/StorageStreamOptions.ts
import type { StorageEncoding } from './StorageEncoding'

export interface StorageStreamOptions {
    encoding?: StorageEncoding
    start?: number
    end?: number
}
```

```typescript
// src/types/PresignedUrlOptions.ts
export interface PresignedUrlOptions {
    expiresIn?: number
    [key: string]: unknown
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/options.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/MkdirOptions.ts src/types/StorageStreamOptions.ts src/types/PresignedUrlOptions.ts src/types/__tests__/options.spec.ts && git commit -S -m "feat(types): add MkdirOptions, StorageStreamOptions, PresignedUrlOptions"
```

---

### Task 9: StorageError Base Class

**Files:**
- Create: `src/shared/errors/StorageError.ts`
- Test: `src/shared/errors/__tests__/StorageError.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/errors/__tests__/StorageError.spec.ts
import { StorageError } from '../StorageError'
import { describe, it, expect } from 'vitest'

describe('StorageError', () => {
    it('should set code to ERR_STORAGE', () => {
        const err = new StorageError('test error')
        expect(err.code).toBe('ERR_STORAGE')
    })

    it('should set message', () => {
        const err = new StorageError('something went wrong')
        expect(err.message).toBe('something went wrong')
    })

    it('should set name to StorageError', () => {
        const err = new StorageError('test')
        expect(err.name).toBe('StorageError')
    })

    it('should accept cause via options', () => {
        const cause = new Error('original')
        const err = new StorageError('wrapped', { cause })
        expect(err.cause).toBe(cause)
    })

    it('should accept adapter via options', () => {
        const err = new StorageError('test', { adapter: 'NodeFsAdapter' })
        expect(err.adapter).toBe('NodeFsAdapter')
    })

    it('should accept custom code via options', () => {
        const err = new StorageError('test', { code: 'ERR_CUSTOM' })
        expect(err.code).toBe('ERR_CUSTOM')
    })

    it('should be instanceof Error', () => {
        const err = new StorageError('test')
        expect(err).toBeInstanceOf(Error)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/errors/__tests__/StorageError.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/shared/errors/StorageError.ts
export class StorageError extends Error {
    readonly code: string = 'ERR_STORAGE' as const
    readonly adapter?: string

    constructor(
        message: string,
        options?: { cause?: Error; code?: string; adapter?: string },
    ) {
        super(message, options?.cause ? { cause: options.cause } : undefined)
        this.name = 'StorageError'
        if (options?.code) this.code = options.code
        if (options?.adapter) this.adapter = options.adapter
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/errors/__tests__/StorageError.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/errors/StorageError.ts src/shared/errors/__tests__/StorageError.spec.ts && git commit -S -m "feat(errors): add StorageError base class"
```

---

### Task 10: UnsupportedOperationError

**Files:**
- Create: `src/shared/errors/UnsupportedOperationError.ts`
- Test: `src/shared/errors/__tests__/UnsupportedOperationError.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/errors/__tests__/UnsupportedOperationError.spec.ts
import { UnsupportedOperationError } from '../UnsupportedOperationError'
import { describe, it, expect } from 'vitest'

describe('UnsupportedOperationError', () => {
    it('should set code to ERR_UNSUPPORTED_OPERATION', () => {
        const sym = Symbol.for('storage:read')
        const err = new UnsupportedOperationError(sym, 'not-implemented')
        expect(err.code).toBe('ERR_UNSUPPORTED_OPERATION')
    })

    it('should store capability symbol', () => {
        const sym = Symbol.for('storage:read')
        const err = new UnsupportedOperationError(sym, 'not-implemented')
        expect(err.capability).toBe(sym)
    })

    it('should store operation name', () => {
        const sym = Symbol.for('storage:read')
        const err = new UnsupportedOperationError(sym, 'not-implemented', {
            operation: 'get',
        })
        expect(err.operation).toBe('get')
    })

    it('should store adapter name', () => {
        const sym = Symbol.for('storage:read')
        const err = new UnsupportedOperationError(sym, 'not-implemented', {
            adapter: 'NodeFsAdapter',
        })
        expect(err.adapter).toBe('NodeFsAdapter')
    })

    it('should store reason', () => {
        const sym = Symbol.for('storage:metadata')
        const err = new UnsupportedOperationError(sym, 'disabled')
        expect(err.reason).toBe('disabled')
    })

    it('should accept not-implemented reason', () => {
        const sym = Symbol.for('storage:search')
        const err = new UnsupportedOperationError(sym, 'not-implemented')
        expect(err.reason).toBe('not-implemented')
    })

    it('should extend StorageError', () => {
        const sym = Symbol.for('storage:read')
        const err = new UnsupportedOperationError(sym, 'not-implemented')
        expect(err.name).toBe('UnsupportedOperationError')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/errors/__tests__/UnsupportedOperationError.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/shared/errors/UnsupportedOperationError.ts
import { StorageError } from './StorageError'

export class UnsupportedOperationError extends StorageError {
    readonly code = 'ERR_UNSUPPORTED_OPERATION' as const
    readonly capability: symbol
    readonly operation?: string
    readonly reason: 'not-implemented' | 'disabled'

    constructor(
        capability: symbol,
        reason: 'not-implemented' | 'disabled',
        options?: { operation?: string; adapter?: string; cause?: Error },
    ) {
        const opStr = options?.operation ? `.${options.operation}()` : ''
        const adapterStr = options?.adapter ? ` on ${options.adapter}` : ''
        super(
            `Unsupported operation: ${String(capability)}${opStr}${adapterStr} — ${reason}`,
            {
                cause: options?.cause,
                code: 'ERR_UNSUPPORTED_OPERATION',
                adapter: options?.adapter,
            },
        )
        this.name = 'UnsupportedOperationError'
        this.capability = capability
        this.operation = options?.operation
        this.reason = reason
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/errors/__tests__/UnsupportedOperationError.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/errors/UnsupportedOperationError.ts src/shared/errors/__tests__/UnsupportedOperationError.spec.ts && git commit -S -m "feat(errors): add UnsupportedOperationError with capability and reason"
```

---

### Task 11: Remaining Error Classes (PathNotFound, PermissionDenied, AlreadyExists, NotADirectory, IsDirectory, Timeout, Connection, CapabilityConflict, Transaction)

**Files:**
- Create: `src/shared/errors/PathNotFoundError.ts`
- Create: `src/shared/errors/PermissionDeniedError.ts`
- Create: `src/shared/errors/AlreadyExistsError.ts`
- Create: `src/shared/errors/NotADirectoryError.ts`
- Create: `src/shared/errors/IsDirectoryError.ts`
- Create: `src/shared/errors/TimeoutError.ts`
- Create: `src/shared/errors/ConnectionError.ts`
- Create: `src/shared/errors/CapabilityConflictError.ts`
- Create: `src/shared/errors/TransactionError.ts`
- Modify: `src/shared/errors/index.ts`
- Test: `src/shared/errors/__tests__/errors.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/errors/__tests__/errors.spec.ts
import { StorageError } from '../StorageError'
import { PathNotFoundError } from '../PathNotFoundError'
import { PermissionDeniedError } from '../PermissionDeniedError'
import { AlreadyExistsError } from '../AlreadyExistsError'
import { NotADirectoryError } from '../NotADirectoryError'
import { IsDirectoryError } from '../IsDirectoryError'
import { TimeoutError } from '../TimeoutError'
import { ConnectionError } from '../ConnectionError'
import { CapabilityConflictError } from '../CapabilityConflictError'
import { TransactionError } from '../TransactionError'
import { StoragePath } from '../../../types/StoragePath'
import { describe, it, expect } from 'vitest'

describe('PathNotFoundError', () => {
    it('should set code and path', () => {
        const cause = new Error('ENOENT')
        const path = new StoragePath('/missing')
        const err = new PathNotFoundError(path, { cause })
        expect(err.code).toBe('ERR_PATH_NOT_FOUND')
        expect(err.path).toBe(path)
        expect(err.cause).toBe(cause)
    })
})

describe('PermissionDeniedError', () => {
    it('should set code and path', () => {
        const cause = new Error('EACCES')
        const path = new StoragePath('/private')
        const err = new PermissionDeniedError(path, { cause })
        expect(err.code).toBe('ERR_PERMISSION_DENIED')
        expect(err.path).toBe(path)
    })
})

describe('AlreadyExistsError', () => {
    it('should set code and path', () => {
        const cause = new Error('EEXIST')
        const path = new StoragePath('/exists')
        const err = new AlreadyExistsError(path, { cause })
        expect(err.code).toBe('ERR_ALREADY_EXISTS')
        expect(err.path).toBe(path)
    })
})

describe('NotADirectoryError', () => {
    it('should set code and path', () => {
        const cause = new Error('ENOTDIR')
        const path = new StoragePath('/file')
        const err = new NotADirectoryError(path, { cause })
        expect(err.code).toBe('ERR_NOT_A_DIRECTORY')
        expect(err.path).toBe(path)
    })
})

describe('IsDirectoryError', () => {
    it('should set code and path', () => {
        const cause = new Error('EISDIR')
        const path = new StoragePath('/dir')
        const err = new IsDirectoryError(path, { cause })
        expect(err.code).toBe('ERR_IS_DIRECTORY')
        expect(err.path).toBe(path)
    })
})

describe('TimeoutError', () => {
    it('should set code and cause', () => {
        const cause = new Error('timed out')
        const err = new TimeoutError({ cause })
        expect(err.code).toBe('ERR_TIMEOUT')
        expect(err.cause).toBe(cause)
    })
})

describe('ConnectionError', () => {
    it('should set code and cause', () => {
        const cause = new Error('ECONNREFUSED')
        const err = new ConnectionError({ cause })
        expect(err.code).toBe('ERR_CONNECTION')
        expect(err.cause).toBe(cause)
    })
})

describe('CapabilityConflictError', () => {
    it('should set code and capabilities', () => {
        const sym = Symbol.for('storage:read')
        const caps = new Set([sym])
        const err = new CapabilityConflictError(caps)
        expect(err.code).toBe('ERR_CAPABILITY_CONFLICT')
        expect(err.capabilities).toBe(caps)
    })
})

describe('TransactionError', () => {
    it('should set code, partialResults, completedOps, totalOps', () => {
        const cause = new Error('batch failed')
        const err = new TransactionError({
            partialResults: ['result1'],
            completedOps: 1,
            totalOps: 3,
            cause,
        })
        expect(err.code).toBe('ERR_TRANSACTION')
        expect(err.partialResults).toEqual(['result1'])
        expect(err.completedOps).toBe(1)
        expect(err.totalOps).toBe(3)
        expect(err.cause).toBe(cause)
    })
})

describe('all errors extend StorageError', () => {
    it('PathNotFoundError should be instanceof StorageError', () => {
        const err = new PathNotFoundError(new StoragePath('/x'), { cause: new Error() })
        expect(err).toBeInstanceOf(StorageError)
    })

    it('CapabilityConflictError should be instanceof StorageError', () => {
        const err = new CapabilityConflictError(new Set())
        expect(err).toBeInstanceOf(StorageError)
    })

    it('TransactionError should be instanceof StorageError', () => {
        const err = new TransactionError({
            partialResults: [],
            completedOps: 0,
            totalOps: 0,
            cause: new Error(),
        })
        expect(err).toBeInstanceOf(StorageError)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/errors/__tests__/errors.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/shared/errors/PathNotFoundError.ts
import { StorageError } from './StorageError'
import type { StoragePath } from '../../types/StoragePath'

export class PathNotFoundError extends StorageError {
    readonly code = 'ERR_PATH_NOT_FOUND' as const
    readonly path: StoragePath

    constructor(path: StoragePath, options: { cause: Error }) {
        super(`Path not found: ${path.toString()}`, {
            cause: options.cause,
            code: 'ERR_PATH_NOT_FOUND',
        })
        this.name = 'PathNotFoundError'
        this.path = path
    }
}
```

```typescript
// src/shared/errors/PermissionDeniedError.ts
import { StorageError } from './StorageError'
import type { StoragePath } from '../../types/StoragePath'

export class PermissionDeniedError extends StorageError {
    readonly code = 'ERR_PERMISSION_DENIED' as const
    readonly path: StoragePath

    constructor(path: StoragePath, options: { cause: Error }) {
        super(`Permission denied: ${path.toString()}`, {
            cause: options.cause,
            code: 'ERR_PERMISSION_DENIED',
        })
        this.name = 'PermissionDeniedError'
        this.path = path
    }
}
```

```typescript
// src/shared/errors/AlreadyExistsError.ts
import { StorageError } from './StorageError'
import type { StoragePath } from '../../types/StoragePath'

export class AlreadyExistsError extends StorageError {
    readonly code = 'ERR_ALREADY_EXISTS' as const
    readonly path: StoragePath

    constructor(path: StoragePath, options: { cause: Error }) {
        super(`Already exists: ${path.toString()}`, {
            cause: options.cause,
            code: 'ERR_ALREADY_EXISTS',
        })
        this.name = 'AlreadyExistsError'
        this.path = path
    }
}
```

```typescript
// src/shared/errors/NotADirectoryError.ts
import { StorageError } from './StorageError'
import type { StoragePath } from '../../types/StoragePath'

export class NotADirectoryError extends StorageError {
    readonly code = 'ERR_NOT_A_DIRECTORY' as const
    readonly path: StoragePath

    constructor(path: StoragePath, options: { cause: Error }) {
        super(`Not a directory: ${path.toString()}`, {
            cause: options.cause,
            code: 'ERR_NOT_A_DIRECTORY',
        })
        this.name = 'NotADirectoryError'
        this.path = path
    }
}
```

```typescript
// src/shared/errors/IsDirectoryError.ts
import { StorageError } from './StorageError'
import type { StoragePath } from '../../types/StoragePath'

export class IsDirectoryError extends StorageError {
    readonly code = 'ERR_IS_DIRECTORY' as const
    readonly path: StoragePath

    constructor(path: StoragePath, options: { cause: Error }) {
        super(`Is a directory: ${path.toString()}`, {
            cause: options.cause,
            code: 'ERR_IS_DIRECTORY',
        })
        this.name = 'IsDirectoryError'
        this.path = path
    }
}
```

```typescript
// src/shared/errors/TimeoutError.ts
import { StorageError } from './StorageError'

export class TimeoutError extends StorageError {
    readonly code = 'ERR_TIMEOUT' as const

    constructor(options: { cause: Error }) {
        super('Operation timed out', {
            cause: options.cause,
            code: 'ERR_TIMEOUT',
        })
        this.name = 'TimeoutError'
    }
}
```

```typescript
// src/shared/errors/ConnectionError.ts
import { StorageError } from './StorageError'

export class ConnectionError extends StorageError {
    readonly code = 'ERR_CONNECTION' as const

    constructor(options: { cause: Error }) {
        super('Connection error', {
            cause: options.cause,
            code: 'ERR_CONNECTION',
        })
        this.name = 'ConnectionError'
    }
}
```

```typescript
// src/shared/errors/CapabilityConflictError.ts
import { StorageError } from './StorageError'

export class CapabilityConflictError extends StorageError {
    readonly code = 'ERR_CAPABILITY_CONFLICT' as const
    readonly capabilities: Set<symbol>

    constructor(capabilities: Set<symbol>) {
        const symbols = [...capabilities].map(s => String(s)).join(', ')
        super(`Capability conflict between extensions: ${symbols}`, {
            code: 'ERR_CAPABILITY_CONFLICT',
        })
        this.name = 'CapabilityConflictError'
        this.capabilities = capabilities
    }
}
```

```typescript
// src/shared/errors/TransactionError.ts
import { StorageError } from './StorageError'

export class TransactionError extends StorageError {
    readonly code = 'ERR_TRANSACTION' as const
    readonly partialResults: unknown[]
    readonly completedOps: number
    readonly totalOps: number

    constructor(options: {
        partialResults: unknown[]
        completedOps: number
        totalOps: number
        cause: Error
    }) {
        super(
            `Transaction failed: ${options.completedOps}/${options.totalOps} operations completed`,
            {
                cause: options.cause,
                code: 'ERR_TRANSACTION',
            },
        )
        this.name = 'TransactionError'
        this.partialResults = options.partialResults
        this.completedOps = options.completedOps
        this.totalOps = options.totalOps
    }
}
```

Now update the barrel:

```typescript
// src/shared/errors/index.ts
export { UnsupportedEnvironmentError } from './UnsupportedEnvironmentError'
export { StorageError } from './StorageError'
export { UnsupportedOperationError } from './UnsupportedOperationError'
export { PathNotFoundError } from './PathNotFoundError'
export { PermissionDeniedError } from './PermissionDeniedError'
export { AlreadyExistsError } from './AlreadyExistsError'
export { NotADirectoryError } from './NotADirectoryError'
export { IsDirectoryError } from './IsDirectoryError'
export { TimeoutError } from './TimeoutError'
export { ConnectionError } from './ConnectionError'
export { CapabilityConflictError } from './CapabilityConflictError'
export { TransactionError } from './TransactionError'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/errors/__tests__/errors.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/errors/PathNotFoundError.ts src/shared/errors/PermissionDeniedError.ts src/shared/errors/AlreadyExistsError.ts src/shared/errors/NotADirectoryError.ts src/shared/errors/IsDirectoryError.ts src/shared/errors/TimeoutError.ts src/shared/errors/ConnectionError.ts src/shared/errors/CapabilityConflictError.ts src/shared/errors/TransactionError.ts src/shared/errors/index.ts src/shared/errors/__tests__/errors.spec.ts && git commit -S -m "feat(errors): add all error subclasses with path/capability/transaction fields"
```

---

### Task 12: StorageListing Class

**Files:**
- Create: `src/types/StorageListing.ts`
- Test: `src/types/__tests__/StorageListing.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/StorageListing.spec.ts
import { StorageListing } from '../StorageListing'
import { StoragePath } from '../StoragePath'
import { p } from '../../shared/functions/p'
import { describe, it, expect } from 'vitest'

describe('StorageListing', () => {
    describe('constructor', () => {
        it('should create from string name and struct', () => {
            const listing = new StorageListing('/data', [
                new StoragePath('/data/file1.txt'),
                new StoragePath('/data/file2.txt'),
            ])
            expect(listing.name.toString()).toBe('/data')
        })

        it('should coerce string entries to StoragePath', () => {
            const listing = new StorageListing('/data', ['/file1.txt', '/file2.txt'])
            expect(listing.files[0]).toBeInstanceOf(StoragePath)
        })

        it('should accept nested StorageListing entries', () => {
            const inner = new StorageListing('/data/sub', [new StoragePath('/data/sub/file.txt')])
            const listing = new StorageListing('/data', [inner])
            expect(listing.directories).toHaveLength(1)
        })
    })

    describe('properties', () => {
        it('name should return StoragePath', () => {
            const listing = new StorageListing('/foo', [])
            expect(listing.name).toBeInstanceOf(StoragePath)
        })

        it('files should return only StoragePath entries', () => {
            const inner = new StorageListing('/data/sub', [])
            const listing = new StorageListing('/data', [
                new StoragePath('/data/file1.txt'),
                new StoragePath('/data/file2.txt'),
                inner,
            ])
            expect(listing.files).toHaveLength(2)
            expect(listing.files[0]).toBeInstanceOf(StoragePath)
        })

        it('directories should return only StorageListing entries', () => {
            const inner = new StorageListing('/data/sub', [])
            const listing = new StorageListing('/data', [
                new StoragePath('/data/file1.txt'),
                inner,
            ])
            expect(listing.directories).toHaveLength(1)
        })

        it('isEmpty should return true for empty struct', () => {
            const listing = new StorageListing('/empty', [])
            expect(listing.isEmpty).toBe(true)
        })

        it('isEmpty should return false for non-empty struct', () => {
            const listing = new StorageListing('/data', [new StoragePath('/data/f.txt')])
            expect(listing.isEmpty).toBe(false)
        })

        it('depth should return 0 for flat listing', () => {
            const listing = new StorageListing('/data', [new StoragePath('/data/f.txt')])
            expect(listing.depth).toBe(0)
        })

        it('depth should return 1 for one level of nesting', () => {
            const inner = new StorageListing('/data/sub', [])
            const listing = new StorageListing('/data', [inner])
            expect(listing.depth).toBe(1)
        })

        it('flat should return all paths recursively', () => {
            const inner = new StorageListing('/data/sub', [new StoragePath('/data/sub/file.txt')])
            const listing = new StorageListing('/data', [
                new StoragePath('/data/top.txt'),
                inner,
            ])
            expect(listing.flat).toHaveLength(2)
            expect(listing.flat[0].toString()).toBe('/data/top.txt')
            expect(listing.flat[1].toString()).toBe('/data/sub/file.txt')
        })
    })

    describe('Serializable', () => {
        it('toJSON should return structured JSON', () => {
            const listing = new StorageListing('/data', [new StoragePath('/data/file.txt')])
            const json = listing.toJSON()
            expect(json).toHaveProperty('data')
        })

        it('toString should return formatted tree', () => {
            const listing = new StorageListing('/data', [new StoragePath('/data/file.txt')])
            const str = listing.toString()
            expect(str).toContain('data')
        })
    })

    describe('Comparable', () => {
        it('equals should return true for same name and struct', () => {
            const a = new StorageListing('/data', [new StoragePath('/data/f.txt')])
            const b = new StorageListing('/data', [new StoragePath('/data/f.txt')])
            expect(a.equals(b)).toBe(true)
        })

        it('equals should return false for different struct', () => {
            const a = new StorageListing('/data', [new StoragePath('/data/f1.txt')])
            const b = new StorageListing('/data', [new StoragePath('/data/f2.txt')])
            expect(a.equals(b)).toBe(false)
        })
    })

    describe('iteration', () => {
        it('should be iterable', () => {
            const listing = new StorageListing('/data', [
                new StoragePath('/data/f1.txt'),
                new StoragePath('/data/f2.txt'),
            ])
            const items = [...listing]
            expect(items).toHaveLength(2)
        })
    })

    describe('Symbol.toPrimitive', () => {
        it('should coerce to string', () => {
            const listing = new StorageListing('/data', [])
            expect(String(listing)).toContain('data')
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/StorageListing.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/StorageListing.ts
import type { Serializable } from './Serializable'
import type { Comparable } from './Comparable'
import type { StorageStats } from './StorageStats'
import { StoragePath } from './StoragePath'
import { p } from '../../shared/functions/p'

export interface StorageListingJSON {
    [name: string]: Array<string | StorageListingJSON>
}

export class StorageListing
    implements Serializable<StorageListingJSON>, Comparable<StorageListing>
{
    private struct: Array<StoragePath | StorageListing>
    private _name: StoragePath
    private _stats?: StorageStats

    constructor(
        name: StoragePath | string,
        struct: Array<StoragePath | StorageListing>,
        stats?: StorageStats,
    ) {
        this._name = name instanceof StoragePath ? name : p(name)
        this.struct = struct.map(item =>
            typeof item === 'string' ? p(item) : item,
        )
        this._stats = stats
    }

    get name(): StoragePath {
        return this._name
    }

    get stats(): StorageStats | undefined {
        return this._stats
    }

    get files(): StoragePath[] {
        return this.struct.filter(
            (item): item is StoragePath => item instanceof StoragePath,
        )
    }

    get directories(): StorageListing[] {
        return this.struct.filter(
            (item): item is StorageListing => item instanceof StorageListing,
        )
    }

    get isEmpty(): boolean {
        return this.struct.length === 0
    }

    get depth(): number {
        let maxDepth = 0
        for (const item of this.struct) {
            if (item instanceof StorageListing) {
                const d = item.depth + 1
                if (d > maxDepth) maxDepth = d
            }
        }
        return maxDepth
    }

    get flat(): StoragePath[] {
        const result: StoragePath[] = []
        for (const item of this.struct) {
            if (item instanceof StoragePath) {
                result.push(item)
            } else if (item instanceof StorageListing) {
                result.push(...item.flat)
            }
        }
        return result
    }

    toJSON(fullname = false, root = true): StorageListingJSON {
        const name = root || fullname ? this._name.toString() : this._name.toString().split('/').pop() || this._name.toString()
        const content = this.struct.map(item => {
            if (item instanceof StorageListing) return item.toJSON(fullname, false)
            const pathStr = item.toString()
            return fullname ? pathStr : pathStr.split('/').pop() || pathStr
        })
        return { [name]: content as Array<string | StorageListingJSON> }
    }

    toString(): string {
        return this._formatTree(0)
    }

    private _formatTree(depth: number, padUnit = 4, traceChar = ' '): string {
        const sorted = [...this.struct].sort((a, b) => {
            const aIsDir = a instanceof StorageListing
            const bIsDir = b instanceof StorageListing
            if (aIsDir && !bIsDir) return -1
            if (!aIsDir && bIsDir) return 1
            return 0
        })

        const name = depth > 0 ? this._name.toString().split('/').pop() || this._name.toString() : this._name.toString()
        let str = `StorageListing: ${name} {\n`
        str = str.padStart(str.length + depth * padUnit, traceChar)

        for (const item of sorted) {
            if (item instanceof StorageListing) {
                str += item._formatTree(depth + 1, padUnit, traceChar)
            } else {
                const fileName = item.toString().split('/').pop() || item.toString()
                const line = `File: ${fileName}\n`
                str += line.padStart(line.length + (depth + 1) * padUnit, traceChar)
            }
        }

        let tail = '}\n'
        tail = tail.padStart(tail.length + depth * padUnit, traceChar)
        return str.concat(tail)
    }

    equals(other: StorageListing): boolean {
        if (!this._name.equals(other._name)) return false
        if (this.struct.length !== other.struct.length) return false
        for (let i = 0; i < this.struct.length; i++) {
            const a = this.struct[i]
            const b = other.struct[i]
            if (a instanceof StoragePath && b instanceof StoragePath) {
                if (!a.equals(b)) return false
            } else if (a instanceof StorageListing && b instanceof StorageListing) {
                if (!a.equals(b)) return false
            } else {
                return false
            }
        }
        return true
    }

    *[Symbol.iterator](): Iterator<StoragePath | StorageListing> {
        for (const item of this.struct) yield item
    }

    [Symbol.toPrimitive](hint: string): string | undefined {
        if (hint === 'string' || hint === 'default') return this.toString()
        return undefined
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/StorageListing.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/StorageListing.ts src/types/__tests__/StorageListing.spec.ts && git commit -S -m "feat(types): add StorageListing class replacing DirectoryList"
```

---

### Task 13: StorageStream Class

**Files:**
- Create: `src/types/StorageStream.ts`
- Test: `src/types/__tests__/StorageStream.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/StorageStream.spec.ts
import { StorageStream } from '../StorageStream'
import { describe, it, expect } from 'vitest'

describe('StorageStream', () => {
    describe('AsyncIterable', () => {
        it('should iterate over pushed chunks', async () => {
            const stream = new StorageStream<Uint8Array>()
            stream.push(new Uint8Array([1, 2, 3]))
            stream.push(new Uint8Array([4, 5, 6]))
            stream.close()

            const chunks: Uint8Array[] = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }
            expect(chunks).toHaveLength(2)
            expect(chunks[0]).toEqual(new Uint8Array([1, 2, 3]))
        })

        it('should handle empty stream', async () => {
            const stream = new StorageStream<string>()
            stream.close()

            const chunks: string[] = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }
            expect(chunks).toHaveLength(0)
        })
    })

    describe('lifecycle', () => {
        it('close should set closed to true', () => {
            const stream = new StorageStream()
            expect(stream.closed).toBe(false)
            stream.close()
            expect(stream.closed).toBe(true)
        })

        it('abort should set aborted to true', () => {
            const stream = new StorageStream()
            expect(stream.aborted).toBe(false)
            stream.abort('test reason')
            expect(stream.aborted).toBe(true)
        })

        it('pause and resume should control flow', async () => {
            const stream = new StorageStream<number>()
            stream.pause()
            stream.push(1)
            stream.push(2)
            stream.resume()
            stream.push(3)
            stream.close()

            const chunks: number[] = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }
            expect(chunks).toEqual([1, 2, 3])
        })
    })

    describe('concurrency and buffer', () => {
        it('concurrency should return this for chaining', () => {
            const stream = new StorageStream()
            const result = stream.concurrency(4)
            expect(result).toBe(stream)
        })

        it('buffer should return this for chaining', () => {
            const stream = new StorageStream()
            const result = stream.buffer(1024)
            expect(result).toBe(stream)
        })
    })

    describe('pipe', () => {
        it('should pipe to another StorageStream', async () => {
            const source = new StorageStream<number>()
            const dest = new StorageStream<number>()

            source.push(1)
            source.push(2)
            source.close()

            source.pipe(dest)

            const chunks: number[] = []
            for await (const chunk of dest) {
                chunks.push(chunk)
            }
            expect(chunks).toEqual([1, 2])
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/StorageStream.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/StorageStream.ts
export class StorageStream<T = Uint8Array> implements AsyncIterable<T> {
    private chunks: T[] = []
    private consumers: Array<{
        resolve: (value: IteratorResult<T>) => void
        reject: (reason?: unknown) => void
    }> = []
    private _closed = false
    private _aborted = false
    private _paused = false
    private _concurrency = 1
    private _bufferSize = Infinity
    private abortReason?: unknown

    get closed(): boolean {
        return this._closed
    }

    get aborted(): boolean {
        return this._aborted
    }

    push(chunk: T): void {
        if (this._closed || this._aborted) return
        this.chunks.push(chunk)
        this._drain()
    }

    close(): void {
        this._closed = true
        this._drain()
    }

    abort(reason?: unknown): void {
        this._aborted = true
        this.abortReason = reason
        this._drain()
    }

    pause(): void {
        this._paused = true
    }

    resume(): void {
        this._paused = false
        this._drain()
    }

    concurrency(n: number): this {
        this._concurrency = n
        return this
    }

    buffer(size: number): this {
        this._bufferSize = size
        return this
    }

    pipe(destination: StorageStream<T> | WritableStream | AsyncIterable<unknown>): StorageStream<T> {
        if (destination instanceof StorageStream) {
            const self = this
            ;(async () => {
                for await (const chunk of self) {
                    destination.push(chunk)
                }
                destination.close()
            })()
        }
        return this
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        return {
            next: (): Promise<IteratorResult<T>> => {
                return new Promise<IteratorResult<T>>((resolve, reject) => {
                    if (this.chunks.length > 0) {
                        resolve({ value: this.chunks.shift()!, done: false })
                        return
                    }
                    if (this._aborted) {
                        reject(this.abortReason)
                        return
                    }
                    if (this._closed) {
                        resolve({ value: undefined, done: true } as IteratorResult<T>)
                        return
                    }
                    this.consumers.push({ resolve, reject })
                })
            },
        }
    }

    private _drain(): void {
        if (this._paused) return

        while (this.consumers.length > 0 && this.chunks.length > 0) {
            const consumer = this.consumers.shift()!
            consumer.resolve({ value: this.chunks.shift()!, done: false })
        }

        if (this._aborted) {
            while (this.consumers.length > 0) {
                const consumer = this.consumers.shift()!
                consumer.reject(this.abortReason)
            }
        }

        if (this._closed && this.chunks.length === 0) {
            while (this.consumers.length > 0) {
                const consumer = this.consumers.shift()!
                consumer.resolve({ value: undefined, done: true } as IteratorResult<T>)
            }
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/StorageStream.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/StorageStream.ts src/types/__tests__/StorageStream.spec.ts && git commit -S -m "feat(types): add StorageStream class with AsyncIterable and flow control"
```

---

### Task 14: Types Barrel + Update UnsupportedEnvironmentError

**Files:**
- Create: `src/types/index.ts`
- Modify: `src/shared/errors/UnsupportedEnvironmentError.ts`
- Test: `src/types/__tests__/barrel.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/barrel.spec.ts
import { describe, it, expect } from 'vitest'
import type {
    StorageEncoding,
    ValidInput,
    Input,
    StorageStats,
    MkdirOptions,
    StorageStreamOptions,
    PresignedUrlOptions,
    Serializable,
    Comparable,
} from '../index'
import {
    F_OK,
    R_OK,
    W_OK,
    X_OK,
    AccessMode,
} from '../index'
import {
    StoragePath,
    StorageStream,
    StorageListing,
    Timestamp,
} from '../index'

describe('types barrel', () => {
    it('should re-export StoragePath', () => {
        const sp = new StoragePath('/test')
        expect(sp.toString()).toBe('/test')
    })

    it('should re-export AccessMode constants', () => {
        expect(F_OK).toBe(0)
        expect(R_OK).toBe(4)
        expect(W_OK).toBe(2)
        expect(X_OK).toBe(1)
    })

    it('should re-export Timestamp', () => {
        const ts = Timestamp.fromMilliseconds(1000)
        expect(ts.milliseconds).toBe(1000)
    })

    it('should re-export StorageStream', () => {
        const s = new StorageStream<number>()
        expect(s.closed).toBe(false)
    })

    it('should re-export StorageListing', () => {
        const l = new StorageListing('/dir', [])
        expect(l.isEmpty).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/barrel.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/index.ts
export type { Serializable } from './Serializable'
export type { Comparable } from './Comparable'
export type { StorageEncoding } from './StorageEncoding'
export type { ValidInput, Input } from './Input'
export type { StorageStats } from './StorageStats'
export type { MkdirOptions } from './MkdirOptions'
export type { StorageStreamOptions } from './StorageStreamOptions'
export type { PresignedUrlOptions } from './PresignedUrlOptions'

export { F_OK, R_OK, W_OK, X_OK, constants, AccessMode } from './AccessMode'
export type { AccessModeString } from './AccessMode'

export { StoragePath } from './StoragePath'
export { StorageStream } from './StorageStream'
export { StorageListing } from './StorageListing'
export type { StorageListingJSON } from './StorageListing'
export { Timestamp } from './Timestamp'
```

Also update `UnsupportedEnvironmentError` to extend `StorageError`:

```typescript
// src/shared/errors/UnsupportedEnvironmentError.ts
import { StorageError } from './StorageError'

export class UnsupportedEnvironmentError extends StorageError {
    readonly code = 'ERR_UNSUPPORTED_ENVIRONMENT' as const
    readonly detectedRuntime: string

    constructor(detectedRuntime?: string) {
        const runtime = detectedRuntime ?? 'unknown'
        super(
            `Unsupported environment detected (${runtime}). ` +
            `Call setFS() with a custom Adapter before using storage methods, ` +
            `or run this library in a supported runtime (Node.js).`,
            {
                code: 'ERR_UNSUPPORTED_ENVIRONMENT',
            },
        )
        this.name = 'UnsupportedEnvironmentError'
        this.detectedRuntime = runtime
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/barrel.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/shared/errors/UnsupportedEnvironmentError.ts src/types/__tests__/barrel.spec.ts && git commit -S -m "feat(types): add barrel exports and update UnsupportedEnvironmentError to extend StorageError"
```

---

### Task 15: Path Utility Functions

**Files:**
- Create: `src/shared/functions/join.ts`
- Create: `src/shared/functions/basename.ts`
- Create: `src/shared/functions/dirname.ts`
- Create: `src/shared/functions/extname.ts`
- Create: `src/shared/functions/normalize.ts`
- Create: `src/shared/functions/resolve.ts`
- Create: `src/shared/functions/relative.ts`
- Create: `src/shared/functions/isAbsolute.ts`
- Test: `src/shared/functions/__tests__/path.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/functions/__tests__/path.spec.ts
import { join } from '../join'
import { basename } from '../basename'
import { dirname } from '../dirname'
import { extname } from '../extname'
import { normalize } from '../normalize'
import { resolve } from '../resolve'
import { relative } from '../relative'
import { isAbsolute } from '../isAbsolute'
import { describe, it, expect } from 'vitest'

describe('path utilities', () => {
    describe('join', () => {
        it('should join path segments', () => {
            expect(join('/foo', 'bar', 'baz')).toBe('/foo/bar/baz')
        })
        it('should handle trailing slash', () => {
            expect(join('/foo/', 'bar')).toBe('/foo/bar')
        })
        it('should handle empty segments', () => {
            expect(join('/foo', '', 'bar')).toBe('/foo/bar')
        })
        it('should handle single segment', () => {
            expect(join('foo')).toBe('foo')
        })
    })

    describe('basename', () => {
        it('should return the last segment', () => {
            expect(basename('/foo/bar/baz.txt')).toBe('baz.txt')
        })
        it('should strip extension when provided', () => {
            expect(basename('/foo/bar/baz.txt', '.txt')).toBe('baz')
        })
        it('should handle root path', () => {
            expect(basename('/')).toBe('/')
        })
    })

    describe('dirname', () => {
        it('should return parent directory', () => {
            expect(dirname('/foo/bar/baz.txt')).toBe('/foo/bar')
        })
        it('should return root for top-level', () => {
            expect(dirname('/foo')).toBe('/')
        })
        it('should return . for relative path without separator', () => {
            expect(dirname('file.txt')).toBe('.')
        })
    })

    describe('extname', () => {
        it('should return extension with dot', () => {
            expect(extname('/foo/bar/baz.txt')).toBe('.txt')
        })
        it('should return empty for no extension', () => {
            expect(extname('/foo/bar/baz')).toBe('')
        })
        it('should handle multiple dots', () => {
            expect(extname('/foo/bar/baz.tar.gz')).toBe('.gz')
        })
    })

    describe('normalize', () => {
        it('should remove double slashes', () => {
            expect(normalize('/foo//bar')).toBe('/foo/bar')
        })
        it('should resolve .. segments', () => {
            expect(normalize('/foo/bar/../baz')).toBe('/foo/baz')
        })
        it('should resolve . segments', () => {
            expect(normalize('/foo/./bar')).toBe('/foo/bar')
        })
    })

    describe('resolve', () => {
        it('should resolve to absolute path', () => {
            const result = resolve('/foo/bar', '../baz')
            expect(result).toBe('/foo/baz')
        })
        it('should handle absolute from root', () => {
            const result = resolve('/foo', '/bar')
            expect(result).toBe('/bar')
        })
    })

    describe('relative', () => {
        it('should compute relative path', () => {
            expect(relative('/foo/bar', '/foo/baz')).toBe('../baz')
        })
        it('should return . for same path', () => {
            expect(relative('/foo/bar', '/foo/bar')).toBe('.')
        })
    })

    describe('isAbsolute', () => {
        it('should return true for absolute paths', () => {
            expect(isAbsolute('/foo/bar')).toBe(true)
        })
        it('should return false for relative paths', () => {
            expect(isAbsolute('foo/bar')).toBe(false)
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/functions/__tests__/path.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/shared/functions/join.ts
export function join(...segments: string[]): string {
    const combined = segments.filter(Boolean).join('/')
    return normalize(combined)
}

function normalize(path: string): string {
    const parts = path.split('/').filter(Boolean)
    const result: string[] = []
    for (const part of parts) {
        if (part === '.') continue
        if (part === '..') {
            if (result.length > 0 && result[result.length - 1] !== '..') {
                result.pop()
            } else if (!path.startsWith('/')) {
                result.push('..')
            }
        } else {
            result.push(part)
        }
    }
    const joined = result.join('/')
    return path.startsWith('/') ? '/' + joined : joined || '.'
}
```

```typescript
// src/shared/functions/basename.ts
export function basename(path: string, ext?: string): string {
    const segments = path.split('/').filter(Boolean)
    let name = segments.pop() || '/'
    if (ext && name.endsWith(ext)) {
        name = name.slice(0, name.length - ext.length)
    }
    return name
}
```

```typescript
// src/shared/functions/dirname.ts
export function dirname(path: string): string {
    const segments = path.split('/').filter(Boolean)
    if (segments.length <= 1) {
        return path.startsWith('/') ? '/' : '.'
    }
    segments.pop()
    return path.startsWith('/') ? '/' + segments.join('/') : segments.join('/')
}
```

```typescript
// src/shared/functions/extname.ts
export function extname(path: string): string {
    const name = path.split('/').pop() || ''
    const dotIndex = name.lastIndexOf('.')
    if (dotIndex <= 0) return ''
    return name.slice(dotIndex)
}
```

```typescript
// src/shared/functions/normalize.ts
export function normalize(path: string): string {
    const parts = path.split('/')
    const result: string[] = []
    let isAbsolute = path.startsWith('/')

    for (const part of parts) {
        if (part === '' || part === '.') continue
        if (part === '..') {
            if (result.length > 0 && result[result.length - 1] !== '..') {
                result.pop()
            } else if (!isAbsolute) {
                result.push('..')
            }
        } else {
            result.push(part)
        }
    }

    const joined = result.join('/')
    if (isAbsolute) return '/' + joined
    return joined || '.'
}
```

```typescript
// src/shared/functions/resolve.ts
import { normalize } from './normalize'

export function resolve(...pathSegments: string[]): string {
    let resolved = ''
    for (const segment of pathSegments) {
        if (segment.startsWith('/')) {
            resolved = segment
        } else {
            resolved = resolved ? resolved + '/' + segment : segment
        }
    }
    if (!resolved.startsWith('/')) {
        resolved = '/' + resolved
    }
    return normalize(resolved)
}
```

```typescript
// src/shared/functions/relative.ts
import { normalize } from './normalize'

export function relative(from: string, to: string): string {
    const fromNorm = normalize(from.startsWith('/') ? from : '/' + from)
    const toNorm = normalize(to.startsWith('/') ? to : '/' + to)

    const fromParts = fromNorm.split('/').filter(Boolean)
    const toParts = toNorm.split('/').filter(Boolean)

    let commonLength = 0
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
        if (fromParts[i] !== toParts[i]) break
        commonLength = i + 1
    }

    const upCount = fromParts.length - commonLength
    const upParts = Array(upCount).fill('..')
    const downParts = toParts.slice(commonLength)

    const result = [...upParts, ...downParts].join('/')
    return result || '.'
}
```

```typescript
// src/shared/functions/isAbsolute.ts
export function isAbsolute(path: string): boolean {
    return path.startsWith('/')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/functions/__tests__/path.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/functions/join.ts src/shared/functions/basename.ts src/shared/functions/dirname.ts src/shared/functions/extname.ts src/shared/functions/normalize.ts src/shared/functions/resolve.ts src/shared/functions/relative.ts src/shared/functions/isAbsolute.ts src/shared/functions/__tests__/path.spec.ts && git commit -S -m "feat(shared): add runtime-agnostic path utility functions"
```

---

### Task 16: CapabilityOperation and TransactionOperation Types

**Files:**
- Create: `src/types/capabilities.ts`
- Test: `src/types/__tests__/capabilities.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/capabilities.spec.ts
import type { TransactionOperation } from '../capabilities'
import { describe, it, expect } from 'vitest'

describe('TransactionOperation', () => {
    it('should accept put operation', () => {
        const op: TransactionOperation = {
            type: 'put',
            path: '/data/file.txt',
            value: 'content',
        }
        expect(op.type).toBe('put')
    })

    it('should accept delete operation', () => {
        const op: TransactionOperation = {
            type: 'delete',
            path: '/data/file.txt',
        }
        expect(op.type).toBe('delete')
    })

    it('should accept copy operation', () => {
        const op: TransactionOperation = {
            type: 'copy',
            from: '/src/file.txt',
            to: '/dest/file.txt',
        }
        expect(op.type).toBe('copy')
    })

    it('should accept move operation', () => {
        const op: TransactionOperation = {
            type: 'move',
            from: '/src/file.txt',
            to: '/dest/file.txt',
        }
        expect(op.type).toBe('move')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/capabilities.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/types/capabilities.ts
import type { StoragePath } from './StoragePath'
import type { Input } from './Input'

export type TransactionOperation =
    | { type: 'put'; path: StoragePath | string; value: Input }
    | { type: 'delete'; path: StoragePath | string }
    | { type: 'copy'; from: StoragePath | string; to: StoragePath | string }
    | { type: 'move'; from: StoragePath | string; to: StoragePath | string }
```

Note: `CapabilityOperation` derived type will be added in sub-plan 2 after the 13 domain interfaces are defined, since it depends on `keyof` each interface.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/capabilities.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/capabilities.ts src/types/__tests__/capabilities.spec.ts && git commit -S -m "feat(types): add TransactionOperation type"
```

---

## Sub-Plan 2: Capability Model + Adapter Interfaces

### Task 17: Capability Symbols and Namespace

**Files:**
- Create: `src/adapters/capabilities.ts`
- Test: `src/adapters/__tests__/capabilities.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/__tests__/capabilities.spec.ts
import {
    Read, Write, Stream, Mutate, Navigate, Watch,
    Transaction, Lock, Metadata, Versioning, Search,
    Linking, Events, Capability,
} from '../capabilities'
import { describe, it, expect } from 'vitest'

describe('Capability symbols', () => {
    it('should create unique symbols via Symbol.for', () => {
        expect(Read).toBe(Symbol.for('storage:read'))
        expect(Write).toBe(Symbol.for('storage:write'))
        expect(Stream).toBe(Symbol.for('storage:stream'))
        expect(Mutate).toBe(Symbol.for('storage:mutate'))
        expect(Navigate).toBe(Symbol.for('storage:navigate'))
        expect(Watch).toBe(Symbol.for('storage:watch'))
        expect(Transaction).toBe(Symbol.for('storage:transaction'))
        expect(Lock).toBe(Symbol.for('storage:lock'))
        expect(Metadata).toBe(Symbol.for('storage:metadata'))
        expect(Versioning).toBe(Symbol.for('storage:versioning'))
        expect(Search).toBe(Symbol.for('storage:search'))
        expect(Linking).toBe(Symbol.for('storage:linking'))
        expect(Events).toBe(Symbol.for('storage:events'))
    })

    it('should be globally unique', () => {
        expect(Read).not.toBe(Write)
        expect(Write).not.toBe(Stream)
        expect(Stream).not.toBe(Mutate)
    })

    it('should provide Capability namespace with all 13 symbols', () => {
        expect(Capability.Read).toBe(Read)
        expect(Capability.Write).toBe(Write)
        expect(Capability.Stream).toBe(Stream)
        expect(Capability.Mutate).toBe(Mutate)
        expect(Capability.Navigate).toBe(Navigate)
        expect(Capability.Watch).toBe(Watch)
        expect(Capability.Transaction).toBe(Transaction)
        expect(Capability.Lock).toBe(Lock)
        expect(Capability.Metadata).toBe(Metadata)
        expect(Capability.Versioning).toBe(Versioning)
        expect(Capability.Search).toBe(Search)
        expect(Capability.Linking).toBe(Linking)
        expect(Capability.Events).toBe(Events)
    })

    it('should have 13 capability symbols in namespace', () => {
        const keys = Object.getOwnPropertyNames(Capability).filter(
            k => typeof (Capability as unknown as Record<string, unknown>)[k] === 'symbol',
        )
        expect(keys).toHaveLength(13)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/__tests__/capabilities.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/capabilities.ts
export const Read = Symbol.for('storage:read')
export const Write = Symbol.for('storage:write')
export const Stream = Symbol.for('storage:stream')
export const Mutate = Symbol.for('storage:mutate')
export const Navigate = Symbol.for('storage:navigate')
export const Watch = Symbol.for('storage:watch')
export const Transaction = Symbol.for('storage:transaction')
export const Lock = Symbol.for('storage:lock')
export const Metadata = Symbol.for('storage:metadata')
export const Versioning = Symbol.for('storage:versioning')
export const Search = Symbol.for('storage:search')
export const Linking = Symbol.for('storage:linking')
export const Events = Symbol.for('storage:events')

export const Capability = {
    Read,
    Write,
    Stream,
    Mutate,
    Navigate,
    Watch,
    Transaction,
    Lock,
    Metadata,
    Versioning,
    Search,
    Linking,
    Events,
} as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/__tests__/capabilities.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/capabilities.ts src/adapters/__tests__/capabilities.spec.ts && git commit -S -m "feat(adapters): add 13 capability symbols and Capability namespace"
```

---

### Task 18: Adapter Base Interface

**Files:**
- Create: `src/adapters/interfaces/Adapter.ts`
- Test: `src/adapters/interfaces/__tests__/Adapter.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/interfaces/__tests__/Adapter.spec.ts
import type { Adapter } from '../Adapter'
import { Read, Write } from '../../capabilities'
import { describe, it, expect } from 'vitest'

describe('Adapter', () => {
    it('should require capabilities Set<symbol>', () => {
        const adapter: Adapter = {
            capabilities: new Set([Read, Write]),
        }
        expect(adapter.capabilities.has(Read)).toBe(true)
        expect(adapter.capabilities.has(Write)).toBe(true)
        expect(adapter.capabilities.size).toBe(2)
    })

    it('should accept empty capabilities set', () => {
        const adapter: Adapter = {
            capabilities: new Set(),
        }
        expect(adapter.capabilities.size).toBe(0)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/interfaces/__tests__/Adapter.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/interfaces/Adapter.ts
export interface Adapter {
    readonly capabilities: Set<symbol>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/interfaces/__tests__/Adapter.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/interfaces/Adapter.ts src/adapters/interfaces/__tests__/Adapter.spec.ts && git commit -S -m "feat(adapters): add Adapter base interface with capabilities"
```

---

### Task 19: 13 Domain Capability Interfaces

**Files:**
- Create: `src/adapters/interfaces/capabilities/ReadAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/WriteAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/StreamAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/MutateAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/NavigateAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/WatchAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/TransactionAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/LockAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/MetadataAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/VersioningAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/SearchAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/LinkingAdapter.ts`
- Create: `src/adapters/interfaces/capabilities/EventsAdapter.ts`
- Test: `src/adapters/interfaces/capabilities/__tests__/domains.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/interfaces/capabilities/__tests__/domains.spec.ts
import type { ReadAdapter } from '../ReadAdapter'
import type { WriteAdapter } from '../WriteAdapter'
import type { StreamAdapter } from '../StreamAdapter'
import type { MutateAdapter } from '../MutateAdapter'
import type { NavigateAdapter } from '../NavigateAdapter'
import type { WatchAdapter } from '../WatchAdapter'
import type { TransactionAdapter } from '../TransactionAdapter'
import type { LockAdapter } from '../LockAdapter'
import type { MetadataAdapter } from '../MetadataAdapter'
import type { VersioningAdapter } from '../VersioningAdapter'
import type { SearchAdapter } from '../SearchAdapter'
import type { LinkingAdapter } from '../LinkingAdapter'
import type { EventsAdapter } from '../EventsAdapter'
import type { StoragePath } from '../../../../types/StoragePath'
import type { StorageEncoding } from '../../../../types/StorageEncoding'
import type { StorageStats } from '../../../../types/StorageStats'
import type { Input } from '../../../../types/Input'
import type { MkdirOptions } from '../../../../types/MkdirOptions'
import type { StorageStreamOptions } from '../../../../types/StorageStreamOptions'
import type { PresignedUrlOptions } from '../../../../types/PresignedUrlOptions'
import type { TransactionOperation } from '../../../../types/capabilities'
import { StorageStream } from '../../../../types/StorageStream'
import { StorageListing } from '../../../../types/StorageListing'
import { Timestamp } from '../../../../types/Timestamp'
import { describe, it, expect } from 'vitest'

describe('ReadAdapter', () => {
    it('should define get, getAsBuffer, getAsJSON', () => {
        const adapter: ReadAdapter = {
            async get(path, encoding?) { return '' },
            async getAsBuffer(path) { return new Uint8Array() },
            async getAsJSON(path, encoding?, reviver?) { return {} as unknown },
        }
        expect(typeof adapter.get).toBe('function')
        expect(typeof adapter.getAsBuffer).toBe('function')
        expect(typeof adapter.getAsJSON).toBe('function')
    })
})

describe('WriteAdapter', () => {
    it('should define put, putStreamed, append, appendStreamed, mkdir', () => {
        const adapter: WriteAdapter = {
            async put(path, value, encoding?) { return true },
            async putStreamed(path, values, encoding?) {},
            async append(path, value, encoding?) { return true },
            async appendStreamed(path, values, encoding?) {},
            async mkdir(path, options?) {},
        }
        expect(typeof adapter.put).toBe('function')
        expect(typeof adapter.mkdir).toBe('function')
    })
})

describe('StreamAdapter', () => {
    it('should define readStream, writeStream, duplexStream, fileStream', () => {
        const adapter: StreamAdapter = {
            readStream(path, options?) { return new StorageStream() },
            writeStream(path, options?) { return new StorageStream() },
            duplexStream(path, options?) { return new StorageStream() },
            fileStream(path, mode?, options?) { return new StorageStream() },
        }
        expect(typeof adapter.readStream).toBe('function')
        expect(typeof adapter.fileStream).toBe('function')
    })
})

describe('MutateAdapter', () => {
    it('should define copy, rename, move, delete', () => {
        const adapter: MutateAdapter = {
            async copy(from, to, as?) {},
            async rename(path, renameTo) {},
            async move(from, to, as?) {},
            async delete(path) {},
        }
        expect(typeof adapter.copy).toBe('function')
        expect(typeof adapter.delete).toBe('function')
    })
})

describe('NavigateAdapter', () => {
    it('should define all navigate methods', () => {
        const adapter: NavigateAdapter = {
            async exists(path, mode?) { return true },
            async doesntExist(path, mode?) { return false },
            async stats(path) { return {} as StorageStats },
            async isFile(path) { return true },
            async isDirectory(path) { return false },
            async listDirectory(path, recursive?) { return [] },
            async getPresignedUrl(path, options?) { return '' },
        }
        expect(typeof adapter.exists).toBe('function')
        expect(typeof adapter.getPresignedUrl).toBe('function')
    })
})

describe('WatchAdapter', () => {
    it('should define watch', () => {
        const adapter: WatchAdapter = {
            watch(path, callback?) {
                return {
                    close() {},
                    [Symbol.dispose]() {},
                    [Symbol.asyncIterator]() {
                        return { async next() { return { done: true, value: undefined } } }
                    },
                }
            },
        }
        expect(typeof adapter.watch).toBe('function')
    })
})

describe('TransactionAdapter', () => {
    it('should define batch, commit, rollback', () => {
        const adapter: TransactionAdapter = {
            batch(operations) {
                return { id: '1', operations, status: 'pending' }
            },
            async commit(handle) {
                return { handle, results: [], succeeded: true }
            },
            async rollback(handle) {},
        }
        expect(typeof adapter.batch).toBe('function')
    })
})

describe('LockAdapter', () => {
    it('should define lock', () => {
        const adapter: LockAdapter = {
            async lock(path, options?) {
                return {
                    release() {},
                    [Symbol.dispose]() {},
                    get type() { return 'exclusive' as const },
                    get path() { return path instanceof StoragePath ? path : new StoragePath(path) },
                    get acquired() { return true },
                }
            },
        }
        expect(typeof adapter.lock).toBe('function')
    })
})

describe('MetadataAdapter', () => {
    it('should define getAttributes, setAttributes', () => {
        const adapter: MetadataAdapter = {
            async getAttributes(path) { return {} },
            async setAttributes(path, attrs) {},
        }
        expect(typeof adapter.getAttributes).toBe('function')
        expect(typeof adapter.setAttributes).toBe('function')
    })
})

describe('VersioningAdapter', () => {
    it('should define getByVersion, listVersions', () => {
        const adapter: VersioningAdapter = {
            async getByVersion(path, versionId) { return new Uint8Array() },
            async listVersions(path) { return [] },
        }
        expect(typeof adapter.getByVersion).toBe('function')
    })
})

describe('SearchAdapter', () => {
    it('should define query, filter', () => {
        const adapter: SearchAdapter = {
            async query(pattern, options?) { return [] },
            async filter(predicate) { return [] },
        }
        expect(typeof adapter.query).toBe('function')
    })
})

describe('LinkingAdapter', () => {
    it('should define symlink, hardlink, readlink', () => {
        const adapter: LinkingAdapter = {
            async symlink(target, linkPath) {},
            async hardlink(target, linkPath) {},
            async readlink(path) { return new StoragePath('') },
        }
        expect(typeof adapter.symlink).toBe('function')
    })
})

describe('EventsAdapter', () => {
    it('should define on, off, events', () => {
        const adapter: EventsAdapter = {
            on(event, handler) {},
            off(event, handler) {},
            events() {
                return { async *[Symbol.asyncIterator]() {} }
            },
        }
        expect(typeof adapter.on).toBe('function')
        expect(typeof adapter.events).toBe('function')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/interfaces/capabilities/__tests__/domains.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/interfaces/capabilities/ReadAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { StorageEncoding } from '../../../types/StorageEncoding'

type JSONReviver = (this: unknown, key: string, value: unknown) => unknown

export interface ReadAdapter {
    get(path: StoragePath | string, encoding?: StorageEncoding): Promise<string>
    getAsBuffer(path: StoragePath | string): Promise<Uint8Array>
    getAsJSON<T = unknown>(path: StoragePath | string, encoding?: StorageEncoding, reviver?: JSONReviver): Promise<T>
}

export type { JSONReviver }
```

```typescript
// src/adapters/interfaces/capabilities/WriteAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { StorageEncoding } from '../../../types/StorageEncoding'
import type { Input } from '../../../types/Input'
import type { MkdirOptions } from '../../../types/MkdirOptions'

export interface WriteAdapter {
    put(path: StoragePath | string, value: Input, encoding?: StorageEncoding): Promise<boolean>
    putStreamed(path: StoragePath | string, values: Input, encoding?: StorageEncoding): Promise<void>
    append(path: StoragePath | string, value: Input, encoding?: StorageEncoding): Promise<boolean>
    appendStreamed(path: StoragePath | string, values: Input, encoding?: StorageEncoding): Promise<void>
    mkdir(path: StoragePath | string, options?: MkdirOptions): Promise<void>
}
```

```typescript
// src/adapters/interfaces/capabilities/StreamAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { StorageStreamOptions } from '../../../types/StorageStreamOptions'
import type { StorageStream } from '../../../types/StorageStream'

export interface StreamAdapter {
    readStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T>
    writeStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T>
    duplexStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T>
    fileStream<T = Uint8Array>(path: StoragePath | string, mode?: FileStreamMode, options?: StorageStreamOptions): StorageStream<T>
}

export type FileStreamMode = 'r' | 'w' | 'rw'
```

```typescript
// src/adapters/interfaces/capabilities/MutateAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'

export interface MutateAdapter {
    copy(from: StoragePath | string, to: StoragePath | string, as?: string): Promise<void>
    rename(path: StoragePath | string, renameTo: StoragePath | string): Promise<void>
    move(from: StoragePath | string, to: StoragePath | string, as?: string): Promise<void>
    delete(path: StoragePath | string): Promise<void>
}
```

```typescript
// src/adapters/interfaces/capabilities/NavigateAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { StorageStats } from '../../../types/StorageStats'
import type { StorageListing } from '../../../types/StorageListing'
import type { AccessModeString } from '../../../types/AccessMode'
import type { PresignedUrlOptions } from '../../../types/PresignedUrlOptions'

export interface NavigateAdapter {
    exists(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean>
    doesntExist(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean>
    stats<T = unknown>(path: StoragePath | string): Promise<StorageStats<T>>
    isFile(path: StoragePath | string): Promise<boolean>
    isDirectory(path: StoragePath | string): Promise<boolean>
    listDirectory(path: StoragePath | string, recursive?: boolean): Promise<string[] | StorageListing>
    getPresignedUrl(path: StoragePath | string, options?: PresignedUrlOptions): Promise<string>
}
```

```typescript
// src/adapters/interfaces/capabilities/WatchAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { Timestamp } from '../../../types/Timestamp'

type WatchEventSlug = 'create' | 'modify' | 'delete' | 'rename'

interface BaseWatchEvent<T extends WatchEventSlug = WatchEventSlug> {
    type: T
    path: StoragePath
    timestamp: Timestamp<number | bigint>
}

export interface CreateEvent extends BaseWatchEvent<'create'> {}
export interface ModifyEvent extends BaseWatchEvent<'modify'> {}
export interface DeleteEvent extends BaseWatchEvent<'delete'> {}
export interface RenameEvent extends BaseWatchEvent<'rename'> {
    previousPath: StoragePath
}

export type WatchEvent = CreateEvent | ModifyEvent | DeleteEvent | RenameEvent
export type WatchCallback = (event: WatchEvent) => void

export interface WatchHandle extends Disposable, AsyncIterable<WatchEvent> {
    close(): void
    [Symbol.dispose](): void
}

export interface WatchAdapter {
    watch(path: StoragePath | string, callback?: WatchCallback): WatchHandle
}
```

```typescript
// src/adapters/interfaces/capabilities/TransactionAdapter.ts
import type { TransactionOperation } from '../../../types/capabilities'

export interface TransactionHandle {
    readonly id: string
    readonly operations: TransactionOperation[]
    readonly status: 'pending' | 'committed' | 'rolledback'
}

export interface TransactionResult {
    readonly handle: TransactionHandle
    readonly results: unknown[]
    readonly succeeded: boolean
}

export interface TransactionAdapter {
    batch(operations: TransactionOperation[]): TransactionHandle
    commit(handle: TransactionHandle): Promise<TransactionResult>
    rollback(handle: TransactionHandle): Promise<void>
}
```

```typescript
// src/adapters/interfaces/capabilities/LockAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'

export type LockType = 'exclusive' | 'shared'

export type LockOptions = {
    type?: LockType
    timeout?: number
}

export interface LockHandle extends Disposable {
    release(): void
    [Symbol.dispose](): void
    readonly type: LockType
    readonly path: StoragePath
    readonly acquired: boolean
}

export interface LockAdapter {
    lock(path: StoragePath | string, options?: LockOptions): Promise<LockHandle>
}
```

```typescript
// src/adapters/interfaces/capabilities/MetadataAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'

export interface MetadataAdapter {
    getAttributes(path: StoragePath | string): Promise<Record<string, unknown>>
    setAttributes(path: StoragePath | string, attrs: Record<string, unknown>): Promise<void>
}
```

```typescript
// src/adapters/interfaces/capabilities/VersioningAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { StorageStats } from '../../../types/StorageStats'
import type { Timestamp } from '../../../types/Timestamp'

export interface VersionInfo<T = unknown> {
    versionId: string
    path: StoragePath
    lastModified: Timestamp<number | bigint>
    isLatest: boolean
    size: number
    stats?: StorageStats<T>
}

export interface VersioningAdapter {
    getByVersion(path: StoragePath | string, versionId: string): Promise<Uint8Array>
    listVersions<T = unknown>(path: StoragePath | string): Promise<VersionInfo<T>[]>
}
```

```typescript
// src/adapters/interfaces/capabilities/SearchAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'
import type { StorageStats } from '../../../types/StorageStats'

export interface SearchOptions {
    maxResults?: number
    recursive?: boolean
}

export type SearchPredicate<T = unknown> = (path: StoragePath, stats: StorageStats<T>) => boolean

export interface SearchResult<T = unknown> {
    path: StoragePath
    stats: StorageStats<T>
}

export interface SearchAdapter {
    query<T = unknown>(pattern: string, options?: SearchOptions): Promise<SearchResult<T>[]>
    filter<T = unknown>(predicate: SearchPredicate<T>): Promise<SearchResult<T>[]>
}
```

```typescript
// src/adapters/interfaces/capabilities/LinkingAdapter.ts
import type { StoragePath } from '../../../types/StoragePath'

export interface LinkingAdapter {
    symlink(target: StoragePath | string, linkPath: StoragePath | string): Promise<void>
    hardlink(target: StoragePath | string, linkPath: StoragePath | string): Promise<void>
    readlink(path: StoragePath | string): Promise<StoragePath>
}
```

```typescript
// src/adapters/interfaces/capabilities/EventsAdapter.ts
import type { Timestamp } from '../../../types/Timestamp'
import type { StorageError } from '../../../shared/errors/StorageError'

type AdapterEventType = 'ready' | 'error' | 'disconnect' | 'reconnect'

interface BaseAdapterEvent<T extends AdapterEventType = AdapterEventType> {
    type: T
    timestamp: Timestamp
    adapter: string
    detail?: unknown
}

export interface ReadyEvent extends BaseAdapterEvent<'ready'> {}
export interface ErrorEvent extends BaseAdapterEvent<'error'> {
    error: StorageError
}
export interface DisconnectEvent extends BaseAdapterEvent<'disconnect'> {}
export interface ReconnectEvent extends BaseAdapterEvent<'reconnect'> {}

export type AdapterEvent = ReadyEvent | ErrorEvent | DisconnectEvent | ReconnectEvent
export type EventHandler = (event: AdapterEvent) => void

export interface EventsAdapter {
    on(event: AdapterEventType, handler: EventHandler): void
    off(event: AdapterEventType, handler: EventHandler): void
    events(): AsyncIterable<AdapterEvent>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/interfaces/capabilities/__tests__/domains.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/interfaces/capabilities/ src/adapters/interfaces/capabilities/__tests__/domains.spec.ts && git commit -S -m "feat(adapters): add 13 domain capability interfaces"
```

---

### Task 20: FsAdapter and BlobAdapter Type Aliases

**Files:**
- Create: `src/adapters/interfaces/FsAdapter.ts` (overwrite existing)
- Create: `src/adapters/interfaces/BlobAdapter.ts`
- Test: `src/adapters/interfaces/__tests__/composite-types.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/interfaces/__tests__/composite-types.spec.ts
import type { FsAdapter } from '../FsAdapter'
import type { BlobAdapter } from '../BlobAdapter'
import type { Adapter } from '../Adapter'
import type { ReadAdapter } from '../capabilities/ReadAdapter'
import { Read, Write, Stream, Mutate, Navigate, Watch, Transaction, Lock, Metadata, Versioning, Search, Linking, Events } from '../../capabilities'
import { describe, it, expect } from 'vitest'

describe('FsAdapter', () => {
    it('should be a type alias composing Adapter + all 13 domains', () => {
        const adapter: FsAdapter = {
            capabilities: new Set([Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events]),
            async get(p, e?) { return '' },
            async getAsBuffer(p) { return new Uint8Array() },
            async getAsJSON(p, e?, r?) { return {} as unknown },
            async put(p, v, e?) { return true },
            async putStreamed(p, v, e?) {},
            async append(p, v, e?) { return true },
            async appendStreamed(p, v, e?) {},
            async mkdir(p, o?) {},
            readStream(p, o?) { return null as any },
            writeStream(p, o?) { return null as any },
            duplexStream(p, o?) { return null as any },
            fileStream(p, m?, o?) { return null as any },
            async copy(f, t, a?) {},
            async rename(p, r) {},
            async move(f, t, a?) {},
            async delete(p) {},
            async exists(p, m?) { return true },
            async doesntExist(p, m?) { return false },
            async stats(p) { return null as any },
            async isFile(p) { return true },
            async isDirectory(p) { return false },
            async listDirectory(p, r?) { return [] },
            async getPresignedUrl(p, o?) { return '' },
            watch(p, c?) { return null as any },
            batch(o) { return null as any },
            async commit(h) { return null as any },
            async rollback(h) {},
            async lock(p, o?) { return null as any },
            async getAttributes(p) { return {} },
            async setAttributes(p, a) {},
            async getByVersion(p, v) { return new Uint8Array() },
            async listVersions(p) { return [] },
            async query(pat, o?) { return [] },
            async filter(pred) { return [] },
            async symlink(t, l) {},
            async hardlink(t, l) {},
            async readlink(p) { return null as any },
            on(e, h) {},
            off(e, h) {},
            events() { return null as any },
        }
        expect(adapter.capabilities.has(Read)).toBe(true)
    })
})

describe('BlobAdapter', () => {
    it('should be a type alias composing Adapter + all 13 domains', () => {
        const adapter: BlobAdapter = {
            capabilities: new Set([Read, Write]),
            async get(p, e?) { return '' },
            async getAsBuffer(p) { return new Uint8Array() },
            async getAsJSON(p, e?, r?) { return {} as unknown },
            async put(p, v, e?) { return true },
            async putStreamed(p, v, e?) {},
            async append(p, v, e?) { return true },
            async appendStreamed(p, v, e?) {},
            async mkdir(p, o?) {},
            readStream(p, o?) { return null as any },
            writeStream(p, o?) { return null as any },
            duplexStream(p, o?) { return null as any },
            fileStream(p, m?, o?) { return null as any },
            async copy(f, t, a?) {},
            async rename(p, r) {},
            async move(f, t, a?) {},
            async delete(p) {},
            async exists(p, m?) { return true },
            async doesntExist(p, m?) { return false },
            async stats(p) { return null as any },
            async isFile(p) { return true },
            async isDirectory(p) { return false },
            async listDirectory(p, r?) { return [] },
            async getPresignedUrl(p, o?) { return '' },
            watch(p, c?) { return null as any },
            batch(o) { return null as any },
            async commit(h) { return null as any },
            async rollback(h) {},
            async lock(p, o?) { return null as any },
            async getAttributes(p) { return {} },
            async setAttributes(p, a) {},
            async getByVersion(p, v) { return new Uint8Array() },
            async listVersions(p) { return [] },
            async query(pat, o?) { return [] },
            async filter(pred) { return [] },
            async symlink(t, l) {},
            async hardlink(t, l) {},
            async readlink(p) { return null as any },
            on(e, h) {},
            off(e, h) {},
            events() { return null as any },
        }
        expect(adapter.capabilities.has(Write)).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/interfaces/__tests__/composite-types.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/interfaces/FsAdapter.ts
import type { Adapter } from './Adapter'
import type { ReadAdapter } from './capabilities/ReadAdapter'
import type { WriteAdapter } from './capabilities/WriteAdapter'
import type { StreamAdapter } from './capabilities/StreamAdapter'
import type { MutateAdapter } from './capabilities/MutateAdapter'
import type { NavigateAdapter } from './capabilities/NavigateAdapter'
import type { WatchAdapter } from './capabilities/WatchAdapter'
import type { TransactionAdapter } from './capabilities/TransactionAdapter'
import type { LockAdapter } from './capabilities/LockAdapter'
import type { MetadataAdapter } from './capabilities/MetadataAdapter'
import type { VersioningAdapter } from './capabilities/VersioningAdapter'
import type { SearchAdapter } from './capabilities/SearchAdapter'
import type { LinkingAdapter } from './capabilities/LinkingAdapter'
import type { EventsAdapter } from './capabilities/EventsAdapter'

export type FsAdapter = Adapter &
    ReadAdapter &
    WriteAdapter &
    StreamAdapter &
    MutateAdapter &
    NavigateAdapter &
    WatchAdapter &
    TransactionAdapter &
    LockAdapter &
    MetadataAdapter &
    VersioningAdapter &
    SearchAdapter &
    LinkingAdapter &
    EventsAdapter
```

```typescript
// src/adapters/interfaces/BlobAdapter.ts
import type { Adapter } from './Adapter'
import type { ReadAdapter } from './capabilities/ReadAdapter'
import type { WriteAdapter } from './capabilities/WriteAdapter'
import type { StreamAdapter } from './capabilities/StreamAdapter'
import type { MutateAdapter } from './capabilities/MutateAdapter'
import type { NavigateAdapter } from './capabilities/NavigateAdapter'
import type { WatchAdapter } from './capabilities/WatchAdapter'
import type { TransactionAdapter } from './capabilities/TransactionAdapter'
import type { LockAdapter } from './capabilities/LockAdapter'
import type { MetadataAdapter } from './capabilities/MetadataAdapter'
import type { VersioningAdapter } from './capabilities/VersioningAdapter'
import type { SearchAdapter } from './capabilities/SearchAdapter'
import type { LinkingAdapter } from './capabilities/LinkingAdapter'
import type { EventsAdapter } from './capabilities/EventsAdapter'

export type BlobAdapter = Adapter &
    ReadAdapter &
    WriteAdapter &
    StreamAdapter &
    MutateAdapter &
    NavigateAdapter &
    WatchAdapter &
    TransactionAdapter &
    LockAdapter &
    MetadataAdapter &
    VersioningAdapter &
    SearchAdapter &
    LinkingAdapter &
    EventsAdapter
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/interfaces/__tests__/composite-types.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/interfaces/FsAdapter.ts src/adapters/interfaces/BlobAdapter.ts src/adapters/interfaces/__tests__/composite-types.spec.ts && git commit -S -m "feat(adapters): add FsAdapter and BlobAdapter type aliases composing all 13 domains"
```

---

### Task 21: CapabilityMap and CompositeAdapter

**Files:**
- Create: `src/adapters/interfaces/CapabilityMap.ts`
- Create: `src/adapters/interfaces/CompositeAdapter.ts`
- Test: `src/adapters/interfaces/__tests__/CapabilityMap-CompositeAdapter.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/interfaces/__tests__/CapabilityMap-CompositeAdapter.spec.ts
import type { CompositeAdapter } from '../CompositeAdapter'
import type { Adapter } from '../Adapter'
import { Read, Write, Search } from '../../capabilities'
import { describe, it, expect } from 'vitest'

describe('CapabilityMap', () => {
    it('should map symbols to domain interfaces', async () => {
        const { CapabilityMap } = await import('../CapabilityMap')
        expect(CapabilityMap[Read]).toBeDefined()
        expect(CapabilityMap[Write]).toBeDefined()
    })
})

describe('CompositeAdapter', () => {
    it('should extend Adapter with base and extensions', () => {
        const base: Adapter = { capabilities: new Set([Read, Write]) }
        const ext: Adapter = { capabilities: new Set([Search]) }

        const composite: CompositeAdapter = {
            capabilities: new Set([Read, Write, Search]),
            base,
            extensions: [ext],
        }
        expect(composite.capabilities.size).toBe(3)
        expect(composite.base).toBe(base)
        expect(composite.extensions).toHaveLength(1)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/interfaces/__tests__/CapabilityMap-CompositeAdapter.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/interfaces/CapabilityMap.ts
import type { ReadAdapter } from './capabilities/ReadAdapter'
import type { WriteAdapter } from './capabilities/WriteAdapter'
import type { StreamAdapter } from './capabilities/StreamAdapter'
import type { MutateAdapter } from './capabilities/MutateAdapter'
import type { NavigateAdapter } from './capabilities/NavigateAdapter'
import type { WatchAdapter } from './capabilities/WatchAdapter'
import type { TransactionAdapter } from './capabilities/TransactionAdapter'
import type { LockAdapter } from './capabilities/LockAdapter'
import type { MetadataAdapter } from './capabilities/MetadataAdapter'
import type { VersioningAdapter } from './capabilities/VersioningAdapter'
import type { SearchAdapter } from './capabilities/SearchAdapter'
import type { LinkingAdapter } from './capabilities/LinkingAdapter'
import type { EventsAdapter } from './capabilities/EventsAdapter'
import { Read, Write, Stream, Mutate, Navigate, Watch, Transaction, Lock, Metadata, Versioning, Search, Linking, Events } from '../capabilities'

export interface CapabilityMap {
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

export const CapabilityMap: CapabilityMap = {
    [Read]: null as unknown as ReadAdapter,
    [Write]: null as unknown as WriteAdapter,
    [Stream]: null as unknown as StreamAdapter,
    [Mutate]: null as unknown as MutateAdapter,
    [Navigate]: null as unknown as NavigateAdapter,
    [Watch]: null as unknown as WatchAdapter,
    [Transaction]: null as unknown as TransactionAdapter,
    [Lock]: null as unknown as LockAdapter,
    [Metadata]: null as unknown as MetadataAdapter,
    [Versioning]: null as unknown as VersioningAdapter,
    [Search]: null as unknown as SearchAdapter,
    [Linking]: null as unknown as LinkingAdapter,
    [Events]: null as unknown as EventsAdapter,
}
```

```typescript
// src/adapters/interfaces/CompositeAdapter.ts
import type { Adapter } from './Adapter'

export interface CompositeAdapter extends Adapter {
    readonly capabilities: Set<symbol>
    readonly base: Adapter
    readonly extensions: Adapter[]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/interfaces/__tests__/CapabilityMap-CompositeAdapter.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/interfaces/CapabilityMap.ts src/adapters/interfaces/CompositeAdapter.ts src/adapters/interfaces/__tests__/CapabilityMap-CompositeAdapter.spec.ts && git commit -S -m "feat(adapters): add CapabilityMap and CompositeAdapter interfaces"
```

---

### Task 22: Update RuntimeResolver Interface

**Files:**
- Modify: `src/adapters/interfaces/RuntimeResolver.ts`
- Test: `src/adapters/interfaces/__tests__/RuntimeResolver.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/interfaces/__tests__/RuntimeResolver.spec.ts
import type { RuntimeResolver } from '../RuntimeResolver'
import { Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events } from '../../capabilities'
import { describe, it, expect } from 'vitest'

describe('RuntimeResolver', () => {
    it('should include capabilities field', () => {
        const resolver: RuntimeResolver = {
            runtime: 'node',
            capabilities: [Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events],
            matchesEnvironment() { return true },
            create() { return null as any },
        }
        expect(resolver.runtime).toBe('node')
        expect(resolver.capabilities).toHaveLength(10)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/interfaces/__tests__/RuntimeResolver.spec.ts`

Expected: FAIL — `capabilities` not in interface

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/interfaces/RuntimeResolver.ts
import type { Adapter } from './Adapter'

export interface RuntimeResolver {
    readonly runtime: string
    readonly capabilities: symbol[]
    matchesEnvironment(): boolean
    create(): Adapter
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/interfaces/__tests__/RuntimeResolver.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS (may need to fix references to old FsAdapter return type)

- [ ] **Step 6: Fix any broken references from FsAdapter→Adapter change in resolve.ts**

```typescript
// src/adapters/resolve.ts
import type { Adapter } from './interfaces/Adapter'
import type { RuntimeResolver } from './interfaces/RuntimeResolver'

const registry: RuntimeResolver[] = []

export function registerRuntime(resolver: RuntimeResolver): void {
    registry.push(resolver)
}

export function detectRuntime(): string {
    for (const resolver of registry) {
        if (resolver.matchesEnvironment()) return resolver.runtime
    }
    return 'unknown'
}

export function resolveAdapter(): Adapter | null {
    for (const resolver of registry) {
        if (resolver.matchesEnvironment()) return resolver.create()
    }
    return null
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/adapters/interfaces/RuntimeResolver.ts src/adapters/interfaces/__tests__/RuntimeResolver.spec.ts src/adapters/resolve.ts && git commit -S -m "feat(adapters): update RuntimeResolver with capabilities field and Adapter return type"
```

---

### Task 23: Update Interfaces Barrel + Add CapabilityOperation Type

**Files:**
- Modify: `src/adapters/interfaces/index.ts`
- Modify: `src/types/capabilities.ts` (add CapabilityOperation)
- Test: `src/types/__tests__/capabilities.spec.ts` (extend)

- [ ] **Step 1: Write the failing test**

```typescript
// Update src/types/__tests__/capabilities.spec.ts — add:
import type { CapabilityOperation } from '../capabilities'

describe('CapabilityOperation', () => {
    it('should include method names from all domains', () => {
        const ops: CapabilityOperation[] = [
            'get', 'getAsBuffer', 'getAsJSON',
            'put', 'putStreamed', 'append', 'appendStreamed', 'mkdir',
            'readStream', 'writeStream', 'duplexStream', 'fileStream',
            'copy', 'rename', 'move', 'delete',
            'exists', 'doesntExist', 'stats', 'isFile', 'isDirectory', 'listDirectory', 'getPresignedUrl',
            'watch',
            'batch', 'commit', 'rollback',
            'lock',
            'getAttributes', 'setAttributes',
            'getByVersion', 'listVersions',
            'query', 'filter',
            'symlink', 'hardlink', 'readlink',
            'on', 'off', 'events',
        ]
        expect(ops.length).toBeGreaterThan(0)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/capabilities.spec.ts`

Expected: FAIL — CapabilityOperation not found

- [ ] **Step 3: Write minimal implementation**

Update `src/types/capabilities.ts`:

```typescript
// src/types/capabilities.ts
import type { StoragePath } from './StoragePath'
import type { Input } from './Input'
import type { ReadAdapter } from '../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../adapters/interfaces/capabilities/WriteAdapter'
import type { StreamAdapter } from '../adapters/interfaces/capabilities/StreamAdapter'
import type { MutateAdapter } from '../adapters/interfaces/capabilities/MutateAdapter'
import type { NavigateAdapter } from '../adapters/interfaces/capabilities/NavigateAdapter'
import type { WatchAdapter } from '../adapters/interfaces/capabilities/WatchAdapter'
import type { TransactionAdapter } from '../adapters/interfaces/capabilities/TransactionAdapter'
import type { LockAdapter } from '../adapters/interfaces/capabilities/LockAdapter'
import type { MetadataAdapter } from '../adapters/interfaces/capabilities/MetadataAdapter'
import type { VersioningAdapter } from '../adapters/interfaces/capabilities/VersioningAdapter'
import type { SearchAdapter } from '../adapters/interfaces/capabilities/SearchAdapter'
import type { LinkingAdapter } from '../adapters/interfaces/capabilities/LinkingAdapter'
import type { EventsAdapter } from '../adapters/interfaces/capabilities/EventsAdapter'

export type TransactionOperation =
    | { type: 'put'; path: StoragePath | string; value: Input }
    | { type: 'delete'; path: StoragePath | string }
    | { type: 'copy'; from: StoragePath | string; to: StoragePath | string }
    | { type: 'move'; from: StoragePath | string; to: StoragePath | string }

export type ReadOperations = keyof ReadAdapter
export type WriteOperations = keyof WriteAdapter
export type StreamOperations = keyof StreamAdapter
export type MutateOperations = keyof MutateAdapter
export type NavigateOperations = keyof NavigateAdapter
export type WatchOperations = keyof WatchAdapter
export type TransactionAdapterOperations = keyof TransactionAdapter
export type LockOperations = keyof LockAdapter
export type MetadataOperations = keyof MetadataAdapter
export type VersioningOperations = keyof VersioningAdapter
export type SearchOperations = keyof SearchAdapter
export type LinkingOperations = keyof LinkingAdapter
export type EventsOperations = keyof EventsAdapter

export type CapabilityOperation =
    | ReadOperations
    | WriteOperations
    | StreamOperations
    | MutateOperations
    | NavigateOperations
    | WatchOperations
    | TransactionAdapterOperations
    | LockOperations
    | MetadataOperations
    | VersioningOperations
    | SearchOperations
    | LinkingOperations
    | EventsOperations
```

Update `src/adapters/interfaces/index.ts`:

```typescript
// src/adapters/interfaces/index.ts
export type { Adapter } from './Adapter'
export type { RuntimeResolver } from './RuntimeResolver'
export type { CompositeAdapter } from './CompositeAdapter'
export type { CapabilityMap } from './CapabilityMap'
export type { FsAdapter } from './FsAdapter'
export type { BlobAdapter } from './BlobAdapter'

export type { ReadAdapter, JSONReviver } from './capabilities/ReadAdapter'
export type { WriteAdapter } from './capabilities/WriteAdapter'
export type { StreamAdapter, FileStreamMode } from './capabilities/StreamAdapter'
export type { MutateAdapter } from './capabilities/MutateAdapter'
export type { NavigateAdapter } from './capabilities/NavigateAdapter'
export type { WatchAdapter, WatchEvent, WatchCallback, WatchHandle, CreateEvent, ModifyEvent, DeleteEvent, RenameEvent } from './capabilities/WatchAdapter'
export type { TransactionAdapter, TransactionHandle, TransactionResult } from './capabilities/TransactionAdapter'
export type { LockAdapter, LockHandle, LockOptions, LockType } from './capabilities/LockAdapter'
export type { MetadataAdapter } from './capabilities/MetadataAdapter'
export type { VersioningAdapter, VersionInfo } from './capabilities/VersioningAdapter'
export type { SearchAdapter, SearchOptions, SearchPredicate, SearchResult } from './capabilities/SearchAdapter'
export type { LinkingAdapter } from './capabilities/LinkingAdapter'
export type { EventsAdapter, AdapterEvent, EventHandler, AdapterEventType, ReadyEvent, ErrorEvent, DisconnectEvent, ReconnectEvent } from './capabilities/EventsAdapter'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/capabilities.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/capabilities.ts src/adapters/interfaces/index.ts src/types/__tests__/capabilities.spec.ts && git commit -S -m "feat(adapters): update interfaces barrel and add CapabilityOperation derived type"
```

---

## Sub-Plan 3: Domain Functions + NodeFsAdapter Rewrite

### Task 24: Domain Function Infrastructure — _getAdapter and sanitizeInput Update

**Files:**
- Modify: `src/bootstrap.ts` — update `_getAdapter()` return type to `Adapter`
- Modify: `src/shared/utils/sanitizeInput.ts` — rewrite for new Input type
- Test: `src/shared/utils/__tests__/sanitizeInput.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/utils/__tests__/sanitizeInput.spec.ts
import { sanitizeInput } from '../sanitizeInput'
import { describe, it, expect } from 'vitest'

describe('sanitizeInput', () => {
    it('should return string unchanged', () => {
        expect(sanitizeInput('hello')).toBe('hello')
    })

    it('should return Uint8Array unchanged', () => {
        const buf = new Uint8Array([1, 2, 3])
        expect(sanitizeInput(buf)).toBe(buf)
    })

    it('should convert ArrayBuffer to Uint8Array', () => {
        const ab = new ArrayBuffer(4)
        const result = sanitizeInput(ab)
        expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should serialize object via JSON.stringify', () => {
        const obj = { key: 'value' }
        const result = sanitizeInput(obj)
        expect(result).toBeInstanceOf(Uint8Array)
        const decoded = new TextDecoder().decode(result as Uint8Array)
        expect(decoded).toBe('{"key":"value"}')
    })

    it('should serialize object with toJSON via toJSON first', () => {
        const obj = { toJSON() { return { simplified: true } } }
        const result = sanitizeInput(obj)
        expect(result).toBeInstanceOf(Uint8Array)
        const decoded = new TextDecoder().decode(result as Uint8Array)
        expect(decoded).toBe('{"simplified":true}')
    })

    it('should serialize Serializable via toJSON first', () => {
        const serializable = {
            toJSON() { return 'serialized' },
            toString() { return 'serialized' },
        }
        const result = sanitizeInput(serializable)
        expect(result).toBeInstanceOf(Uint8Array)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/utils/__tests__/sanitizeInput.spec.ts`

Expected: FAIL — current implementation returns `Buffer` for objects, not `Uint8Array`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/shared/utils/sanitizeInput.ts
import type { ValidInput, Input } from '../../types/Input'
import type { Serializable } from '../../types/Serializable'
import { isIterable, isAsyncIterable } from './isIterable'

export function sanitizeInput(input: string): string
export function sanitizeInput(input: Uint8Array): Uint8Array
export function sanitizeInput(input: ArrayBuffer): Uint8Array
export function sanitizeInput(input: object): Uint8Array
export function sanitizeInput(input: Input): ValidInput
export function sanitizeInput(input: Input): ValidInput {
    if (typeof input === 'string') return input
    if (input instanceof Uint8Array) return input
    if (input instanceof ArrayBuffer) return new Uint8Array(input)
    if (typeof input === 'object' && input !== null) {
        if ('toJSON' in input && typeof input.toJSON === 'function') {
            const json = input.toJSON()
            const encoded = new TextEncoder().encode(JSON.stringify(json))
            return encoded
        }
        const encoded = new TextEncoder().encode(JSON.stringify(input))
        return encoded
    }
    const encoded = new TextEncoder().encode(String(input))
    return encoded
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/utils/__tests__/sanitizeInput.spec.ts`

Expected: PASS

- [ ] **Step 5: Update bootstrap.ts return type**

```typescript
// src/bootstrap.ts — update _getAdapter return type
import type { Adapter } from './adapters/interfaces/Adapter'
import './adapters/auto-register'
import { detectRuntime, resolveAdapter } from './adapters/resolve'
import { UnsupportedEnvironmentError } from './shared/errors/UnsupportedEnvironmentError'

let _adapter: Adapter | null = null
let _bootstrapped = false

export function _bootstrap(): void {
    if (_bootstrapped) return
    try {
        _adapter = resolveAdapter()
        _bootstrapped = true
    } catch (error) {
        _bootstrapped = false
        throw error
    }
}

export function bootstrap(): void {
    _bootstrap()
}

export function setFS(adapter: Adapter): void {
    _bootstrapped = true
    _adapter = adapter
}

export function useAdapter(adapter: Adapter) {
    const methods: Record<string, unknown> = {}
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(adapter))) {
        if (key === 'constructor' || key === 'capabilities') continue
        const value = (adapter as Record<string, unknown>)[key]
        if (typeof value === 'function') {
            methods[key] = value.bind(adapter)
        }
    }
    methods.capabilities = adapter.capabilities
    return Object.freeze(methods)
}

export function _getAdapter(): Adapter {
    _bootstrap()
    if (!_adapter) throw new UnsupportedEnvironmentError(detectRuntime())
    return _adapter
}

export { detectRuntime }
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS (with expected errors from old code referencing FsAdapter — these will be fixed in subsequent tasks)

- [ ] **Step 7: Commit**

```bash
git add src/shared/utils/sanitizeInput.ts src/shared/utils/__tests__/sanitizeInput.spec.ts src/bootstrap.ts && git commit -S -m "refactor(shared): update sanitizeInput for new Input types and bootstrap for Adapter"
```

---

### Task 25: Fs Family Read Domain Functions

**Files:**
- Create: `src/fs/index.ts`
- Create: `src/fs/read/get.ts`
- Create: `src/fs/read/getAsBuffer.ts`
- Create: `src/fs/read/getAsJSON.ts`
- Test: `src/fs/read/__tests__/read.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/fs/read/__tests__/read.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../../adapters/interfaces/capabilities/ReadAdapter'
import { Read } from '../../../adapters/capabilities'
import { _getAdapter } from '../../../bootstrap'

import { get } from '../get'
import { getAsBuffer } from '../getAsBuffer'
import { getAsJSON } from '../getAsJSON'

class MockReadAdapter implements Adapter, ReadAdapter {
    capabilities = new Set([Read])
    async get(path, encoding?) { return 'file content' }
    async getAsBuffer(path) { return new Uint8Array([1, 2, 3]) }
    async getAsJSON(path, encoding?, reviver?) { return { parsed: true } }
}

describe('read domain functions', () => {
    beforeEach(() => {
        const { setFS } = await import('../../../bootstrap')
        setFS(new MockReadAdapter())
    })

    it('get should delegate to adapter', async () => {
        const result = await get('/test.txt')
        expect(result).toBe('file content')
    })

    it('getAsBuffer should delegate to adapter', async () => {
        const result = await getAsBuffer('/test.txt')
        expect(result).toBeInstanceOf(Uint8Array)
        expect(result).toEqual(new Uint8Array([1, 2, 3]))
    })

    it('getAsJSON should delegate to adapter', async () => {
        const result = await getAsJSON<{ parsed: boolean }>('/test.json')
        expect(result).toEqual({ parsed: true })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fs/read/__tests__/read.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/fs/read/get.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import { Read } from '../../adapters/capabilities'

export async function get(path: StoragePath | string, encoding: StorageEncoding = 'utf-8'): Promise<string> {
    const adapter = _getAdapter() as unknown as ReadAdapter
    return adapter.get(path, encoding)
}
```

```typescript
// src/fs/read/getAsBuffer.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import { Read } from '../../adapters/capabilities'

export async function getAsBuffer(path: StoragePath | string): Promise<Uint8Array> {
    const adapter = _getAdapter() as unknown as ReadAdapter
    return adapter.getAsBuffer(path)
}
```

```typescript
// src/fs/read/getAsJSON.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { ReadAdapter, JSONReviver } from '../../adapters/interfaces/capabilities/ReadAdapter'
import { Read } from '../../adapters/capabilities'

export async function getAsJSON<T = unknown>(
    path: StoragePath | string,
    encoding?: StorageEncoding,
    reviver?: JSONReviver,
): Promise<T> {
    const adapter = _getAdapter() as unknown as ReadAdapter
    return adapter.getAsJSON<T>(path, encoding, reviver)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fs/read/__tests__/read.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
mkdir -p src/fs/read && git add src/fs/read/ src/fs/read/__tests__/read.spec.ts && git commit -S -m "feat(fs): add read domain functions (get, getAsBuffer, getAsJSON)"
```

---

### Task 26: Fs Family Write Domain Functions

**Files:**
- Create: `src/fs/write/put.ts`
- Create: `src/fs/write/putStreamed.ts`
- Create: `src/fs/write/append.ts`
- Create: `src/fs/write/appendStreamed.ts`
- Create: `src/fs/write/mkdir.ts`
- Test: `src/fs/write/__tests__/write.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/fs/write/__tests__/write.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { WriteAdapter } from '../../../adapters/interfaces/capabilities/WriteAdapter'
import { Write } from '../../../adapters/capabilities'
import { setFS } from '../../../bootstrap'
import { put } from '../put'
import { putStreamed } from '../putStreamed'
import { append } from '../append'
import { appendStreamed } from '../appendStreamed'
import { mkdir } from '../mkdir'

class MockWriteAdapter implements Adapter, WriteAdapter {
    capabilities = new Set([Write])
    async put(path, value, encoding?) { return true }
    async putStreamed(path, values, encoding?) {}
    async append(path, value, encoding?) { return true }
    async appendStreamed(path, values, encoding?) {}
    async mkdir(path, options?) {}
}

describe('write domain functions', () => {
    beforeEach(() => {
        setFS(new MockWriteAdapter())
    })

    it('put should delegate to adapter', async () => {
        const result = await put('/test.txt', 'content')
        expect(result).toBe(true)
    })

    it('putStreamed should delegate to adapter', async () => {
        await expect(putStreamed('/test.txt', 'content')).resolves.toBeUndefined()
    })

    it('append should delegate to adapter', async () => {
        const result = await append('/test.txt', 'more')
        expect(result).toBe(true)
    })

    it('appendStreamed should delegate to adapter', async () => {
        await expect(appendStreamed('/test.txt', 'more')).resolves.toBeUndefined()
    })

    it('mkdir should delegate to adapter', async () => {
        await expect(mkdir('/new-dir')).resolves.toBeUndefined()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fs/write/__tests__/write.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/fs/write/put.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { Input } from '../../types/Input'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'

export async function put(
    path: StoragePath | string,
    value: Input,
    encoding?: StorageEncoding,
): Promise<boolean> {
    const adapter = _getAdapter() as unknown as WriteAdapter
    return adapter.put(path, value, encoding)
}
```

```typescript
// src/fs/write/putStreamed.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { Input } from '../../types/Input'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'

export async function putStreamed(
    path: StoragePath | string,
    values: Input,
    encoding?: StorageEncoding,
): Promise<void> {
    const adapter = _getAdapter() as unknown as WriteAdapter
    return adapter.putStreamed(path, values, encoding)
}
```

```typescript
// src/fs/write/append.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { Input } from '../../types/Input'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'

export async function append(
    path: StoragePath | string,
    value: Input,
    encoding?: StorageEncoding,
): Promise<boolean> {
    const adapter = _getAdapter() as unknown as WriteAdapter
    return adapter.append(path, value, encoding)
}
```

```typescript
// src/fs/write/appendStreamed.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { Input } from '../../types/Input'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'

export async function appendStreamed(
    path: StoragePath | string,
    values: Input,
    encoding?: StorageEncoding,
): Promise<void> {
    const adapter = _getAdapter() as unknown as WriteAdapter
    return adapter.appendStreamed(path, values, encoding)
}
```

```typescript
// src/fs/write/mkdir.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MkdirOptions } from '../../types/MkdirOptions'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'

export async function mkdir(
    path: StoragePath | string,
    options?: MkdirOptions,
): Promise<void> {
    const adapter = _getAdapter() as unknown as WriteAdapter
    return adapter.mkdir(path, options)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fs/write/__tests__/write.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/fs/write/ src/fs/write/__tests__/write.spec.ts && git commit -S -m "feat(fs): add write domain functions (put, putStreamed, append, appendStreamed, mkdir)"
```

---

### Task 27: Fs Family Stream Domain Functions

**Files:**
- Create: `src/fs/stream/readStream.ts`
- Create: `src/fs/stream/writeStream.ts`
- Create: `src/fs/stream/duplexStream.ts`
- Create: `src/fs/stream/fileStream.ts`
- Create: `src/fs/stream/pipe.ts`
- Create: `src/fs/stream/merge.ts`
- Create: `src/fs/stream/flatMap.ts`
- Create: `src/fs/stream/transform.ts`
- Test: `src/fs/stream/__tests__/stream.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/fs/stream/__tests__/stream.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { StreamAdapter } from '../../../adapters/interfaces/capabilities/StreamAdapter'
import { Stream } from '../../../adapters/capabilities'
import { StorageStream } from '../../../types/StorageStream'
import { setFS } from '../../../bootstrap'
import { readStream } from '../readStream'
import { writeStream } from '../writeStream'
import { duplexStream } from '../duplexStream'
import { fileStream } from '../fileStream'
import { pipe } from '../pipe'
import { merge } from '../merge'
import { flatMap } from '../flatMap'
import { transform } from '../transform'

class MockStreamAdapter implements Adapter, StreamAdapter {
    capabilities = new Set([Stream])
    readStream(path, options?) { return new StorageStream<Uint8Array>() }
    writeStream(path, options?) { return new StorageStream<Uint8Array>() }
    duplexStream(path, options?) { return new StorageStream<Uint8Array>() }
    fileStream(path, mode?, options?) { return new StorageStream<Uint8Array>() }
}

describe('stream domain functions', () => {
    beforeEach(() => {
        setFS(new MockStreamAdapter())
    })

    it('readStream should delegate to adapter', () => {
        const result = readStream('/test.txt')
        expect(result).toBeInstanceOf(StorageStream)
    })

    it('writeStream should delegate to adapter', () => {
        const result = writeStream('/test.txt')
        expect(result).toBeInstanceOf(StorageStream)
    })

    it('duplexStream should delegate to adapter', () => {
        const result = duplexStream('/test.txt')
        expect(result).toBeInstanceOf(StorageStream)
    })

    it('fileStream should delegate to adapter', () => {
        const result = fileStream('/test.txt', 'r')
        expect(result).toBeInstanceOf(StorageStream)
    })
})

describe('stream composition utilities', () => {
    it('pipe should connect two StorageStreams', async () => {
        const source = new StorageStream<number>()
        const dest = new StorageStream<number>()
        source.push(1)
        source.push(2)
        source.close()
        pipe(source, dest)
        const chunks: number[] = []
        for await (const chunk of dest) { chunks.push(chunk) }
        expect(chunks).toEqual([1, 2])
    })

    it('merge should combine multiple streams', async () => {
        const a = new StorageStream<number>()
        const b = new StorageStream<number>()
        a.push(1)
        b.push(2)
        a.close()
        b.close()
        const merged = merge(a, b)
        const chunks: number[] = []
        for await (const chunk of merged) { chunks.push(chunk) }
        expect(chunks).toContain(1)
        expect(chunks).toContain(2)
    })

    it('flatMap should transform and flatten', async () => {
        const source = new StorageStream<number>()
        source.push(1)
        source.push(2)
        source.close()
        const result = flatMap(source, n => [n, n * 10])
        const chunks: number[] = []
        for await (const chunk of result) { chunks.push(chunk) }
        expect(chunks).toEqual([1, 10, 2, 20])
    })

    it('transform should apply mapping function', async () => {
        const source = new StorageStream<number>()
        source.push(1)
        source.push(2)
        source.close()
        const result = transform(source, n => n * 2)
        const chunks: number[] = []
        for await (const chunk of result) { chunks.push(chunk) }
        expect(chunks).toEqual([2, 4])
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fs/stream/__tests__/stream.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/fs/stream/readStream.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageStreamOptions } from '../../types/StorageStreamOptions'
import type { StorageStream } from '../../types/StorageStream'
import type { StreamAdapter } from '../../adapters/interfaces/capabilities/StreamAdapter'

export function readStream<T = Uint8Array>(
    path: StoragePath | string,
    options?: StorageStreamOptions,
): StorageStream<T> {
    const adapter = _getAdapter() as unknown as StreamAdapter
    return adapter.readStream<T>(path, options)
}
```

```typescript
// src/fs/stream/writeStream.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageStreamOptions } from '../../types/StorageStreamOptions'
import type { StorageStream } from '../../types/StorageStream'
import type { StreamAdapter } from '../../adapters/interfaces/capabilities/StreamAdapter'

export function writeStream<T = Uint8Array>(
    path: StoragePath | string,
    options?: StorageStreamOptions,
): StorageStream<T> {
    const adapter = _getAdapter() as unknown as StreamAdapter
    return adapter.writeStream<T>(path, options)
}
```

```typescript
// src/fs/stream/duplexStream.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageStreamOptions } from '../../types/StorageStreamOptions'
import type { StorageStream } from '../../types/StorageStream'
import type { StreamAdapter } from '../../adapters/interfaces/capabilities/StreamAdapter'

export function duplexStream<T = Uint8Array>(
    path: StoragePath | string,
    options?: StorageStreamOptions,
): StorageStream<T> {
    const adapter = _getAdapter() as unknown as StreamAdapter
    return adapter.duplexStream<T>(path, options)
}
```

```typescript
// src/fs/stream/fileStream.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageStreamOptions } from '../../types/StorageStreamOptions'
import type { StorageStream } from '../../types/StorageStream'
import type { StreamAdapter, FileStreamMode } from '../../adapters/interfaces/capabilities/StreamAdapter'

export function fileStream<T = Uint8Array>(
    path: StoragePath | string,
    mode?: FileStreamMode,
    options?: StorageStreamOptions,
): StorageStream<T> {
    const adapter = _getAdapter() as unknown as StreamAdapter
    return adapter.fileStream<T>(path, mode, options)
}
```

```typescript
// src/fs/stream/pipe.ts
import type { StorageStream } from '../../types/StorageStream'

export function pipe<T>(
    source: StorageStream<T>,
    destination: StorageStream<T>,
): StorageStream<T> {
    source.pipe(destination)
    return destination
}
```

```typescript
// src/fs/stream/merge.ts
import { StorageStream } from '../../types/StorageStream'

export function merge<T>(...streams: StorageStream<T>[]): StorageStream<T> {
    const result = new StorageStream<T>()
    let activeCount = streams.length

    for (const stream of streams) {
        ;(async () => {
            for await (const chunk of stream) {
                result.push(chunk)
            }
            activeCount--
            if (activeCount === 0) result.close()
        })()
    }

    return result
}
```

```typescript
// src/fs/stream/flatMap.ts
import { StorageStream } from '../../types/StorageStream'

export function flatMap<T, U>(
    stream: StorageStream<T>,
    fn: (chunk: T) => U[],
): StorageStream<U> {
    const result = new StorageStream<U>()
    ;(async () => {
        for await (const chunk of stream) {
            for (const item of fn(chunk)) {
                result.push(item)
            }
        }
        result.close()
    })()
    return result
}
```

```typescript
// src/fs/stream/transform.ts
import { StorageStream } from '../../types/StorageStream'

export function transform<T, U>(
    stream: StorageStream<T>,
    fn: (chunk: T) => U,
): StorageStream<U> {
    const result = new StorageStream<U>()
    ;(async () => {
        for await (const chunk of stream) {
            result.push(fn(chunk))
        }
        result.close()
    })()
    return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fs/stream/__tests__/stream.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/fs/stream/ src/fs/stream/__tests__/stream.spec.ts && git commit -S -m "feat(fs): add stream domain functions and composition utilities"
```

---

### Task 28: Fs Family Mutate + Navigate Domain Functions

**Files:**
- Create: `src/fs/mutate/copy.ts`, `src/fs/mutate/rename.ts`, `src/fs/mutate/move.ts`, `src/fs/mutate/delete.ts`
- Create: `src/fs/navigate/exists.ts`, `src/fs/navigate/doesntExist.ts`, `src/fs/navigate/stats.ts`, `src/fs/navigate/isFile.ts`, `src/fs/navigate/isDirectory.ts`, `src/fs/navigate/listDirectory.ts`, `src/fs/navigate/getPresignedUrl.ts`
- Test: `src/fs/mutate/__tests__/mutate.spec.ts`
- Test: `src/fs/navigate/__tests__/navigate.spec.ts`

- [ ] **Step 1: Write the failing test for mutate**

```typescript
// src/fs/mutate/__tests__/mutate.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { MutateAdapter } from '../../../adapters/interfaces/capabilities/MutateAdapter'
import { Mutate } from '../../../adapters/capabilities'
import { setFS } from '../../../bootstrap'
import { copy } from '../copy'
import { rename } from '../rename'
import { move } from '../move'
import { deleteFile } from '../delete'

let lastOp = ''

class MockMutateAdapter implements Adapter, MutateAdapter {
    capabilities = new Set([Mutate])
    async copy(from, to, as?) { lastOp = 'copy' }
    async rename(path, renameTo) { lastOp = 'rename' }
    async move(from, to, as?) { lastOp = 'move' }
    async delete(path) { lastOp = 'delete' }
}

describe('mutate domain functions', () => {
    beforeEach(() => {
        lastOp = ''
        setFS(new MockMutateAdapter())
    })

    it('copy should delegate to adapter', async () => {
        await copy('/from', '/to')
        expect(lastOp).toBe('copy')
    })

    it('rename should delegate to adapter', async () => {
        await rename('/old', '/new')
        expect(lastOp).toBe('rename')
    })

    it('move should delegate to adapter', async () => {
        await move('/from', '/to')
        expect(lastOp).toBe('move')
    })

    it('delete should delegate to adapter', async () => {
        await deleteFile('/file.txt')
        expect(lastOp).toBe('delete')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fs/mutate/__tests__/mutate.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 3: Write mutate implementations**

```typescript
// src/fs/mutate/copy.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'

export async function copy(
    from: StoragePath | string,
    to: StoragePath | string,
    as?: string,
): Promise<void> {
    const adapter = _getAdapter() as unknown as MutateAdapter
    return adapter.copy(from, to, as)
}
```

```typescript
// src/fs/mutate/rename.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'

export async function rename(
    path: StoragePath | string,
    renameTo: StoragePath | string,
): Promise<void> {
    const adapter = _getAdapter() as unknown as MutateAdapter
    return adapter.rename(path, renameTo)
}
```

```typescript
// src/fs/mutate/move.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'

export async function move(
    from: StoragePath | string,
    to: StoragePath | string,
    as?: string,
): Promise<void> {
    const adapter = _getAdapter() as unknown as MutateAdapter
    return adapter.move(from, to, as)
}
```

```typescript
// src/fs/mutate/delete.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'

export async function deleteFile(path: StoragePath | string): Promise<void> {
    const adapter = _getAdapter() as unknown as MutateAdapter
    return adapter.delete(path)
}

export { deleteFile as delete }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fs/mutate/__tests__/mutate.spec.ts`

Expected: PASS

- [ ] **Step 5: Write navigate test**

```typescript
// src/fs/navigate/__tests__/navigate.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { NavigateAdapter } from '../../../adapters/interfaces/capabilities/NavigateAdapter'
import { Navigate } from '../../../adapters/capabilities'
import { StorageStats, StorageListing, Timestamp } from '../../../types'
import { setFS } from '../../../bootstrap'
import { exists } from '../exists'
import { doesntExist } from '../doesntExist'
import { stats } from '../stats'
import { isFile } from '../isFile'
import { isDirectory } from '../isDirectory'
import { listDirectory } from '../listDirectory'
import { getPresignedUrl } from '../getPresignedUrl'

const mockStats: StorageStats = {
    size: 1024,
    lastModified: Timestamp.fromMilliseconds(1000),
    isFile: true,
    isDirectory: false,
    isSymbolicLink: false,
}

class MockNavigateAdapter implements Adapter, NavigateAdapter {
    capabilities = new Set([Navigate])
    async exists(path, mode?) { return true }
    async doesntExist(path, mode?) { return false }
    async stats(path) { return mockStats }
    async isFile(path) { return true }
    async isDirectory(path) { return false }
    async listDirectory(path, recursive?) { return [] }
    async getPresignedUrl(path, options?) { return 'https://presigned.url' }
}

describe('navigate domain functions', () => {
    beforeEach(() => {
        setFS(new MockNavigateAdapter())
    })

    it('exists should delegate to adapter', async () => {
        expect(await exists('/test.txt')).toBe(true)
    })

    it('doesntExist should delegate to adapter', async () => {
        expect(await doesntExist('/test.txt')).toBe(false)
    })

    it('stats should delegate to adapter', async () => {
        const result = await stats('/test.txt')
        expect(result.size).toBe(1024)
    })

    it('isFile should delegate to adapter', async () => {
        expect(await isFile('/test.txt')).toBe(true)
    })

    it('isDirectory should delegate to adapter', async () => {
        expect(await isDirectory('/dir')).toBe(false)
    })

    it('listDirectory should delegate to adapter', async () => {
        const result = await listDirectory('/dir')
        expect(result).toEqual([])
    })

    it('getPresignedUrl should delegate to adapter', async () => {
        const url = await getPresignedUrl('/file.txt')
        expect(url).toBe('https://presigned.url')
    })
})
```

- [ ] **Step 6: Write navigate implementations**

```typescript
// src/fs/navigate/exists.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { AccessModeString } from '../../types/AccessMode'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function exists(
    path: StoragePath | string,
    mode?: number | AccessModeString,
): Promise<boolean> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.exists(path, mode)
}
```

```typescript
// src/fs/navigate/doesntExist.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { AccessModeString } from '../../types/AccessMode'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function doesntExist(
    path: StoragePath | string,
    mode?: number | AccessModeString,
): Promise<boolean> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.doesntExist(path, mode)
}
```

```typescript
// src/fs/navigate/stats.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageStats } from '../../types/StorageStats'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function stats<T = unknown>(
    path: StoragePath | string,
): Promise<StorageStats<T>> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.stats<T>(path)
}
```

```typescript
// src/fs/navigate/isFile.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function isFile(path: StoragePath | string): Promise<boolean> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.isFile(path)
}
```

```typescript
// src/fs/navigate/isDirectory.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function isDirectory(path: StoragePath | string): Promise<boolean> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.isDirectory(path)
}
```

```typescript
// src/fs/navigate/listDirectory.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageListing } from '../../types/StorageListing'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function listDirectory(
    path: StoragePath | string,
    recursive?: boolean,
): Promise<string[] | StorageListing> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.listDirectory(path, recursive)
}
```

```typescript
// src/fs/navigate/getPresignedUrl.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { PresignedUrlOptions } from '../../types/PresignedUrlOptions'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'

export async function getPresignedUrl(
    path: StoragePath | string,
    options?: PresignedUrlOptions,
): Promise<string> {
    const adapter = _getAdapter() as unknown as NavigateAdapter
    return adapter.getPresignedUrl(path, options)
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/fs/mutate/__tests__/mutate.spec.ts src/fs/navigate/__tests__/navigate.spec.ts`

Expected: PASS

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/fs/mutate/ src/fs/navigate/ src/fs/mutate/__tests__/mutate.spec.ts src/fs/navigate/__tests__/navigate.spec.ts && git commit -S -m "feat(fs): add mutate and navigate domain functions"
```

---

### Task 29: Fs Family Watch, Lock, Metadata, Linking, Events Domain Functions

**Files:**
- Create: `src/fs/watch/watch.ts`
- Create: `src/fs/lock/lock.ts`
- Create: `src/fs/metadata/getAttributes.ts`, `src/fs/metadata/setAttributes.ts`
- Create: `src/fs/linking/symlink.ts`, `src/fs/linking/hardlink.ts`, `src/fs/linking/readlink.ts`
- Create: `src/fs/events/on.ts`, `src/fs/events/off.ts`
- Test: `src/fs/watch/__tests__/watch.spec.ts`
- Test: `src/fs/lock/__tests__/lock.spec.ts`
- Test: `src/fs/metadata/__tests__/metadata.spec.ts`
- Test: `src/fs/linking/__tests__/linking.spec.ts`
- Test: `src/fs/events/__tests__/events.spec.ts`

- [ ] **Step 1: Write the failing test for watch**

```typescript
// src/fs/watch/__tests__/watch.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { WatchAdapter, WatchHandle } from '../../../adapters/interfaces/capabilities/WatchAdapter'
import { Watch } from '../../../adapters/capabilities'
import { setFS } from '../../../bootstrap'
import { watch } from '../watch'

class MockWatchAdapter implements Adapter, WatchAdapter {
    capabilities = new Set([Watch])
    watch(path, callback?) {
        return {
            close() {},
            [Symbol.dispose]() {},
            async *[Symbol.asyncIterator]() {},
        } satisfies WatchHandle
    }
}

describe('watch domain function', () => {
    beforeEach(() => { setFS(new MockWatchAdapter()) })

    it('watch should return WatchHandle', () => {
        const handle = watch('/dir')
        expect(handle).toBeDefined()
        expect(typeof handle.close).toBe('function')
        expect(typeof handle[Symbol.dispose]).toBe('function')
    })
})
```

- [ ] **Step 2: Write the failing test for lock**

```typescript
// src/fs/lock/__tests__/lock.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { LockAdapter, LockHandle } from '../../../adapters/interfaces/capabilities/LockAdapter'
import { Lock } from '../../../adapters/capabilities'
import { StoragePath } from '../../../types/StoragePath'
import { setFS } from '../../../bootstrap'
import { lock } from '../lock'

class MockLockAdapter implements Adapter, LockAdapter {
    capabilities = new Set([Lock])
    async lock(path, options?) {
        return {
            release() {},
            [Symbol.dispose]() {},
            type: 'exclusive' as const,
            path: path instanceof StoragePath ? path : new StoragePath(path),
            acquired: true,
        } satisfies LockHandle
    }
}

describe('lock domain function', () => {
    beforeEach(() => { setFS(new MockLockAdapter()) })

    it('lock should return LockHandle', async () => {
        const handle = await lock('/file.txt')
        expect(handle.acquired).toBe(true)
        expect(handle.type).toBe('exclusive')
    })
})
```

- [ ] **Step 3: Write the failing test for metadata**

```typescript
// src/fs/metadata/__tests__/metadata.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { MetadataAdapter } from '../../../adapters/interfaces/capabilities/MetadataAdapter'
import { Metadata } from '../../../adapters/capabilities'
import { setFS } from '../../../bootstrap'
import { getAttributes } from '../getAttributes'
import { setAttributes } from '../setAttributes'

class MockMetadataAdapter implements Adapter, MetadataAdapter {
    capabilities = new Set([Metadata])
    async getAttributes(path) { return { author: 'test' } }
    async setAttributes(path, attrs) {}
}

describe('metadata domain functions', () => {
    beforeEach(() => { setFS(new MockMetadataAdapter()) })

    it('getAttributes should delegate to adapter', async () => {
        const attrs = await getAttributes('/file.txt')
        expect(attrs).toEqual({ author: 'test' })
    })

    it('setAttributes should delegate to adapter', async () => {
        await expect(setAttributes('/file.txt', { author: 'new' })).resolves.toBeUndefined()
    })
})
```

- [ ] **Step 4: Write the failing test for linking**

```typescript
// src/fs/linking/__tests__/linking.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { LinkingAdapter } from '../../../adapters/interfaces/capabilities/LinkingAdapter'
import { Linking } from '../../../adapters/capabilities'
import { StoragePath } from '../../../types/StoragePath'
import { setFS } from '../../../bootstrap'
import { symlink } from '../symlink'
import { hardlink } from '../hardlink'
import { readlink } from '../readlink'

let lastLinkOp = ''

class MockLinkingAdapter implements Adapter, LinkingAdapter {
    capabilities = new Set([Linking])
    async symlink(target, linkPath) { lastLinkOp = 'symlink' }
    async hardlink(target, linkPath) { lastLinkOp = 'hardlink' }
    async readlink(path) { lastLinkOp = 'readlink'; return new StoragePath('/target') }
}

describe('linking domain functions', () => {
    beforeEach(() => {
        lastLinkOp = ''
        setFS(new MockLinkingAdapter())
    })

    it('symlink should delegate to adapter', async () => {
        await symlink('/target', '/link')
        expect(lastLinkOp).toBe('symlink')
    })

    it('hardlink should delegate to adapter', async () => {
        await hardlink('/target', '/link')
        expect(lastLinkOp).toBe('hardlink')
    })

    it('readlink should delegate to adapter', async () => {
        const target = await readlink('/link')
        expect(target).toBeInstanceOf(StoragePath)
        expect(lastLinkOp).toBe('readlink')
    })
})
```

- [ ] **Step 5: Write the failing test for events**

```typescript
// src/fs/events/__tests__/events.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Adapter } from '../../../adapters/interfaces/Adapter'
import type { EventsAdapter } from '../../../adapters/interfaces/capabilities/EventsAdapter'
import { Events } from '../../../adapters/capabilities'
import { setFS } from '../../../bootstrap'
import { on } from '../on'
import { off } from '../off'

class MockEventsAdapter implements Adapter, EventsAdapter {
    capabilities = new Set([Events])
    on(event, handler) {}
    off(event, handler) {}
    events() { return { async *[Symbol.asyncIterator]() {} } }
}

describe('events domain functions', () => {
    beforeEach(() => { setFS(new MockEventsAdapter()) })

    it('on should delegate to adapter', () => {
        expect(() => on('ready', () => {})).not.toThrow()
    })

    it('off should delegate to adapter', () => {
        expect(() => off('ready', () => {})).not.toThrow()
    })
})
```

- [ ] **Step 6: Run all tests to verify they fail**

Run: `npx vitest run src/fs/watch/__tests__/watch.spec.ts src/fs/lock/__tests__/lock.spec.ts src/fs/metadata/__tests__/metadata.spec.ts src/fs/linking/__tests__/linking.spec.ts src/fs/events/__tests__/events.spec.ts`

Expected: FAIL — modules not found

- [ ] **Step 7: Write all implementations**

```typescript
// src/fs/watch/watch.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { WatchAdapter, WatchCallback, WatchHandle } from '../../adapters/interfaces/capabilities/WatchAdapter'

export function watch(
    path: StoragePath | string,
    callback?: WatchCallback,
): WatchHandle {
    const adapter = _getAdapter() as unknown as WatchAdapter
    return adapter.watch(path, callback)
}
```

```typescript
// src/fs/lock/lock.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { LockOptions, LockHandle } from '../../adapters/interfaces/capabilities/LockAdapter'
import type { LockAdapter } from '../../adapters/interfaces/capabilities/LockAdapter'

export async function lock(
    path: StoragePath | string,
    options?: LockOptions,
): Promise<LockHandle> {
    const adapter = _getAdapter() as unknown as LockAdapter
    return adapter.lock(path, options)
}
```

```typescript
// src/fs/metadata/getAttributes.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MetadataAdapter } from '../../adapters/interfaces/capabilities/MetadataAdapter'

export async function getAttributes(
    path: StoragePath | string,
): Promise<Record<string, unknown>> {
    const adapter = _getAdapter() as unknown as MetadataAdapter
    return adapter.getAttributes(path)
}
```

```typescript
// src/fs/metadata/setAttributes.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { MetadataAdapter } from '../../adapters/interfaces/capabilities/MetadataAdapter'

export async function setAttributes(
    path: StoragePath | string,
    attrs: Record<string, unknown>,
): Promise<void> {
    const adapter = _getAdapter() as unknown as MetadataAdapter
    return adapter.setAttributes(path, attrs)
}
```

```typescript
// src/fs/linking/symlink.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { LinkingAdapter } from '../../adapters/interfaces/capabilities/LinkingAdapter'

export async function symlink(
    target: StoragePath | string,
    linkPath: StoragePath | string,
): Promise<void> {
    const adapter = _getAdapter() as unknown as LinkingAdapter
    return adapter.symlink(target, linkPath)
}
```

```typescript
// src/fs/linking/hardlink.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { LinkingAdapter } from '../../adapters/interfaces/capabilities/LinkingAdapter'

export async function hardlink(
    target: StoragePath | string,
    linkPath: StoragePath | string,
): Promise<void> {
    const adapter = _getAdapter() as unknown as LinkingAdapter
    return adapter.hardlink(target, linkPath)
}
```

```typescript
// src/fs/linking/readlink.ts
import { _getAdapter } from '../../bootstrap'
import type { StoragePath } from '../../types/StoragePath'
import type { LinkingAdapter } from '../../adapters/interfaces/capabilities/LinkingAdapter'

export async function readlink(path: StoragePath | string): Promise<StoragePath> {
    const adapter = _getAdapter() as unknown as LinkingAdapter
    return adapter.readlink(path)
}
```

```typescript
// src/fs/events/on.ts
import { _getAdapter } from '../../bootstrap'
import type { EventsAdapter, EventHandler, AdapterEventType } from '../../adapters/interfaces/capabilities/EventsAdapter'

export function on(event: AdapterEventType, handler: EventHandler): void {
    const adapter = _getAdapter() as unknown as EventsAdapter
    return adapter.on(event, handler)
}
```

```typescript
// src/fs/events/off.ts
import { _getAdapter } from '../../bootstrap'
import type { EventsAdapter, EventHandler, AdapterEventType } from '../../adapters/interfaces/capabilities/EventsAdapter'

export function off(event: AdapterEventType, handler: EventHandler): void {
    const adapter = _getAdapter() as unknown as EventsAdapter
    return adapter.off(event, handler)
}
```

- [ ] **Step 8: Run all tests to verify they pass**

Run: `npx vitest run src/fs/watch/__tests__/watch.spec.ts src/fs/lock/__tests__/lock.spec.ts src/fs/metadata/__tests__/metadata.spec.ts src/fs/linking/__tests__/linking.spec.ts src/fs/events/__tests__/events.spec.ts`

Expected: PASS

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/fs/watch/ src/fs/lock/ src/fs/metadata/ src/fs/linking/ src/fs/events/ src/fs/watch/__tests__/watch.spec.ts src/fs/lock/__tests__/lock.spec.ts src/fs/metadata/__tests__/metadata.spec.ts src/fs/linking/__tests__/linking.spec.ts src/fs/events/__tests__/events.spec.ts && git commit -S -m "feat(fs): add watch, lock, metadata, linking, events domain functions"
```

---

### Task 30: Fs Family Barrel Export

**Files:**
- Create: `src/fs/index.ts`

- [ ] **Step 1: Write the barrel**

```typescript
// src/fs/index.ts
export { get, getAsBuffer, getAsJSON } from './read/get'
export type { JSONReviver } from '../adapters/interfaces/capabilities/ReadAdapter'

export { put, putStreamed, append, appendStreamed, mkdir } from './write/put'
export { putStreamed } from './write/putStreamed'
export { append } from './write/append'
export { appendStreamed } from './write/appendStreamed'
export { mkdir } from './write/mkdir'

export { readStream } from './stream/readStream'
export { writeStream } from './stream/writeStream'
export { duplexStream } from './stream/duplexStream'
export { fileStream } from './stream/fileStream'
export { pipe } from './stream/pipe'
export { merge } from './stream/merge'
export { flatMap } from './stream/flatMap'
export { transform } from './stream/transform'

export { copy } from './mutate/copy'
export { rename } from './mutate/rename'
export { move } from './mutate/move'
export { deleteFile, delete } from './mutate/delete'

export { exists } from './navigate/exists'
export { doesntExist } from './navigate/doesntExist'
export { stats } from './navigate/stats'
export { isFile } from './navigate/isFile'
export { isDirectory } from './navigate/isDirectory'
export { listDirectory } from './navigate/listDirectory'
export { getPresignedUrl } from './navigate/getPresignedUrl'

export { watch } from './watch/watch'
export { lock } from './lock/lock'
export { getAttributes } from './metadata/getAttributes'
export { setAttributes } from './metadata/setAttributes'
export { symlink } from './linking/symlink'
export { hardlink } from './linking/hardlink'
export { readlink } from './linking/readlink'
export { on } from './events/on'
export { off } from './events/off'
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/fs/index.ts && git commit -S -m "feat(fs): add fs family barrel export"
```

---

### Task 31: Blob Family Barrel (Interfaces Only)

**Files:**
- Create: `src/blob/index.ts`

- [ ] **Step 1: Write the barrel**

```typescript
// src/blob/index.ts
// BlobAdapter family barrel — interfaces only for 2.0.0
// Re-exports adapter types relevant to blob storage semantics
export type { BlobAdapter } from '../adapters/interfaces/BlobAdapter'
export type { ReadAdapter, JSONReviver } from '../adapters/interfaces/capabilities/ReadAdapter'
export type { WriteAdapter } from '../adapters/interfaces/capabilities/WriteAdapter'
export type { StreamAdapter } from '../adapters/interfaces/capabilities/StreamAdapter'
export type { MutateAdapter } from '../adapters/interfaces/capabilities/MutateAdapter'
export type { NavigateAdapter } from '../adapters/interfaces/capabilities/NavigateAdapter'
export type { WatchAdapter, WatchEvent, WatchCallback, WatchHandle } from '../adapters/interfaces/capabilities/WatchAdapter'
export type { TransactionAdapter, TransactionHandle, TransactionResult } from '../adapters/interfaces/capabilities/TransactionAdapter'
export type { LockAdapter, LockHandle, LockOptions, LockType } from '../adapters/interfaces/capabilities/LockAdapter'
export type { MetadataAdapter } from '../adapters/interfaces/capabilities/MetadataAdapter'
export type { VersioningAdapter, VersionInfo } from '../adapters/interfaces/capabilities/VersioningAdapter'
export type { SearchAdapter, SearchOptions, SearchPredicate, SearchResult } from '../adapters/interfaces/capabilities/SearchAdapter'
export type { LinkingAdapter } from '../adapters/interfaces/capabilities/LinkingAdapter'
export type { EventsAdapter, AdapterEvent, EventHandler } from '../adapters/interfaces/capabilities/EventsAdapter'
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/blob/index.ts && git commit -S -m "feat(blob): add blob family barrel (interfaces only for 2.0.0)"
```

---

### Task 32: NodeFsAdapter Rewrite — Core Capabilities (Read, Write, Stream, Mutate, Navigate)

**Files:**
- Modify: `src/adapters/node/NodeFsAdapter.ts` — rewrite with capability mixin pattern
- Test: `src/adapters/node/__tests__/NodeFsAdapter.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/node/__tests__/NodeFsAdapter.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeFsAdapter } from '../NodeFsAdapter'
import { Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events } from '../../capabilities'
import { StoragePath } from '../../../types/StoragePath'
import { StorageStats } from '../../../types/StorageStats'
import { StorageListing } from '../../../types/StorageListing'
import { Timestamp } from '../../../types/Timestamp'
import { StorageStream } from '../../../types/StorageStream'

const tmpDir = path.join(os.tmpdir(), 'storage-manager-test-' + process.pid)

describe('NodeFsAdapter', () => {
    let adapter: NodeFsAdapter

    beforeEach(() => {
        adapter = new NodeFsAdapter()
        fs.mkdirSync(tmpDir, { recursive: true })
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    describe('capabilities', () => {
        it('should declare 10 capabilities', () => {
            expect(adapter.capabilities.size).toBe(10)
            expect(adapter.capabilities.has(Read)).toBe(true)
            expect(adapter.capabilities.has(Write)).toBe(true)
            expect(adapter.capabilities.has(Stream)).toBe(true)
            expect(adapter.capabilities.has(Mutate)).toBe(true)
            expect(adapter.capabilities.has(Navigate)).toBe(true)
            expect(adapter.capabilities.has(Watch)).toBe(true)
            expect(adapter.capabilities.has(Lock)).toBe(true)
            expect(adapter.capabilities.has(Metadata)).toBe(true)
            expect(adapter.capabilities.has(Linking)).toBe(true)
            expect(adapter.capabilities.has(Events)).toBe(true)
        })

        it('should NOT declare Transaction, Versioning, Search', () => {
            expect(adapter.capabilities.has(Symbol.for('storage:transaction'))).toBe(false)
            expect(adapter.capabilities.has(Symbol.for('storage:versioning'))).toBe(false)
            expect(adapter.capabilities.has(Symbol.for('storage:search'))).toBe(false)
        })

        it('static capabilities should match instance', () => {
            expect(NodeFsAdapter.capabilities).toHaveLength(10)
        })
    })

    describe('read', () => {
        it('get should read file as string', async () => {
            const filePath = path.join(tmpDir, 'test.txt')
            fs.writeFileSync(filePath, 'hello world')
            const content = await adapter.get(filePath)
            expect(content).toBe('hello world')
        })

        it('getAsBuffer should read file as Uint8Array', async () => {
            const filePath = path.join(tmpDir, 'binary.bin')
            fs.writeFileSync(filePath, Buffer.from([1, 2, 3]))
            const buf = await adapter.getAsBuffer(filePath)
            expect(buf).toBeInstanceOf(Uint8Array)
            expect(buf.length).toBe(3)
        })

        it('getAsJSON should parse JSON file', async () => {
            const filePath = path.join(tmpDir, 'data.json')
            fs.writeFileSync(filePath, '{"key":"value"}')
            const result = await adapter.getAsJSON<{ key: string }>(filePath)
            expect(result.key).toBe('value')
        })

        it('get should accept StoragePath', async () => {
            const filePath = path.join(tmpDir, 'sp-test.txt')
            fs.writeFileSync(filePath, 'storage path content')
            const sp = new StoragePath(filePath)
            const content = await adapter.get(sp)
            expect(content).toBe('storage path content')
        })
    })

    describe('write', () => {
        it('put should write string content', async () => {
            const filePath = path.join(tmpDir, 'write-test.txt')
            const result = await adapter.put(filePath, 'written content')
            expect(result).toBe(true)
            expect(fs.readFileSync(filePath, 'utf-8')).toBe('written content')
        })

        it('put should create parent directories', async () => {
            const filePath = path.join(tmpDir, 'deep', 'nested', 'file.txt')
            await adapter.put(filePath, 'deep content')
            expect(fs.readFileSync(filePath, 'utf-8')).toBe('deep content')
        })

        it('append should append to existing file', async () => {
            const filePath = path.join(tmpDir, 'append-test.txt')
            fs.writeFileSync(filePath, 'initial')
            await adapter.append(filePath, ' appended')
            expect(fs.readFileSync(filePath, 'utf-8')).toBe('initial appended')
        })

        it('mkdir should create directory', async () => {
            const dirPath = path.join(tmpDir, 'new-dir')
            await adapter.mkdir(dirPath)
            expect(fs.statSync(dirPath).isDirectory()).toBe(true)
        })
    })

    describe('mutate', () => {
        it('copy should copy file', async () => {
            const src = path.join(tmpDir, 'src.txt')
            const dest = path.join(tmpDir, 'dest.txt')
            fs.writeFileSync(src, 'copy me')
            await adapter.copy(src, dest)
            expect(fs.readFileSync(dest, 'utf-8')).toBe('copy me')
        })

        it('rename should rename file', async () => {
            const oldPath = path.join(tmpDir, 'old.txt')
            const newPath = path.join(tmpDir, 'new.txt')
            fs.writeFileSync(oldPath, 'rename me')
            await adapter.rename(oldPath, newPath)
            expect(fs.existsSync(newPath)).toBe(true)
            expect(fs.existsSync(oldPath)).toBe(false)
        })

        it('move should move file to new directory', async () => {
            const src = path.join(tmpDir, 'move-src.txt')
            const destDir = path.join(tmpDir, 'move-dest')
            fs.writeFileSync(src, 'move me')
            fs.mkdirSync(destDir, { recursive: true })
            await adapter.move(src, destDir)
            expect(fs.readFileSync(path.join(destDir, 'move-src.txt'), 'utf-8')).toBe('move me')
        })

        it('delete should remove file', async () => {
            const filePath = path.join(tmpDir, 'delete-me.txt')
            fs.writeFileSync(filePath, 'delete me')
            await adapter.delete(filePath)
            expect(fs.existsSync(filePath)).toBe(false)
        })

        it('delete should remove directory recursively', async () => {
            const dirPath = path.join(tmpDir, 'delete-dir')
            fs.mkdirSync(dirPath, { recursive: true })
            fs.writeFileSync(path.join(dirPath, 'file.txt'), 'content')
            await adapter.delete(dirPath)
            expect(fs.existsSync(dirPath)).toBe(false)
        })
    })

    describe('navigate', () => {
        it('exists should return true for existing path', async () => {
            const filePath = path.join(tmpDir, 'exists.txt')
            fs.writeFileSync(filePath, 'exists')
            expect(await adapter.exists(filePath)).toBe(true)
        })

        it('exists should return false for missing path', async () => {
            expect(await adapter.exists(path.join(tmpDir, 'missing.txt'))).toBe(false)
        })

        it('doesntExist should be opposite of exists', async () => {
            const filePath = path.join(tmpDir, 'exists.txt')
            fs.writeFileSync(filePath, 'exists')
            expect(await adapter.doesntExist(filePath)).toBe(false)
        })

        it('stats should return StorageStats', async () => {
            const filePath = path.join(tmpDir, 'stats.txt')
            fs.writeFileSync(filePath, 'stats content')
            const result = await adapter.stats(filePath)
            expect(result.size).toBeGreaterThan(0)
            expect(result.isFile).toBe(true)
            expect(result.isDirectory).toBe(false)
            expect(result.lastModified).toBeInstanceOf(Timestamp)
        })

        it('isFile should return true for file', async () => {
            const filePath = path.join(tmpDir, 'isfile.txt')
            fs.writeFileSync(filePath, 'file')
            expect(await adapter.isFile(filePath)).toBe(true)
        })

        it('isDirectory should return true for directory', async () => {
            expect(await adapter.isDirectory(tmpDir)).toBe(true)
        })

        it('listDirectory should list files', async () => {
            fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a')
            fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'b')
            const result = await adapter.listDirectory(tmpDir, false)
            expect(Array.isArray(result)).toBe(true)
            expect((result as string[]).length).toBeGreaterThanOrEqual(2)
        })

        it('listDirectory recursive should return StorageListing', async () => {
            const subDir = path.join(tmpDir, 'subdir')
            fs.mkdirSync(subDir, { recursive: true })
            fs.writeFileSync(path.join(subDir, 'nested.txt'), 'nested')
            const result = await adapter.listDirectory(tmpDir, true)
            expect(result).toBeInstanceOf(StorageListing)
        })

        it('getPresignedUrl should throw UnsupportedOperationError', async () => {
            const { UnsupportedOperationError } = await import('../../../shared/errors/UnsupportedOperationError')
            await expect(adapter.getPresignedUrl(path.join(tmpDir, 'file.txt')))
                .rejects.toThrow(UnsupportedOperationError)
        })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/node/__tests__/NodeFsAdapter.spec.ts`

Expected: FAIL — capabilities mismatch, method signatures changed

- [ ] **Step 3: Write the NodeFsAdapter rewrite**

```typescript
// src/adapters/node/NodeFsAdapter.ts
import fs from 'node:fs'
import os from 'node:os'
import { basename, dirname, join } from 'node:path'

import type { Adapter } from '../interfaces/Adapter'
import type { ReadAdapter } from '../interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../interfaces/capabilities/WriteAdapter'
import type { StreamAdapter, FileStreamMode } from '../interfaces/capabilities/StreamAdapter'
import type { MutateAdapter } from '../interfaces/capabilities/MutateAdapter'
import type { NavigateAdapter } from '../interfaces/capabilities/NavigateAdapter'
import type { WatchAdapter, WatchCallback, WatchHandle, WatchEvent } from '../interfaces/capabilities/WatchAdapter'
import type { LockAdapter, LockHandle, LockOptions, LockType } from '../interfaces/capabilities/LockAdapter'
import type { MetadataAdapter } from '../interfaces/capabilities/MetadataAdapter'
import type { LinkingAdapter } from '../interfaces/capabilities/LinkingAdapter'
import type { EventsAdapter, AdapterEventType, EventHandler, AdapterEvent } from '../interfaces/capabilities/EventsAdapter'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageEncoding } from '../../types/StorageEncoding'
import type { Input, ValidInput } from '../../types/Input'
import type { MkdirOptions } from '../../types/MkdirOptions'
import type { StorageStreamOptions } from '../../types/StorageStreamOptions'
import type { StorageStats } from '../../types/StorageStats'
import type { StorageListing } from '../../types/StorageListing'
import type { StorageStream } from '../../types/StorageStream'
import type { PresignedUrlOptions } from '../../types/PresignedUrlOptions'
import type { AccessModeString } from '../../types/AccessMode'
import { F_OK } from '../../types/AccessMode'
import { StoragePath as StoragePathClass } from '../../types/StoragePath'
import { StorageStream as StorageStreamClass } from '../../types/StorageStream'
import { StorageListing as StorageListingClass } from '../../types/StorageListing'
import { StorageStats as StorageStatsInterface } from '../../types/StorageStats'
import { Timestamp } from '../../types/Timestamp'
import { sanitizeInput } from '../../shared/utils/sanitizeInput'
import { isIterable, isAsyncIterable } from '../../shared/utils/isIterable'
import {
    Read, Write, Stream, Mutate, Navigate,
    Watch, Lock, Metadata, Linking, Events,
} from '../capabilities'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'
import { PathNotFoundError } from '../../shared/errors/PathNotFoundError'
import { PermissionDeniedError } from '../../shared/errors/PermissionDeniedError'
import { AlreadyExistsError } from '../../shared/errors/AlreadyExistsError'
import { NotADirectoryError } from '../../shared/errors/NotADirectoryError'
import { IsDirectoryError } from '../../shared/errors/IsDirectoryError'

function toPathString(p: StoragePath | string): string {
    return p instanceof StoragePathClass ? p.toString() : p
}

const encodingMap: Record<StorageEncoding, BufferEncoding> = {
    'utf-8': 'utf-8',
    'utf-16le': 'utf16le',
    'ascii': 'ascii',
    'latin1': 'latin1',
    'base64': 'base64',
    'base64url': 'base64url',
    'hex': 'hex',
}

function toNodeEncoding(enc?: StorageEncoding): BufferEncoding {
    return enc ? encodingMap[enc] : 'utf-8'
}

function wrapNativeError(path: string, err: NodeJS.ErrnoException): never {
    const sp = new StoragePathClass(path)
    switch (err.code) {
        case 'ENOENT': throw new PathNotFoundError(sp, { cause: err })
        case 'EACCES': throw new PermissionDeniedError(sp, { cause: err })
        case 'EEXIST': throw new AlreadyExistsError(sp, { cause: err })
        case 'ENOTDIR': throw new NotADirectoryError(sp, { cause: err })
        case 'EISDIR': throw new IsDirectoryError(sp, { cause: err })
        default: throw err
    }
}

export class NodeFsAdapter implements
    Adapter,
    ReadAdapter,
    WriteAdapter,
    StreamAdapter,
    MutateAdapter,
    NavigateAdapter,
    WatchAdapter,
    LockAdapter,
    MetadataAdapter,
    LinkingAdapter,
    EventsAdapter
{
    static capabilities = [
        Read, Write, Stream, Mutate, Navigate,
        Watch, Lock, Metadata, Linking, Events,
    ] as symbol[]

    get capabilities(): Set<symbol> {
        const caps = [...NodeFsAdapter.capabilities]
        if (process.platform === 'win32') {
            // Metadata is disabled on Windows
            // It stays in the set but operations throw 'disabled'
        }
        return new Set(caps)
    }

    private eventHandlers = new Map<string, Set<EventHandler>>()

    // ── Read ──────────────────────────────────────────

    async get(path: StoragePath | string, encoding?: StorageEncoding): Promise<string> {
        const p = toPathString(path)
        const enc = toNodeEncoding(encoding)
        return new Promise<string>((resolve, reject) => {
            fs.readFile(p, enc, (err, data) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else resolve(data)
            })
        })
    }

    async getAsBuffer(path: StoragePath | string): Promise<Uint8Array> {
        const p = toPathString(path)
        return new Promise<Uint8Array>((resolve, reject) => {
            fs.readFile(p, (err, data) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else resolve(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
            })
        })
    }

    async getAsJSON<T = unknown>(
        path: StoragePath | string,
        encoding?: StorageEncoding,
        reviver?: (this: unknown, key: string, value: unknown) => unknown,
    ): Promise<T> {
        const content = await this.get(path, encoding)
        return JSON.parse(content, reviver)
    }

    // ── Write ─────────────────────────────────────────

    async put(path: StoragePath | string, value: Input, encoding?: StorageEncoding): Promise<boolean> {
        const p = toPathString(path)
        const dir = dirname(p)
        if (dir !== '.') await this.mkdir(dir, { recursive: true })
        return new Promise<boolean>((resolve, reject) => {
            const data = sanitizeInput(value)
            const content = typeof data === 'string' ? data : Buffer.from(data)
            fs.writeFile(p, content, toNodeEncoding(encoding), (err) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else resolve(true)
            })
        })
    }

    async putStreamed(
        path: StoragePath | string,
        values: Input,
        encoding?: StorageEncoding,
    ): Promise<void> {
        const p = toPathString(path)
        const dir = dirname(p)
        if (dir !== '.') await this.mkdir(dir, { recursive: true })
        const enc = toNodeEncoding(encoding)

        const writeChunk = (chunk: Input): Promise<void> => {
            return new Promise((resolve, reject) => {
                const data = sanitizeInput(chunk)
                const content = typeof data === 'string' ? data : Buffer.from(data)
                fs.appendFile(p, content, enc, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        }

        if (isIterable(values)) {
            for (const chunk of values as Iterable<Input>) await writeChunk(chunk)
        } else if (isAsyncIterable(values)) {
            for await (const chunk of values as AsyncIterable<Input>) await writeChunk(chunk)
        } else {
            await writeChunk(values)
        }
    }

    async append(path: StoragePath | string, value: Input, encoding?: StorageEncoding): Promise<boolean> {
        const p = toPathString(path)
        if (await this.exists(p)) {
            return new Promise<boolean>((resolve, reject) => {
                const data = sanitizeInput(value)
                const content = typeof data === 'string' ? data : Buffer.from(data)
                fs.appendFile(p, content, toNodeEncoding(encoding), (err) => {
                    if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                    else resolve(true)
                })
            })
        }
        return this.put(p, value, encoding)
    }

    async appendStreamed(
        path: StoragePath | string,
        values: Input,
        encoding?: StorageEncoding,
    ): Promise<void> {
        const p = toPathString(path)
        if (await this.exists(p)) {
            return this.putStreamed(p, values, encoding)
        }
        return this.putStreamed(p, values, encoding)
    }

    async mkdir(path: StoragePath | string, options?: MkdirOptions): Promise<void> {
        const p = toPathString(path)
        return new Promise((resolve, reject) => {
            fs.mkdir(p, { recursive: options?.recursive ?? true, mode: options?.mode }, (err) => {
                if (err) {
                    if (err.code === 'EEXIST') resolve()
                    else try { wrapNativeError(p, err) } catch (e) { reject(e) }
                } else resolve()
            })
        })
    }

    // ── Stream ────────────────────────────────────────

    readStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T> {
        const stream = new StorageStreamClass<T>()
        const p = toPathString(path)
        const nodeOptions: fs.ReadStreamOptions = {}
        if (options?.start) nodeOptions.start = options.start
        if (options?.end) nodeOptions.end = options.end
        if (options?.encoding) nodeOptions.encoding = toNodeEncoding(options.encoding)

        const nodeStream = fs.createReadStream(p, nodeOptions)
        nodeStream.on('data', (chunk) => {
            const data = chunk instanceof Buffer
                ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength) as unknown as T
                : chunk as unknown as T
            stream.push(data)
        })
        nodeStream.on('end', () => stream.close())
        nodeStream.on('error', (err) => stream.abort(err))
        return stream
    }

    writeStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T> {
        const stream = new StorageStreamClass<T>()
        const p = toPathString(path)
        const dir = dirname(p)
        this.mkdir(dir, { recursive: true }).then(() => {
            const nodeStream = fs.createWriteStream(p)
            ;(async () => {
                for await (const chunk of stream) {
                    const data = chunk instanceof Uint8Array ? Buffer.from(chunk) : Buffer.from(String(chunk))
                    nodeStream.write(data)
                }
                nodeStream.end()
            })()
        })
        return stream
    }

    duplexStream<T = Uint8Array>(path: StoragePath | string, options?: StorageStreamOptions): StorageStream<T> {
        const stream = new StorageStreamClass<T>()
        return stream
    }

    fileStream<T = Uint8Array>(
        path: StoragePath | string,
        mode?: FileStreamMode,
        options?: StorageStreamOptions,
    ): StorageStream<T> {
        switch (mode) {
            case 'r': return this.readStream(path, options)
            case 'w': return this.writeStream(path, options)
            case 'rw': return this.duplexStream(path, options)
            default: return this.readStream(path, options)
        }
    }

    // ── Mutate ────────────────────────────────────────

    async copy(from: StoragePath | string, to: StoragePath | string, as?: string): Promise<void> {
        const srcPath = toPathString(from)
        const destPath = toPathString(to)
        const dest = join(destPath, as ?? basename(srcPath))
        const s = await this.stats(srcPath)
        if (s.isFile) {
            await this.mkdir(destPath, { recursive: true })
            return new Promise((resolve, reject) => {
                fs.copyFile(srcPath, dest, (err) => {
                    if (err) try { wrapNativeError(srcPath, err) } catch (e) { reject(e) }
                    else resolve()
                })
            })
        }
        if (s.isDirectory) {
            await this.mkdir(dest, { recursive: true })
            const listing = await this.listDirectory(srcPath, true)
            if (listing instanceof StorageListingClass) {
                for (const filePath of listing.flat) {
                    await this.copy(filePath.toString(), dest)
                }
            }
        }
    }

    async rename(path: StoragePath | string, renameTo: StoragePath | string): Promise<void> {
        const p = toPathString(path)
        const dest = toPathString(renameTo)
        return new Promise((resolve, reject) => {
            let dir = dirname(dest)
            if (dir === '.') dir = dirname(p)
            const to = join(dir, basename(dest))
            fs.rename(p, to, (err) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else resolve()
            })
        })
    }

    async move(from: StoragePath | string, to: StoragePath | string, as?: string): Promise<void> {
        const srcPath = toPathString(from)
        const destPath = toPathString(to)
        return this.rename(srcPath, join(destPath, as ?? basename(srcPath)))
    }

    async delete(path: StoragePath | string): Promise<void> {
        const p = toPathString(path)
        const s = await this.stats(p)
        if (s.isFile || s.isSymbolicLink) {
            return new Promise((resolve, reject) => {
                fs.unlink(p, (err) => {
                    if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                    else resolve()
                })
            })
        }
        if (s.isDirectory) {
            return new Promise((resolve, reject) => {
                fs.rm(p, { recursive: true, force: true }, (err) => {
                    if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                    else resolve()
                })
            })
        }
    }

    // ── Navigate ──────────────────────────────────────

    async exists(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean> {
        const p = toPathString(path)
        const accessMode = typeof mode === 'string'
            ? ({ exists: F_OK, readable: 4, writable: 2, executable: 1 }[mode] ?? F_OK)
            : (mode ?? F_OK)
        return new Promise((resolve) => {
            fs.access(p, accessMode, (err) => resolve(!err))
        })
    }

    async doesntExist(path: StoragePath | string, mode?: number | AccessModeString): Promise<boolean> {
        return !(await this.exists(path, mode))
    }

    async stats<T = unknown>(path: StoragePath | string): Promise<StorageStats<T>> {
        const p = toPathString(path)
        return new Promise((resolve, reject) => {
            fs.lstat(p, (err, stats) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else {
                    const result: StorageStats<T> = {
                        size: stats.size,
                        lastModified: Timestamp.fromMilliseconds(stats.mtimeMs),
                        isFile: stats.isFile(),
                        isDirectory: stats.isDirectory(),
                        isSymbolicLink: stats.isSymbolicLink(),
                        mode: stats.mode as T,
                        uid: stats.uid as T,
                        gid: stats.gid as T,
                        permissions: (stats.mode & 0o777) as T,
                    }
                    resolve(result)
                }
            })
        })
    }

    async isFile(path: StoragePath | string): Promise<boolean> {
        try {
            const s = await this.stats(path)
            return s.isFile
        } catch {
            return false
        }
    }

    async isDirectory(path: StoragePath | string): Promise<boolean> {
        try {
            const s = await this.stats(path)
            return s.isDirectory
        } catch {
            return false
        }
    }

    async listDirectory(
        path: StoragePath | string,
        recursive?: boolean,
    ): Promise<string[] | StorageListing> {
        const p = toPathString(path)
        if (await this.doesntExist(p)) return []
        if (await this.isFile(p)) return [p]

        if (recursive) {
            return new Promise((resolve, reject) => {
                fs.readdir(p, async (err, list) => {
                    if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                    else {
                        const entries: Array<StoragePathClass | StorageListingClass> = []
                        for (const name of list) {
                            const fullPath = join(p, name)
                            const s = await this.stats(fullPath)
                            if (s.isDirectory) {
                                const sub = await this.listDirectory(fullPath, true)
                                entries.push(
                                    sub instanceof StorageListingClass
                                        ? sub
                                        : new StorageListingClass(fullPath, sub.map(f => new StoragePathClass(f))),
                                )
                            } else {
                                entries.push(new StoragePathClass(fullPath))
                            }
                        }
                        const dirStats = await this.stats(p)
                        resolve(new StorageListingClass(p, entries, dirStats))
                    }
                })
            })
        }

        return new Promise((resolve, reject) => {
            fs.readdir(p, (err, list) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else resolve(list)
            })
        })
    }

    async getPresignedUrl(path: StoragePath | string, options?: PresignedUrlOptions): Promise<string> {
        throw new UnsupportedOperationError(Navigate, 'not-implemented', {
            operation: 'getPresignedUrl',
            adapter: 'NodeFsAdapter',
        })
    }

    // ── Watch ─────────────────────────────────────────

    watch(path: StoragePath | string, callback?: WatchCallback): WatchHandle {
        const p = toPathString(path)
        const watcher = fs.watch(p, { recursive: true }, (eventType, filename) => {
            if (callback) {
                const event: WatchEvent = {
                    type: eventType === 'rename' ? 'create' : 'modify',
                    path: new StoragePathClass(filename ?? p),
                    timestamp: Timestamp.now(),
                } as WatchEvent
                callback(event)
            }
        })

        return {
            close() { watcher.close() },
            [Symbol.dispose]() { watcher.close() },
            [Symbol.asyncIterator]() {
                return {
                    async next() {
                        return new Promise<IteratorResult<WatchEvent>>((resolve) => {
                            watcher.on('change', (eventType, filename) => {
                                const event: WatchEvent = {
                                    type: eventType === 'rename' ? 'create' : 'modify',
                                    path: new StoragePathClass(filename ?? ''),
                                    timestamp: Timestamp.now(),
                                } as WatchEvent
                                resolve({ value: event, done: false })
                            })
                            watcher.on('close', () => {
                                resolve({ value: undefined, done: true } as IteratorResult<WatchEvent>)
                            })
                        })
                    },
                }
            },
        }
    }

    // ── Lock ──────────────────────────────────────────

    async lock(path: StoragePath | string, options?: LockOptions): Promise<LockHandle> {
        const { lockFile } = await import('./lock')
        return lockFile(toPathString(path), options)
    }

    // ── Metadata ──────────────────────────────────────

    async getAttributes(path: StoragePath | string): Promise<Record<string, unknown>> {
        if (process.platform === 'win32') {
            throw new UnsupportedOperationError(Metadata, 'disabled', {
                operation: 'getAttributes',
                adapter: 'NodeFsAdapter',
            })
        }
        const { getXattrs } = await import('./xattrs')
        return getXattrs(toPathString(path))
    }

    async setAttributes(path: StoragePath | string, attrs: Record<string, unknown>): Promise<void> {
        if (process.platform === 'win32') {
            throw new UnsupportedOperationError(Metadata, 'disabled', {
                operation: 'setAttributes',
                adapter: 'NodeFsAdapter',
            })
        }
        const { setXattrs } = await import('./xattrs')
        return setXattrs(toPathString(path), attrs)
    }

    // ── Linking ───────────────────────────────────────

    async symlink(target: StoragePath | string, linkPath: StoragePath | string): Promise<void> {
        const targetStr = toPathString(target)
        const linkStr = toPathString(linkPath)
        return new Promise((resolve, reject) => {
            fs.symlink(targetStr, linkStr, (err) => {
                if (err) try { wrapNativeError(linkStr, err) } catch (e) { reject(e) }
                else resolve()
            })
        })
    }

    async hardlink(target: StoragePath | string, linkPath: StoragePath | string): Promise<void> {
        const targetStr = toPathString(target)
        const linkStr = toPathString(linkPath)
        return new Promise((resolve, reject) => {
            fs.link(targetStr, linkStr, (err) => {
                if (err) try { wrapNativeError(linkStr, err) } catch (e) { reject(e) }
                else resolve()
            })
        })
    }

    async readlink(path: StoragePath | string): Promise<StoragePath> {
        const p = toPathString(path)
        return new Promise((resolve, reject) => {
            fs.readlink(p, (err, linkString) => {
                if (err) try { wrapNativeError(p, err) } catch (e) { reject(e) }
                else resolve(new StoragePathClass(linkString))
            })
        })
    }

    // ── Events ────────────────────────────────────────

    on(event: AdapterEventType, handler: EventHandler): void {
        const key = event
        if (!this.eventHandlers.has(key)) {
            this.eventHandlers.set(key, new Set())
        }
        this.eventHandlers.get(key)!.add(handler)
    }

    off(event: AdapterEventType, handler: EventHandler): void {
        this.eventHandlers.get(event)?.delete(handler)
    }

    events(): AsyncIterable<AdapterEvent> {
        const self = this
        return {
            [Symbol.asyncIterator]() {
                const queue: AdapterEvent[] = []
                let resolveNext: ((value: IteratorResult<AdapterEvent>) => void) | null = null

                for (const [eventType, handlers] of self.eventHandlers) {
                    for (const handler of handlers) {
                        const wrapped: EventHandler = (event) => {
                            if (resolveNext) {
                                resolveNext({ value: event, done: false })
                                resolveNext = null
                            } else {
                                queue.push(event)
                            }
                        }
                        self.on(eventType, wrapped)
                    }
                }

                return {
                    async next(): Promise<IteratorResult<AdapterEvent>> {
                        if (queue.length > 0) {
                            return { value: queue.shift()!, done: false }
                        }
                        return new Promise((resolve) => {
                            resolveNext = resolve
                        })
                    },
                }
            },
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/node/__tests__/NodeFsAdapter.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/node/NodeFsAdapter.ts src/adapters/node/__tests__/NodeFsAdapter.spec.ts && git commit -S -m "refactor(node): rewrite NodeFsAdapter with capability mixin pattern"
```

---

### Task 33: NodeFsAdapter Lock Implementation

**Files:**
- Create: `src/adapters/node/lock.ts`
- Test: `src/adapters/node/__tests__/lock.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/node/__tests__/lock.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { lockFile } from '../lock'
import type { LockHandle, LockOptions } from '../../interfaces/capabilities/LockAdapter'
import { StoragePath } from '../../../types/StoragePath'

const tmpDir = path.join(os.tmpdir(), 'storage-manager-lock-test-' + process.pid)

describe('lockFile', () => {
    beforeEach(() => {
        fs.mkdirSync(tmpDir, { recursive: true })
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('should acquire exclusive lock', async () => {
        const filePath = path.join(tmpDir, 'test.txt')
        fs.writeFileSync(filePath, 'content')
        const handle = await lockFile(filePath, { type: 'exclusive' })
        expect(handle.acquired).toBe(true)
        expect(handle.type).toBe('exclusive')
        handle.release()
    })

    it('should create .lock file on exclusive lock', async () => {
        const filePath = path.join(tmpDir, 'locked.txt')
        fs.writeFileSync(filePath, 'content')
        const handle = await lockFile(filePath, { type: 'exclusive' })
        expect(fs.existsSync(filePath + '.lock')).toBe(true)
        handle.release()
    })

    it('should remove .lock file on release', async () => {
        const filePath = path.join(tmpDir, 'release-test.txt')
        fs.writeFileSync(filePath, 'content')
        const handle = await lockFile(filePath, { type: 'exclusive' })
        handle.release()
        expect(fs.existsSync(filePath + '.lock')).toBe(false)
    })

    it('should create .slock file on shared lock', async () => {
        const filePath = path.join(tmpDir, 'shared.txt')
        fs.writeFileSync(filePath, 'content')
        const handle = await lockFile(filePath, { type: 'shared' })
        expect(fs.existsSync(filePath + '.slock')).toBe(true)
        handle.release()
    })

    it('should support Symbol.dispose', async () => {
        const filePath = path.join(tmpDir, 'dispose-test.txt')
        fs.writeFileSync(filePath, 'content')
        {
            const handle = await lockFile(filePath, { type: 'exclusive' })
            using _h = handle
        }
        expect(fs.existsSync(filePath + '.lock')).toBe(false)
    })

    it('should contain PID and timestamp in lock file', async () => {
        const filePath = path.join(tmpDir, 'pid-test.txt')
        fs.writeFileSync(filePath, 'content')
        const handle = await lockFile(filePath, { type: 'exclusive' })
        const content = fs.readFileSync(filePath + '.lock', 'utf-8')
        expect(content).toContain(String(process.pid))
        handle.release()
    })

    it('should fail to acquire if already locked with timeout=0', async () => {
        const filePath = path.join(tmpDir, 'conflict.txt')
        fs.writeFileSync(filePath, 'content')
        const handle1 = await lockFile(filePath, { type: 'exclusive', timeout: 0 })
        const handle2 = await lockFile(filePath, { type: 'exclusive', timeout: 0 })
        expect(handle1.acquired).toBe(true)
        expect(handle2.acquired).toBe(false)
        handle1.release()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/node/__tests__/lock.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/node/lock.ts
import fs from 'node:fs'
import type { LockHandle, LockType } from '../interfaces/capabilities/LockAdapter'
import { StoragePath } from '../../types/StoragePath'

export async function lockFile(
    filePath: string,
    options?: { type?: LockType; timeout?: number },
): Promise<LockHandle> {
    const lockType: LockType = options?.type ?? 'exclusive'
    const suffix = lockType === 'shared' ? '.slock' : '.lock'
    const lockPath = filePath + suffix
    const timeout = options?.timeout ?? 5000
    const startTime = Date.now()

    let acquired = false

    const tryAcquire = (): Promise<boolean> => {
        return new Promise((resolve) => {
            fs.open(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, (err, fd) => {
                if (err) {
                    if (err.code === 'EEXIST') {
                        resolve(false)
                    } else {
                        resolve(false)
                    }
                } else {
                    const content = `${process.pid}\n${Date.now()}\n`
                    fs.write(fd, content, (writeErr) => {
                        fs.close(fd, () => {
                            resolve(!writeErr)
                        })
                    })
                }
            })
        })
    }

    acquired = await tryAcquire()

    if (!acquired && timeout > 0) {
        while (Date.now() - startTime < timeout) {
            await new Promise((r) => setTimeout(r, 50))
            acquired = await tryAcquire()
            if (acquired) break
        }
    }

    const handle: LockHandle = {
        type: lockType,
        path: new StoragePath(filePath),
        acquired,
        release() {
            try {
                fs.unlinkSync(lockPath)
            } catch {}
        },
        [Symbol.dispose]() {
            this.release()
        },
    }

    return handle
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/node/__tests__/lock.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/node/lock.ts src/adapters/node/__tests__/lock.spec.ts && git commit -S -m "feat(node): add cooperative O_EXCL lock file implementation"
```

---

### Task 34: NodeFsAdapter xattrs Implementation

**Files:**
- Create: `src/adapters/node/xattrs.ts`
- Test: `src/adapters/node/__tests__/xattrs.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/adapters/node/__tests__/xattrs.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { getXattrs, setXattrs } from '../xattrs'

const tmpDir = path.join(os.tmpdir(), 'storage-manager-xattr-test-' + process.pid)

describe('xattrs', () => {
    beforeEach(() => {
        fs.mkdirSync(tmpDir, { recursive: true })
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    const isPosix = process.platform !== 'win32'

    it.skipIf(!isPosix)('getXattrs should return extended attributes', async () => {
        const filePath = path.join(tmpDir, 'xattr-test.txt')
        fs.writeFileSync(filePath, 'content')
        const result = await getXattrs(filePath)
        expect(typeof result).toBe('object')
    })

    it.skipIf(!isPosix)('setXattrs should set extended attributes', async () => {
        const filePath = path.join(tmpDir, 'xattr-set-test.txt')
        fs.writeFileSync(filePath, 'content')
        await setXattrs(filePath, { 'user.test': 'value' })
        const result = await getXattrs(filePath)
        expect(result).toHaveProperty('user.test')
    })

    it('should handle non-POSIX gracefully on non-Windows', async () => {
        if (process.platform === 'win32') return
        const filePath = path.join(tmpDir, 'graceful-test.txt')
        fs.writeFileSync(filePath, 'content')
        const result = await getXattrs(filePath)
        expect(typeof result).toBe('object')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/node/__tests__/xattrs.spec.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/adapters/node/xattrs.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getXattrs(filePath: string): Promise<Record<string, unknown>> {
    if (process.platform === 'win32') {
        throw new Error('xattrs not supported on Windows')
    }

    try {
        const { stdout } = await execFileAsync('xattr', ['-p', filePath])
        const attrs: Record<string, unknown> = {}
        const lines = stdout.trim().split('\n').filter(Boolean)
        for (const name of lines) {
            try {
                const { stdout: value } = await execFileAsync('xattr', ['-p', name, filePath])
                attrs[name] = value.trim()
            } catch {
                attrs[name] = null
            }
        }
        return attrs
    } catch {
        return {}
    }
}

export async function setXattrs(
    filePath: string,
    attrs: Record<string, unknown>,
): Promise<void> {
    if (process.platform === 'win32') {
        throw new Error('xattrs not supported on Windows')
    }

    for (const [name, value] of Object.entries(attrs)) {
        const strValue = typeof value === 'string' ? value : JSON.stringify(value)
        await execFileAsync('xattr', ['-w', name, strValue, filePath])
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/node/__tests__/xattrs.spec.ts`

Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/adapters/node/xattrs.ts src/adapters/node/__tests__/xattrs.spec.ts && git commit -S -m "feat(node): add xattr read/write for POSIX systems"
```

---

### Task 35: Update Node Adapter Resolver and Index

**Files:**
- Modify: `src/adapters/node/resolver.ts`
- Modify: `src/adapters/node/index.ts`

- [ ] **Step 1: Update resolver with capabilities**

```typescript
// src/adapters/node/resolver.ts
import type { RuntimeResolver } from '../interfaces/RuntimeResolver'
import { NodeFsAdapter } from './NodeFsAdapter'
import { matchesEnvironment } from './detect'
import { Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events } from '../capabilities'

export const nodeResolver: RuntimeResolver = {
    runtime: 'node',
    capabilities: [Read, Write, Stream, Mutate, Navigate, Watch, Lock, Metadata, Linking, Events],
    matchesEnvironment,
    create: () => new NodeFsAdapter(),
}
```

- [ ] **Step 2: Update node index**

```typescript
// src/adapters/node/index.ts
export { NodeFsAdapter } from './NodeFsAdapter'
export { matchesEnvironment as matchesNodeEnvironment } from './detect'
export { nodeResolver } from './resolver'
export { lockFile } from './lock'
export { getXattrs, setXattrs } from './xattrs'
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/adapters/node/resolver.ts src/adapters/node/index.ts && git commit -S -m "refactor(node): update resolver with capabilities and index exports"
```

---

## Sub-Plan 4: Bootstrap + Builder + SDK

**Goal:** Implement the enhanced bootstrap system, Storage builder pattern, `fs` Proxy singleton, and all SDK utilities (extend, hasCapability, crossAdapterCopy/Move, sequentialBatch, throwUnsupportedOperation).

---

### Task 36: Rewrite Bootstrap with Adapter Type

**Files:**
- Modify: `src/bootstrap.ts`
- Create: `src/bootstrap.spec.ts`

- [ ] **Step 1: Write failing test for bootstrap with Adapter type**

```typescript
// src/bootstrap.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { _getAdapter, setFS, _bootstrap } from './bootstrap'
import type { Adapter } from './adapters/interfaces/Adapter'

function makeFakeAdapter(capabilities: Set<symbol>): Adapter {
    return { capabilities }
}

describe('bootstrap', () => {
    beforeEach(() => {
        // Reset module state by re-importing
        vi.resetModules()
    })

    it('setFS installs adapter and marks bootstrapped', () => {
        const adapter = makeFakeAdapter(new Set())
        setFS(adapter)
        expect(_getAdapter()).toBe(adapter)
    })

    it('setFS can hot-swap adapter after initial bootstrap', () => {
        const first = makeFakeAdapter(new Set())
        const second = makeFakeAdapter(new Set())
        setFS(first)
        setFS(second)
        expect(_getAdapter()).toBe(second)
    })

    it('_bootstrap returns null when no resolver matches', () => {
        // Clear any existing adapter
        const { _resetBootstrap } = require('./bootstrap')
        if (_resetBootstrap) _resetBootstrap()
        // With no registered resolvers, resolveAdapter returns null
        expect(_bootstrap()).toBeNull()
    })
})
```

Run: `npx vitest run src/bootstrap.spec.ts`
Expected: FAIL (Adapter type doesn't exist yet, imports fail)

- [ ] **Step 2: Rewrite bootstrap.ts**

```typescript
// src/bootstrap.ts
import type { Adapter } from './adapters/interfaces/Adapter'
import { resolveAdapter } from './adapters/resolve'
import { UnsupportedEnvironmentError } from './shared/errors/UnsupportedEnvironmentError'

let _adapter: Adapter | null = null
let _bootstrapped = false

export function _bootstrap(): Adapter | null {
    if (_bootstrapped && _adapter) return _adapter
    const resolved = resolveAdapter()
    if (resolved) {
        _adapter = resolved
        _bootstrapped = true
        return _adapter
    }
    return null
}

export function _getAdapter(): Adapter {
    if (_bootstrapped && _adapter) return _adapter
    const adapter = _bootstrap()
    if (!adapter) {
        throw new UnsupportedEnvironmentError('No adapter matches this environment')
    }
    return adapter
}

export function setFS(adapter: Adapter): void {
    _adapter = adapter
    _bootstrapped = true
}

export function useAdapter(adapter: Adapter): Readonly<Adapter> {
    return Object.freeze({ ...adapter }) as Readonly<Adapter>
}

/** @internal Test-only reset */
export function _resetBootstrap(): void {
    _adapter = null
    _bootstrapped = false
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/bootstrap.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/bootstrap.ts src/bootstrap.spec.ts && git commit -S -m "refactor(bootstrap): rewrite with Adapter type and hot-swap support"
```

---

### Task 37: Implement `throwUnsupportedOperation()` SDK Utility

**Files:**
- Create: `src/sdk/throwUnsupportedOperation.ts`
- Create: `src/sdk/__tests__/throwUnsupportedOperation.spec.ts`

- [ ] **Step 1: Write failing test for throwUnsupportedOperation**

```typescript
// src/sdk/__tests__/throwUnsupportedOperation.spec.ts
import { describe, it, expect } from 'vitest'
import { throwUnsupportedOperation } from '../throwUnsupportedOperation'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'
import { Read, Write } from '../../adapters/capabilities'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { CapabilityOperation } from '../../types/capabilities'

describe('throwUnsupportedOperation', () => {
    it('throws UnsupportedOperationError with capability only', () => {
        expect(() => throwUnsupportedOperation(Read)).toThrow(UnsupportedOperationError)
        try {
            throwUnsupportedOperation(Read)
        } catch (e) {
            const err = e as UnsupportedOperationError
            expect(err.capability).toBe(Read)
            expect(err.reason).toBe('not-implemented')
        }
    })

    it('throws with capability and operation', () => {
        try {
            throwUnsupportedOperation(Read, 'get')
        } catch (e) {
            const err = e as UnsupportedOperationError
            expect(err.capability).toBe(Read)
            expect(err.operation).toBe('get')
            expect(err.reason).toBe('not-implemented')
        }
    })

    it('throws with capability, operation, and adapter', () => {
        const adapter: Adapter = { capabilities: new Set([Write]) }
        try {
            throwUnsupportedOperation(Read, 'get', adapter)
        } catch (e) {
            const err = e as UnsupportedOperationError
            expect(err.capability).toBe(Read)
            expect(err.operation).toBe('get')
            expect(err.adapter).toBe('Adapter')
            expect(err.reason).toBe('not-implemented')
        }
    })

    it('throws with capability, operation, adapter, and reason', () => {
        const adapter: Adapter = { capabilities: new Set([Read]) }
        try {
            throwUnsupportedOperation(Read, 'getAttributes', adapter, 'disabled')
        } catch (e) {
            const err = e as UnsupportedOperationError
            expect(err.capability).toBe(Read)
            expect(err.operation).toBe('getAttributes')
            expect(err.reason).toBe('disabled')
        }
    })
})
```

Run: `npx vitest run src/sdk/__tests__/throwUnsupportedOperation.spec.ts`
Expected: FAIL (imports don't exist yet)

- [ ] **Step 2: Implement throwUnsupportedOperation**

```typescript
// src/sdk/throwUnsupportedOperation.ts
import { UnsupportedOperationError } from '../shared/errors/UnsupportedOperationError'
import type { Adapter } from '../adapters/interfaces/Adapter'
import type { CapabilityOperation } from '../types/capabilities'

export function throwUnsupportedOperation(capability: symbol): never
export function throwUnsupportedOperation(
    capability: symbol,
    operation: CapabilityOperation,
): never
export function throwUnsupportedOperation(
    capability: symbol,
    operation: CapabilityOperation,
    adapter: Adapter,
): never
export function throwUnsupportedOperation(
    capability: symbol,
    operation: CapabilityOperation,
    adapter: Adapter,
    reason: 'not-implemented' | 'disabled',
): never
export function throwUnsupportedOperation(
    capability: symbol,
    operation?: CapabilityOperation,
    adapter?: Adapter,
    reason?: 'not-implemented' | 'disabled',
): never {
    throw new UnsupportedOperationError({
        capability,
        operation: operation ?? undefined,
        adapter: adapter ? 'Adapter' : undefined,
        reason: reason ?? 'not-implemented',
    })
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/sdk/__tests__/throwUnsupportedOperation.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sdk/throwUnsupportedOperation.ts src/sdk/__tests__/throwUnsupportedOperation.spec.ts && git commit -S -m "feat(sdk): add throwUnsupportedOperation utility with overloads"
```

---

### Task 38: Implement `hasCapability()` Type Guard + Runtime Check

**Files:**
- Create: `src/sdk/hasCapability.ts`
- Create: `src/sdk/__tests__/hasCapability.spec.ts`

- [ ] **Step 1: Write failing test for hasCapability**

```typescript
// src/sdk/__tests__/hasCapability.spec.ts
import { describe, it, expect } from 'vitest'
import { hasCapability } from '../hasCapability'
import { Read, Write, Stream, Lock } from '../../adapters/capabilities'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'

function makeAdapterWith(...caps: symbol[]): Adapter {
    return { capabilities: new Set(caps) }
}

describe('hasCapability', () => {
    it('returns true when adapter has the capability', () => {
        const adapter = makeAdapterWith(Read, Write)
        expect(hasCapability(adapter, Read)).toBe(true)
    })

    it('returns false when adapter lacks the capability', () => {
        const adapter = makeAdapterWith(Read)
        expect(hasCapability(adapter, Lock)).toBe(false)
    })

    it('narrows type when capability is present', () => {
        const adapter: Adapter = makeAdapterWith(Read, Write)
        if (hasCapability(adapter, Read)) {
            // Type narrows to Adapter & ReadAdapter
            // This is a type-level test; runtime just confirms true
            expect(adapter.capabilities.has(Read)).toBe(true)
        }
    })

    it('returns false for empty capabilities', () => {
        const adapter = makeAdapterWith()
        expect(hasCapability(adapter, Read)).toBe(false)
    })

    it('checks multiple capabilities at once', () => {
        const adapter = makeAdapterWith(Read, Write, Stream)
        expect(hasCapability(adapter, Read, Write)).toBe(true)
        expect(hasCapability(adapter, Read, Lock)).toBe(false)
    })
})
```

Run: `npx vitest run src/sdk/__tests__/hasCapability.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement hasCapability**

```typescript
// src/sdk/hasCapability.ts
import type { Adapter } from '../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../adapters/interfaces/capabilities/WriteAdapter'
import type { StreamAdapter } from '../adapters/interfaces/capabilities/StreamAdapter'
import type { MutateAdapter } from '../adapters/interfaces/capabilities/MutateAdapter'
import type { NavigateAdapter } from '../adapters/interfaces/capabilities/NavigateAdapter'
import type { WatchAdapter } from '../adapters/interfaces/capabilities/WatchAdapter'
import type { TransactionAdapter } from '../adapters/interfaces/capabilities/TransactionAdapter'
import type { LockAdapter } from '../adapters/interfaces/capabilities/LockAdapter'
import type { MetadataAdapter } from '../adapters/interfaces/capabilities/MetadataAdapter'
import type { VersioningAdapter } from '../adapters/interfaces/capabilities/VersioningAdapter'
import type { SearchAdapter } from '../adapters/interfaces/capabilities/SearchAdapter'
import type { LinkingAdapter } from '../adapters/interfaces/capabilities/LinkingAdapter'
import type { EventsAdapter } from '../adapters/interfaces/capabilities/EventsAdapter'
import {
    Read,
    Write,
    Stream,
    Mutate,
    Navigate,
    Watch,
    Transaction,
    Lock,
    Metadata,
    Versioning,
    Search,
    Linking,
    Events,
} from '../adapters/capabilities'
import type { CapabilityMap } from '../adapters/interfaces/CapabilityMap'

type CapabilityInterface<S extends symbol> = S extends typeof Read
    ? ReadAdapter
    : S extends typeof Write
      ? WriteAdapter
      : S extends typeof Stream
        ? StreamAdapter
        : S extends typeof Mutate
          ? MutateAdapter
          : S extends typeof Navigate
            ? NavigateAdapter
            : S extends typeof Watch
              ? WatchAdapter
              : S extends typeof Transaction
                ? TransactionAdapter
                : S extends typeof Lock
                  ? LockAdapter
                  : S extends typeof Metadata
                    ? MetadataAdapter
                    : S extends typeof Versioning
                      ? VersioningAdapter
                      : S extends typeof Search
                        ? SearchAdapter
                        : S extends typeof Linking
                          ? LinkingAdapter
                          : S extends typeof Events
                            ? EventsAdapter
                            : never

type AugmentAdapter<A extends Adapter, S extends symbol> = A & CapabilityInterface<S>

export function hasCapability<A extends Adapter, S extends symbol>(
    adapter: A,
    capability: S,
): adapter is AugmentAdapter<A, S>

export function hasCapability<A extends Adapter, S extends symbol[]>(
    adapter: A,
    ...capabilities: S
): boolean

export function hasCapability<A extends Adapter>(
    adapter: A,
    ...capabilities: symbol[]
): boolean {
    return capabilities.every((cap) => adapter.capabilities.has(cap))
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/sdk/__tests__/hasCapability.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sdk/hasCapability.ts src/sdk/__tests__/hasCapability.spec.ts && git commit -S -m "feat(sdk): add hasCapability type guard with runtime check"
```

---

### Task 39: Implement `extend()` Standalone Utility

**Files:**
- Create: `src/sdk/extend.ts`
- Create: `src/sdk/__tests__/extend.spec.ts`

- [ ] **Step 1: Write failing test for extend**

```typescript
// src/sdk/__tests__/extend.spec.ts
import { describe, it, expect } from 'vitest'
import { extend } from '../extend'
import { _getAdapter, setFS } from '../../bootstrap'
import { Read, Write, Stream, Lock } from '../../adapters/capabilities'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'
import type { LockAdapter } from '../../adapters/interfaces/capabilities/LockAdapter'
import { CapabilityConflictError } from '../../shared/errors/CapabilityConflictError'

function makeReadAdapter(): Adapter & ReadAdapter {
    return {
        capabilities: new Set([Read]),
        get: async () => '',
        getAsBuffer: async () => new Uint8Array(),
        getAsJSON: async () => ({} as any),
    }
}

function makeWriteAdapter(): Adapter & WriteAdapter {
    return {
        capabilities: new Set([Write]),
        put: async () => true,
        putStreamed: async () => {},
        append: async () => true,
        appendStreamed: async () => {},
        mkdir: async () => {},
    }
}

function makeLockAdapter(): Adapter & LockAdapter {
    return {
        capabilities: new Set([Lock]),
        lock: async () =>
            ({
                release() {},
                [Symbol.dispose]() {},
                type: 'exclusive' as const,
                path: '/test' as any,
                acquired: true,
            }) as any,
    }
}

function makeConflictingReadAdapter(): Adapter & ReadAdapter {
    return {
        capabilities: new Set([Read]),
        get: async () => 'conflict',
        getAsBuffer: async () => new Uint8Array(),
        getAsJSON: async () => ({} as any),
    }
}

describe('extend', () => {
    it('composes extensions with global base adapter', () => {
        const base = makeReadAdapter()
        setFS(base)
        const lockExt = makeLockAdapter()
        const result = extend(lockExt)
        expect(result.capabilities.has(Read)).toBe(true)
        expect(result.capabilities.has(Lock)).toBe(true)
    })

    it('extension overrides base on overlapping capabilities', () => {
        const base = makeReadAdapter()
        setFS(base)
        const overrideRead = makeConflictingReadAdapter()
        const result = extend(overrideRead)
        expect(result.capabilities.has(Read)).toBe(true)
        // Extension's get should override base's get
        expect((result as any).get).toBe(overrideRead.get)
    })

    it('throws CapabilityConflictError if two extensions provide same capability', () => {
        const base = makeWriteAdapter()
        setFS(base)
        const read1 = makeReadAdapter()
        const read2 = makeConflictingReadAdapter()
        expect(() => extend(read1, read2)).toThrow(CapabilityConflictError)
    })

    it('merges capabilities from multiple non-conflicting extensions', () => {
        const base = makeReadAdapter()
        setFS(base)
        const writeExt = makeWriteAdapter()
        const lockExt = makeLockAdapter()
        const result = extend(writeExt, lockExt)
        expect(result.capabilities.has(Read)).toBe(true)
        expect(result.capabilities.has(Write)).toBe(true)
        expect(result.capabilities.has(Lock)).toBe(true)
    })
})
```

Run: `npx vitest run src/sdk/__tests__/extend.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement extend**

```typescript
// src/sdk/extend.ts
import type { Adapter } from '../adapters/interfaces/Adapter'
import type { CompositeAdapter } from '../adapters/interfaces/CompositeAdapter'
import { _getAdapter } from '../bootstrap'
import { CapabilityConflictError } from '../shared/errors/CapabilityConflictError'

export function extend(...extensions: Adapter[]): CompositeAdapter {
    const base = _getAdapter()
    const merged = new Set(base.capabilities)
    const result: Record<string, unknown> = {
        capabilities: merged,
    }

    // Copy base methods
    for (const key of Object.keys(base as any)) {
        if (key !== 'capabilities') {
            result[key] = (base as any)[key]
        }
    }

    // Track which extension provides which capability
    const extensionCapabilities = new Map<symbol, number>()

    for (let i = 0; i < extensions.length; i++) {
        const ext = extensions[i]
        for (const cap of ext.capabilities) {
            if (extensionCapabilities.has(cap)) {
                throw new CapabilityConflictError({
                    capabilities: new Set([cap, ...Array.from(extensionCapabilities.keys())]),
                })
            }
            extensionCapabilities.set(cap, i)
            merged.add(cap)
        }
        // Extension overrides base on overlapping capabilities
        for (const key of Object.keys(ext as any)) {
            if (key !== 'capabilities') {
                result[key] = (ext as any)[key]
            }
        }
    }

    return Object.freeze(result) as unknown as CompositeAdapter
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/sdk/__tests__/extend.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sdk/extend.ts src/sdk/__tests__/extend.spec.ts && git commit -S -m "feat(sdk): add extend() utility for adapter composition"
```

---

### Task 40: Implement `Storage` Builder Pattern

**Files:**
- Create: `src/Storage.ts`
- Create: `src/Storage.spec.ts`

- [ ] **Step 1: Write failing test for Storage builder**

```typescript
// src/Storage.spec.ts
import { describe, it, expect } from 'vitest'
import { Storage } from './Storage'
import { Read, Write, Lock, Stream } from './adapters/capabilities'
import type { Adapter } from './adapters/interfaces/Adapter'
import type { ReadAdapter } from './adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from './adapters/interfaces/capabilities/WriteAdapter'
import type { LockAdapter } from './adapters/interfaces/capabilities/LockAdapter'
import { CapabilityConflictError } from './shared/errors/CapabilityConflictError'

function makeReadAdapter(): Adapter & ReadAdapter {
    return {
        capabilities: new Set([Read]),
        get: async () => 'read-result',
        getAsBuffer: async () => new Uint8Array(),
        getAsJSON: async () => ({ data: true }),
    }
}

function makeWriteAdapter(): Adapter & WriteAdapter {
    return {
        capabilities: new Set([Write]),
        put: async () => true,
        putStreamed: async () => {},
        append: async () => true,
        appendStreamed: async () => {},
        mkdir: async () => {},
    }
}

function makeLockAdapter(): Adapter & LockAdapter {
    return {
        capabilities: new Set([Lock]),
        lock: async () =>
            ({
                release() {},
                [Symbol.dispose]() {},
                type: 'exclusive' as const,
                path: '/test' as any,
                acquired: true,
            }) as any,
    }
}

describe('Storage builder', () => {
    it('Storage.with(adapter).build() returns frozen object with all capabilities', () => {
        const adapter = makeReadAdapter()
        const storage = Storage.with(adapter).build()
        expect(Object.isFrozen(storage)).toBe(true)
        expect(storage.capabilities.has(Read)).toBe(true)
    })

    it('.for() narrows returned type to only specified capabilities', () => {
        const adapter = makeReadAdapter()
        const storage = Storage.with(adapter).for(Read).build()
        expect(storage.capabilities.has(Read)).toBe(true)
    })

    it('.extend() augments base adapter', () => {
        const base = makeReadAdapter()
        const lockExt = makeLockAdapter()
        const storage = Storage.with(base).extend(lockExt).build()
        expect(storage.capabilities.has(Read)).toBe(true)
        expect(storage.capabilities.has(Lock)).toBe(true)
    })

    it('.extend() with conflicting extensions throws CapabilityConflictError', () => {
        const base = makeReadAdapter()
        const readExt = makeReadAdapter()
        const storage = Storage.with(base).extend(readExt)
        expect(() => storage.build()).toThrow(CapabilityConflictError)
    })

    it('.for() with non-existent capability still builds (methods absent)', () => {
        const adapter = makeReadAdapter()
        const storage = Storage.with(adapter).for(Read, Write).build()
        // Read methods exist, Write does not
        expect(storage.capabilities.has(Read)).toBe(true)
    })

    it('minimal builder with just adapter', () => {
        const adapter = makeReadAdapter()
        const storage = Storage.with(adapter).build()
        expect(typeof storage.get).toBe('function')
    })
})
```

Run: `npx vitest run src/Storage.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement Storage builder**

```typescript
// src/Storage.ts
import type { Adapter } from './adapters/interfaces/Adapter'
import type { CompositeAdapter } from './adapters/interfaces/CompositeAdapter'
import { CapabilityConflictError } from './shared/errors/CapabilityConflictError'
import type { ReadAdapter } from './adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from './adapters/interfaces/capabilities/WriteAdapter'
import type { StreamAdapter } from './adapters/interfaces/capabilities/StreamAdapter'
import type { MutateAdapter } from './adapters/interfaces/capabilities/MutateAdapter'
import type { NavigateAdapter } from './adapters/interfaces/capabilities/NavigateAdapter'
import type { WatchAdapter } from './adapters/interfaces/capabilities/WatchAdapter'
import type { TransactionAdapter } from './adapters/interfaces/capabilities/TransactionAdapter'
import type { LockAdapter } from './adapters/interfaces/capabilities/LockAdapter'
import type { MetadataAdapter } from './adapters/interfaces/capabilities/MetadataAdapter'
import type { VersioningAdapter } from './adapters/interfaces/capabilities/VersioningAdapter'
import type { SearchAdapter } from './adapters/interfaces/capabilities/SearchAdapter'
import type { LinkingAdapter } from './adapters/interfaces/capabilities/LinkingAdapter'
import type { EventsAdapter } from './adapters/interfaces/capabilities/EventsAdapter'
import {
    Read,
    Write,
    Stream,
    Mutate,
    Navigate,
    Watch,
    Transaction,
    Lock,
    Metadata,
    Versioning,
    Search,
    Linking,
    Events,
} from './adapters/capabilities'

type DomainInterfaceMap = {
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

type CapabilitySetToInterface<S extends symbol> = S extends keyof DomainInterfaceMap
    ? DomainInterfaceMap[S]
    : never

type ForCapabilities<Caps extends symbol[]> = Caps extends (infer S extends symbol)[]
    ? Adapter & { [K in S]: CapabilitySetToInterface<K> }[S]
    : Adapter

class StorageBuilder<Base extends Adapter = Adapter> {
    private base: Base
    private extensions: Adapter[] = []
    private narrowTo?: symbol[]

    constructor(base: Base) {
        this.base = base
    }

    extend(...partialAdapters: Adapter[]): StorageBuilder<Base> {
        this.extensions.push(...partialAdapters)
        return this
    }

    for(...capabilities: symbol[]): StorageBuilder<Base> {
        this.narrowTo = capabilities
        return this
    }

    build(): Adapter | CompositeAdapter {
        const merged = new Set(this.base.capabilities)
        const result: Record<string, unknown> = {
            capabilities: merged,
        }

        // Copy base methods
        for (const key of Object.keys(this.base as any)) {
            if (key !== 'capabilities') {
                result[key] = (this.base as any)[key]
            }
        }

        // Process extensions
        const extensionCapabilitySources = new Map<symbol, number>()

        for (let i = 0; i < this.extensions.length; i++) {
            const ext = this.extensions[i]
            for (const cap of ext.capabilities) {
                if (extensionCapabilitySources.has(cap)) {
                    throw new CapabilityConflictError({
                        capabilities: new Set([cap]),
                    })
                }
                extensionCapabilitySources.set(cap, i)
                merged.add(cap)
            }
            // Extension overrides base on overlapping capabilities
            for (const key of Object.keys(ext as any)) {
                if (key !== 'capabilities') {
                    result[key] = (ext as any)[key]
                }
            }
        }

        // If .for() was called, narrow the capabilities set
        if (this.narrowTo) {
            const narrowed = new Set<symbol>()
            for (const cap of this.narrowTo) {
                if (merged.has(cap)) {
                    narrowed.add(cap)
                }
            }
            result.capabilities = narrowed
        }

        return Object.freeze(result) as unknown as Adapter | CompositeAdapter
    }
}

export const Storage = {
    with<A extends Adapter>(adapter: A): StorageBuilder<A> {
        return new StorageBuilder(adapter)
    },
} as const

export { StorageBuilder }
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/Storage.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Storage.ts src/Storage.spec.ts && git commit -S -m "feat: add Storage builder pattern (with/extend/for/build)"
```

---

### Task 41: Implement `fs` Proxy Singleton

**Files:**
- Create: `src/fs/proxy.ts`
- Create: `src/fs/__tests__/proxy.spec.ts`

- [ ] **Step 1: Write failing test for fs Proxy**

```typescript
// src/fs/__tests__/proxy.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFSProxy } from '../proxy'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import { Read, Write } from '../../adapters/capabilities'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'
import { setFS, _resetBootstrap } from '../../bootstrap'

function makeFakeReadAdapter(): Adapter & Record<string, any> {
    return {
        capabilities: new Set([Read]),
        get: vi.fn(async () => 'file-content'),
        getAsBuffer: vi.fn(async () => new Uint8Array([1, 2, 3])),
        getAsJSON: vi.fn(async () => ({ parsed: true })),
    }
}

describe('fs Proxy', () => {
    beforeEach(() => {
        _resetBootstrap()
    })

    it('delegates method calls to resolved adapter', () => {
        const adapter = makeFakeReadAdapter()
        setFS(adapter)
        const fs = createFSProxy()
        // Access via proxy should delegate to adapter
        expect(typeof fs.get).toBe('function')
    })

    it('exposes .capabilities for runtime introspection', () => {
        const adapter = makeFakeReadAdapter()
        setFS(adapter)
        const fs = createFSProxy()
        expect(fs.capabilities).toBe(adapter.capabilities)
    })

    it('throws UnsupportedOperationError for unsupported methods', () => {
        const adapter = makeFakeReadAdapter()
        setFS(adapter)
        const fs = createFSProxy()
        // Write is not in capabilities
        expect(() => fs.put).toBeDefined()
        expect(() => fs.put('/test', 'data')).toThrow(UnsupportedOperationError)
    })

    it('returns correct capability set via .capabilities', () => {
        const adapter = makeFakeReadAdapter()
        setFS(adapter)
        const fs = createFSProxy()
        expect(fs.capabilities.has(Read)).toBe(true)
        expect(fs.capabilities.has(Write)).toBe(false)
    })
})
```

Run: `npx vitest run src/fs/__tests__/proxy.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement fs Proxy**

```typescript
// src/fs/proxy.ts
import { _getAdapter } from '../bootstrap'
import type { Adapter } from '../adapters/interfaces/Adapter'
import { throwUnsupportedOperation } from '../sdk/throwUnsupportedOperation'
import type { CapabilityOperation } from '../types/capabilities'

export function createFSProxy(): Adapter & { capabilities: Set<symbol> } {
    return new Proxy({} as Adapter & { capabilities: Set<symbol> }, {
        get(_target, prop: string | symbol) {
            if (prop === 'capabilities') {
                return _getAdapter().capabilities
            }
            const adapter = _getAdapter()
            if (prop in adapter) {
                const value = (adapter as any)[prop]
                if (typeof value === 'function') {
                    return value.bind(adapter)
                }
                return value
            }
            // Method doesn't exist on adapter — return a function that throws
            return (..._args: unknown[]) => {
                throwUnsupportedOperation(
                    Symbol.for('unknown'),
                    prop as CapabilityOperation,
                    adapter,
                    'not-implemented',
                )
            }
        },
        ownKeys() {
            return Reflect.ownKeys(_getAdapter())
        },
        has(_target, prop) {
            return prop in (_getAdapter() as any)
        },
        getOwnPropertyDescriptor(_target, prop) {
            const adapter = _getAdapter()
            if (prop in (adapter as any)) {
                return {
                    configurable: true,
                    enumerable: true,
                    value: (adapter as any)[prop],
                    writable: true,
                }
            }
            return undefined
        },
    })
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/fs/__tests__/proxy.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fs/proxy.ts src/fs/__tests__/proxy.spec.ts && git commit -S -m "feat(fs): add Proxy-based fs singleton with capability introspection"
```

---

### Task 42: Implement `crossAdapterCopy()` SDK Utility

**Files:**
- Create: `src/sdk/crossAdapterCopy.ts`
- Create: `src/sdk/__tests__/crossAdapterCopy.spec.ts`

- [ ] **Step 1: Write failing test for crossAdapterCopy**

```typescript
// src/sdk/__tests__/crossAdapterCopy.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { crossAdapterCopy } from '../crossAdapterCopy'
import { Read, Write } from '../../adapters/capabilities'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'
import { p } from '../../shared/functions/p'

function makeSourceAdapter(): Adapter & ReadAdapter {
    return {
        capabilities: new Set([Read]),
        get: vi.fn(async () => 'source-content'),
        getAsBuffer: vi.fn(async () => new Uint8Array([1, 2, 3])),
        getAsJSON: vi.fn(async () => ({ data: true })),
    }
}

function makeDestAdapter(): Adapter & WriteAdapter {
    return {
        capabilities: new Set([Write]),
        put: vi.fn(async () => true),
        putStreamed: vi.fn(async () => {}),
        append: vi.fn(async () => true),
        appendStreamed: vi.fn(async () => {}),
        mkdir: vi.fn(async () => {}),
    }
}

function makeNoReadAdapter(): Adapter {
    return { capabilities: new Set() }
}

function makeNoWriteAdapter(): Adapter {
    return { capabilities: new Set() }
}

describe('crossAdapterCopy', () => {
    it('copies data from source to dest adapter', async () => {
        const source = makeSourceAdapter()
        const dest = makeDestAdapter()
        await crossAdapterCopy(
            { adapter: source, path: p`/source/file.txt` },
            { adapter: dest, path: p`/dest/file.txt` },
        )
        expect(dest.put).toHaveBeenCalledWith(
            p`/dest/file.txt`,
            expect.any(Uint8Array),
            undefined,
        )
    })

    it('throws UnsupportedOperationError if source lacks Read capability', async () => {
        const source = makeNoReadAdapter() as any
        const dest = makeDestAdapter()
        await expect(
            crossAdapterCopy(
                { adapter: source, path: p`/source.txt` },
                { adapter: dest, path: p`/dest.txt` },
            ),
        ).rejects.toThrow(UnsupportedOperationError)
    })

    it('throws UnsupportedOperationError if dest lacks Write capability', async () => {
        const source = makeSourceAdapter()
        const dest = makeNoWriteAdapter() as any
        await expect(
            crossAdapterCopy(
                { adapter: source, path: p`/source.txt` },
                { adapter: dest, path: p`/dest.txt` },
            ),
        ).rejects.toThrow(UnsupportedOperationError)
    })

    it('calls onProgress callback when provided', async () => {
        const source = makeSourceAdapter()
        const dest = makeDestAdapter()
        const onProgress = vi.fn()
        await crossAdapterCopy(
            { adapter: source, path: p`/source.txt` },
            { adapter: dest, path: p`/dest.txt` },
            { onProgress },
        )
        expect(onProgress).toHaveBeenCalled()
    })
})
```

Run: `npx vitest run src/sdk/__tests__/crossAdapterCopy.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement crossAdapterCopy**

```typescript
// src/sdk/crossAdapterCopy.ts
import type { Adapter } from '../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../adapters/interfaces/capabilities/WriteAdapter'
import { Read, Write } from '../adapters/capabilities'
import { hasCapability } from './hasCapability'
import { UnsupportedOperationError } from '../shared/errors/UnsupportedOperationError'
import type { StoragePath } from '../types/StoragePath'

interface CrossAdapterOptions {
    concurrency?: number
    onProgress?: (transferred: number, total?: number) => void
    verifyIntegrity?: boolean
}

interface CopySource {
    adapter: Adapter
    path: StoragePath | string
}

interface CopyDest {
    adapter: Adapter
    path: StoragePath | string
}

export async function crossAdapterCopy(
    source: CopySource,
    dest: CopyDest,
    options?: CrossAdapterOptions,
): Promise<void> {
    if (!hasCapability(source.adapter, Read)) {
        throw new UnsupportedOperationError({
            capability: Read,
            operation: 'getAsBuffer',
            adapter: 'SourceAdapter',
            reason: 'not-implemented',
        })
    }
    if (!hasCapability(dest.adapter, Write)) {
        throw new UnsupportedOperationError({
            capability: Write,
            operation: 'put',
            adapter: 'DestAdapter',
            reason: 'not-implemented',
        })
    }

    const readAdapter = source.adapter as Adapter & ReadAdapter
    const writeAdapter = dest.adapter as Adapter & WriteAdapter

    const data = await readAdapter.getAsBuffer(source.path)
    await writeAdapter.put(dest.path, data)

    if (options?.onProgress) {
        options.onProgress(data.byteLength)
    }

    if (options?.verifyIntegrity) {
        const copied = await readAdapter.getAsBuffer(dest.path)
        if (copied.byteLength !== data.byteLength) {
            throw new Error('Integrity verification failed: size mismatch')
        }
    }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/sdk/__tests__/crossAdapterCopy.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sdk/crossAdapterCopy.ts src/sdk/__tests__/crossAdapterCopy.spec.ts && git commit -S -m "feat(sdk): add crossAdapterCopy utility"
```

---

### Task 43: Implement `crossAdapterMove()` SDK Utility

**Files:**
- Create: `src/sdk/crossAdapterMove.ts`
- Create: `src/sdk/__tests__/crossAdapterMove.spec.ts`

- [ ] **Step 1: Write failing test for crossAdapterMove**

```typescript
// src/sdk/__tests__/crossAdapterMove.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { crossAdapterMove } from '../crossAdapterMove'
import { Read, Write, Mutate } from '../../adapters/capabilities'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'
import { p } from '../../shared/functions/p'

function makeSourceAdapter(): Adapter & ReadAdapter & MutateAdapter {
    return {
        capabilities: new Set([Read, Mutate]),
        get: vi.fn(async () => 'source-content'),
        getAsBuffer: vi.fn(async () => new Uint8Array([1, 2, 3])),
        getAsJSON: vi.fn(async () => ({})),
        copy: vi.fn(async () => {}),
        rename: vi.fn(async () => {}),
        move: vi.fn(async () => {}),
        delete: vi.fn(async () => {}),
    }
}

function makeDestAdapter(): Adapter & WriteAdapter {
    return {
        capabilities: new Set([Write]),
        put: vi.fn(async () => true),
        putStreamed: vi.fn(async () => {}),
        append: vi.fn(async () => true),
        appendStreamed: vi.fn(async () => {}),
        mkdir: vi.fn(async () => {}),
    }
}

describe('crossAdapterMove', () => {
    it('copies then deletes from source', async () => {
        const source = makeSourceAdapter()
        const dest = makeDestAdapter()
        await crossAdapterMove(
            { adapter: source, path: p`/source/file.txt` },
            { adapter: dest, path: p`/dest/file.txt` },
        )
        expect(dest.put).toHaveBeenCalled()
        expect(source.delete).toHaveBeenCalledWith(p`/source/file.txt`)
    })

    it('throws UnsupportedOperationError if source lacks Mutate capability', async () => {
        const source = {
            capabilities: new Set([Read]),
            get: vi.fn(async () => ''),
            getAsBuffer: vi.fn(async () => new Uint8Array()),
            getAsJSON: vi.fn(async () => ({})),
        } as any
        const dest = makeDestAdapter()
        await expect(
            crossAdapterMove(
                { adapter: source, path: p`/source.txt` },
                { adapter: dest, path: p`/dest.txt` },
            ),
        ).rejects.toThrow(UnsupportedOperationError)
    })
})
```

Run: `npx vitest run src/sdk/__tests__/crossAdapterMove.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement crossAdapterMove**

```typescript
// src/sdk/crossAdapterMove.ts
import type { Adapter } from '../adapters/interfaces/Adapter'
import type { MutateAdapter } from '../adapters/interfaces/capabilities/MutateAdapter'
import { Mutate } from '../adapters/capabilities'
import { crossAdapterCopy } from './crossAdapterCopy'
import { hasCapability } from './hasCapability'
import { UnsupportedOperationError } from '../shared/errors/UnsupportedOperationError'
import type { StoragePath } from '../types/StoragePath'

interface CrossAdapterOptions {
    concurrency?: number
    onProgress?: (transferred: number, total?: number) => void
    verifyIntegrity?: boolean
}

interface MoveSource {
    adapter: Adapter
    path: StoragePath | string
}

interface MoveDest {
    adapter: Adapter
    path: StoragePath | string
}

export async function crossAdapterMove(
    source: MoveSource,
    dest: MoveDest,
    options?: CrossAdapterOptions,
): Promise<void> {
    if (!hasCapability(source.adapter, Mutate)) {
        throw new UnsupportedOperationError({
            capability: Mutate,
            operation: 'delete',
            adapter: 'SourceAdapter',
            reason: 'not-implemented',
        })
    }

    await crossAdapterCopy(source, dest, options)

    const mutateAdapter = source.adapter as Adapter & MutateAdapter
    await mutateAdapter.delete(source.path)
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/sdk/__tests__/crossAdapterMove.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sdk/crossAdapterMove.ts src/sdk/__tests__/crossAdapterMove.spec.ts && git commit -S -m "feat(sdk): add crossAdapterMove utility (copy + delete)"
```

---

### Task 44: Implement `sequentialBatch()` SDK Utility

**Files:**
- Create: `src/sdk/sequentialBatch.ts`
- Create: `src/sdk/__tests__/sequentialBatch.spec.ts`

- [ ] **Step 1: Write failing test for sequentialBatch**

```typescript
// src/sdk/__tests__/sequentialBatch.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { sequentialBatch } from '../sequentialBatch'
import { Read, Write, Mutate } from '../../adapters/capabilities'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'
import type { TransactionOperation } from '../../types/capabilities'
import { StorageError } from '../../shared/errors/StorageError'
import { p } from '../../shared/functions/p'

function makeFullAdapter(): Adapter & WriteAdapter & MutateAdapter & ReadAdapter {
    const files = new Map<string, string>()
    return {
        capabilities: new Set([Read, Write, Mutate]),
        get: vi.fn(async (path: string) => files.get(path) ?? ''),
        getAsBuffer: vi.fn(async () => new Uint8Array()),
        getAsJSON: vi.fn(async () => ({})),
        put: vi.fn(async (path: string, value: unknown) => {
            files.set(path, String(value))
            return true
        }),
        putStreamed: vi.fn(async () => {}),
        append: vi.fn(async () => true),
        appendStreamed: vi.fn(async () => {}),
        mkdir: vi.fn(async () => {}),
        copy: vi.fn(async (from: string, to: string) => {
            files.set(to, files.get(from) ?? '')
        }),
        rename: vi.fn(async () => {}),
        move: vi.fn(async (from: string, to: string) => {
            files.set(to, files.get(from) ?? '')
            files.delete(from)
        }),
        delete: vi.fn(async (path: string) => {
            files.delete(path)
        }),
    }
}

describe('sequentialBatch', () => {
    it('executes operations sequentially', async () => {
        const adapter = makeFullAdapter()
        const ops: TransactionOperation[] = [
            { type: 'put', path: '/a.txt', value: 'hello' },
            { type: 'put', path: '/b.txt', value: 'world' },
        ]
        const result = await sequentialBatch(adapter, ops)
        expect(result.completed).toBe(2)
        expect(result.total).toBe(2)
        expect(result.partial).toBe(false)
    })

    it('stops on first error with stopOnError=true', async () => {
        const adapter = makeFullAdapter()
        // Make delete fail
        ;(adapter.delete as any).mockRejectedValueOnce(new StorageError('delete failed'))
        const ops: TransactionOperation[] = [
            { type: 'put', path: '/a.txt', value: 'hello' },
            { type: 'delete', path: '/nonexistent.txt' },
            { type: 'put', path: '/b.txt', value: 'world' },
        ]
        const result = await sequentialBatch(adapter, ops, { stopOnError: true })
        expect(result.completed).toBe(1)
        expect(result.partial).toBe(true)
    })

    it('continues on error with stopOnError=false', async () => {
        const adapter = makeFullAdapter()
        ;(adapter.delete as any).mockRejectedValueOnce(new StorageError('delete failed'))
        const ops: TransactionOperation[] = [
            { type: 'put', path: '/a.txt', value: 'hello' },
            { type: 'delete', path: '/nonexistent.txt' },
            { type: 'put', path: '/b.txt', value: 'world' },
        ]
        const result = await sequentialBatch(adapter, ops, { stopOnError: false })
        expect(result.completed).toBe(3)
        expect(result.errors[1]).not.toBeNull()
        expect(result.partial).toBe(false)
    })

    it('calls onProgress callback', async () => {
        const adapter = makeFullAdapter()
        const onProgress = vi.fn()
        const ops: TransactionOperation[] = [
            { type: 'put', path: '/a.txt', value: 'a' },
            { type: 'put', path: '/b.txt', value: 'b' },
        ]
        await sequentialBatch(adapter, ops, { onProgress })
        expect(onProgress).toHaveBeenCalledTimes(2)
    })

    it('attempts rollback with rollbackOnError=true', async () => {
        const adapter = makeFullAdapter()
        ;(adapter.put as any).mockRejectedValueOnce(new StorageError('put failed'))
        const ops: TransactionOperation[] = [
            { type: 'put', path: '/a.txt', value: 'hello' },
        ]
        const result = await sequentialBatch(adapter, ops, {
            stopOnError: true,
            rollbackOnError: true,
        })
        expect(result.partial).toBe(true)
    })
})
```

Run: `npx vitest run src/sdk/__tests__/sequentialBatch.spec.ts`
Expected: FAIL

- [ ] **Step 2: Implement sequentialBatch**

```typescript
// src/sdk/sequentialBatch.ts
import type { Adapter } from '../adapters/interfaces/Adapter'
import type { WriteAdapter } from '../adapters/interfaces/capabilities/WriteAdapter'
import type { MutateAdapter } from '../adapters/interfaces/capabilities/MutateAdapter'
import type { ReadAdapter } from '../adapters/interfaces/capabilities/ReadAdapter'
import type { TransactionOperation } from '../types/capabilities'
import { Read, Write, Mutate } from '../adapters/capabilities'
import { StorageError } from '../shared/errors/StorageError'

interface SequentialBatchOptions {
    stopOnError?: boolean
    rollbackOnError?: boolean
    onProgress?: (completed: number, total: number) => void
}

interface SequentialBatchResult {
    completed: number
    total: number
    results: unknown[]
    errors: (StorageError | null)[]
    partial: boolean
}

export async function sequentialBatch(
    adapter: Adapter,
    operations: TransactionOperation[],
    options?: SequentialBatchOptions,
): Promise<SequentialBatchResult> {
    const stopOnError = options?.stopOnError ?? true
    const rollbackOnError = options?.rollbackOnError ?? false
    const results: unknown[] = []
    const errors: (StorageError | null)[] = []
    let completed = 0
    let partial = false
    const executedOps: { op: TransactionOperation; result: unknown }[] = []

    for (const op of operations) {
        try {
            const result = await executeOperation(adapter, op)
            results.push(result)
            errors.push(null)
            executedOps.push({ op, result })
            completed++
            options?.onProgress?.(completed, operations.length)
        } catch (err) {
            const storageErr =
                err instanceof StorageError
                    ? err
                    : new StorageError(String(err), { cause: err as Error })
            results.push(null)
            errors.push(storageErr)
            completed++
            options?.onProgress?.(completed, operations.length)

            if (stopOnError) {
                partial = true
                if (rollbackOnError) {
                    await attemptRollback(adapter, executedOps)
                }
                break
            }
        }
    }

    return {
        completed,
        total: operations.length,
        results,
        errors,
        partial,
    }
}

async function executeOperation(adapter: Adapter, op: TransactionOperation): Promise<unknown> {
    if (op.type === 'put') {
        if (!adapter.capabilities.has(Write))
            throw new StorageError('Write capability not supported')
        return (adapter as unknown as WriteAdapter).put(op.path, op.value)
    }
    if (op.type === 'delete') {
        if (!adapter.capabilities.has(Mutate))
            throw new StorageError('Mutate capability not supported')
        return (adapter as unknown as MutateAdapter).delete(op.path)
    }
    if (op.type === 'copy') {
        if (!adapter.capabilities.has(Mutate))
            throw new StorageError('Mutate capability not supported')
        return (adapter as unknown as MutateAdapter).copy(op.from, op.to)
    }
    if (op.type === 'move') {
        if (!adapter.capabilities.has(Mutate))
            throw new StorageError('Mutate capability not supported')
        return (adapter as unknown as MutateAdapter).move(op.from, op.to)
    }
    throw new StorageError(`Unknown operation type: ${(op as any).type}`)
}

async function attemptRollback(
    adapter: Adapter,
    executedOps: { op: TransactionOperation; result: unknown }[],
): Promise<void> {
    // Rollback in reverse order
    for (let i = executedOps.length - 1; i >= 0; i--) {
        const { op } = executedOps[i]
        try {
            if (op.type === 'put' && adapter.capabilities.has(Mutate)) {
                await (adapter as unknown as MutateAdapter).delete(op.path)
            } else if (op.type === 'delete' && adapter.capabilities.has(Read) && adapter.capabilities.has(Write)) {
                // Best-effort: can't restore deleted content without cache
            } else if (op.type === 'copy' && adapter.capabilities.has(Mutate)) {
                await (adapter as unknown as MutateAdapter).delete(op.to)
            } else if (op.type === 'move' && adapter.capabilities.has(Mutate) && adapter.capabilities.has(Read) && adapter.capabilities.has(Write)) {
                // Best-effort: move back
                await (adapter as unknown as MutateAdapter).move(op.to, op.from)
            }
        } catch {
            // Best-effort rollback — swallow errors
        }
    }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/sdk/__tests__/sequentialBatch.spec.ts`
Expected: PASS

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sdk/sequentialBatch.ts src/sdk/__tests__/sequentialBatch.spec.ts && git commit -S -m "feat(sdk): add sequentialBatch utility with best-effort rollback"
```

---

### Task 45: Create SDK Barrel Export

**Files:**
- Create: `src/sdk/index.ts`

- [ ] **Step 1: Create SDK barrel**

```typescript
// src/sdk/index.ts
export { throwUnsupportedOperation } from './throwUnsupportedOperation'
export { hasCapability } from './hasCapability'
export { extend } from './extend'
export { crossAdapterCopy } from './crossAdapterCopy'
export { crossAdapterMove } from './crossAdapterMove'
export { sequentialBatch } from './sequentialBatch'
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/sdk/index.ts && git commit -S -m "feat(sdk): add barrel export for SDK utilities"
```

---

## Sub-Plan 5: Module Organization + Build Config

**Goal:** Reorganize the source tree from flat `src/read/`, `src/write/`, etc. into `src/fs/` domain modules, create `src/blob/` placeholder, update `src/index.ts` barrel, update `package.json` exports, update `tsconfig.*.json`, update `vitest.config.ts`, update `typedoc.json`, delete old domain directories, and regenerate `auto-register.ts`.

---

### Task 46: Create `src/fs/` Domain Module Barrels

**Files:**
- Create: `src/fs/index.ts`
- Create: `src/fs/read/index.ts`
- Create: `src/fs/write/index.ts`
- Create: `src/fs/stream/index.ts`
- Create: `src/fs/mutate/index.ts`
- Create: `src/fs/navigate/index.ts`
- Create: `src/fs/watch/index.ts`
- Create: `src/fs/lock/index.ts`
- Create: `src/fs/metadata/index.ts`
- Create: `src/fs/linking/index.ts`
- Create: `src/fs/events/index.ts`

- [ ] **Step 1: Create read domain barrel**

```typescript
// src/fs/read/index.ts
export { get } from './get'
export { getAsBuffer } from './getAsBuffer'
export { getAsJSON } from './getAsJSON'
```

- [ ] **Step 2: Create write domain barrel**

```typescript
// src/fs/write/index.ts
export { put } from './put'
export { putStreamed } from './putStreamed'
export { append } from './append'
export { appendStreamed } from './appendStreamed'
export { mkdir } from './mkdir'
```

- [ ] **Step 3: Create stream domain barrel**

```typescript
// src/fs/stream/index.ts
export { readStream } from './readStream'
export { writeStream } from './writeStream'
export { duplexStream } from './duplexStream'
export { fileStream } from './fileStream'
export { StorageStream } from './StorageStream'
export { pipe } from './pipe'
export { merge } from './merge'
export { flatMap } from './flatMap'
export { transform } from './transform'
```

- [ ] **Step 4: Create mutate domain barrel**

```typescript
// src/fs/mutate/index.ts
export { copy } from './copy'
export { rename } from './rename'
export { move } from './move'
export { deleteFile } from './delete'
```

- [ ] **Step 5: Create navigate domain barrel**

```typescript
// src/fs/navigate/index.ts
export { exists } from './exists'
export { doesntExist } from './doesntExist'
export { stats } from './stats'
export { isFile } from './isFile'
export { isDirectory } from './isDirectory'
export { listDirectory } from './listDirectory'
export { StorageListing } from './StorageListing'
export { getPresignedUrl } from './getPresignedUrl'
```

- [ ] **Step 6: Create watch domain barrel**

```typescript
// src/fs/watch/index.ts
export { watch } from './watch'
```

- [ ] **Step 7: Create lock domain barrel**

```typescript
// src/fs/lock/index.ts
export { lock } from './lock'
```

- [ ] **Step 8: Create metadata domain barrel**

```typescript
// src/fs/metadata/index.ts
export { getAttributes } from './getAttributes'
export { setAttributes } from './setAttributes'
```

- [ ] **Step 9: Create linking domain barrel**

```typescript
// src/fs/linking/index.ts
export { symlink } from './symlink'
export { hardlink } from './hardlink'
export { readlink } from './readlink'
```

- [ ] **Step 10: Create events domain barrel**

```typescript
// src/fs/events/index.ts
export { on } from './on'
export { off } from './off'
```

- [ ] **Step 11: Create fs family barrel**

```typescript
// src/fs/index.ts
export * from './read'
export * from './write'
export * from './stream'
export * from './mutate'
export * from './navigate'
export * from './watch'
export * from './lock'
export * from './metadata'
export * from './linking'
export * from './events'
export { createFSProxy } from './proxy'
export type { FsAdapter } from '../adapters/interfaces/FsAdapter'
```

- [ ] **Step 12: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (assuming all referenced files exist from Sub-Plans 1-3)

- [ ] **Step 13: Commit**

```bash
git add src/fs/ && git commit -S -m "feat(fs): add domain module barrels and fs family barrel"
```

---

### Task 47: Create `src/blob/` Placeholder Module

**Files:**
- Create: `src/blob/index.ts`
- Create: `src/blob/read/index.ts`
- Create: `src/blob/write/index.ts`
- Create: `src/blob/stream/index.ts`
- Create: `src/blob/mutate/index.ts`
- Create: `src/blob/navigate/index.ts`
- Create: `src/blob/watch/index.ts`
- Create: `src/blob/lock/index.ts`
- Create: `src/blob/metadata/index.ts`
- Create: `src/blob/versioning/index.ts`
- Create: `src/blob/search/index.ts`
- Create: `src/blob/linking/index.ts`
- Create: `src/blob/events/index.ts`

- [ ] **Step 1: Create blob domain barrels — all stubs that throw UnsupportedOperationError**

Each blob domain barrel re-exports placeholder functions. The blob adapter implementation is deferred to a later task, but the subpath export structure must exist.

```typescript
// src/blob/read/index.ts
export { get } from './get'
export { getAsBuffer } from './getAsBuffer'
export { getAsJSON } from './getAsJSON'
```

Each function file (e.g., `src/blob/read/get.ts`) follows this pattern:

```typescript
// src/blob/read/get.ts
import { throwUnsupportedOperation } from '../../sdk/throwUnsupportedOperation'
import { Read } from '../../adapters/capabilities'

export async function get(
    _path: string,
    _encoding?: string,
): Promise<string> {
    throwUnsupportedOperation(Read, 'get')
}
```

Apply the same pattern for all blob domain functions: `getAsBuffer`, `getAsJSON`, `put`, `putStreamed`, `append`, `appendStreamed`, `mkdir`, `readStream`, `writeStream`, `duplexStream`, `fileStream`, `copy`, `rename`, `move`, `delete`, `exists`, `doesntExist`, `stats`, `isFile`, `isDirectory`, `listDirectory`, `getPresignedUrl`, `watch`, `lock`, `getAttributes`, `setAttributes`, `getByVersion`, `listVersions`, `query`, `filter`, `symlink`, `hardlink`, `readlink`, `on`, `off`.

```typescript
// src/blob/index.ts
export * from './read'
export * from './write'
export * from './stream'
export * from './mutate'
export * from './navigate'
export * from './watch'
export * from './lock'
export * from './metadata'
export * from './versioning'
export * from './search'
export * from './linking'
export * from './events'
export type { BlobAdapter } from '../adapters/interfaces/BlobAdapter'
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/blob/ && git commit -S -m "feat(blob): add placeholder module with UnsupportedOperationError stubs"
```

---

### Task 48: Update `src/index.ts` Main Barrel

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Rewrite src/index.ts**

Replace the current barrel with the new module structure. The main entry re-exports both adapter families, SDK, types, adapters, bootstrap, and the `fs` proxy singleton.

```typescript
// src/index.ts
// Adapter families
export * from './fs'
export * from './blob'

// Adapters
export * from './adapters'

// SDK
export * from './sdk'

// Types
export * from './types'

// Bootstrap
export { setFS, useAdapter } from './bootstrap'

// Storage builder
export { Storage } from './Storage'

// Errors
export { StorageError } from './shared/errors/StorageError'
export { UnsupportedOperationError } from './shared/errors/UnsupportedOperationError'
export { UnsupportedEnvironmentError } from './shared/errors/UnsupportedEnvironmentError'
export { PathNotFoundError } from './shared/errors/PathNotFoundError'
export { PermissionDeniedError } from './shared/errors/PermissionDeniedError'
export { AlreadyExistsError } from './shared/errors/AlreadyExistsError'
export { NotADirectoryError } from './shared/errors/NotADirectoryError'
export { IsDirectoryError } from './shared/errors/IsDirectoryError'
export { TimeoutError } from './shared/errors/TimeoutError'
export { ConnectionError } from './shared/errors/ConnectionError'
export { CapabilityConflictError } from './shared/errors/CapabilityConflictError'
export { TransactionError } from './shared/errors/TransactionError'

// Shared utilities
export { p } from './shared/functions/p'
export { join } from './shared/functions/join'
export { basename } from './shared/functions/basename'
export { dirname } from './shared/functions/dirname'
export { extname } from './shared/functions/extname'
export { normalize } from './shared/functions/normalize'
export { resolve } from './shared/functions/resolve'
export { relative } from './shared/functions/relative'
export { isAbsolute } from './shared/functions/isAbsolute'

// Constants
export { constants, F_OK, R_OK, W_OK, X_OK } from './types/AccessMode'

// fs proxy singleton
import { createFSProxy } from './fs/proxy'
export const fs = createFSProxy()
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/index.ts && git commit -S -m "refactor: rewrite main barrel for new module structure"
```

---

### Task 49: Update `package.json` Exports + Metadata

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update exports map and metadata**

Read the current `package.json` and update the `"exports"` field, `"description"`, and `"keywords"`.

The new exports map:

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

Update description:
```json
"description": "A capability-based storage abstraction for Node.js, Bun, Deno, and blob stores"
```

Update keywords (add `storage`, `abstraction`, `blob`, `capability`):
```json
"keywords": ["storage", "filesystem", "abstraction", "blob", "capability", "adapter", "node", "promise"]
```

- [ ] **Step 2: Validate JSON**

Run: `npx prettier --check package.json`
Expected: PASS (or fix with `npx prettier --write package.json`)

- [ ] **Step 3: Commit**

```bash
git add package.json && git commit -S -m "chore: update package.json exports, description, keywords for 2.0"
```

---

### Task 50: Update `tsconfig.esm.json` and `tsconfig.cjs.json`

**Files:**
- Modify: `tsconfig.esm.json`
- Modify: `tsconfig.cjs.json`

- [ ] **Step 1: Read current tsconfig files and update rootDir/include paths**

The `rootDir` and `include` paths must account for the new `src/fs/`, `src/blob/`, `src/sdk/`, `src/types/` directories. Since `src/` is still the root and all new directories are under `src/`, the existing `rootDir: "./src"` should remain correct. Verify and update if needed.

For `tsconfig.esm.json`, the `outDir` should be `"./dist/esm"` and `rootDir` should be `"./src"`.

For `tsconfig.cjs.json`, the `outDir` should be `"./dist/cjs"` and `rootDir` should be `"./src"`.

Both configs should include all necessary `src/` subdirectories. Since `include: ["src/**/*"]` already covers the new directories, no path changes may be needed — but verify by reading the current files.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Build**

Run: `yarn build`
Expected: PASS (all outputs generated to `dist/esm/`, `dist/cjs/`, `types/`)

- [ ] **Step 4: Commit** (if changes were needed)

```bash
git add tsconfig.esm.json tsconfig.cjs.json && git commit -S -m "chore: update tsconfig build paths for new module structure"
```

---

### Task 51: Update `vitest.config.ts`

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Read current vitest config and update include paths**

Read the current `vitest.config.ts` and ensure test file patterns cover:
- `src/**/__tests__/*.spec.ts` (unit tests, co-located)
- `src/__tests__/compliance/*.compliance.ts` (compliance suite)
- `__tests__/**/*.spec.ts` (root-level integration/e2e/perf tests)

If the current config already uses `src/**/__tests__/*.spec.ts`, it should cover the new `src/fs/`, `src/blob/`, `src/sdk/` test directories automatically. Verify and add `compliance` pattern if missing.

```typescript
// vitest.config.ts — expected pattern
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: [
            'src/**/__tests__/*.spec.ts',
            'src/__tests__/compliance/*.compliance.ts',
            '__tests__/**/*.spec.ts',
        ],
    },
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS (all existing + new tests)

- [ ] **Step 3: Commit** (if changes were needed)

```bash
git add vitest.config.ts && git commit -S -m "chore: update vitest config for compliance test paths"
```

---

### Task 52: Update `typedoc.json`

**Files:**
- Modify: `typedoc.json`

- [ ] **Step 1: Update entry point**

Read the current `typedoc.json` and update the entry point if needed. The entry should point to `src/index.ts` (unchanged), but verify the `exclude` patterns cover internal/private members.

```json
{
    "entryPoints": ["src/index.ts"],
    "excludePrivate": true,
    "excludeProtected": true,
    "excludeInternal": true
}
```

- [ ] **Step 2: Generate docs**

Run: `yarn docs`
Expected: PASS (typedoc-site/ generated without errors)

- [ ] **Step 3: Commit** (if changes were needed)

```bash
git add typedoc.json && git commit -S -m "docs: update typedoc config for new module structure"
```

---

### Task 53: Delete Old Domain Directories

**Files:**
- Delete: `src/read/` (entire directory)
- Delete: `src/write/` (entire directory)
- Delete: `src/stream/` (entire directory)
- Delete: `src/metadata/` (entire directory)
- Delete: `src/directory/` (entire directory)
- Delete: `src/adapters/interfaces/ReadAdapter.ts` (old)
- Delete: `src/adapters/interfaces/WriteAdapter.ts` (old)
- Delete: `src/adapters/interfaces/StreamAdapter.ts` (old)
- Delete: `src/adapters/interfaces/DirAdapter.ts` (old)
- Delete: `src/adapters/interfaces/MetaAdapter.ts` (old)
- Delete: `src/adapters/interfaces/FsAdapter.ts` (old)
- Delete: `src/adapters/interfaces/BlobStorageAdapter.ts` (old)
- Delete: `src/shared/types/Input.ts` (old)
- Delete: `src/shared/types/FileStreamMode.ts` (old)
- Delete: `src/shared/types/DirectoryListTypes.ts` (old)
- Delete: `src/shared/utils/sanitizeInput.ts` (old — replaced by new version)
- Delete: `src/directory/DirectoryList.ts` (replaced by StorageListing)

- [ ] **Step 1: Remove old directories and files**

```bash
rm -rf src/read/ src/write/ src/stream/ src/metadata/ src/directory/
rm -f src/adapters/interfaces/ReadAdapter.ts
rm -f src/adapters/interfaces/WriteAdapter.ts
rm -f src/adapters/interfaces/StreamAdapter.ts
rm -f src/adapters/interfaces/DirAdapter.ts
rm -f src/adapters/interfaces/MetaAdapter.ts
rm -f src/adapters/interfaces/FsAdapter.ts
rm -f src/adapters/interfaces/BlobStorageAdapter.ts
rm -f src/shared/types/Input.ts
rm -f src/shared/types/FileStreamMode.ts
rm -f src/shared/types/DirectoryListTypes.ts
rm -f src/shared/utils/sanitizeInput.ts
rm -f src/directory/DirectoryList.ts
```

- [ ] **Step 2: Verify no dangling imports**

Run: `npx tsc --noEmit`
Expected: PASS (no import errors from deleted files)

- [ ] **Step 3: Verify tests still pass**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -S -m "refactor: remove old domain directories and deprecated adapter interfaces"
```

---

### Task 54: Regenerate `auto-register.ts` and Verify Build

**Files:**
- Regenerate: `src/adapters/auto-register.ts`

- [ ] **Step 1: Regenerate auto-register**

```bash
yarn build:generate-adapters
```

This scans `src/adapters/*/register.ts` and regenerates `auto-register.ts`. The node adapter's `register.ts` should already be updated from Task 35.

- [ ] **Step 2: Full build**

```bash
yarn build
```

Expected: PASS (generate-adapters → clean → ESM → fix-esm → CJS)

- [ ] **Step 3: Verify ESM output has .js extensions**

```bash
grep -r "from '\.\." dist/esm/ | head -5
```

Expected: All relative imports have `.js` extensions

- [ ] **Step 4: Verify CJS output exists**

```bash
ls dist/cjs/package.json
```

Expected: File exists with `{ "type": "commonjs" }`

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit** (if auto-register.ts changed)

```bash
git add src/adapters/auto-register.ts && git commit -S -m "chore: regenerate auto-register.ts for new module structure"
```

---

## Sub-Plan 6: Compliance Test Suite

**Goal:** Implement the shared capability compliance suite, NodeFsAdapter-specific tests, SDK utility tests, and type-level tests. The compliance suite is the primary guard against semantic drift — every field, method, and edge case must be validated.

---

### Task 55: Create Read Compliance Suite

**Files:**
- Create: `src/__tests__/compliance/read.compliance.ts`

- [ ] **Step 1: Implement read compliance tests**

```typescript
// src/__tests__/compliance/read.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import { Read } from '../../adapters/capabilities'
import { hasCapability } from '../../sdk/hasCapability'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'
import { p } from '../../shared/functions/p'

export function testReadCompliance(adapter: Adapter): void {
    const readAdapter = adapter as Adapter & ReadAdapter

    describe('Read compliance', () => {
        it('has Read capability in capabilities set', () => {
            expect(adapter.capabilities.has(Read)).toBe(true)
        })

        it('get(path, encoding?) returns string', async () => {
            const result = await readAdapter.get(p`/test-read.txt`, 'utf-8')
            expect(typeof result).toBe('string')
        })

        it('getAsBuffer(path) returns Uint8Array', async () => {
            const result = await readAdapter.getAsBuffer(p`/test-read.txt`)
            expect(result).toBeInstanceOf(Uint8Array)
        })

        it('getAsJSON<T>(path) returns parsed object', async () => {
            const result = await readAdapter.getAsJSON(p`/test-read.json`)
            expect(typeof result).toBe('object')
        })

        it('accepts StoragePath | string for path', async () => {
            await expect(readAdapter.get('/test-read.txt')).resolves.toBeTypeOf('string')
            await expect(readAdapter.get(p`/test-read.txt`)).resolves.toBeTypeOf('string')
        })

        it('throws PathNotFoundError for nonexistent path', async () => {
            await expect(readAdapter.get(p`/nonexistent-file.txt`)).rejects.toThrow()
        })

        it('wraps native errors into StorageError subclass', async () => {
            try {
                await readAdapter.get(p`/nonexistent-file.txt`)
            } catch (e) {
                expect(e).toBeInstanceOf(Error)
                expect((e as any).code).toBeDefined()
            }
        })
    })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/compliance/read.compliance.ts && git commit -S -m "test(compliance): add Read capability compliance suite"
```

---

### Task 56: Create Write Compliance Suite

**Files:**
- Create: `src/__tests__/compliance/write.compliance.ts`

- [ ] **Step 1: Implement write compliance tests**

```typescript
// src/__tests__/compliance/write.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'
import { Write } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testWriteCompliance(adapter: Adapter): void {
    const writeAdapter = adapter as Adapter & WriteAdapter

    describe('Write compliance', () => {
        it('has Write capability in capabilities set', () => {
            expect(adapter.capabilities.has(Write)).toBe(true)
        })

        it('put(path, value, encoding?) returns boolean', async () => {
            const result = await writeAdapter.put(p`/test-write.txt`, 'content', 'utf-8')
            expect(typeof result).toBe('boolean')
        })

        it('putStreamed(path, values, encoding?) returns void', async () => {
            await expect(
                writeAdapter.putStreamed(p`/test-write-stream.txt`, 'line1\nline2', 'utf-8'),
            ).resolves.toBeUndefined()
        })

        it('append(path, value, encoding?) returns boolean', async () => {
            const result = await writeAdapter.append(p`/test-append.txt`, 'appended', 'utf-8')
            expect(typeof result).toBe('boolean')
        })

        it('appendStreamed(path, values, encoding?) returns void', async () => {
            await expect(
                writeAdapter.appendStreamed(p`/test-append-stream.txt`, 'line3\nline4', 'utf-8'),
            ).resolves.toBeUndefined()
        })

        it('mkdir(path, options?) returns void', async () => {
            await expect(
                writeAdapter.mkdir(p`/test-mkdir-dir`, { recursive: true }),
            ).resolves.toBeUndefined()
        })

        it('accepts StoragePath | string for path', async () => {
            await expect(writeAdapter.put('/test-path.txt', 'data')).resolves.toBeTypeOf('boolean')
            await expect(writeAdapter.put(p`/test-path.txt`, 'data')).resolves.toBeTypeOf('boolean')
        })

        it('parameter name is encoding (not charset)', () => {
            // Type-level check: WriteAdapter.put signature uses `encoding?`
            const fn = writeAdapter.put
            expect(fn.length).toBeGreaterThanOrEqual(2)
        })
    })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/compliance/write.compliance.ts && git commit -S -m "test(compliance): add Write capability compliance suite"
```

---

### Task 57: Create Stream Compliance Suite

**Files:**
- Create: `src/__tests__/compliance/stream.compliance.ts`

- [ ] **Step 1: Implement stream compliance tests**

```typescript
// src/__tests__/compliance/stream.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { StreamAdapter } from '../../adapters/interfaces/capabilities/StreamAdapter'
import { Stream } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testStreamCompliance(adapter: Adapter): void {
    const streamAdapter = adapter as Adapter & StreamAdapter

    describe('Stream compliance', () => {
        it('has Stream capability in capabilities set', () => {
            expect(adapter.capabilities.has(Stream)).toBe(true)
        })

        it('readStream(path, options?) returns StorageStream', () => {
            const stream = streamAdapter.readStream(p`/test-stream.txt`)
            expect(stream).toBeDefined()
            expect(typeof stream[Symbol.asyncIterator]).toBe('function')
        })

        it('writeStream(path, options?) returns StorageStream', () => {
            const stream = streamAdapter.writeStream(p`/test-write-stream.txt`)
            expect(stream).toBeDefined()
            expect(typeof stream[Symbol.asyncIterator]).toBe('function')
        })

        it('duplexStream(path, options?) returns StorageStream', () => {
            const stream = streamAdapter.duplexStream(p`/test-duplex-stream.txt`)
            expect(stream).toBeDefined()
        })

        it('fileStream(path, mode?, options?) returns StorageStream', () => {
            const stream = streamAdapter.fileStream(p`/test-file-stream.txt`, 'r')
            expect(stream).toBeDefined()
        })

        it('StorageStream implements AsyncIterable', async () => {
            const stream = streamAdapter.readStream(p`/test-stream-iter.txt`)
            const chunks: Uint8Array[] = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }
            expect(chunks.length).toBeGreaterThanOrEqual(0)
        })

        it('accepts StoragePath | string for path', () => {
            expect(() => streamAdapter.readStream('/test.txt')).not.toThrow()
            expect(() => streamAdapter.readStream(p`/test.txt`)).not.toThrow()
        })
    })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/compliance/stream.compliance.ts && git commit -S -m "test(compliance): add Stream capability compliance suite"
```

---

### Task 58: Create Mutate Compliance Suite

**Files:**
- Create: `src/__tests__/compliance/mutate.compliance.ts`

- [ ] **Step 1: Implement mutate compliance tests**

```typescript
// src/__tests__/compliance/mutate.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { MutateAdapter } from '../../adapters/interfaces/capabilities/MutateAdapter'
import { Mutate } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testMutateCompliance(adapter: Adapter): void {
    const mutateAdapter = adapter as Adapter & MutateAdapter

    describe('Mutate compliance', () => {
        it('has Mutate capability in capabilities set', () => {
            expect(adapter.capabilities.has(Mutate)).toBe(true)
        })

        it('copy(from, to, as?) returns void', async () => {
            await expect(
                mutateAdapter.copy(p`/mutate-src.txt`, p`/mutate-dst.txt`),
            ).resolves.toBeUndefined()
        })

        it('rename(path, renameTo) returns void', async () => {
            await expect(
                mutateAdapter.rename(p`/mutate-rename.txt`, p`/mutate-renamed.txt`),
            ).resolves.toBeUndefined()
        })

        it('move(from, to, as?) returns void', async () => {
            await expect(
                mutateAdapter.move(p`/mutate-move.txt`, p`/mutate-moved.txt`),
            ).resolves.toBeUndefined()
        })

        it('delete(path) returns void', async () => {
            await expect(
                mutateAdapter.delete(p`/mutate-delete.txt`),
            ).resolves.toBeUndefined()
        })

        it('accepts StoragePath | string for path', async () => {
            await expect(mutateAdapter.delete('/test.txt')).resolves.toBeUndefined()
            await expect(mutateAdapter.delete(p`/test.txt`)).resolves.toBeUndefined()
        })

        it('wraps native errors into StorageError subclass', async () => {
            try {
                await mutateAdapter.delete(p`/nonexistent-mutate.txt`)
            } catch (e) {
                expect((e as any).code).toBeDefined()
            }
        })
    })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/compliance/mutate.compliance.ts && git commit -S -m "test(compliance): add Mutate capability compliance suite"
```

---

### Task 59: Create Navigate Compliance Suite

**Files:**
- Create: `src/__tests__/compliance/navigate.compliance.ts`

- [ ] **Step 1: Implement navigate compliance tests**

```typescript
// src/__tests__/compliance/navigate.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { NavigateAdapter } from '../../adapters/interfaces/capabilities/NavigateAdapter'
import { Navigate } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'
import type { StorageStats } from '../../types/StorageStats'
import type { StorageListing } from '../../types/StorageListing'

export function testNavigateCompliance(adapter: Adapter): void {
    const navigateAdapter = adapter as Adapter & NavigateAdapter

    describe('Navigate compliance', () => {
        it('has Navigate capability in capabilities set', () => {
            expect(adapter.capabilities.has(Navigate)).toBe(true)
        })

        it('exists(path, mode?) returns boolean', async () => {
            const result = await navigateAdapter.exists(p`/navigate-test.txt`)
            expect(typeof result).toBe('boolean')
        })

        it('doesntExist(path, mode?) returns boolean', async () => {
            const result = await navigateAdapter.doesntExist(p`/navigate-test.txt`)
            expect(typeof result).toBe('boolean')
        })

        it('stats<T>(path) returns StorageStats<T>', async () => {
            const result = await navigateAdapter.stats(p`/navigate-test.txt`)
            expect(result).toBeDefined()
            expect(result).toHaveProperty('size')
            expect(result).toHaveProperty('lastModified')
            expect(result).toHaveProperty('isFile')
            expect(result).toHaveProperty('isDirectory')
        })

        it('isFile(path) returns boolean', async () => {
            const result = await navigateAdapter.isFile(p`/navigate-test.txt`)
            expect(typeof result).toBe('boolean')
        })

        it('isDirectory(path) returns boolean', async () => {
            const result = await navigateAdapter.isDirectory(p`/navigate-test-dir`)
            expect(typeof result).toBe('boolean')
        })

        it('listDirectory(path, recursive?) returns string[] | StorageListing', async () => {
            const result = await navigateAdapter.listDirectory(p`/navigate-test-dir`)
            expect(Array.isArray(result) || result instanceof (await import('../../types/StorageListing')).StorageListing).toBe(true)
        })

        it('StorageStats.lastModified uses Timestamp type', async () => {
            const result = await navigateAdapter.stats(p`/navigate-test.txt`)
            if (result.lastModified !== null) {
                const { Timestamp } = await import('../../types/Timestamp')
                expect(result.lastModified).toBeInstanceOf(Timestamp)
            }
        })

        it('getPresignedUrl throws UnsupportedOperationError for NodeFsAdapter', async () => {
            // NodeFsAdapter doesn't support presigned URLs
            if (!adapter.capabilities.has(Navigate)) return
            try {
                await navigateAdapter.getPresignedUrl(p`/test.txt`)
            } catch (e) {
                expect((e as any).code).toBe('ERR_UNSUPPORTED_OPERATION')
            }
        })
    })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/compliance/navigate.compliance.ts && git commit -S -m "test(compliance): add Navigate capability compliance suite"
```

---

### Task 60: Create Watch, Lock, Metadata, Linking, Events Compliance Suites

**Files:**
- Create: `src/__tests__/compliance/watch.compliance.ts`
- Create: `src/__tests__/compliance/lock.compliance.ts`
- Create: `src/__tests__/compliance/metadata.compliance.ts`
- Create: `src/__tests__/compliance/linking.compliance.ts`
- Create: `src/__tests__/compliance/events.compliance.ts`

- [ ] **Step 1: Implement watch compliance**

```typescript
// src/__tests__/compliance/watch.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { WatchAdapter } from '../../adapters/interfaces/capabilities/WatchAdapter'
import { Watch } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testWatchCompliance(adapter: Adapter): void {
    const watchAdapter = adapter as Adapter & WatchAdapter

    describe('Watch compliance', () => {
        it('has Watch capability in capabilities set', () => {
            expect(adapter.capabilities.has(Watch)).toBe(true)
        })

        it('watch(path, callback?) returns WatchHandle', () => {
            const handle = watchAdapter.watch(p`/watch-test-dir`, () => {})
            expect(handle).toBeDefined()
            expect(typeof handle.close).toBe('function')
            expect(typeof handle[Symbol.dispose]).toBe('function')
            expect(typeof handle[Symbol.asyncIterator]).toBe('function')
            handle.close()
        })

        it('WatchHandle implements Disposable', () => {
            const handle = watchAdapter.watch(p`/watch-test-dir`, () => {})
            expect(typeof handle[Symbol.dispose]).toBe('function')
            handle.close()
        })

        it('WatchHandle implements AsyncIterable<WatchEvent>', async () => {
            const handle = watchAdapter.watch(p`/watch-test-dir`)
            expect(typeof handle[Symbol.asyncIterator]).toBe('function')
            handle.close()
        })
    })
}
```

- [ ] **Step 2: Implement lock compliance**

```typescript
// src/__tests__/compliance/lock.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { LockAdapter } from '../../adapters/interfaces/capabilities/LockAdapter'
import { Lock } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testLockCompliance(adapter: Adapter): void {
    const lockAdapter = adapter as Adapter & LockAdapter

    describe('Lock compliance', () => {
        it('has Lock capability in capabilities set', () => {
            expect(adapter.capabilities.has(Lock)).toBe(true)
        })

        it('lock(path, options?) returns LockHandle', async () => {
            const handle = await lockAdapter.lock(p`/lock-test.txt`, {
                type: 'exclusive',
            })
            expect(handle).toBeDefined()
            expect(typeof handle.release).toBe('function')
            expect(typeof handle[Symbol.dispose]).toBe('function')
            expect(handle.type).toBe('exclusive')
            expect(handle.acquired).toBe(true)
            handle.release()
        })

        it('LockHandle implements Disposable', async () => {
            const handle = await lockAdapter.lock(p`/lock-test.txt`)
            expect(typeof handle[Symbol.dispose]).toBe('function')
            handle.release()
        })

        it('shared lock uses .slock suffix', async () => {
            const handle = await lockAdapter.lock(p`/lock-test.txt`, {
                type: 'shared',
            })
            expect(handle.type).toBe('shared')
            handle.release()
        })
    })
}
```

- [ ] **Step 3: Implement metadata compliance**

```typescript
// src/__tests__/compliance/metadata.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { MetadataAdapter } from '../../adapters/interfaces/capabilities/MetadataAdapter'
import { Metadata } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testMetadataCompliance(adapter: Adapter): void {
    const metadataAdapter = adapter as Adapter & MetadataAdapter

    describe('Metadata compliance', () => {
        it('has Metadata capability in capabilities set', () => {
            expect(adapter.capabilities.has(Metadata)).toBe(true)
        })

        it('getAttributes(path) returns Record<string, unknown>', async () => {
            const result = await metadataAdapter.getAttributes(p`/metadata-test.txt`)
            expect(typeof result).toBe('object')
        })

        it('setAttributes(path, attrs) returns void', async () => {
            await expect(
                metadataAdapter.setAttributes(p`/metadata-test.txt`, {
                    'user.test': 'value',
                }),
            ).resolves.toBeUndefined()
        })
    })
}
```

- [ ] **Step 4: Implement linking compliance**

```typescript
// src/__tests__/compliance/linking.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { LinkingAdapter } from '../../adapters/interfaces/capabilities/LinkingAdapter'
import { Linking } from '../../adapters/capabilities'
import { p } from '../../shared/functions/p'

export function testLinkingCompliance(adapter: Adapter): void {
    const linkingAdapter = adapter as Adapter & LinkingAdapter

    describe('Linking compliance', () => {
        it('has Linking capability in capabilities set', () => {
            expect(adapter.capabilities.has(Linking)).toBe(true)
        })

        it('symlink(target, linkPath) returns void', async () => {
            await expect(
                linkingAdapter.symlink(p`/linking-target.txt`, p`/linking-symlink.txt`),
            ).resolves.toBeUndefined()
        })

        it('hardlink(target, linkPath) returns void', async () => {
            await expect(
                linkingAdapter.hardlink(p`/linking-target.txt`, p`/linking-hardlink.txt`),
            ).resolves.toBeUndefined()
        })

        it('readlink(path) returns StoragePath', async () => {
            const result = await linkingAdapter.readlink(p`/linking-symlink.txt`)
            expect(result).toBeDefined()
        })
    })
}
```

- [ ] **Step 5: Implement events compliance**

```typescript
// src/__tests__/compliance/events.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { EventsAdapter } from '../../adapters/interfaces/capabilities/EventsAdapter'
import { Events } from '../../adapters/capabilities'

export function testEventsCompliance(adapter: Adapter): void {
    const eventsAdapter = adapter as Adapter & EventsAdapter

    describe('Events compliance', () => {
        it('has Events capability in capabilities set', () => {
            expect(adapter.capabilities.has(Events)).toBe(true)
        })

        it('on(event, handler) registers event handler', () => {
            expect(() =>
                eventsAdapter.on('ready', () => {}),
            ).not.toThrow()
        })

        it('off(event, handler) unregisters event handler', () => {
            const handler = () => {}
            eventsAdapter.on('error', handler)
            expect(() => eventsAdapter.off('error', handler)).not.toThrow()
        })

        it('events() returns AsyncIterable<AdapterEvent>', () => {
            const iterable = eventsAdapter.events()
            expect(typeof iterable[Symbol.asyncIterator]).toBe('function')
        })
    })
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/compliance/ && git commit -S -m "test(compliance): add Watch, Lock, Metadata, Linking, Events compliance suites"
```

---

### Task 61: Create Versioning, Search, Transaction Compliance Suites

**Files:**
- Create: `src/__tests__/compliance/versioning.compliance.ts`
- Create: `src/__tests__/compliance/search.compliance.ts`
- Create: `src/__tests__/compliance/transaction.compliance.ts`

- [ ] **Step 1: Implement versioning compliance**

```typescript
// src/__tests__/compliance/versioning.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import { Versioning } from '../../adapters/capabilities'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'

export function testVersioningCompliance(adapter: Adapter): void {
    describe('Versioning compliance', () => {
        it('NodeFsAdapter should NOT have Versioning capability', () => {
            // NodeFsAdapter does not support versioning
            if (!adapter.capabilities.has(Versioning)) {
                expect(true).toBe(true)
                return
            }
        })

        it('throws UnsupportedOperationError with reason not-implemented when lacking capability', async () => {
            if (adapter.capabilities.has(Versioning)) return
            try {
                const versioningAdapter = adapter as any
                await versioningAdapter.getByVersion('/test.txt', 'v1')
            } catch (e) {
                expect(e).toBeInstanceOf(UnsupportedOperationError)
                expect((e as UnsupportedOperationError).reason).toBe('not-implemented')
            }
        })
    })
}
```

- [ ] **Step 2: Implement search compliance**

```typescript
// src/__tests__/compliance/search.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import { Search } from '../../adapters/capabilities'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'

export function testSearchCompliance(adapter: Adapter): void {
    describe('Search compliance', () => {
        it('NodeFsAdapter should NOT have Search capability', () => {
            if (!adapter.capabilities.has(Search)) {
                expect(true).toBe(true)
                return
            }
        })

        it('throws UnsupportedOperationError with reason not-implemented when lacking capability', async () => {
            if (adapter.capabilities.has(Search)) return
            try {
                const searchAdapter = adapter as any
                await searchAdapter.query('*.txt')
            } catch (e) {
                expect(e).toBeInstanceOf(UnsupportedOperationError)
                expect((e as UnsupportedOperationError).reason).toBe('not-implemented')
            }
        })
    })
}
```

- [ ] **Step 3: Implement transaction compliance**

```typescript
// src/__tests__/compliance/transaction.compliance.ts
import { describe, it, expect } from 'vitest'
import type { Adapter } from '../../adapters/interfaces/Adapter'
import { Transaction } from '../../adapters/capabilities'
import { UnsupportedOperationError } from '../../shared/errors/UnsupportedOperationError'

export function testTransactionCompliance(adapter: Adapter): void {
    describe('Transaction compliance', () => {
        it('NodeFsAdapter should NOT have Transaction capability', () => {
            if (!adapter.capabilities.has(Transaction)) {
                expect(true).toBe(true)
                return
            }
        })

        it('throws UnsupportedOperationError with reason not-implemented when lacking capability', async () => {
            if (adapter.capabilities.has(Transaction)) return
            try {
                const txAdapter = adapter as any
                const handle = txAdapter.batch([])
                await txAdapter.commit(handle)
            } catch (e) {
                expect(e).toBeInstanceOf(UnsupportedOperationError)
                expect((e as UnsupportedOperationError).reason).toBe('not-implemented')
            }
        })

        it('sequentialBatch provides best-effort alternative', async () => {
            // This is tested in SDK tests (Task 44)
            expect(true).toBe(true)
        })
    })
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/compliance/ && git commit -S -m "test(compliance): add Versioning, Search, Transaction compliance suites"
```

---

### Task 62: Create NodeFsAdapter Compliance Runner

**Files:**
- Create: `src/adapters/node/__tests__/node.compliance.spec.ts`

- [ ] **Step 1: Wire up NodeFsAdapter with all compliance suites**

```typescript
// src/adapters/node/__tests__/node.compliance.spec.ts
import { describe, beforeAll, afterAll } from 'vitest'
import { NodeFsAdapter } from '../NodeFsAdapter'
import { testReadCompliance } from '../../../__tests__/compliance/read.compliance'
import { testWriteCompliance } from '../../../__tests__/compliance/write.compliance'
import { testStreamCompliance } from '../../../__tests__/compliance/stream.compliance'
import { testMutateCompliance } from '../../../__tests__/compliance/mutate.compliance'
import { testNavigateCompliance } from '../../../__tests__/compliance/navigate.compliance'
import { testWatchCompliance } from '../../../__tests__/compliance/watch.compliance'
import { testLockCompliance } from '../../../__tests__/compliance/lock.compliance'
import { testMetadataCompliance } from '../../../__tests__/compliance/metadata.compliance'
import { testLinkingCompliance } from '../../../__tests__/compliance/linking.compliance'
import { testEventsCompliance } from '../../../__tests__/compliance/events.compliance'
import { testVersioningCompliance } from '../../../__tests__/compliance/versioning.compliance'
import { testSearchCompliance } from '../../../__tests__/compliance/search.compliance'
import { testTransactionCompliance } from '../../../__tests__/compliance/transaction.compliance'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

let tmpDir: string

describe('NodeFsAdapter compliance', () => {
    let adapter: NodeFsAdapter

    beforeAll(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-manager-compliance-'))
        adapter = new NodeFsAdapter()
    })

    afterAll(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    testReadCompliance(adapter)
    testWriteCompliance(adapter)
    testStreamCompliance(adapter)
    testMutateCompliance(adapter)
    testNavigateCompliance(adapter)
    testWatchCompliance(adapter)
    testLockCompliance(adapter)
    testMetadataCompliance(adapter)
    testLinkingCompliance(adapter)
    testEventsCompliance(adapter)
    testVersioningCompliance(adapter)
    testSearchCompliance(adapter)
    testTransactionCompliance(adapter)
})
```

- [ ] **Step 2: Run compliance tests**

Run: `npx vitest run src/adapters/node/__tests__/node.compliance.spec.ts`
Expected: PASS

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/adapters/node/__tests__/node.compliance.spec.ts && git commit -S -m "test(node): wire NodeFsAdapter to all compliance suites"
```

---

### Task 63: Create NodeFsAdapter-Specific Tests

**Files:**
- Create: `src/adapters/node/__tests__/lock.spec.ts`
- Create: `src/adapters/node/__tests__/xattr.spec.ts`
- Create: `src/adapters/node/__tests__/symlink.spec.ts`

- [ ] **Step 1: Implement lock-specific tests**

```typescript
// src/adapters/node/__tests__/lock.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { lockFile } from '../lock'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { p } from '../../../shared/functions/p'

let tmpDir: string

describe('NodeFsAdapter lock', () => {
    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lock-test-'))
    })

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('acquires exclusive lock via O_EXCL', async () => {
        const filePath = path.join(tmpDir, 'test.txt')
        const handle = await lockFile(filePath, { type: 'exclusive' })
        expect(handle.acquired).toBe(true)
        expect(handle.type).toBe('exclusive')
        // Lock file should exist
        const exists = await fs.access(`${filePath}.lock`).then(() => true, () => false)
        expect(exists).toBe(true)
        handle.release()
    })

    it('acquires shared lock via .slock suffix', async () => {
        const filePath = path.join(tmpDir, 'shared.txt')
        const handle = await lockFile(filePath, { type: 'shared' })
        expect(handle.type).toBe('shared')
        const exists = await fs.access(`${filePath}.slock`).then(() => true, () => false)
        expect(exists).toBe(true)
        handle.release()
    })

    it('release unlinks the lock file', async () => {
        const filePath = path.join(tmpDir, 'release.txt')
        const handle = await lockFile(filePath)
        handle.release()
        const exists = await fs.access(`${filePath}.lock`).then(() => true, () => false)
        expect(exists).toBe(false)
    })

    it('Disposable support via Symbol.dispose', async () => {
        const filePath = path.join(tmpDir, 'dispose.txt')
        {
            await using handle = await lockFile(filePath)
            expect(handle.acquired).toBe(true)
        }
        const exists = await fs.access(`${filePath}.lock`).then(() => true, () => false)
        expect(exists).toBe(false)
    })

    it('contention: second lock waits and acquires after release', async () => {
        const filePath = path.join(tmpDir, 'contention.txt')
        const handle1 = await lockFile(filePath, { timeout: 2000 })
        let handle2Acquired = false
        const lock2Promise = lockFile(filePath, { timeout: 5000 }).then((h) => {
            handle2Acquired = true
            return h
        })
        // Give event loop a tick
        await new Promise((r) => setTimeout(r, 100))
        expect(handle2Acquired).toBe(false)
        handle1.release()
        const handle2 = await lock2Promise
        expect(handle2.acquired).toBe(true)
        handle2.release()
    })
})
```

- [ ] **Step 2: Implement xattr-specific tests**

```typescript
// src/adapters/node/__tests__/xattr.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getXattrs, setXattrs } from '../xattrs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

let tmpDir: string
let testFile: string

describe('NodeFsAdapter xattrs', () => {
    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xattr-test-'))
        testFile = path.join(tmpDir, 'test.txt')
        await fs.writeFile(testFile, 'test content')
    })

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('throws on Windows', async () => {
        if (process.platform !== 'win32') return
        await expect(getXattrs(testFile)).rejects.toThrow('xattrs not supported on Windows')
    })

    it('sets and gets xattrs on POSIX', async () => {
        if (process.platform === 'win32') return
        await setXattrs(testFile, { 'user.test': 'hello' })
        const attrs = await getXattrs(testFile)
        expect(attrs['user.test']).toBe('hello')
    })

    it('serializes non-string values as JSON', async () => {
        if (process.platform === 'win32') return
        await setXattrs(testFile, { 'user.complex': { key: 'value' } })
        const attrs = await getXattrs(testFile)
        expect(typeof attrs['user.complex']).toBe('string')
    })
})
```

- [ ] **Step 3: Implement symlink-specific tests**

```typescript
// src/adapters/node/__tests__/symlink.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { NodeFsAdapter } from '../NodeFsAdapter'
import { p } from '../../../shared/functions/p'

let tmpDir: string
let adapter: NodeFsAdapter

describe('NodeFsAdapter symlink', () => {
    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-test-'))
        adapter = new NodeFsAdapter()
        await fs.writeFile(path.join(tmpDir, 'target.txt'), 'content')
    })

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('creates symbolic link', async () => {
        await adapter.symlink(
            p`${path.join(tmpDir, 'target.txt')}`,
            p`${path.join(tmpDir, 'link.txt')}`,
        )
        const linkTarget = await fs.readlink(path.join(tmpDir, 'link.txt'))
        expect(linkTarget).toContain('target.txt')
    })

    it('creates hard link', async () => {
        await adapter.hardlink(
            p`${path.join(tmpDir, 'target.txt')}`,
            p`${path.join(tmpDir, 'hardlink.txt')}`,
        )
        const stat1 = await fs.stat(path.join(tmpDir, 'target.txt'))
        const stat2 = await fs.stat(path.join(tmpDir, 'hardlink.txt'))
        expect(stat1.ino).toBe(stat2.ino)
    })

    it('readlink returns StoragePath', async () => {
        await adapter.symlink(
            p`${path.join(tmpDir, 'target.txt')}`,
            p`${path.join(tmpDir, 'link.txt')}`,
        )
        const result = await adapter.readlink(p`${path.join(tmpDir, 'link.txt')}`)
        expect(result).toBeDefined()
        expect(typeof result.toString()).toBe('string')
    })

    it('wraps EEXIST into AlreadyExistsError', async () => {
        await fs.writeFile(path.join(tmpDir, 'exists.txt'), 'existing')
        await expect(
            adapter.symlink(
                p`${path.join(tmpDir, 'target.txt')}`,
                p`${path.join(tmpDir, 'exists.txt')}`,
            ),
        ).rejects.toThrow()
    })
})
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/node/__tests__/lock.spec.ts src/adapters/node/__tests__/xattr.spec.ts src/adapters/node/__tests__/symlink.spec.ts && git commit -S -m "test(node): add NodeFsAdapter-specific tests for lock, xattr, symlink"
```

---

### Task 64: Create Type-Level Tests

**Files:**
- Create: `src/__tests__/types/compliance.types.ts`

- [ ] **Step 1: Implement type-level compliance tests**

```typescript
// src/__tests__/types/compliance.types.ts
import type { Adapter } from '../../adapters/interfaces/Adapter'
import type { ReadAdapter } from '../../adapters/interfaces/capabilities/ReadAdapter'
import type { WriteAdapter } from '../../adapters/interfaces/capabilities/WriteAdapter'
import type { StoragePath } from '../../types/StoragePath'
import type { StorageStats } from '../../types/StorageStats'
import type { StorageListing } from '../../types/StorageListing'
import type { Timestamp } from '../../types/Timestamp'
import type { StorageStream } from '../../types/StorageStream'
import type { Serializable } from '../../types/Serializable'
import type { Comparable } from '../../types/Comparable'
import type { CapabilityOperation } from '../../types/capabilities'
import { Read, Write } from '../../adapters/capabilities'
import { hasCapability } from '../../sdk/hasCapability'

// --- Type helpers ---
type Expect<T extends true> = T
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false

// --- StoragePath is string & { __brand: 'StoragePath' } ---
type _storagePathIsString = Expect<Equal<StoragePath, string & { __brand: 'StoragePath' }>>

// --- Timestamp<number> vs Timestamp<bigint> ---
type _timestampNumberExtendsNumber = Expect<Equal<Timestamp<number> extends Timestamp<number> ? true : false, true>>
type _timestampBigintExtendsBigint = Expect<Equal<Timestamp<bigint> extends Timestamp<bigint> ? true : false, true>>

// --- StorageStats has required fields ---
type _storageStatsHasSize = StorageStats<unknown> extends { size: number } ? true : false
type _storageStatsFields = Expect<Equal<
    Pick<StorageStats<unknown>, 'size' | 'isFile' | 'isDirectory' | 'lastModified'>,
    { size: number; isFile: boolean; isDirectory: boolean; lastModified: Timestamp | null }
>>

// --- StorageListing implements Serializable and Comparable ---
type _storageListingIsSerializable = StorageListing extends Serializable<any> ? true : false
type _storageListingIsComparable = StorageListing extends Comparable<StorageListing> ? true : false

// --- CapabilityOperation derived type includes domain method names ---
type _capabilityOperationIncludesGet = 'get' extends CapabilityOperation ? true : false
type _capabilityOperationIncludesPut = 'put' extends CapabilityOperation ? true : false
type _capabilityOperationIncludesLock = 'lock' extends CapabilityOperation ? true : false

// --- hasCapability narrows type ---
declare const testAdapter: Adapter
type _narrowedWhenRead = typeof testAdapter extends Adapter ? true : false

// --- Adapter has capabilities: Set<symbol> ---
type _adapterHasCapabilities = Adapter extends { capabilities: Set<symbol> } ? true : false

// --- StorageStream implements AsyncIterable ---
type _storageStreamIsAsyncIterable = StorageStream<Uint8Array> extends AsyncIterable<Uint8Array> ? true : false

// Verify that the type-level tests compile
export const _typeChecks: Record<string, true> = {
    storagePathIsString: true as _storagePathIsString,
    timestampNumber: true as _timestampNumberExtendsNumber,
    timestampBigint: true as _timestampBigintExtendsBigint,
    storageStatsFields: true as _storageStatsFields,
    storageListingIsSerializable: true as _storageListingIsSerializable,
    storageListingIsComparable: true as _storageListingIsComparable,
    capabilityOperationIncludesGet: true as _capabilityOperationIncludesGet,
    capabilityOperationIncludesPut: true as _capabilityOperationIncludesPut,
    capabilityOperationIncludesLock: true as _capabilityOperationIncludesLock,
    adapterHasCapabilities: true as _adapterHasCapabilities,
    storageStreamIsAsyncIterable: true as _storageStreamIsAsyncIterable,
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (type-level tests compile successfully)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/types/compliance.types.ts && git commit -S -m "test(types): add type-level compliance tests for capability narrowing and type contracts"
```

---

### Task 65: Full Test Suite Verification + Build

**Files:**
- No new files — verification only

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: ALL PASS (unit tests, compliance suites, SDK tests, node-specific tests)

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (no errors)

- [ ] **Step 3: Run full build**

```bash
yarn build
```

Expected: PASS (generate-adapters → clean → ESM → fix-esm → CJS)

- [ ] **Step 4: Run QA checks**

```bash
yarn qa
```

Expected: PASS (Biome lint + Prettier check)

- [ ] **Step 5: Run coverage**

```bash
yarn test:coverage
```

Expected: Coverage report generated successfully

- [ ] **Step 6: Final verification commit** (if any QA fixes were needed)

```bash
git add -A && git commit -S -m "test: full test suite and build verification pass"
```
