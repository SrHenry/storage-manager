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