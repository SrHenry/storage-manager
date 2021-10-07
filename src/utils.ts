/**
 * A function that removes its last element of an array-like list and
 *
 * @template {T extends Array<U>} T - An array-like object type
 * @template U Arbitrary unknown type of the array-like object
 *
 * @param {T} list The list to remove the last element of it
 *
 * @returns {T} The list without the last element of it
 */
export function removeLastElement<T extends Array<U>, U>(list: T): T
{
    list.pop()
    return list
}

/** Check if given input is Iterable */
export function isIterable(obj: any): obj is Iterable<any>
{
    return obj[Symbol.iterator] === "function"
}

/** Check if given input is AsyncIterable */
export function isAsyncIterable(obj: any): obj is AsyncIterable<any>
{
    return obj[Symbol.asyncIterator] === "function"
}

/** Omit an subtype from given type */
export type IgnoreUnionType<T, U = unknown> = T extends U ? never : T

export namespace LogicGates
{
    /**
 * Logic gate 'AND' to many inputs.
 *
 * @param values input list of argument values.
 *
 * @returns result of nested 'AND' Logic gate.
 */
    export const AND = (...values: any[]) => values.reduce<boolean>((p, v) => (p && !!v), true)

    /**
     * Logic gate 'OR' to many inputs.
     *
     * @param values input list of argument values.
     *
     * @returns result of nested 'OR' Logic gate.
     */
    export const OR = (...values: any[]) =>
    {
        for (const value of values)
            if (!!value)
                return true
        return false
    }

    /**
     * Logic gate 'NOT'.
     *
     * @param value input value.
     *
     * @returns result of 'NOT' Logic gate.
     */
    export const NOT = (value: any) => !value

    /**
     * Logic gate 'NAND' (Not AND) to many inputs.
     * It applies 'AND' to all values then apply 'NOT' for the result.
     *
     * @param values input list of argument values.
     *
     * @returns result of nested 'NAND' Logic gate.
     */
    export const NAND = (...values: any[]) => NOT(AND(...values))

    /**
     * Logic gate 'NOR' (Not OR) to many inputs.
     * It applies 'OR' to all values then apply 'NOT' for the result.
     *
     * @param values input list of argument values.
     *
     * @returns result of nested 'NOR' Logic gate.
     */
    export const NOR = (...values: any[]) => NOT(OR(...values))

    /**
     * Logic gate 'XOR' (eXclusive OR) to many inputs.
     * Returns true if only one of the inputs are true, false otherwise.
     *
     * @param values input list of argument values.
     *
     * @returns result of 'XOR' Logic gate.
     */
    export const XOR = (...values: any[]) => OR(...values) && OR(...(values.map(NOT)))

    /**
     * Logic gate 'XNOR' (eXclusive Not OR) to many inputs.
     * Returns false if only one of the inputs are true, true otherwise.
     * Same as applying 'XOR' then 'NOT'.
     *
     * @param values input list of argument values.
     *
     * @returns result of 'XNOR' Logic gate.
     */
    export const XNOR = (...values: any[]) => NOT(XOR(...values))
}