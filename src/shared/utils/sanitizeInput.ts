import type { ValidInput } from '../types'

/**
 * Wrapper to sanitize input of filesystem input wrappers.
 * @param input Input data to sanitize.
 * @returns a string or buffer representing the input data
 *
 * @since 1.2.0
 */
export function sanitizeInput(input: Buffer): Buffer
export function sanitizeInput(input: string): string
export function sanitizeInput(input: object): string
export function sanitizeInput<T = unknown>(input: T[]): string
export function sanitizeInput<T = unknown>(input: T): string
// biome-ignore lint/suspicious/noExplicitAny: overload implementation requires any
export function sanitizeInput(input: any): ValidInput {
    if (Buffer.isBuffer(input) || typeof input === 'string') return input
    else if (Array.isArray(input) || typeof input === 'object') return JSON.stringify(input)
    else if ('toString' in input) return input.toString()
    else return `${input}`
}
