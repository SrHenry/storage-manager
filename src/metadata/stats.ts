import type fs from 'node:fs'
import { _getAdapter } from '../bootstrap'

export async function stats(path: string): Promise<fs.Stats> {
    return _getAdapter().stats(path)
}
