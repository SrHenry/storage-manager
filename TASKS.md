# TASKS

## P0 — Critical

## P1 — High

- [x] Update dependencies (semver, @types/node, @types/semver, typedoc, typescript)
- **ID**: update-deps
- **Details**: The stale `feat/update-dependencies-and-node-support` branch already attempted this (tsconfig, package.json, yarn.lock). The dependency bumps in that branch are already on `developer` — verify no regressions, then discard the stale branch
- **Files**: `package.json`, `yarn.lock`, `tsconfig.json`
- **Acceptance**: `yarn install` + `yarn build` + `npx tsc --noEmit` all pass with latest versions

- [x] Add Biome linting + replace Prettier with Biome formatting
- **ID**: add-biome
- **Details**: Follow the pattern from `@srhenry/type-utils` — Biome for lint (no formatting), Prettier for formatting. Configure `biome.json` with rules matching sibling repo conventions (no enums, `noExplicitAny: warn`, `useImportType: warn`, `noNonNullAssertion: warn`). Add `yarn check`, `yarn check:fix`, `yarn lint`, `yarn lint:fix`, `yarn format`, `yarn format:fix` scripts
- **Files**: `biome.json`, `package.json`, `src/**/*.ts`
- **Acceptance**: `yarn check` passes clean on existing code (existing `any` / non-null assertions may stay as `warn`); `yarn format:fix` reformats all files per Prettier config

- [x] Add Vitest test framework
- **ID**: add-vitest
- **Blocked by**: ~~add-biome~~ (done)
- **Details**: Install Vitest, create `vitest.config.ts`, add `yarn test` and `yarn test:coverage` scripts. Write initial smoke tests for core methods (`put`, `get`, `append`, `exists`, `mkdir`, `delete`, `copy`, `move`, `rename`, `listDirectory`, `stats`, `isFile`, `isDirectory`, `fileStream`). Use `os.tmpdir()` + random subdirs for fixtures; clean up after each test
- **Files**: `vitest.config.ts`, `package.json`, `src/**/__tests__/*.spec.ts`
- **Acceptance**: `yarn test` runs and all smoke tests pass; `yarn test:coverage` produces a coverage report

- [ ] Add pre-commit hooks (Husky + lint-staged)
- **ID**: add-precommit-hooks
- **Blocked by**: ~~add-biome~~ (done), ~~add-vitest~~ (done)
    - **Details**: Install Husky + lint-staged. Hook runs `check:fix → test` on staged `.ts` / config files. Configure `lint-staged` to run Biome lint:fix + Prettier format:fix on `src/**/*.ts`, and Prettier check on `*.{yml,yaml,json}`. Add `prepare` script to `package.json`
    - **Files**: `package.json`, `.husky/pre-commit`, `.lintstagedrc.json`
    - **Acceptance**: Committing a `.ts` file triggers lint + format + typecheck + test; hook reformats files in-place when needed

- [ ] Add dual ESM + CJS build
- **ID**: dual-build
- **Blocked by**: ~~add-biome~~ (done), ~~add-vitest~~ (done)
    - **Details**: Follow the pattern from `@srhenry/type-utils`. Switch `"type": "module"` in package.json. Create `tsconfig.json` (base), `tsconfig.cjs.json` (CJS emit to `dist/cjs/`), `tsconfig.esm.json` (ESM emit to `dist/esm/`). Update `package.json` `exports` map with `import`/`require` conditions. Add `yarn build:clean` script. May need a `scripts/fix-declarations.mjs` step to rewrite `.ts` → `.js` extensions in `.d.ts` files for ESM
    - **Files**: `tsconfig.json`, `tsconfig.cjs.json`, `tsconfig.esm.json`, `package.json`, `scripts/fix-declarations.mjs`
    - **Acceptance**: `yarn build` produces both ESM and CJS outputs; `yarn test` passes; consumers can `import` (ESM) and `require` (CJS) the package

## P2 — Medium

- [ ] Remove deprecated methods
- **Blocked by**: ~~add-vitest~~ (done)
    - **Details**: Remove `checkExist`, `writeFileStream`, `writeStorage`, `readStorage`, `getFileContents`, `readFileStream`, `openFileOrDirectory` from `StorageManager.ts` and their re-exports in `src/index.ts`. Ensure no internal code paths depend on them (they don't — they're self-contained legacy). This is a breaking change → bump major version
    - **Files**: `src/StorageManager.ts`, `src/index.ts`
    - **Acceptance**: Deprecated methods are gone; `yarn build` + `yarn test` pass; no references to removed methods remain

- [ ] Remove legacy Node version code paths
    - **ID**: remove-legacy-node
    - **Blocked by**: add-vitest, dual-build
    - **Details**: `mkdir` has a semver check for Node < 10.12.0 and `deleteFromStorage` has one for Node < 12.10.0. Both versions are long EOL. Remove the branches and the `semver` dependency entirely. Also remove `removeLastElement` from `utils.ts` if no other consumers remain
    - **Files**: `src/StorageManager.ts`, `src/utils.ts`, `package.json`
    - **Acceptance**: `semver` removed from dependencies; `mkdir` and `deleteFromStorage` use only the modern code paths; `yarn test` passes

- [ ] Refactor: split StorageManager into focused modules
    - **ID**: refactor-split-modules
    - **Blocked by**: remove-deprecated, remove-legacy-node
    - **Details**: `StorageManager.ts` is 1100+ lines with all methods in a single static class. Split into domain modules: read operations, write operations, stream operations, metadata/exists checks, directory operations. Keep `StorageManager` as a facade that re-exports from modules for backward compatibility. Internal helpers (`sanitizeInput`, `LogicGates`, type helpers) move to their own files
    - **Files**: `src/StorageManager.ts`, `src/modules/**/*.ts`, `src/helpers/**`, `src/utils/**`
    - **Acceptance**: `StorageManager.*` API unchanged from consumer perspective; `yarn test` passes; no file exceeds ~300 lines

- [ ] Rethink API: evaluate instance-based vs static-only design
    - **ID**: rethink-api-design
    - **Blocked by**: refactor-split-modules, add-vitest
    - **Details**: Current API is entirely static (`StorageManager.put(...)`), which makes it hard to configure per-call options (base dir, encoding defaults, mode flags) or mock in tests. Research alternatives: (a) keep static + add config object per-call, (b) add an instance-based API (`new StorageManager({ basePath: '...' })`) alongside static defaults, (c) switch entirely to instances. This task is design-only — produce a proposal document, not code
    - **Files**: Proposal document (e.g. `docs/api-redesign.md` or ADR)
    - **Acceptance**: Written proposal comparing approaches with pros/cons, backward-compatibility analysis, and recommendation

- [ ] Rethink capabilities: missing filesystem operations
- **ID**: rethink-capabilities
- **Blocked by**: rethink-api-design
- **Details**: Identify gaps vs `fs-extra`, `graceful-fs`, and native `node:fs/promises`. Candidates: `chmod`/`chown`, `symlink`/`readlink`/`lstat` (exposed), `watch`/`watchFile`, `tmpdir`/`mkdtemp`, `glob`-style listing, atomic writes, retry/error-handling wrappers. Prioritize by user demand and API fit. This task is design-only — produce a feature wish list with priority
- **Files**: Proposal document (e.g. `docs/feature-wishlist.md` or ADR)
- **Acceptance**: Prioritized list of new capabilities with rationale and complexity estimates

- [ ] Add Bun and Deno runtime support with native fs API selection
- **ID**: multi-runtime-fs
- **Blocked by**: refactor-split-modules, rethink-api-design
- **Details**: Currently all filesystem operations use `node:fs`/`node:fs/promises`. Add runtime-aware API selection so that when running under Bun or Deno, their native fs APIs are used instead (e.g. `Bun.file()`/`Bun.write()`, `Deno.open()`/`Deno.readDir()`/`Deno.stat()`). Detect runtime at load time via `typeof Bun !== 'undefined'` / `typeof Deno !== 'undefined'` and select the appropriate adapter. Create a unified `FsAdapter` interface that each runtime implements, with Node.js as the default/fallback. This enables better performance and native API alignment on non-Node runtimes while keeping full Node.js compatibility. Update `engines` in `package.json` to also list Bun and Deno version constraints
- **Files**: `src/adapters/**/*.ts`, `src/StorageManager.ts`, `package.json`
- **Acceptance**: `StorageManager.*` API unchanged from consumer perspective; under Node.js, behavior is identical to current; under Bun/Deno, native fs APIs are used; `yarn test` passes on all three runtimes

## P3 — Low

- [x] Add GitHub Actions CI/CD workflows
- **ID**: add-ci-cd
- **Blocked by**: ~~add-biome~~ (done)
- **Details**: Create `.github/workflows/ci.yml` (typecheck, lint, build on PRs), `.github/workflows/typedoc-github-pages.yml` (deploy docs on master push), and `.github/workflows/publish-npm.yml` (publish to npm on GitHub Release). Follow the pattern from `@srhenry/type-utils`. Adapt script names: `yarn qa` instead of `yarn check`, `yarn build` instead of `yarn build:clean`. Skip `circular-dependencies` and `test` steps in CI until those are available
- **Files**: `.github/workflows/ci.yml`, `.github/workflows/typedoc-github-pages.yml`, `.github/workflows/publish-npm.yml`
- **Acceptance**: CI runs on PRs and reports status; publish-npm.yml triggers on GitHub Release; TypeDoc deploys on master push

- [ ] Add circular dependency checking (madge)
    - **ID**: add-madge
    - **Blocked by**: refactor-split-modules, add-vitest
    - **Details**: Install `madge`, add `yarn circular-dependencies` script. Wire into pre-commit hook and CI
    - **Files**: `package.json`, `.husky/pre-commit`, `.github/workflows/ci.yml`
    - **Acceptance**: `yarn circular-dependencies` runs and reports zero cycles

- [x] Clean up stale `feat/update-dependencies-and-node-support` branch
    - **ID**: cleanup-stale-branch
    - **Blocked by**: update-deps
    - **Details**: The dependency bumps from that branch are already on `developer`. Delete the branch from local and all remotes
    - **Files**: N/A (git branch operations)
    - **Acceptance**: `git branch -a` no longer lists `feat/update-dependencies-and-node-support`

- [x] Clean up uncommitted working-tree changes
    - **ID**: cleanup-working-tree
    - **Details**: `.npmignore`, `src/DirectoryList.ts`, `src/StorageManager.ts` have unstaged changes from the stale branch (node: prefixed imports, re-ordered imports, expanded `.npmignore`). These are already in the compiled output on `developer`. Decide: commit or discard
    - **Files**: `.npmignore`, `src/DirectoryList.ts`, `src/StorageManager.ts`
    - **Acceptance**: Working tree is clean on `developer`
