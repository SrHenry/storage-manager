import type fs from 'node:fs'

export interface MetaAdapter {
    exists(...args: (string | number)[]): Promise<boolean>
    doesntExist(...args: (string | number)[]): Promise<boolean>
    stats(path: string): Promise<fs.Stats>
    isFile(path: string): Promise<boolean>
    isDirectory(path: string): Promise<boolean>
}
