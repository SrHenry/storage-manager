import type fs from 'node:fs'
import type { DirectoryList } from '../../directory/DirectoryList'

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
