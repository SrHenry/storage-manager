import { TypeOfTag } from "typescript"
import { dirname, basename, join } from "path"


export type RecursiveType<T> = T | RecursiveType<T>[]

export type DirectoryListJSON = {
    [name: string]: Array<string | DirectoryListJSON>
}

export class DirectoryList
{
    // private struct: RecursiveType<string>[]
    private struct: (string | DirectoryList)[]

    private _name: string

    public get name()
    {
        return this._name
    }

    public set name(name: string)
    {
        this._name = name
    }

    public constructor(instance?: DirectoryList)
    public constructor(name: string, struct: (string | DirectoryList)[])
    public constructor(arg1?: string | DirectoryList, struct: (string | DirectoryList)[] = [])
    {
        if (typeof arg1 === 'string') {
            this.name = arg1
            this.struct = struct
        }
        else if (arg1 instanceof DirectoryList) {
            this.name = arg1.name
            this.struct = arg1.struct
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

    public [Symbol.toPrimitive](hint: TypeOfTag)
    {
        switch (hint) {
            case 'string':
                return this.__toString()
        }
    }

    private __toString(deep: number = 0, traceChar = " ", padUnit = 4)
    {
        const directoriesFirst = this.struct.sort((a, b) => a instanceof DirectoryList ? (b instanceof DirectoryList ? 0 : -1) : (b instanceof DirectoryList ? 1 : 0))
        let str = `DirectoryList: ${this.name} {\n`

        str = str.padStart(str.length + (deep * padUnit), traceChar)

        for (const row of directoriesFirst) {
            if (row instanceof DirectoryList)
                str += row.__toString(deep + 1)
            else {
                let out = `File: ${row}\n`
                str += out.padStart(out.length + ((deep + 1) * padUnit), traceChar)
            }
        }

        return str.concat("}\n".padStart(2 + (deep * 2)))
    }

    public toString()
    {
        return `${this}`
    }

    public toJSON(): DirectoryListJSON
    {
        return {
            [basename(this.name)]: this.struct.map(item =>
            {
                if (item instanceof DirectoryList)
                    return item.toJSON()
                else return item
            })
        }
    }
}

export default DirectoryList