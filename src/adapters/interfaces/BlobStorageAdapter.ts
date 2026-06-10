import type { Input } from '../../shared/types'

/** Options for putObject */
export interface BlobPutOptions {
    [key: string]: unknown
}

/** Result of putObject */
export interface BlobPutResult {
    key: string
    etag?: string
    versionId?: string
}

/** Options for getObject */
export interface BlobGetOptions {
    [key: string]: unknown
}

/** Result of getObject */
export interface BlobGetResult {
    data: Buffer | string
    metadata?: Record<string, string>
}

/** Options for deleteObject */
export interface BlobDeleteOptions {
    [key: string]: unknown
}

/** Result of deleteObject */
export interface BlobDeleteResult {
    key: string
    versionId?: string
}

/** Options for listObjects */
export interface BlobListOptions {
    maxKeys?: number
    [key: string]: unknown
}

/** Result of listObjects */
export interface BlobListResult {
    keys: string[]
    isTruncated: boolean
    nextContinuationToken?: string
}

/** Options for getPresignedUrl */
export interface PresignedUrlOptions {
    expiresIn?: number
    [key: string]: unknown
}

/** Stats for a blob object */
export interface BlobStats {
    key: string
    size: number
    lastModified?: Date
    etag?: string
}

/** Blob storage adapter interface for external storage providers (S3, R2, etc.) */
export interface BlobStorageAdapter {
    putObject(key: string, data: Input, options?: BlobPutOptions): Promise<BlobPutResult>
    getObject(key: string, options?: BlobGetOptions): Promise<BlobGetResult>
    deleteObject(key: string, options?: BlobDeleteOptions): Promise<BlobDeleteResult>
    listObjects(prefix: string, options?: BlobListOptions): Promise<BlobListResult>
    getPresignedUrl(key: string, options?: PresignedUrlOptions): Promise<string>
    exists(key: string): Promise<boolean>
    stats(key: string): Promise<BlobStats>
}
