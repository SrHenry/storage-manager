import { _getAdapter } from '../bootstrap'

export async function deleteFromStorage(filePath: string): Promise<void> {
    return _getAdapter().deleteFromStorage(filePath)
}
