import { TypeOfTag } from "typescript"
import { basename } from "path"
import { Stats } from "fs"


export type RecursiveType<T> = T | RecursiveType<T>[]

export type DirectoryListJSONContent = Array<string | DirectoryListJSON>
export type DirectoryListJSON = {
    [name: string]: Array<string | DirectoryListJSON>
}

/**
 * Wrapper for directory structure in filesystem. May be recursive
 */
export class DirectoryList
{
    // private struct: RecursiveType<string>[]
    private struct: Array<string | DirectoryList>

    private _name: string
    private _stats?: Stats


    public get name()
    {
        return this._name
    }
    public set name(name: string)
    {
        this._name = name
    }

    /**
     * Stats info of directory.
     * @see {@link Stats NodeJS.fs.Stats}
     */
    public get stats()
    {
        return this._stats
    }

    public constructor(instance?: DirectoryList)
    public constructor(name: string, struct: Array<string | DirectoryList>)
    public constructor(name: string, struct: Array<string | DirectoryList>, stats: Stats)
    public constructor(arg1?: string | DirectoryList, struct: Array<string | DirectoryList> = [], stats?: Stats)
    {
        if (typeof arg1 === 'string') {
            this.name = arg1
            this.struct = struct
            this._stats = stats
        }
        else if (arg1 instanceof DirectoryList) {
            this.name = arg1.name
            this.struct = arg1.struct
            this._stats = arg1.stats
        }
        else {
            this.name = "/"
            this.struct = []
        }
    }

    public *[Symbol.iterator](): Iterator<string | DirectoryList>
    {
        for (const item of this.struct)
            yield item
    }

    public [Symbol.toPrimitive](hint: TypeOfTag): string | void
    {
        switch (hint) {
            case 'string':
                return this.__toString()
        }
    }

    private __toString(deep: number = 0, traceChar = " ", padUnit = 4)
    {
        const directoriesFirst = this.struct.sort((a, b) => a instanceof DirectoryList ? (b instanceof DirectoryList ? 0 : -1) : (b instanceof DirectoryList ? 1 : 0))
        let str = `DirectoryList: ${deep > 0 ? basename(this.name) : this.name} {\n`

        str = str.padStart(str.length + (deep * padUnit), traceChar)

        for (const row of directoriesFirst) {
            if (row instanceof DirectoryList)
                str += row.__toString(deep + 1, traceChar, padUnit)
            else {
                let out = `File: ${row}\n`
                str += out.padStart(out.length + ((deep + 1) * padUnit), traceChar)
            }
        }

        let tail = "}\n"
        tail = tail.padStart(tail.length + (deep * padUnit), traceChar)

        return str.concat(tail)
    }

    public toString()
    {
        return `${this}`
    }

    /** Get JSON representation of inner directory structure on filesystem */
    public get(fullname = false): DirectoryListJSONContent
    {
        return this.struct.map(item =>
        {
            if (item instanceof DirectoryList)
                return item.toJSON(fullname, false)
            else return item
        })
    }

    /**
     * Prefered method to serialize instance
     * @since 1.3.0
     */
    public toJSON(fullname = false, root = true): DirectoryListJSON
    {
        return {
            [(root || fullname) ? this.name : basename(this.name)]: this.get(fullname)
        }
    }
}

/** Alias for {@link DirectoryList} */
export const Directory = DirectoryList

export default DirectoryList