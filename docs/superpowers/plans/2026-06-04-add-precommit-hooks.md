# Pre-commit Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Husky + lint-staged pre-commit hooks that auto-fix lint/format on `.ts` files and check YAML/JSON formatting before commit.

**Architecture:** Husky manages the git hook lifecycle via `yarn prepare`. The `.husky/pre-commit` hook delegates entirely to `lint-staged`, which runs only on staged files. lint-staged config in `.lintstagedrc.json` defines per-pattern commands.

**Tech Stack:** Husky, lint-staged, Biome, Prettier

---

### Task 1: Install Husky + lint-staged

**Files:**

- Modify: `package.json`
- Modify: `yarn.lock`

- [ ] **Step 1: Install packages**

```sh
yarn add -D husky lint-staged
```

- [ ] **Step 2: Verify installation**

```sh
yarn ls --pattern husky && yarn ls --pattern lint-staged
```

Expected: both packages listed with versions

- [ ] **Step 3: Commit**

```sh
git add package.json yarn.lock
git commit -S -m "chore: install husky and lint-staged"
```

---

### Task 2: Configure Husky and add prepare script

**Files:**

- Modify: `package.json` (add `"prepare": "husky"` script)
- Create: `.husky/pre-commit`

- [ ] **Step 1: Add prepare script to package.json**

Add to the `"scripts"` object in `package.json`:

```json
"prepare": "husky"
```

- [ ] **Step 2: Initialize Husky**

```sh
yarn prepare
```

Expected: `.husky/` directory created with `_/` subdirectory containing Husky internals

- [ ] **Step 3: Create pre-commit hook**

```sh
echo 'npx lint-staged' > .husky/pre-commit
```

- [ ] **Step 4: Verify hook is executable**

```sh
cat .husky/pre-commit
```

Expected: file contains `npx lint-staged`

- [ ] **Step 5: Commit**

```sh
git add package.json .husky/
git commit -S -m "chore: add husky pre-commit hook with lint-staged"
```

---

### Task 3: Configure lint-staged

**Files:**

- Create: `.lintstagedrc.json`

- [ ] **Step 1: Create `.lintstagedrc.json`**

```json
{
    "src/**/*.ts": ["biome lint --write", "prettier --write"],
    "*.{yml,yaml,json}": ["prettier --check"]
}
```

- [ ] **Step 2: Validate JSON**

```sh
npx prettier --check .lintstagedrc.json
```

Expected: passes (valid JSON, Prettier-compliant formatting)

- [ ] **Step 3: Test lint-staged dry run**

```sh
npx lint-staged --diff HEAD --verbose
```

Expected: runs without errors (may report "no staged files matching patterns" which is fine)

- [ ] **Step 4: Commit**

```sh
git add .lintstagedrc.json
git commit -S -m "chore: add lint-staged config for pre-commit hooks"
```

---

### Task 4: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Verify full pipeline — typecheck + QA + test**

```sh
npx tsc --noEmit && yarn qa && yarn test
```

Expected: all pass (0 errors from QA, all tests green)

- [ ] **Step 2: Verify hook fires on commit**

Make a trivial change to a `.ts` file, stage it, and attempt to commit:

```sh
echo "// test" >> src/index.ts && git add src/index.ts && git commit -S -m "test: verify pre-commit hook fires"
```

Expected: commit succeeds, lint-staged output visible in console (Biome lint + Prettier run on `src/index.ts`)

- [ ] **Step 3: Clean up test commit**

```sh
git reset HEAD~1 && git checkout -- src/index.ts
```

- [ ] **Step 4: Verify `.husky/` is tracked correctly**

```sh
git status .husky/
```

Expected: `.husky/pre-commit` and `.husky/_/` are staged/tracked

---

### Task 5: Update AGENTS.md and TASKS.md

**Files:**

- Modify: `AGENTS.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Update AGENTS.md**

Add to the Build & Development Commands table:

```
| `yarn prepare` | Install Husky git hooks |
```

Add a new subsection under Code Conventions:

```
### Pre-commit hooks

- Husky + lint-staged runs on every commit
- `src/**/*.ts` → Biome lint --write + Prettier --write (auto-fix)
- `*.{yml,yaml,json}` → Prettier --check (blocks if malformed)
- Typecheck and test are NOT in the hook — deferred to CI
```

- [ ] **Step 2: Update TASKS.md**

Change the add-precommit-hooks task from `- [ ]` to `- [x]` and strikethrough its blockers:

```markdown
- [x] Add pre-commit hooks (Husky + lint-staged)
- **ID**: add-precommit-hooks
- **Blocked by**: ~~add-biome~~ (done), ~~add-vitest~~ (done)
```

- [ ] **Step 3: Validate formatting**

```sh
npx prettier --check AGENTS.md TASKS.md
```

- [ ] **Step 4: Commit**

```sh
git add AGENTS.md TASKS.md
git commit -S -m "docs: update AGENTS.md and TASKS.md for pre-commit hooks"
```
