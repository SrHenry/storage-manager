import { describe, expect, it, vi } from 'vitest'
import { bootstrap, setFS, useAdapter, _getAdapter } from '../bootstrap'
import type { FsAdapter } from '../adapters/interfaces/FsAdapter'
import { UnsupportedEnvironmentError } from '../shared/errors'

function createMockFsAdapter(overrides: Partial<FsAdapter> = {}): FsAdapter {
    return {
        get: vi.fn(),
        getAsBuffer: vi.fn(),
        getAsBuffers: vi.fn(),
        getAsJSON: vi.fn(),
        put: vi.fn(),
        putStreamed: vi.fn(),
        append: vi.fn(),
        appendStreamed: vi.fn(),
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
        copy: vi.fn(),
        rename: vi.fn(),
        move: vi.fn(),
        deleteFromStorage: vi.fn(),
        delete: vi.fn(),
        constants: {},
        path: {},
        ...overrides,
    } as FsAdapter
}

describe('bootstrap', () => {
    it('is idempotent — calling multiple times does not throw', () => {
        bootstrap()
        bootstrap()
        bootstrap()
    })

    it('setFS installs a custom adapter', () => {
        const mockAdapter = createMockFsAdapter()
        setFS(mockAdapter)
        expect(_getAdapter()).toBe(mockAdapter)
    })
})

describe('useAdapter', () => {
    it('returns a frozen object with all FS methods', () => {
        const mockAdapter = createMockFsAdapter()

        const scoped = useAdapter(mockAdapter)

        expect(Object.isFrozen(scoped)).toBe(true)
        expect(typeof scoped.get).toBe('function')
        expect(typeof scoped.put).toBe('function')
        expect(typeof scoped.mkdir).toBe('function')
    })

    it('does not mutate the global adapter', () => {
        const globalAdapter = createMockFsAdapter()
        const scopedAdapter = createMockFsAdapter()

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
