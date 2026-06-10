import type fs from 'node:fs'

import type { DirectoryList } from '../DirectoryList'
import { _getAdapter } from '../bootstrap'

export async function mkdir(
    path: string,
    options: fs.MakeDirectoryOptions = { recursive: true }
): Promise<void> {
    return _getAdapter().mkdir(path, options)
}

export async function listDirectory(path: string, recursive?: false): Promise<string[]>
export async function listDirectory(path: string, recursive: true): Promise<DirectoryList>
export async function listDirectory(
    path: string,
    recursive?: boolean
): Promise<string[] | DirectoryList> {
    // biome-ignore lint/suspicious/noExplicitAny: overload resolution requires cast
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

// delete is a JS reserved keyword; cannot be used as function declaration name
// Exported as 'delete' alias via re-export for API compatibility
export const deleteFile = async (filePath: string): Promise<void> => {
    return _getAdapter().delete(filePath)
}

export { deleteFile as delete }
