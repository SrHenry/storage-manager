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
