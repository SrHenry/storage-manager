import { _getAdapter } from '../bootstrap'

export async function exists(...args: (string | number)[]): Promise<boolean> {
    return _getAdapter().exists(...args)
}
