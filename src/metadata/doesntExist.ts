import { _getAdapter } from '../bootstrap'

export async function doesntExist(...args: (string | number)[]): Promise<boolean> {
    return _getAdapter().doesntExist(...args)
}
