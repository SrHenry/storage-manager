# Dual ESM + CJS Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from single CJS build (root output) to dual ESM + CJS build (`dist/` + `types/`), with extensionless source and post-build `.js` extension rewriting.

**Architecture:** Three tsconfigs (base noEmit, ESM, CJS). ESM build emits to `dist/esm/` + declarations to `types/`. CJS build emits to `dist/cjs/`. Post-build script `fix-esm-imports.mjs` adds `.js` extensions to relative imports in ESM output. Package becomes `"type": "module"` with conditional `exports` map.

**Tech Stack:** TypeScript 6.x, Node.js, Vitest

---

## File structure

| File                          | Action | Responsibility                                                                  |
| ----------------------------- | ------ | ------------------------------------------------------------------------------- |
| `tsconfig.json`               | Modify | Base config — `noEmit: true`, `module: "esnext"`, `moduleResolution: "bundler"` |
| `tsconfig.esm.json`           | Create | ESM build — `module: "esnext"`, outDir `dist/esm/`, declarations to `types/`    |
| `tsconfig.cjs.json`           | Create | CJS build — `module: "commonjs"`, outDir `dist/cjs/`, no declarations           |
| `scripts/fix-esm-imports.mjs` | Create | Post-build: adds `.js` to relative imports in `dist/esm/` and `types/`          |
| `package.json`                | Modify | `"type": "module"`, `exports` map, `files`, build scripts                       |
| `.gitignore`                  | Modify | Replace root `/*.js` etc with `/dist`, `/types`                                 |
| `.npmignore`                  | Delete | Replaced by `"files"` field                                                     |
| `vitest.config.ts`            | Modify | Add `resolve.alias` for `.js` extension stripping (future-proofing)             |
| `AGENTS.md`                   | Modify | Update architecture, commands, gotchas                                          |

---

### Task 1: Create base tsconfig (noEmit)

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Replace tsconfig.json with base config**

```json
{
    "compilerOptions": {
        "target": "es2024",
        "lib": ["ES2024"],
        "module": "esnext",
        "moduleResolution": "bundler",
        "rootDir": "./src",
        "noEmit": true,
        "isolatedModules": true,
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": false,
        "noImplicitThis": true,
        "alwaysStrict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "types": ["node"],
        "allowSyntheticDefaultImports": true,
        "esModuleInterop": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src/*"],
    "exclude": [
        ".git",
        "bin",
        "build",
        "node_modules",
        "dist",
        "types",
        "docs",
        "test",
        "tests",
        "__test__",
        "__tests__",
        "**/*.spec.*",
        "**/*.test.*"
    ]
}
```

- [ ] **Step 2: Validate JSON**

```sh
npx prettier --check tsconfig.json
```

Expected: passes

- [ ] **Step 3: Verify typecheck still works**

```sh
npx tsc --noEmit
```

Expected: passes (no errors)

- [ ] **Step 4: Run tests**

```sh
yarn test
```

Expected: 46 tests pass

- [ ] **Step 5: Commit**

```sh
git add tsconfig.json
git commit -S -m "chore: convert tsconfig.json to base config (noEmit, esnext/bundler)"
```

---

### Task 2: Create ESM and CJS build configs

**Files:**

- Create: `tsconfig.esm.json`
- Create: `tsconfig.cjs.json`

- [ ] **Step 1: Create tsconfig.esm.json**

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "noEmit": false,
        "module": "esnext",
        "moduleResolution": "bundler",
        "outDir": "./dist/esm",
        "declaration": true,
        "declarationDir": "./types",
        "declarationMap": true,
        "sourceMap": true,
        "noEmitOnError": true
    },
    "exclude": ["node_modules", "dist", "types", "**/*.spec.*", "**/*.test.*"]
}
```

- [ ] **Step 2: Create tsconfig.cjs.json**

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "noEmit": false,
        "module": "commonjs",
        "moduleResolution": "bundler",
        "outDir": "./dist/cjs",
        "declaration": false,
        "sourceMap": true,
        "noEmitOnError": true
    },
    "exclude": ["node_modules", "dist", "types", "**/*.spec.*", "**/*.test.*"]
}
```

- [ ] **Step 3: Validate both JSON files**

```sh
npx prettier --check tsconfig.esm.json tsconfig.cjs.json
```

Expected: passes

- [ ] **Step 4: Test ESM build**

```sh
npx tsc -p tsconfig.esm.json
```

Expected: no errors. Files emitted to `dist/esm/` and `types/`.

- [ ] **Step 5: Test CJS build**

```sh
npx tsc -p tsconfig.cjs.json
```

Expected: no errors. Files emitted to `dist/cjs/`.

- [ ] **Step 6: Verify output structure**

```sh
ls dist/esm/index.js dist/esm/StorageManager.js dist/esm/DirectoryList.js dist/esm/utils.js
ls dist/cjs/index.js dist/cjs/StorageManager.js dist/cjs/DirectoryList.js dist/cjs/utils.js
ls types/index.d.ts types/StorageManager.d.ts types/DirectoryList.d.ts types/utils.d.ts
```

Expected: all files exist

- [ ] **Step 7: Clean up test output and commit**

```sh
rm -rf dist/ types/
git add tsconfig.esm.json tsconfig.cjs.json
git commit -S -m "chore: add ESM and CJS build tsconfigs"
```

---

### Task 3: Create fix-esm-imports.mjs script

**Files:**

- Create: `scripts/fix-esm-imports.mjs`

- [ ] **Step 1: Create the script**

```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const DIRS = [join(ROOT, 'dist', 'esm'), join(ROOT, 'types')]

const EXTENSION_REGEX = /\.\w+$/
const SPECIFIER_REGEX = /(from|import\s*\()\s*['"](\.\.?\/[^'"]+)(['"])/g

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
    const fixed = content.replace(SPECIFIER_REGEX, (match, prefix, specifier, suffix) => {
        if (hasExtension(specifier)) return match
        return `${prefix}${specifier}.js${suffix}`
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
```

- [ ] **Step 2: Test the script end-to-end**

```sh
npx tsc -p tsconfig.esm.json && node ./scripts/fix-esm-imports.mjs
```

Expected: logs `Fixed: dist/esm/index.js`, `Fixed: types/index.d.ts` (and any other files with relative imports). Files without relative imports are silently skipped.

- [ ] **Step 3: Verify extensions were added**

```sh
grep "from './" dist/esm/index.js
```

Expected: imports have `.js` extensions, e.g. `from './StorageManager.js'`

```sh
grep "from './" types/index.d.ts
```

Expected: same — `.js` extensions present

- [ ] **Step 4: Verify it skips already-has-extension specifiers**

Run the script a second time:

```sh
node ./scripts/fix-esm-imports.mjs
```

Expected: no output (nothing to fix — all specifiers already have `.js`)

- [ ] **Step 5: Clean up and commit**

```sh
rm -rf dist/ types/
git add scripts/fix-esm-imports.mjs
git commit -S -m "chore: add fix-esm-imports.mjs post-build script"
```

---

### Task 4: Update package.json

**Files:**

- Modify: `package.json`

This is the core migration step. After this, `yarn build` produces dual output.

- [ ] **Step 1: Update package.json**

The full updated file:

```json
{
    "name": "@srhenry/storage-manager",
    "version": "2.0.0",
    "description": "A Custom filesystem wrapper for Node.JS implemented in Typescript.",
    "repository": "gitlab:SrHenry/storage-manager",
    "type": "module",
    "main": "./dist/cjs/index.js",
    "module": "./dist/esm/index.js",
    "types": "./types/index.d.ts",
    "exports": {
        ".": {
            "types": "./types/index.d.ts",
            "import": "./dist/esm/index.js",
            "require": "./dist/cjs/index.js",
            "default": "./dist/esm/index.js"
        },
        "./package.json": "./package.json"
    },
    "files": ["dist", "types"],
    "scripts": {
        "test": "vitest run",
        "test:coverage": "vitest run --coverage",
        "build:esm": "tsc -p tsconfig.esm.json",
        "build:cjs": "tsc -p tsconfig.cjs.json && echo '{\"type\":\"commonjs\"}' > ./dist/cjs/package.json",
        "build:fix-esm": "node ./scripts/fix-esm-imports.mjs",
        "build": "yarn build:esm && yarn build:fix-esm && yarn build:cjs",
        "docs": "npx typedoc",
        "lint": "biome lint ./src",
        "lint:fix": "biome lint --write ./src",
        "format": "prettier --check \"src/**/*.ts\"",
        "format:fix": "prettier --write \"src/**/*.ts\"",
        "qa": "biome lint ./src && prettier --check \"src/**/*.ts\"",
        "qa:fix": "biome lint --write ./src && prettier --write \"src/**/*.ts\"",
        "prepare": "husky"
    },
    "keywords": ["filesystem", "wrapper", "storage", "file", "fs", "stream"],
    "author": "SrHenry",
    "license": "MIT",
    "engines": {
        "node": "^22.0.0 || ^24.0.0 || ^26.0.0"
    },
    "dependencies": {
        "semver": "^7.8.1"
    },
    "devDependencies": {
        "@biomejs/biome": "^2.4.16",
        "@types/node": ">=24.0.0",
        "@types/semver": "^7.7.1",
        "@vitest/coverage-v8": "^4.1.8",
        "husky": "^9.1.7",
        "lint-staged": "^17.0.7",
        "prettier": "^3.8.3",
        "typedoc": "^0.28.19",
        "typescript": "^6.0.3",
        "vitest": "^4.1.8"
    }
}
```

Key changes from current:

- `"type": "commonjs"` → `"type": "module"`
- Removed `"main": "index.js"` and `"types": "index.d.ts"` → new `"main"`, `"module"`, `"types"`, `"exports"` map
- `"files": ["*.js", "*.d.ts"]` → `"files": ["dist", "types"]`
- Added `build:esm`, `build:cjs`, `build:fix-esm` scripts; replaced `"build": "npx tsc"` with the dual-build pipeline
- Removed `"build": "npx tsc"` (replaced by new `build` script)

- [ ] **Step 2: Validate JSON**

```sh
npx prettier --check package.json
```

Expected: passes

- [ ] **Step 3: Run full build**

```sh
yarn build
```

Expected: ESM output to `dist/esm/`, declarations to `types/`, CJS output to `dist/cjs/`, `dist/cjs/package.json` with `{"type":"commonjs"}`

- [ ] **Step 4: Verify CJS package.json was created**

```sh
cat dist/cjs/package.json
```

Expected: `{"type":"commonjs"}`

- [ ] **Step 5: Verify fix-esm-imports ran**

```sh
grep "from './" dist/esm/index.js
```

Expected: imports have `.js` extensions

- [ ] **Step 6: Verify typecheck**

```sh
npx tsc --noEmit
```

Expected: passes

- [ ] **Step 7: Run tests**

```sh
yarn test
```

Expected: 46 tests pass

- [ ] **Step 8: Verify QA**

```sh
yarn qa
```

Expected: 0 errors (pre-existing warnings OK)

- [ ] **Step 9: Clean up build output and commit**

```sh
rm -rf dist/ types/
git add package.json
git commit -S -m "feat: dual ESM + CJS build with exports map"
```

---

### Task 5: Update .gitignore and delete .npmignore

**Files:**

- Modify: `.gitignore`
- Delete: `.npmignore`

- [ ] **Step 1: Update .gitignore**

Replace the root-level build output patterns with the new output directories. The full updated file:

```
.history
.vscode
/node_modules
/dist
/types
/typedoc-site
/src/*.draft.ts
/package-lock.json
/dir0
/coverage
```

Changes: removed `/*.js`, `/*.mjs`, `/*.d.ts`. Added `/dist`, `/types`. Kept `/typedoc-site` (from previous PR).

- [ ] **Step 2: Delete .npmignore**

```sh
git rm .npmignore
```

Publishing is now controlled by `"files": ["dist", "types"]` in `package.json`.

- [ ] **Step 3: Remove root-level build artifacts (if any)**

```sh
rm -f *.js *.d.ts
```

These are old CJS build outputs from the previous `yarn build` that wrote to repo root. They are now gitignored and obsolete.

- [ ] **Step 4: Verify git status is clean**

```sh
git status
```

Expected: only `.gitignore` and `.npmignore` deletion are staged. Root `*.js`/`*.d.ts` files should NOT appear (gitignored).

- [ ] **Step 5: Commit**

```sh
git add .gitignore
git commit -S -m "chore: gitignore dist+types, delete .npmignore, use files field"
```

---

### Task 6: Update vitest.config.ts

**Files:**

- Modify: `vitest.config.ts`

Adding `resolve.alias` to strip `.js` extensions from imports. This isn't needed today (source has no `.js` extensions), but it future-proofs the config for when `.js` extensions may be added to source (e.g. when adopting `moduleResolution: "nodenext"` for multi-runtime support).

- [ ] **Step 1: Update vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/__tests__/*.spec.ts'],
        globals: true,
    },
    resolve: {
        alias: [
            {
                find: /^(\.\.\/.*)\.js$/,
                replacement: '$1',
            },
            {
                find: /^(\.\/.*)\.js$/,
                replacement: '$1',
            },
        ],
    },
})
```

- [ ] **Step 2: Run tests**

```sh
yarn test
```

Expected: 46 tests pass

- [ ] **Step 3: Commit**

```sh
git add vitest.config.ts
git commit -S -m "chore: add js extension strip aliases to vitest config"
```

---

### Task 7: Update AGENTS.md

**Files:**

- Modify: `AGENTS.md`

Multiple sections need updating to reflect the dual-build architecture.

- [ ] **Step 1: Update Project Overview**

Change:

```
- **Module system**: CommonJS only (`"type": "commonjs"`)
```

To:

```
- **Module system**: Dual ESM + CJS (`"type": "module"`, conditional `exports`)
```

Change:

```
- **TypeScript**: strict mode, target ES2024, module commonjs
```

To:

```
- **TypeScript**: strict mode, target ES2024, module esnext (base), esnext (ESM build), commonjs (CJS build)
```

- [ ] **Step 2: Update Build & Development Commands table**

Replace the `yarn build` row:

```
| `yarn build` | Compile TS via `npx tsc` |
```

With:

```
| `yarn build` | Dual ESM + CJS build (ESM → `dist/esm/`, CJS → `dist/cjs/`, types → `types/`) |
| `yarn build:esm` | ESM build only |
| `yarn build:cjs` | CJS build only (creates `dist/cjs/package.json`) |
| `yarn build:fix-esm` | Post-build: add `.js` extensions to ESM imports |
```

- [ ] **Step 3: Update Architecture section**

Replace:

```
- `src/` is the only source directory. Compiled output (`.js`, `.d.ts`, `.map`) lands in repo root per `outDir: "./"` + `rootDir: "./src"`
- `files` in `package.json` publishes only `*.js` and `*.d.ts` from root (TS source excluded via `.npmignore`)
```

With:

```
- `src/` is the only source directory. Build output: `dist/esm/` (ESM JS), `dist/cjs/` (CJS JS), `types/` (declarations). All three are gitignored and published via `"files": ["dist", "types"]`
- `tsconfig.json` is base-only (`noEmit: true`). Build configs: `tsconfig.esm.json`, `tsconfig.cjs.json`
- Post-build script `scripts/fix-esm-imports.mjs` adds `.js` extensions to relative imports in ESM output and declarations
```

- [ ] **Step 4: Update Gotchas section**

Replace:

```
- Build output writes `.js`/`.d.ts` to repo root, not a separate `dist/` dir. Git ignores root `*.js`/`.d.ts` via `.gitignore`, but npm includes them via `files` + `.npmignore` exclusion logic
```

With:

```
- Build output writes to `dist/` (ESM + CJS) and `types/` (declarations). All are gitignored. Published via `"files": ["dist", "types"]` — no `.npmignore`
- `fix-esm-imports.mjs` must run after ESM build but before CJS build (CJS doesn't need extension rewriting — Node `require()` resolves extensions automatically)
- `dist/cjs/package.json` with `{"type":"commonjs"}` is created during `build:cjs` — this is required because top-level `package.json` has `"type": "module"`
- Source imports are extensionless. The ESM build emits extensionless specifiers, which `fix-esm-imports.mjs` then rewrites to `.js`. Do NOT add `.js` extensions to source imports
```

- [ ] **Step 5: Validate markdown**

```sh
npx prettier --check AGENTS.md
```

- [ ] **Step 6: Commit**

```sh
git add AGENTS.md
git commit -S -m "docs: update AGENTS.md for dual ESM + CJS build"
```

---

### Task 8: Verify full pipeline end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Clean slate — remove any leftover build artifacts**

```sh
rm -rf dist/ types/ *.js *.d.ts
```

- [ ] **Step 2: Run full build from scratch**

```sh
yarn build
```

Expected: no errors. Output in `dist/esm/`, `dist/cjs/`, `types/`.

- [ ] **Step 3: Verify CJS package.json**

```sh
cat dist/cjs/package.json
```

Expected: `{"type":"commonjs"}`

- [ ] **Step 4: Verify ESM imports have .js extensions**

```sh
grep -r "from '\\.\\./" dist/esm/ || echo "No relative parent imports"
grep -r "from '\\./" dist/esm/ | head -5
```

Expected: all relative imports in `dist/esm/` have `.js` extensions

- [ ] **Step 5: Verify declaration imports have .js extensions**

```sh
grep -r "from '\\./" types/ | head -5
```

Expected: all relative imports in `types/` have `.js` extensions

- [ ] **Step 6: Verify CJS imports are extensionless (unchanged)**

```sh
grep -r "require('\\./" dist/cjs/ | head -5
```

Expected: CJS `require()` calls are extensionless (no rewriting applied to CJS)

- [ ] **Step 7: Typecheck**

```sh
npx tsc --noEmit
```

Expected: passes

- [ ] **Step 8: QA**

```sh
yarn qa
```

Expected: 0 errors

- [ ] **Step 9: Tests**

```sh
yarn test
```

Expected: 46 tests pass

- [ ] **Step 10: TypeDoc**

```sh
yarn docs && ls typedoc-site/index.html
```

Expected: generates to `typedoc-site/`

- [ ] **Step 11: Verify dist/ and types/ are gitignored**

```sh
git status dist/ types/
```

Expected: not listed (ignored)

- [ ] **Step 12: Clean up**

```sh
rm -rf dist/ types/ typedoc-site/
```
