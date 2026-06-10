import { _getAdapter } from '../bootstrap'

export const deleteFile = async (filePath: string): Promise<void> => {
    return _getAdapter().delete(filePath)
}

export { deleteFile as delete }
