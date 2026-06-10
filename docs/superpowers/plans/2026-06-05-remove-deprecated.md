# Remove Deprecated Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the seven legacy public methods marked `@deprecated` in `StorageManager`, fix the internal `mkdir` → `checkExist` coupling, and clean up `src/index.ts` re-exports — all in one atomic change with no version bump (batched into the future 2.0.0 release).

**Architecture:** Pure deletion + one minimal internal refactor. No new public API. No new tests required (existing `mkdir` and `exists` tests cover the only behavior change). Public API shrinks by exactly seven methods.

**Tech Stack:** TypeScript (strict), Biome (lint), Prettier (format), Vitest (test), Husky + lint-staged (pre-commit).

---

## File Structure

Files touched in this plan:

| File                                 | Change                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `src/StorageManager.ts` (1108 lines) | Delete lines 803–1105 (~303 lines: 7 deprecated methods + JSDoc). Rewrite `mkdir` body to use `exists` (line 880). |
| `src/index.ts` (46 lines)            | Remove 7 destructured names + `//deprecated:` comment block (~8 lines).                                            |

No new files. No test changes (existing tests cover `mkdir` and `exists`).

---

## Task 1: Setup worktree and verify baseline

**Files:**

- Worktree: `/tmp/storage-manager-remove-deprecated`
- Branch: `refactor/remove-deprecated-methods` (off `origin/developer`)

- [ ] **Step 1: Create the ephemeral worktree + branch from the main repo checkout**

```bash
git -C /home/srhenry/Projects/SrHenry/storage-manager worktree add /tmp/storage-manager-remove-deprecated -b refactor/remove-deprecated-methods origin/developer
```

Expected: prints "Preparing worktree (detached HEAD …)" then "HEAD is now at …". New worktree directory exists.

- [ ] **Step 2: Install dependencies in the worktree**

```bash
yarn install
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: completes without errors; `node_modules/` and `.yarn/cache/` (if present) populated.

- [ ] **Step 3: Verify baseline build, typecheck, and tests pass before any changes**

```bash
yarn build && npx tsc --noEmit && yarn test
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: `yarn build` exits 0 (produces `index.js`, `index.d.ts` etc. at root), `npx tsc --noEmit` exits 0 with no output, `yarn test` shows all tests passing.

- [ ] **Step 4: Verify the deprecated methods are present in baseline**

```bash
rg "checkExist|writeFileStream|writeStorage|readFileStream|readStorage|getFileContents|openFileOrDirectory" /tmp/storage-manager-remove-deprecated/src/
```

Expected: matches in `src/StorageManager.ts` and `src/index.ts` (baseline state — confirms the refactor targets exist).

---

## Task 2: Refactor `mkdir` to use `exists` instead of `checkExist`

**Files:**

- Modify: `src/StorageManager.ts:880-900` (the `checkExist` call site inside `mkdir`)

- [ ] **Step 1: Replace the `checkExist` call with `exists`**

In `src/StorageManager.ts`, replace the block from line 880 to line 900 inclusive:

```ts
StorageManager.checkExist(path).then(
    async () => preHandler(null, path),
    async () => {
        if (lt(process.versions.node, '10.12.0')) {
            return path.split('/').map((v, i, arr) =>
                fs.mkdir(
                    this.path.join(String(path.split(v)[0]), v),
                    options,
                    (err: NodeJS.ErrnoException | null) => {
                        if (arr.length - 1 > i) {
                            if (err && err.code !== 'EEXIST') {
                                console.error(err)
                                preHandler(err)
                            }
                        } else preHandler(err)
                    }
                )
            )
        } else return fs.mkdir(path, options, preHandler)
    }
)
```

with:

```ts
StorageManager.exists(path).then(exists => {
    if (exists) return preHandler(null, path)
    if (lt(process.versions.node, '10.12.0')) {
        return path.split('/').map((v, i, arr) =>
            fs.mkdir(
                this.path.join(String(path.split(v)[0]), v),
                options,
                (err: NodeJS.ErrnoException | null) => {
                    if (arr.length - 1 > i) {
                        if (err && err.code !== 'EEXIST') {
                            console.error(err)
                            preHandler(err)
                        }
                    } else preHandler(err)
                }
            )
        )
    } else return fs.mkdir(path, options, preHandler)
})
```

Notes:

- `exists` returns `Promise<boolean>`, takes one handler with the boolean. We keep the legacy `< 10.12.0` branch for now — `remove-legacy-node` is a separate task.
- The behavior is equivalent: if path exists → `preHandler(null, path)`; if not → attempt `fs.mkdir`.

- [ ] **Step 2: Run the mkdir test to verify behavior is preserved**

```bash
yarn test src/__tests__/directory.spec.ts
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: all directory tests pass (covers `mkdir` for both existing and non-existing paths).

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: exits 0, no output.

- [ ] **Step 4: Verify `checkExist` still appears (we haven't deleted it yet — just stopped calling it internally)**

```bash
rg "checkExist" /tmp/storage-manager-remove-deprecated/src/
```

Expected: matches only at the `checkExist` method definition itself (no calls). If matches inside `mkdir` appear, the edit in Step 1 didn't apply correctly — revert and reapply.

---

## Task 3: Delete the seven deprecated methods from `StorageManager.ts`

**Files:**

- Modify: `src/StorageManager.ts` — delete lines 803 through 1105 inclusive

- [ ] **Step 1: Delete the deprecated block**

In `src/StorageManager.ts`, delete the entire block from line 803 (the `/**` JSDoc opening for `checkExist`) through line 1105 (the closing `}` of `openFileOrDirectory`). The remaining `}` on line 1106 (class close) and `export default StorageManager` on line 1108 must stay.

After deletion, the tail of the file should look exactly like:

```ts
    }
}

export default StorageManager
```

Two closing braces (one for the last surviving method, one for the class) followed by the default export. Use your editor's line-range delete or a tool that preserves trailing newline.

Verify by reading lines 798–808 of the post-edit file — you should see the `listDirectory` method close, then a blank line, then the class close and export.

- [ ] **Step 2: Run build and typecheck**

```bash
yarn build && npx tsc --noEmit
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: both exit 0. The build will fail loudly if you accidentally removed the class-closing brace.

- [ ] **Step 3: Run full test suite**

```bash
yarn test
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: all tests pass. No test references the deleted methods (verified in design phase).

---

## Task 4: Clean up `src/index.ts` destructure

**Files:**

- Modify: `src/index.ts` (lines 32–43)

- [ ] **Step 1: Remove the 7 deprecated names and the `//deprecated:` comment block**

In `src/index.ts`, the destructure currently has two duplicate `delete` keys (lines 32 and 33) — a pre-existing bug, not introduced by this task. Leave those alone. Replace the block from line 34 (`deleteFromStorage,`) through line 43 (`openFileOrDirectory,`) with a single line `} = StorageManager`-on-the-previous-line setup, OR simply remove the 7 deprecated names and the comment, keeping the rest intact.

Final shape of the destructure should be exactly:

```ts
export const {
    constants,
    path,

    put,
    putStreamed,
    append,
    appendStreamed,
    get,
    getAsBuffer,
    getAsBuffers,
    getAsJSON,
    rename,
    move,
    copy,
    readStream,
    writeStream,
    fileStream,
    stream,
    exists,
    doesntExist,
    stats,
    isFile,
    isDirectory,
    listDirectory,
    mkdir,
    delete: unlink,
    delete: Delete,
    deleteFromStorage,
} = StorageManager
```

So: delete line 36 (the blank line), the `//deprecated:` comment (line 37), and the seven destructured names (lines 38–44 — `checkExist,` through `openFileOrDirectory,`). The closing `} = StorageManager` stays on what is now line 35.

- [ ] **Step 2: Run build, typecheck, and tests**

```bash
yarn build && npx tsc --noEmit && yarn test
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: all three pass. Typecheck ensures no other internal module imports any of the removed names.

---

## Task 5: Full verification gate

**Files:** none modified — pure verification.

- [ ] **Step 1: Confirm zero references to removed methods remain in `src/`**

```bash
rg "checkExist|writeFileStream|writeStorage|readFileStream|readStorage|getFileContents|openFileOrDirectory" /tmp/storage-manager-remove-deprecated/src/
```

Expected: zero matches. If any match appears, locate the file and line, then remove the reference (it should not exist per the design's internal-coupling analysis — investigate any match as a regression).

- [ ] **Step 2: Run linter and formatter check**

```bash
yarn qa
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: exits 0. Biome lint passes; Prettier check passes. If Prettier complains about formatting, run `yarn qa:fix` and re-verify, then re-run `yarn qa` to confirm clean.

- [ ] **Step 3: Final full run — build + typecheck + test + qa, all in sequence**

```bash
yarn build && npx tsc --noEmit && yarn test && yarn qa
```

Run in workdir: `/tmp/storage-manager-remove-deprecated`

Expected: all four pass cleanly. This is the gate before commit.

---

## Task 6: Commit, push, and create the PR

**Files:** `src/StorageManager.ts`, `src/index.ts` (both modified)

- [ ] **Step 1: Review the diff**

```bash
git -C /tmp/storage-manager-remove-deprecated diff --stat
git -C /tmp/storage-manager-remove-deprecated diff src/StorageManager.ts src/index.ts
```

Expected: `src/StorageManager.ts` shows ~310 lines removed, ~3 lines added (the mkdir body rewrite). `src/index.ts` shows ~8 lines removed. No unintended changes.

- [ ] **Step 2: Stage and commit (GPG-signed)**

```bash
git -C /tmp/storage-manager-remove-deprecated add src/StorageManager.ts src/index.ts
git -C /tmp/storage-manager-remove-deprecated commit -S -m "refactor(StorageManager): remove deprecated methods, prepare for 2.0.0" -m "Removes the seven legacy public methods marked @deprecated in JSDoc:
- checkExist (use exists)
- writeStorage (use put/putStreamed/append/appendStreamed)
- writeFileStream (use writeStream)
- readStorage (use readStream)
- getFileContents (use getAsBuffers)
- readFileStream (use readStream)
- openFileOrDirectory (use stats)
Also rewrites the internal mkdir early-exists check to use exists
instead of the about-to-be-removed checkExist. No version bump; batched
into the upcoming 2.0.0 release alongside other breaking changes."
```

Expected: commit succeeds with GPG signature (GPG: G in `git log --format='%G?' -1`).

- [ ] **Step 3: Push to all remotes and create the PR**

```bash
cd /tmp/storage-manager-remove-deprecated
for remote in $(git remote); do git push -u "$remote" refactor/remove-deprecated-methods || echo "WARNING: push to $remote failed"; done
gh pr create --base developer --title "refactor(StorageManager): remove deprecated methods, prepare for 2.0.0" --body "$(cat <<'EOF'
## Summary
- Removes the seven legacy public methods marked \`@deprecated\` in JSDoc
- Rewrites the internal \`mkdir\` early-exists check to use \`exists\` instead of the about-to-be-removed \`checkExist\`
- Cleans up the matching destructure in \`src/index.ts\`

## Breaking change
This is a public API removal. Consumers using any of the removed methods will get TypeScript errors and runtime failures. The methods have been marked \`@deprecated\` for a long time with documented modern replacements. No version bump in this PR — batched into the upcoming 2.0.0 release alongside other breaking changes.

## Removed methods
| Method              | Replacement                                            |
| ------------------- | ------------------------------------------------------ |
| \`checkExist\`        | \`exists\`                                               |
| \`writeStorage\`      | \`put\` / \`putStreamed\` / \`append\` / \`appendStreamed\`   |
| \`writeFileStream\`   | \`writeStream\`                                          |
| \`readStorage\`       | \`readStream\` (uses unsafe \`Stream.pipe\`)               |
| \`getFileContents\`   | \`getAsBuffers\`                                         |
| \`readFileStream\`    | \`readStream\` (uses unsafe \`Stream.pipe\`)               |
| \`openFileOrDirectory\` | \`stats\`                                               |

## Test plan
- \`yarn build\` passes
- \`npx tsc --noEmit\` passes
- \`yarn test\` passes (existing \`mkdir\` and \`exists\` smoke tests cover the only behavior change)
- \`yarn qa\` passes (Biome lint + Prettier check)
- \`rg\` for the 7 removed names in \`src/\` returns zero matches

Closes the \`remove-deprecated\` item in \`TASKS.md\`.
EOF
)"
```

Expected: branch pushed to all remotes (warnings on failures are non-fatal); PR URL printed by `gh pr create`. If `gh` auth fails, ask the user to authenticate.

---

## Self-Review Notes

- **Spec coverage:** All three scope items from the design spec (delete methods, fix mkdir, clean up index.ts) are covered in Tasks 2–4. Verification (Task 5) and PR (Task 6) close the loop.
- **Placeholder scan:** No "TBD", "add validation", "similar to Task N" — every code step shows the exact code.
- **Type consistency:** `StorageManager.exists(path)` matches the signature defined in the existing source (returns `Promise<boolean>`). `mkdir` body shape preserved. `preHandler` signature unchanged.
- **TDD note:** This is a refactor of well-tested public API. The existing `directory.spec.ts` (covers `mkdir`) and `exists.spec.ts` (covers `exists`) act as the regression net. Task 1 establishes a green baseline, Task 5 enforces a green gate at the end.
