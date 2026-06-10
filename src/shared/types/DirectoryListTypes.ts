export type RecursiveType<T> = T | RecursiveType<T>[]

export type DirectoryListJSONContent = Array<string | DirectoryListJSON>

export type DirectoryListJSON = {
    [name: string]: Array<string | DirectoryListJSON>
}
