# remove-legacy-node Design

## Summary

Remove dead code paths for Node.js < 10.12.0 (`mkdir`) and < 12.10.0 (`deleteFromStorage`), remove the `semver` dependency, and delete stale pre-dual-build compiled artifacts from the repo root.

## Context

`StorageManager.mkdir` and `StorageManager.deleteFromStorage` contain semver-guarded fallback branches for Node.js versions that are long EOL. The `engines` field already requires `node >= 22`, making both branches unreachable at runtime. The `semver` package (and its `@types/semver` dev dependency) is only used for these two `lt()` comparisons.

Additionally, the repo root contains three stale compiled files (`StorageManager.js`, `utils.js`, `utils.d.ts`) from the pre-dual-build era that are now superseded by `dist/esm/` and `dist/cjs/`.

## Changes

### `src/StorageManager.ts`

- **Remove** `import { lt } from 'semver'` (line 6)
- **`mkdir` (line 820):** Remove the entire `lt(process.versions.node, '10.12.0')` branch (manual split/join mkdir loop). Keep only `fs.mkdir(path, options, preHandler)`
- **`deleteFromStorage` (line 856):** Remove the entire `lt(process.versions.node, '12.10.0')` branch (manual recursive delete with `fs.rmdir`). Keep only `fs.rm(filePath, { recursive: true, force: true }, ...)` for directory deletion. Fix pre-existing bug: when `callback` is provided, the Promise never settled because `callback` was forwarded directly to `fs.unlink`/`fs.rm` instead of wrapping it. Now both paths use a `done` helper that calls the callback AND settles the Promise.

### `package.json`

- Remove `semver` from `dependencies`
- Remove `@types/semver` from `devDependencies`
- Run `yarn install` to update `yarn.lock`

### Stale root artifacts

- Delete `StorageManager.js`
- Delete `utils.js`
- Delete `utils.d.ts`

These are pre-dual-build compiled output, now superseded by `dist/esm/` and `dist/cjs/`.

### `src/utils.ts`

No changes needed — `removeLastElement` does not exist in source (only in stale compiled output being deleted).

## Acceptance Criteria

- `semver` and `@types/semver` removed from `package.json` and `yarn.lock`
- `mkdir` uses only `fs.mkdir` with `{ recursive: true }`
- `deleteFromStorage` uses only `fs.rm` with `{ recursive: true, force: true }`
- No `semver` import remains anywhere in `src/`
- Stale root artifacts (`StorageManager.js`, `utils.js`, `utils.d.ts`) are deleted
- `yarn build` succeeds
- `npx tsc --noEmit` passes
- `yarn test` passes (47 tests)
- `yarn qa` passes
