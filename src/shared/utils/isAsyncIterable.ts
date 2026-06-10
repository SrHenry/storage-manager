/** Check if given input is AsyncIterable */
// biome-ignore lint/suspicious/noExplicitAny: type guard requires any input
export function isAsyncIterable(obj: any): obj is AsyncIterable<any> {
    return obj != null && typeof obj[Symbol.asyncIterator] === 'function'
}
