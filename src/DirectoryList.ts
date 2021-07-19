import { TypeOfTag } from "typescript"

export type RecursiveType<T> = T | RecursiveType<T>[]


export class DirectoryList
{
    // private struct: RecursiveType<string>[]
    private struct: (string | DirectoryList)[]

    private _name: string

    public get name()
    {
        return this._name
    }

    private set name(name: string)
    {
        this._name = name
    }

    public constructor(instance?: DirectoryList)
    public constructor(name: string, struct: (string | DirectoryList)[])
    public constructor(arg1?: string|DirectoryList, struct: (string | DirectoryList)[] = [])
    {
        if (typeof arg1 === 'string')
        {
            this.name = arg1
            this.struct = struct
        }
        else if (arg1 instanceof DirectoryList)
        {
            this.name = arg1.name
            this.struct = arg1.struct
        }
        else
        {
            this.name ="/"
            this.struct = []
        }
    }

    public * [Symbol.iterator](): Iterator<string | DirectoryList>
    {
        for (const item of this.struct)
            yield item
    }

    public [Symbol.toPrimitive](hint: TypeOfTag)
    {
        if (hint === 'string')
        {
            const directoriesFirst = this.struct.sort((a, b) => a instanceof DirectoryList ? (b instanceof DirectoryList ? 0 : -1) : (b instanceof DirectoryList ? 1 : 0))
            let str = `DirectoryList: ${this.name}\n`;
            for (const row of directoriesFirst)
                str += `\t${row}\n`

            return str
        }
    }

    public toString()
    {
        return `${this}`
    }

}

export default DirectoryList