#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const DIRS = [join(ROOT, 'dist', 'esm'), join(ROOT, 'types')]

const EXTENSION_REGEX = /\.\w+$/
const SPECIFIER_REGEX = /(from\s*|import\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g

function hasExtension(specifier) {
    return EXTENSION_REGEX.test(specifier)
}

function findFiles(dir, extension) {
    const results = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) {
            results.push(...findFiles(full, extension))
        } else if (entry.endsWith(extension)) {
            results.push(full)
        }
    }
    return results
}

function fixFile(filePath) {
    let content = readFileSync(filePath, 'utf8')
    const fixed = content.replace(SPECIFIER_REGEX, (match, prefix, quote, specifier) => {
        if (hasExtension(specifier)) return match
        return `${prefix}${quote}${specifier}.js${quote}`
    })
    if (fixed !== content) {
        writeFileSync(filePath, fixed, 'utf8')
        console.log(`Fixed: ${relative(ROOT, filePath)}`)
    }
}

for (const dir of DIRS) {
    for (const file of findFiles(dir, '.js')) fixFile(file)
    for (const file of findFiles(dir, '.d.ts')) fixFile(file)
}
