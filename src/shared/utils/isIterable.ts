/** Check if given input is Iterable */
// biome-ignore lint/suspicious/noExplicitAny: type guard requires any input
export function isIterable(obj: any): obj is Iterable<any> {
    return typeof obj[Symbol.iterator] === 'function'
}
