# AGENTS.md

## Session Behavior

### Classify every request before acting

| Category           | Examples                                                   | Workflow                                                       |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------------- |
| **CODE-PRODUCING** | Features, fixes, refactors, deprecations, breaking changes | Strict — follow PR Workflow below                              |
| **EXPLORATORY**    | Questions, debugging, codebase navigation, code review     | Loose — respond conversationally, use search/read tools freely |

### CODE-PRODUCING: scope gate

Do **NOT** create branches, worktrees, or write code until all of the following are confirmed:

1. **Worktree required** — all code-producing work must happen in an ephemeral worktree (`.worktrees/<topic>` inside the repo root), **never** in the main repo checkout. The user may explicitly opt out (e.g. "work in the main checkout" or "no worktree") — but you must never assume this; always use a worktree unless told otherwise
2. **Base branch** — which branch to target:
    - `developer` for features, refactors, and non-urgent changes (default)
    - `master` for hotfixes and urgent production fixes
    - If the user requests a different base, analyze the case against industry standard practices and question the user before proceeding
3. **Related issues** — GitHub/GitLab issue numbers, URLs, or external references (or explicitly "none")
4. **Scope delimited** — what's included, what's excluded, expected behavior for edge cases
5. **User confirms** — restate understanding and get explicit go-ahead before proceeding

If the request is vague or ambiguous: ask targeted questions. Better to over-clarify than to assume. Never start implementation on unclear intent.

### EXPLORATORY: conversational mode

- No branches, worktrees, or PRs
- Use search, read, and analysis tools freely
- If exploration leads to a code change, re-classify as CODE-PRODUCING and start the scope gate from the top

## Project Overview

- **Package**: `@srhenry/storage-manager` (Node.js filesystem wrapper, Promise-based)
- **Module system**: Dual ESM + CJS (`"type": "module"`, conditional `exports`)
- **Package manager**: Yarn 1.x (classic) — **never use `npm install`**, always `yarn install`
- **Linter**: Biome (lint only, no formatting)
- **Formatter**: Prettier
- **Test framework**: Vitest
- **TypeScript**: strict mode, target ES2024, module esnext (base), esnext (ESM build), commonjs (CJS build)

## Build & Development Commands

| Command                        | Purpose                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `yarn install`                 | Install dependencies (required after checkout)                                  |
| `yarn build`                   | Full pipeline: generate-adapters → clean → ESM → fix-esm → CJS                  |
| `yarn build:generate-adapters` | Auto-generate `src/adapters/auto-register.ts` from `src/adapters/*/register.ts` |
| `yarn build:clean`             | Remove `dist/` and `types/` before build                                        |
| `yarn build:esm`               | ESM build only                                                                  |
| `yarn build:cjs`               | CJS build only (creates `dist/cjs/package.json`)                                |
| `yarn build:fix-esm`           | Post-build: add `.js` extensions to ESM imports                                 |
| `yarn docs`                    | Generate TypeDoc to `typedoc-site/`                                             |
| `yarn test`                    | Run Vitest                                                                      |
| `yarn test:coverage`           | Run Vitest with v8 coverage                                                     |
| `yarn lint`                    | Biome lint                                                                      |
| `yarn lint:fix`                | Biome lint with auto-fix                                                        |
| `yarn format`                  | Prettier check                                                                  |
| `yarn format:fix`              | Prettier write                                                                  |
| `yarn qa`                      | Biome lint + Prettier check                                                     |
| `yarn qa:fix`                  | Biome lint --write + Prettier write                                             |
| `yarn prepare`                 | Install Husky git hooks                                                         |
| `npx tsc --noEmit`             | Typecheck only (no emit)                                                        |

No watch mode configured. Re-run `yarn build` after changes.

### Typecheck

```sh
npx tsc --noEmit
```

NEVER skip `tsc --noEmit` after code changes — typecheck is mandatory, not optional.

## Architecture

- Single package, no monorepo
- Entrypoint chain: `index.ts` → re-exports `src/index.ts` → exports standalone domain functions, `fs` convenience object, adapter types, bootstrap utilities
- `StorageManager` class removed (2.0.0) — all API is standalone function exports
- `src/` is the only source directory. Build output: `dist/esm/` (ESM JS), `dist/cjs/` (CJS JS), `types/` (declarations). All three are gitignored and published via `"files": ["dist", "types"]`
- `tsconfig.json` is base-only (`noEmit: true`). Build configs: `tsconfig.esm.json`, `tsconfig.cjs.json`
- Post-build script `scripts/fix-esm-imports.mjs` adds `.js` extensions to relative imports in ESM output and declarations
- Build pipeline: `build:generate-adapters` → `build:clean` → `build:esm` → `build:fix-esm` → `build:cjs`

### Source structure

```text
src/
  index.ts          — main entry: re-exports domains, adapters, bootstrap, types, errors + fs object
  bootstrap.ts      — lazy singleton _bootstrap(), setFS(), useAdapter(), _getAdapter()
  read/             — get, getAsBuffer, getAsBuffers, getAsJSON (one function per file)
  write/            — put, putStreamed, append, appendStreamed
  stream/           — fileStream (with mode overloads), readStream, writeStream, duplexStream
  metadata/         — exists, doesntExist, stats, isFile, isDirectory
  directory/        — mkdir, listDirectory (with recursive overloads), copy, rename, move, deleteFromStorage, deleteFile, DirectoryList
  shared/           — types/ (Input, FileStreamMode, DirectoryListTypes), utils/ (isIterable, isAsyncIterable, sanitizeInput, IgnoreUnionType), errors/ (UnsupportedEnvironmentError)
  adapters/
    interfaces/     — ReadAdapter, WriteAdapter, StreamAdapter, DirAdapter, MetaAdapter, FsAdapter, RuntimeResolver, BlobStorageAdapter
    resolve.ts      — centralized registry: registerRuntime(), detectRuntime(), resolveAdapter()
    auto-register.ts — auto-generated side-effect imports (generated by scripts/generate-adapter-registrations.mjs)
    node/           — NodeFsAdapter, detect.ts, resolver.ts, register.ts
  types/            — legacy type helpers (TypeOfTag)
```

### Adapter architecture

- **RuntimeResolver** interface: `runtime: string`, `matchesEnvironment(): boolean`, `create(): FsAdapter`
- Centralized registry in `src/adapters/resolve.ts` — no hardcoded adapter imports
- Each adapter in `src/adapters/<runtime>/` provides: `detect.ts` (matchesEnvironment), `resolver.ts` (RuntimeResolver object), `register.ts` (side-effect: calls registerRuntime), `index.ts` (barrel)
- `scripts/generate-adapter-registrations.mjs` scans `src/adapters/*/register.ts` and generates `auto-register.ts`
- Adding a new adapter = create directory with convention files + re-run generator (or `yarn build`)

### Bootstrap flow

1. Domain functions call `_getAdapter()` which calls `_bootstrap()` (lazy, runs once)
2. `_bootstrap()` calls `resolveAdapter()` which iterates the registry
3. First resolver whose `matchesEnvironment()` returns true wins → its `create()` provides the adapter
4. If no resolver matches, `_getAdapter()` throws `UnsupportedEnvironmentError`
5. `setFS(adapter)` short-circuits bootstrap — installs adapter directly

### Test Layout

- **Unit tests**: co-located in `src/**/__tests__/*.spec.ts`
- **Other test kinds** (integration, e2e, performance): root-level `__tests__/**/*.spec.ts`

## Code Conventions

### Formatting (Prettier)

- No semicolons
- Single quotes
- 4-space indent (not tabs)
- Trailing commas (es5)
- Print width: 100
- Arrow parens: avoid

### TypeScript

- Strict mode enabled; `strictPropertyInitialization: false`
- `experimentalDecorators` and `emitDecoratorMetadata` are enabled
- `@/*` path alias maps to repo root (tsconfig `paths`), but source only uses relative imports
- `isolatedModules: true` — each file is transpiled independently

### Pre-commit hooks

- Husky + lint-staged runs on every commit
- `src/**/*.ts` → Biome lint --write + Prettier --write (auto-fix)
- `*.{yml,yaml,json}` → Prettier --check (blocks if malformed, no auto-fix — including `package.json`)
- Typecheck and test are NOT in the hook — deferred to CI

### Commit Style

Conventional Commits format:

```
type(scope): description
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `deprecate`, `merge`

### Commit Authoring

Before making any commit, the AI harness **must** clarify the commit author identity:

- **Default author**: The local then global git config of the root worktree (i.e., `git config user.name` / `git.config user.email` resolved from the main repo checkout, not the ephemeral worktree) — the AI harness must ask the user to confirm the author identity before the first commit in a session, unless already specified earlier in the conversation
- **Verification step**: Before the first commit, check the resolved `user.name` and `user.email` — if they look like placeholder values (e.g., `Test`, `test@test.com`), stop and ask the user for the correct identity before committing
- **Override**: If the user explicitly requests a different author (e.g., a co-author, bot identity, or different email), use that instead — but never assume an alternate identity without explicit direction
- **GPG signing**: When the author identity is confirmed, commits should be GPG-signed (`-S` / `--gpg-sign`) with the key matching the author's email

### Branch Naming

| Pattern             | Use          |
| ------------------- | ------------ |
| `feat/<topic>`      | New features |
| `refactor/<topic>`  | Refactors    |
| `hotfix/<topic>`    | Urgent fixes |
| `release/<version>` | Release prep |

### Branch Roles

- `master` — Default/release branch. Published to npm from here.
- `developer` — Long-running integration branch. Feature branches base off this.

## PR Workflow with Git Worktrees

This is the standard workflow for AI harness sessions producing pull requests.

### 1. Gather Context

This is a **blocking gate** — do not proceed to step 2 until all items below are resolved.

- **Base branch**: Default to `developer` for features/refactors, `master` for hotfixes/urgent fixes. If the user requests otherwise, analyze against industry standard practices and question before proceeding.
- **Related issues**: Ask the user for GitHub/GitLab issue numbers, URLs, or any external references.
- **Scope clarification**: Confirm what the PR should accomplish. If the user provides a vague request, ask targeted questions before starting.

### 2. Create Ephemeral Worktree + Branch

Create both together — the worktree stays alive for the entire PR lifecycle:

```sh
git worktree add .worktrees/<topic> -b feat/<topic> origin/<base-branch>
```

Work in the worktree (`.worktrees/` directory inside the repo root — persistent across sessions, not `/tmp/`).

**The first step after creating the worktree must be `yarn install`** to set up dependencies. Do not write code, run builds, or execute tests until `yarn install` completes.

### 3. Implement

- Make changes in the worktree directory
- Run `yarn build` and `npx tsc --noEmit` after each logical change step
- Commit using Conventional Commits format

### 4. Push & Create PR

Push to all remotes (warn on per-remote failure but continue to others):

```sh
for remote in $(git remote); do git push -u "$remote" feat/<topic> || echo "WARNING: push to $remote failed"; done
gh pr create --base <base-branch> --title "type(scope): description" --body "..."
```

### 5. Iterate

- Keep the worktree alive for follow-up commits (rebase, conflict resolution, review feedback)
- After force-pushing a rebase, push to all remotes:

```sh
for remote in $(git remote); do git push --force-with-lease "$remote" feat/<topic> || echo "WARNING: force-push to $remote failed"; done
```

- After resolving rebase conflicts: `git add <resolved-files> && GIT_EDITOR=true git rebase --continue`

### 6. Post-Merge Cleanup

Once the PR is merged, clean up everything:

```sh
# From the main repo checkout (NOT the worktree):
git worktree remove .worktrees/<topic>
git fetch --prune
git branch -d feat/<topic>
for remote in $(git remote); do git push "$remote" --delete feat/<topic> || echo "WARNING: delete from $remote failed"; done
```

## Docs

- `yarn docs` — generates TypeDoc to `typedoc-site/` (GitLab Pages deploys from `typedoc-site/` on default branch)
- `typedoc.json` entry: `src/index.ts`, excludes private/protected/internal members

## Gotchas

- Build output writes to `dist/` (ESM + CJS) and `types/` (declarations). All are gitignored. Published via `"files": ["dist", "types"]` — no `.npmignore`
- `fix-esm-imports.mjs` must run after ESM build but before CJS build (CJS doesn't need extension rewriting — Node `require()` resolves extensions automatically)
- `dist/cjs/package.json` with `{"type":"commonjs"}` is created during `build:cjs` — this is required because top-level `package.json` has `"type": "module"`
- Source imports are extensionless. The ESM build emits extensionless specifiers, which `fix-esm-imports.mjs` then rewrites to `.js`. Do NOT add `.js` extensions to source imports
- `appendStreamed` with a single `Input` value falls through to `putStreamed` (not `append`) when file doesn't exist
- `developer` vs `master`: Most PRs target `developer`. If `developer` is behind `master`, merge `master` into `developer` first, then rebase the feature branch
- `auto-register.ts` is auto-generated but committed (like a lockfile) — `tsc --noEmit` and `yarn test` require it for fresh clones; regenerate via `yarn build:generate-adapters`
- `delete` is a reserved keyword — directory module uses `const deleteFile` + `export { deleteFile as delete }`; the `fs` object uses `delete: deleteFile`
- `BufferEncoding` is a global type — NOT exported from `node:fs`
- `fileStream` and `listDirectory` use TypeScript overloads instead of `as any` casts — do not revert to `as any`
- Worktrees live in `.worktrees/` inside the repo root (not `/tmp/`) — they persist across sessions and are gitignored
- Zero runtime dependencies (semver removed in PR #8, legacy Node code paths removed)

## Prohibitions

- **NEVER use `npm install`** — always use `yarn install`
- **NEVER skip `tsc --noEmit` after code changes** — typecheck is mandatory, not optional
- **NEVER commit with placeholder author identity** — stop and ask the user for correct identity before proceeding
- **NEVER silently overwrite established AGENTS.md guidelines** — always propose first and get confirmation, even when not in doubt
- **NEVER push YAML/JSON without validating** — after editing any `.yml`, `.yaml`, or `.json` file, run `npx prettier --check <file>` before committing. YAML is indentation-sensitive; even one-space drift silently breaks CI.

## Self-Updating Knowledge

This file is a living document. The AI harness **must** keep it current as new knowledge is discovered during sessions.

### Auto-persist criteria

Automatically write new knowledge to `AGENTS.md` only when **all three** criteria are met:

1. **Verifiable from source** — the fact can be confirmed by reading code, config, or dependency behavior (not subjective opinion)
2. **Fills a gap** — no existing rule, gotcha, or entry already covers it
3. **No behavior change** — the fact doesn't alter how the agent should act (that's propose-first territory)

If any criterion is uncertain → propose first instead.

### Section routing table

| Discovery type                                        | Target section               |
| ----------------------------------------------------- | ---------------------------- |
| Build/runtime gotcha not covered                      | Gotchas                      |
| Directory purpose not documented                      | Architecture                 |
| Missing Prohibition (behavior that must never happen) | Prohibitions                 |
| New command or script not in table                    | Build & Development Commands |
| Dependency behavioral quirk                           | Gotchas                      |
| Test convention or matcher                            | Code Conventions             |

### Dedup rule

Before adding, scan existing content. Amend existing entries rather than adding parallel ones. Keeps the file tight and avoids contradiction.

### Contradiction protocol

If the new knowledge **contradicts** something already in this file:

1. **Do not silently overwrite** — present the contradiction to the user
2. Explain what the current guidance says vs. what was just discovered
3. Ask the user which version is correct before updating
4. If the contradiction reveals a deeper misunderstanding, flag it explicitly

### Placement

Add new knowledge to the most relevant existing section per the routing table above. If no section fits, add it to **Gotchas**. Do not create new top-level sections without user approval.
