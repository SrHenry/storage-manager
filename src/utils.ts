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
