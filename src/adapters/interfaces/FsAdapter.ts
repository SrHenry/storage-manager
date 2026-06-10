import type fs from 'node:fs'
import type Path from 'node:path'
import type { ReadAdapter } from './ReadAdapter'
import type { WriteAdapter } from './WriteAdapter'
import type { StreamAdapter } from './StreamAdapter'
import type { DirAdapter } from './DirAdapter'
import type { MetaAdapter } from './MetaAdapter'

export interface FsAdapter
    extends ReadAdapter, WriteAdapter, StreamAdapter, DirAdapter, MetaAdapter {
    readonly constants: typeof fs.constants
    readonly path: typeof Path
}
