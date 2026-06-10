import { _getAdapter } from '../bootstrap'

export async function getAsBuffers(path: string) {
    return _getAdapter().getAsBuffers(path)
}
