import type fs from 'node:fs'

import { _getAdapter } from '../bootstrap'

export async function mkdir(
    path: string,
    options: fs.MakeDirectoryOptions = { recursive: true }
): Promise<void> {
    return _getAdapter().mkdir(path, options)
}
