import { _getAdapter } from '../bootstrap'

export async function isFile(path: string): Promise<boolean> {
    return _getAdapter().isFile(path)
}
