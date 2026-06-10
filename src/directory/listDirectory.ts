import type { DirectoryList } from './DirectoryList'
import { _getAdapter } from '../bootstrap'

export async function listDirectory(path: string, recursive?: false): Promise<string[]>
export async function listDirectory(path: string, recursive: true): Promise<DirectoryList>
export async function listDirectory(
    path: string,
    recursive?: boolean
): Promise<string[] | DirectoryList> {
    return _getAdapter().listDirectory(path, recursive)
}
