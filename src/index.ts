import { StorageManager } from "./StorageManager"

export { StorageManager } from "./StorageManager"
export { DirectoryList } from "./DirectoryList"

export const {
    constants,
    path,

    put,
    putStreamed,
    append,
    appendStreamed,
    get,
    getAsBuffer,
    getAsBuffers,
    getAsJSON,
    rename,
    move,
    copy,
    readStream,
    writeStream,
    fileStream,
    stream,
    exists,
    doesntExist,
    stats,
    isFile,
    isDirectory,
    listDirectory,
    mkdir,
    delete: unlink,
    delete: Delete,
    deleteFromStorage,

    //deprecated:
    checkExist,
    writeFileStream,
    writeStorage,
    readFileStream,
    readStorage,
    getFileContents,
    openFileOrDirectory,
} = StorageManager

export default StorageManager