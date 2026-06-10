import { _getAdapter } from '../bootstrap'

export async function rename(path: string, renameTo: string): Promise<void> {
    return _getAdapter().rename(path, renameTo)
}
