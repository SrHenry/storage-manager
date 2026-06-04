import fs from 'node:fs'
import os from 'node:os'
import Path from 'node:path'

export function tmpDir(prefix = 'sm-test-'): string {
    const dir = Path.join(
        os.tmpdir(),
        `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    )
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

export function cleanup(dir: string) {
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
}
