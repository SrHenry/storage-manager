import { _getAdapter } from '../bootstrap'

export async function getAsBuffer(path: string) {
    return _getAdapter().getAsBuffer(path)
}
