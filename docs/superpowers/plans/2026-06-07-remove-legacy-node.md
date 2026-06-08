# remove-legacy-node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead Node < 10.12.0 and < 12.10.0 code paths, remove the `semver` dependency, and clean up stale pre-dual-build compiled artifacts from the repo root.

**Architecture:** Straightforward deletion — both legacy branches are unreachable given `engines.node >= 22`. After removing the semver import and the two conditional branches, the `semver` and `@types/semver` packages are no longer needed. Stale root artifacts are untracked files that can be deleted from disk.

**Tech Stack:** TypeScript, Node.js fs, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/StorageManager.ts` | Modify | Remove semver import, remove legacy branches in `mkdir` and `deleteFromStorage` |
| `package.json` | Modify | Remove `semver` from dependencies, `@types/semver` from devDependencies |
| `yarn.lock` | Modify | Updated automatically by `yarn install` |
| `DirectoryList.js` | Delete | Stale pre-dual-build compiled output |
| `DirectoryList.d.ts` | Delete | Stale pre-dual-build compiled output |
| `StorageManager.js` | Delete | Stale pre-dual-build compiled output |
| `StorageManager.d.ts` | Delete | Stale pre-dual-build compiled output |
| `index.js` | Delete | Stale pre-dual-build compiled output |
| `index.d.ts` | Delete | Stale pre-dual-build compiled output |
| `utils.js` | Delete | Stale pre-dual-build compiled output |
| `utils.d.ts` | Delete | Stale pre-dual-build compiled output |

---

### Task 1: Remove semver import and legacy mkdir branch

**Files:**
- Modify: `src/StorageManager.ts:1-10` (imports), `src/StorageManager.ts:804-838` (mkdir method)

- [ ] **Step 1: Remove `import { lt } from 'semver'`**

In `src/StorageManager.ts`, remove line 6:

```diff
- import { lt } from 'semver'
```

- [ ] **Step 2: Simplify `mkdir` — remove the legacy Node < 10.12.0 branch**

Replace the `StorageManager.exists(path).then(...)` body in `mkdir` (lines 818–836) to remove the semver check and legacy fallback:

```diff
  StorageManager.exists(path).then(exists => {
    if (exists) return preHandler(null, path)
-   if (lt(process.versions.node, '10.12.0')) {
-     return path.split('/').map((v, i, arr) =>
-       fs.mkdir(
-         StorageManager.path.join(String(path.split(v)[0]), v),
-         options,
-         (err: NodeJS.ErrnoException | null) => {
-           if (arr.length - 1 > i) {
-             if (err && err.code !== 'EEXIST') {
-               console.error(err)
-               preHandler(err)
-             }
-           } else preHandler(err)
-         }
-       )
-     )
-   } else return fs.mkdir(path, options, preHandler)
+   return fs.mkdir(path, options, preHandler)
  })
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

- [ ] **Step 4: Run tests**

Run: `yarn test`
Expected: 47 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/StorageManager.ts
git commit -S -m "refactor(mkdir): remove legacy Node < 10.12.0 code path"
```

---

### Task 2: Remove legacy deleteFromStorage branch

**Files:**
- Modify: `src/StorageManager.ts:846-883` (deleteFromStorage method)

- [ ] **Step 1: Simplify `deleteFromStorage` — remove the legacy Node < 12.10.0 branch**

Remove the semver check and the manual recursive delete fallback, keeping only the `fs.rm` path:

```diff
  else if (metadata.isDirectory()) {
-   if (lt(process.versions.node, '12.10.0 ')) {
-     const dir = await StorageManager.listDirectory(filePath, true)
-
-     const files = Array.from(dir).filter(
-       (file): file is string => typeof file === 'string'
-     )
-
-     const innerDirs = Array.from(dir).filter(
-       (file): file is DirectoryList => file instanceof DirectoryList
-     )
-
-     for (const file of files) await StorageManager.deleteFromStorage(file)
-     for (const { name } of innerDirs) await StorageManager.deleteFromStorage(name)
-
-     return new Promise<void>((resolve, reject) => {
-       fs.rmdir(filePath, callback ?? (err => (err ? reject(err) : resolve())))
-     })
-   } else {
-     return new Promise<void>((resolve, reject) => {
-       fs.rm(
-         filePath,
-         { recursive: true, force: true },
-         callback ?? (err => (err ? reject(err) : resolve()))
-       )
-     })
-   }
+   return new Promise<void>((resolve, reject) => {
+     fs.rm(
+       filePath,
+       { recursive: true, force: true },
+       callback ?? (err => (err ? reject(err) : resolve()))
+     )
+   })
  }
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `yarn test`
Expected: 47 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/StorageManager.ts
git commit -S -m "refactor(delete): remove legacy Node < 12.10.0 code path"
```

---

### Task 3: Remove semver dependency

**Files:**
- Modify: `package.json` (dependencies and devDependencies)
- Modify: `yarn.lock` (updated by `yarn install`)

- [ ] **Step 1: Remove `semver` and `@types/semver` from `package.json`**

In `package.json`, remove from `dependencies`:

```diff
  "dependencies": {
-   "semver": "^7.8.1"
  },
```

Remove from `devDependencies`:

```diff
- "@types/semver": "^7.7.1",
```

If `dependencies` is now empty, replace with `"dependencies": {}`.

- [ ] **Step 2: Run `yarn install` to update lockfile**

Run: `yarn install`
Expected: Success, semver and @types/semver removed from `yarn.lock`

- [ ] **Step 3: Verify no remaining semver references**

Run: `grep -r "semver" src/`
Expected: No output (no references to semver remain)

- [ ] **Step 4: Run full QA + tests**

Run: `yarn qa && yarn test`
Expected: typecheck passes, lint passes (39 warnings pre-existing), format passes, 47 tests pass

- [ ] **Step 5: Run build**

Run: `yarn build`
Expected: ESM + CJS builds succeed, `fix-esm-imports.mjs` runs clean

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock
git commit -S -m "chore(deps): remove semver and @types/semver"
```

---

### Task 4: Delete stale pre-dual-build compiled artifacts

**Files:**
- Delete: `DirectoryList.js`, `DirectoryList.d.ts`, `StorageManager.js`, `StorageManager.d.ts`, `index.js`, `index.d.ts`, `utils.js`, `utils.d.ts`

These are untracked files (not in git) — they are stale compiled output from before the dual-build system. No `git rm` needed, just delete from disk.

- [ ] **Step 1: Delete the stale root artifacts**

```bash
rm DirectoryList.js DirectoryList.d.ts StorageManager.js StorageManager.d.ts index.js index.d.ts utils.js utils.d.ts
```

- [ ] **Step 2: Verify files are gone**

Run: `ls *.js *.d.ts 2>&1`
Expected: "No such file or directory" (or similar — no matches)

- [ ] **Step 3: Verify build still works**

Run: `yarn build && yarn test`
Expected: Build succeeds, 47 tests pass

- [ ] **Step 4: Add root `*.js` and `*.d.ts` to `.gitignore`**

Prevent future stale artifacts from accumulating:

```diff
  /coverage
+ /*.js
+ /*.d.ts
```

- [ ] **Step 5: Validate `.gitignore` with Prettier**

Run: `npx prettier --check .gitignore`
Expected: PASS (`.gitignore` is not a Prettier-supported file, so this may skip — if it fails format check, use `npx prettier --write .gitignore` or skip since gitignore is not in the format glob)

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git commit -S -m "chore: gitignore root *.js and *.d.ts to prevent stale build artifacts"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full QA**

Run: `yarn qa`
Expected: typecheck + lint + format all pass

- [ ] **Step 2: Run build + tests**

Run: `yarn build && yarn test`
Expected: Build succeeds, 47 tests pass

- [ ] **Step 3: Verify semver fully removed from direct dependencies**

Run: `grep -E '"semver"' package.json`
Expected: No output (semver not in dependencies or devDependencies)

Run: `grep -r "semver" src/`
Expected: No output (no semver imports in source)

- [ ] **Step 4: Verify no stale root artifacts**

Run: `ls *.js *.d.ts 2>&1`
Expected: No matches
