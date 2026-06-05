# Design: Remove Deprecated Methods (`remove-deprecated`)

**Date:** 2026-06-05
**Status:** Approved
**Target release:** Batched into future 2.0.0 (no version bump in this task)

## Goal

Remove seven legacy public methods that have been marked `@deprecated` in JSDoc, in preparation for the 2.0.0 release. The methods have well-documented modern replacements and no internal consumers other than one indirect call inside `mkdir`.

## Scope

### In scope

1. **Delete the following methods** from `src/StorageManager.ts`:
    - `checkExist` — replaced by `exists`
    - `writeStorage` — replaced by `put` / `putStreamed` / `append` / `appendStreamed`
    - `writeFileStream` — replaced by `writeStream`
    - `readStorage` — replaced by `readStream` (uses unsafe `Stream.pipe`)
    - `getFileContents` — replaced by `getAsBuffers`
    - `readFileStream` — replaced by `readStream` (uses unsafe `Stream.pipe`)
    - `openFileOrDirectory` — replaced by `stats`

2. **Fix the `mkdir` → `checkExist` coupling** at `src/StorageManager.ts:880`. Replace the internal call:

    ```ts
    StorageManager.checkExist(path).then(
        async () => preHandler(null, path),
        async () => { /* ...mkdir logic... */ }
    )
    ```

    with the modern, non-throwing equivalent:

    ```ts
    StorageManager.exists(path).then(exists => {
        if (exists) return preHandler(null, path)
        /* ...mkdir logic... */
    })
    ```

3. **Clean up `src/index.ts`**: remove the seven destructured names and the `//deprecated:` comment block (lines 36–43).

### Out of scope (deferred to their own tasks)

- Version bump to 2.0.0 — to be done in a later batched release PR
- `CHANGELOG.md` / release notes — no release planned soon
- `remove-legacy-node` (drops `semver` dependency) — separate task
- `refactor-split-modules` — separate task

## Why this is safe

- All seven methods are already annotated `@deprecated` in JSDoc with their modern equivalents documented.
- A repository-wide search (`rg`) confirms no internal consumers of these methods outside the single `mkdir` → `checkExist` link being fixed in this same PR.
- The replacement (`exists`) is already smoke-tested under the `add-vitest` task.
- The public API surface shrinks; no new public API is added.

## Risks

- **Consumer breakage** (external): any consumer still using these methods will see TypeScript errors and runtime `TypeError`s. This is the intended behavior — the methods were deprecated and the 2.0.0 release is the appropriate cut-off. Consumers pinned to `^1.4.0` are unaffected by this PR.
- **`mkdir` regression**: the new early-exists branch uses `exists` (which returns `boolean`) instead of `checkExist` (which throws on missing path). The two cases (`if (exists)` vs. `then(...)` / `catch(...)`) are semantically equivalent — both produce a `preHandler(null, path)` resolution when the path exists. Covered by the existing `mkdir` smoke test.

## Verification (mandatory, per AGENTS.md)

Run in the worktree, in this order:

1. `yarn install` — set up dependencies
2. `yarn build` — compile TS
3. `npx tsc --noEmit` — typecheck
4. `yarn test` — Vitest smoke tests pass (`mkdir`, `exists`, etc.)
5. `yarn qa` — Biome lint + Prettier check clean
6. `rg "checkExist|writeFileStream|writeStorage|readFileStream|readStorage|getFileContents|openFileOrDirectory" src/` — returns zero matches

## Deliverable

- **Branch:** `refactor/remove-deprecated-methods` (off `developer`)
- **Worktree:** `/tmp/storage-manager-remove-deprecated`
- **PR target:** `developer`
- **Commit:** single `refactor(StorageManager): remove deprecated methods, prepare for 2.0.0` covering all three changes atomically
- **Files touched:**
    - `src/StorageManager.ts` — 7 method deletions + 1 `mkdir` rewrite (~300 lines removed)
    - `src/index.ts` — destructure cleanup (~8 lines removed)

## Acceptance

- All seven deprecated methods are gone from the public API
- `mkdir` continues to work correctly with the new `exists`-based early check
- `yarn build`, `npx tsc --noEmit`, `yarn test`, and `yarn qa` all pass
- No `rg` matches for the removed method names in `src/`
