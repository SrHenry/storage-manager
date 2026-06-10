/** Omit a subtype from given type */
export type IgnoreUnionType<T, U = unknown> = T extends U ? never : T
