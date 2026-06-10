/** Supported input types for underlying API (node/fs) */
export type ValidInput = string | Buffer

/** Supported input types for filesystem wrapper */
export type Input = ValidInput | number | object
