import { _getAdapter } from '../bootstrap'

export async function move(from: string, to: string, as?: string): Promise<void> {
    return _getAdapter().move(from, to, as)
}
