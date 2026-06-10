import { _getAdapter } from '../bootstrap'

export async function copy(from: string, to: string, as?: string): Promise<void> {
    return _getAdapter().copy(from, to, as)
}
