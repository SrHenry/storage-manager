import { _getAdapter } from '../bootstrap'

export async function isDirectory(path: string): Promise<boolean> {
    return _getAdapter().isDirectory(path)
}
