# Dual ESM + CJS Build — Design Spec

## Goal

Migrate `@srhenry/storage-manager` from a single CJS build (output to repo root) to a dual ESM + CJS build with output to `dist/` and `types/`. Source files keep extensionless imports. A post-build script adds `.js` extensions to ESM output for Node.js, Deno, and Bun compatibility.

## Context

- **Current state:** Single `tsconfig.json` emits CJS to repo root (`*.js`, `*.d.ts`). `"type": "commonjs"`. Extensionless source imports.
- **Pattern reference:** `@srhenry/type-utils` uses the dual-build pattern with `dist/cjs/`, `dist/esm/`, `types/`.
- **Future consideration:** `multi-runtime-fs` (TASKS.md) will add Bun/Deno native fs adapters. Build system must be runtime-agnostic — no Node-specific module resolution in source, `exports` map with `"default"` condition for non-Node runtimes.

## Architecture

### Build pipeline

```
yarn build
  → yarn build:esm    (tsc -p tsconfig.esm.json → dist/esm/ + types/)
  → yarn build:fix-esm (scripts/fix-esm-imports.mjs → rewrites .js + .d.ts in dist/esm/ and types/)
  → yarn build:cjs    (tsc -p tsconfig.cjs.json → dist/cjs/ + echo {"type":"commonjs"} > dist/cjs/package.json)
```

### File layout

| Path                          | Purpose                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `tsconfig.json`               | Base config — `noEmit: true`, `module: "esnext"`, `moduleResolution: "bundler"`            |
| `tsconfig.cjs.json`           | CJS build — extends base, `module: "commonjs"`, outDir `dist/cjs/`, no declarations        |
| `tsconfig.esm.json`           | ESM build — extends base, `module: "esnext"`, outDir `dist/esm/`, declarations to `types/` |
| `scripts/fix-esm-imports.mjs` | Post-build: adds `.js` extensions to relative imports in ESM `.js` and `.d.ts` files       |
| `dist/cjs/`                   | CJS output (gitignored, published via `"files"`)                                           |
| `dist/esm/`                   | ESM output (gitignored, published via `"files"`)                                           |
| `types/`                      | Shared `.d.ts` declarations (gitignored, published via `"files"`)                          |

### Why `module: "esnext"` + `moduleResolution: "bundler"`

This is the least runtime-opinionated module setting. It allows extensionless source imports, doesn't enforce Node.js-specific ESM resolution rules at compile time, and is what Deno and Bun-native projects use. The alternative (`module: "node20"` / `moduleResolution: "nodenext"`) would require `.js` extensions in source and tie the build to Node.js's resolution semantics — both counterproductive for planned multi-runtime support.

## Design decisions

### D1: Extensionless source + post-build rewriting

Source files keep extensionless imports (`import { foo } from './bar'`). The ESM build emits the same extensionless specifiers. A post-build script (`fix-esm-imports.mjs`) walks `dist/esm/` and `types/`, adding `.js` to relative import/export specifiers.

**Why not `.js` extensions in source?** Counterintuitive DX (referencing files that don't exist at authoring time), requires vitest aliases to strip `.js` during testing, and ties source to Node.js ESM resolution semantics.

**Why not `rewriteRelativeImportExtensions`?** Only rewrites `.ts` → `.js` in source that already has `.ts` extensions. Doesn't help with extensionless imports. Has an unfixed bug where `.d.ts` files retain `.ts` extensions (TS issues #61037, #62788).

**Why custom script over `tsc-esm-imports`?** Project has ~5 source files — edge case surface is tiny. Zero new dependencies. Full control. Pattern already established in type-utils (`fix-declarations.mjs`).

### D2: Declarations from ESM build only

The ESM build (`tsconfig.esm.json`) is the sole declaration producer: `declaration: true`, `declarationDir: "./types"`. The CJS build has `declaration: false`. Both ESM and CJS consumers share the same `types/` declarations.

This matches the type-utils pattern. Declarations are runtime-agnostic — they describe types, not module format.

### D3: CJS compatibility via `dist/cjs/package.json`

Since the top-level `package.json` will have `"type": "module"`, a `dist/cjs/package.json` with `{"type": "commonjs"}` is created during `build:cjs`. This tells Node.js to treat files in `dist/cjs/` as CommonJS regardless of the top-level `"type"`.

CJS is a backward-compatibility shim for Node.js consumers. Deno and Bun consumers will always use ESM. When multi-runtime support lands, the CJS build remains but is not the future-facing output.

### D4: `exports` map with `"default"` condition

```json
"exports": {
    ".": {
        "types": "./types/index.d.ts",
        "import": "./dist/esm/index.js",
        "require": "./dist/cjs/index.js",
        "default": "./dist/esm/index.js"
    },
    "./package.json": "./package.json"
}
```

The `"default"` condition ensures Deno and Bun (which may not send `"import"` or `"require"` conditions) can resolve the package. The `"types"` condition is always first (required by TypeScript for resolution).

### D5: `"files"` field replaces `.npmignore` for publish control

```json
"files": ["dist", "types"]
```

This is simpler and more explicit than `.npmignore` exclusion logic. Only `dist/` and `types/` are published — no source, no configs, no scripts. The `.npmignore` file is deleted.

## package.json changes

```json
{
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
        "build:esm": "tsc -p tsconfig.esm.json",
        "build:cjs": "tsc -p tsconfig.cjs.json && echo '{\"type\":\"commonjs\"}' > ./dist/cjs/package.json",
        "build:fix-esm": "node ./scripts/fix-esm-imports.mjs",
        "build": "yarn build:esm && yarn build:fix-esm && yarn build:cjs"
    }
}
```

Existing scripts (`test`, `test:coverage`, `docs`, `lint`, `lint:fix`, `format`, `format:fix`, `qa`, `qa:fix`, `prepare`) remain unchanged.

## TypeScript configs

### tsconfig.json (base — noEmit)

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

Changes from current: `module` → `"esnext"`, `moduleResolution` → `"bundler"`, removed `declaration`/`declarationMap`/`sourceMap`/`outDir` (moved to build configs), added `noEmit: true`, added `dist` and `types` to exclude.

### tsconfig.esm.json

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

### tsconfig.cjs.json

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

## fix-esm-imports.mjs

Walks `dist/esm/` and `types/`, finds all `.js` and `.d.ts` files. For each file, replaces extensionless relative import/export specifiers with `.js`-suffixed versions.

**Rewrites:** `'./foo'` → `'./foo.js'`, `'../bar'` → `'../bar.js'`

**Skips:**

- Specifiers that already have an extension (`.js`, `.mjs`, `.cjs`, `.ts`, `.json`, etc.)
- Bare package specifiers (`lodash`, `semver`)
- Scoped packages (`@scope/pkg`)
- `node:` / `bun:` prefixed imports
- `#` subpath imports

**Implementation:** Regex-based. Pattern: `/(from|import\()\s*['"](\.\.?\/[^'"]+)(['"])/g` — matches relative specifiers in `import`/`export from` and dynamic `import()` statements. Only rewrites if the matched specifier has no file extension.

## .gitignore changes

Remove root-level build output patterns:

```
- /*.js
- /*.mjs
- /*.d.ts
```

Add:

```
/dist
/types
```

## .npmignore

Deleted. Replaced by `"files": ["dist", "types"]` in `package.json`.

## Vitest config

No changes needed. Source imports are extensionless, so Vitest resolves them to `.ts` files directly. The `vitest.config.ts` alias configuration from type-utils (which strips `.js` extensions) is unnecessary here since source has no `.js` extensions in imports.

If `.js` extensions are later added to source (e.g. when adopting `moduleResolution: "nodenext"` for multi-runtime), aliases will be needed at that time.

## TypeDoc

`typedoc.json` entry point stays as `src/index.ts`. TypeDoc reads source directly — it doesn't need the built output. No changes needed.

## CI workflow

`ci.yml` currently runs `yarn build` then `yarn test`. No changes needed — the new `yarn build` script produces both ESM and CJS. Tests still run against source.

`typedoc-github-pages.yml` and `publish-npm.yml` need no changes — TypeDoc reads source, and `npm publish` picks up files from `"files"` field.

## Breaking changes

These changes will ship as part of the **2.0.0** release (version already bumped, not yet published). No further version bump is made in this task — all breaking changes accumulate under 2.0.0 until launch.

1. **Build output location:** `index.js` / `index.d.ts` at repo root → `dist/cjs/index.js`, `dist/esm/index.js`, `types/index.d.ts`. Any consumer relying on direct file paths (not the `exports` map) would break.
2. **`"type": "module"`:** The package is now ESM-first. Consumers using `require('@srhenry/storage-manager')` still work via the `"require"` condition in `exports`, but the package's own module type has changed.
3. **Removed `.npmignore`:** Publishing is now controlled by `"files"` field only. If any file was previously published via `.npmignore` exclusion logic that isn't in `"dist"` or `"types"`, it would be dropped. (Current published files are only `*.js` and `*.d.ts` at root — all will move to `dist/` and `types/`.)

## Scope

**In scope:**

- Three tsconfigs (base, ESM, CJS)
- `fix-esm-imports.mjs` script
- package.json updates (type, exports, files, scripts)
- .gitignore updates
- .npmignore deletion
- Vitest config (verify no changes needed)
- Update AGENTS.md

**Out of scope:**

- Multi-runtime fs adapters (separate task)
- Removing `semver` dependency / legacy Node paths (separate task)
- Source import changes (source stays extensionless)
- Adding `"exports"` sub-paths (only root export needed)
- UMD build
