# TypeDoc CI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tracked TypeDoc artifacts from the repo, generate them exclusively via CI on push to master.

**Architecture:** TypeDoc output moves from `docs/` to `typedoc-site/`. The `docs/superpowers/` directory (specs, plans) stays in git. The CI workflow uploads from `./typedoc-site` instead of `./docs`. All TypeDoc HTML/CSS/JS/PNG artifacts are deleted from git and the new output directory is gitignored.

**Tech Stack:** TypeDoc, GitHub Actions, GitHub Pages

---

### Task 1: Update typedoc.json output directory

**Files:**

- Modify: `typedoc.json`

- [ ] **Step 1: Change the `"out"` value**

Change `"out": "docs"` to `"out": "typedoc-site"` in `typedoc.json`:

```json
{
    "entryPoints": ["src/index.ts"],
    "out": "typedoc-site",
    "entryPointStrategy": "expand",
    "excludePrivate": true,
    "excludeProtected": true,
    "excludeInternal": true,
    "pretty": true,
    "name": "Storage Manager",
    "readme": "README.md"
}
```

- [ ] **Step 2: Validate JSON**

```sh
npx prettier --check typedoc.json
```

Expected: passes

- [ ] **Step 3: Test TypeDoc output**

```sh
yarn docs
```

Expected: TypeDoc generates output to `typedoc-site/` directory (not `docs/`)

- [ ] **Step 4: Verify output location**

```sh
ls typedoc-site/index.html
```

Expected: file exists

- [ ] **Step 5: Commit**

```sh
git add typedoc.json
git commit -S -m "chore: change TypeDoc output directory to typedoc-site"
```

---

### Task 2: Update .gitignore and remove tracked TypeDoc artifacts

**Files:**

- Modify: `.gitignore`
- Delete: `docs/assets/`, `docs/classes/`, `docs/variables/`, `docs/*.html`

- [ ] **Step 1: Add `/typedoc-site` to `.gitignore`**

Append to `.gitignore`:

```
/typedoc-site
```

- [ ] **Step 2: Remove all tracked TypeDoc artifacts from git (but keep docs/superpowers/)**

```sh
git rm -r docs/assets/ docs/classes/ docs/variables/ docs/*.html
```

Expected: all TypeDoc HTML, CSS, JS, PNGs removed from tracking

- [ ] **Step 3: Verify docs/superpowers/ still exists**

```sh
ls docs/superpowers/specs/ docs/superpowers/plans/
```

Expected: both directories present with their files

- [ ] **Step 4: Verify no stale TypeDoc files remain tracked**

```sh
git ls-files docs/ | grep -v superpowers
```

Expected: no output (all TypeDoc artifacts untracked)

- [ ] **Step 5: Commit**

```sh
git add .gitignore
git commit -S -m "chore: remove tracked TypeDoc artifacts, gitignore typedoc-site"
```

---

### Task 3: Update CI workflow to upload from typedoc-site

**Files:**

- Modify: `.github/workflows/typedoc-github-pages.yml`

- [ ] **Step 1: Update the artifact upload path**

In `.github/workflows/typedoc-github-pages.yml`, change the `upload-pages-artifact` path from `./docs` to `./typedoc-site`:

Change:

```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v5
  with:
      path: ./docs
```

To:

```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v5
  with:
      path: ./typedoc-site
```

- [ ] **Step 2: Validate YAML**

```sh
npx prettier --check .github/workflows/typedoc-github-pages.yml
```

Expected: passes

- [ ] **Step 3: Commit**

```sh
git add .github/workflows/typedoc-github-pages.yml
git commit -S -m "ci: update typedoc workflow to upload from typedoc-site"
```

---

### Task 4: Update AGENTS.md

**Files:**

- Modify: `AGENTS.md`

- [ ] **Step 1: Update the docs command description**

In the Build & Development Commands table, update the `yarn docs` row to reflect the new output directory. Change the description from "Generate TypeDoc to \`docs/\`" to "Generate TypeDoc to \`typedoc-site/\`".

- [ ] **Step 2: Validate formatting**

```sh
npx prettier --check AGENTS.md
```

- [ ] **Step 3: Commit**

```sh
git add AGENTS.md
git commit -S -m "docs: update AGENTS.md TypeDoc output path"
```

---

### Task 5: Verify full pipeline

**Files:** None (verification only)

- [ ] **Step 1: Verify typecheck + QA + test**

```sh
npx tsc --noEmit && yarn qa && yarn test
```

Expected: all pass

- [ ] **Step 2: Verify TypeDoc generates to correct location**

```sh
yarn docs && ls typedoc-site/index.html
```

Expected: `typedoc-site/index.html` exists

- [ ] **Step 3: Verify typedoc-site is gitignored**

```sh
git status typedoc-site/
```

Expected: not listed (ignored by `.gitignore`)

- [ ] **Step 4: Verify docs/superpowers/ is still tracked**

```sh
git ls-files docs/superpowers/
```

Expected: lists spec and plan files

- [ ] **Step 5: Clean up local typedoc-site**

```sh
rm -rf typedoc-site/
```
