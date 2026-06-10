# Remove TypeDoc Artifacts from Repo + CI Migration Design

## Overview

Remove tracked TypeDoc output from the repository. TypeDoc will be generated exclusively by the `typedoc-github-pages.yml` CI workflow on push to `master`, matching the pattern used in `@srhenry/type-utils`.

## Changes

| What                       | Detail                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `typedoc.json`             | Change `"out"` from `"docs"` to `"typedoc-site"`                                        |
| `.gitignore`               | Add `/typedoc-site`                                                                     |
| Delete from git            | All TypeDoc artifacts under `docs/` (assets/, classes/, variables/, \*.html)            |
| Keep in git                | `docs/superpowers/**` (specs, plans)                                                    |
| `typedoc-github-pages.yml` | Update artifact upload path from `./docs` to `./typedoc-site`                           |
| `package.json`             | No change needed — `yarn docs` runs `npx typedoc` which reads `out` from `typedoc.json` |

## What Stays in Git

- `docs/superpowers/**` — specs and plans
- `typedoc.json` — TypeDoc configuration
- `.github/workflows/typedoc-github-pages.yml` — CI workflow

## What Gets Removed from Git

~44 TypeDoc files (768K) — HTML, CSS, JS, PNGs under `docs/assets/`, `docs/classes/`, `docs/variables/`, and `docs/*.html`

## What Gets Gitignored

`/typedoc-site` — CI-generated output directory

## CI Flow

Push to `master` → workflow runs `yarn docs` → TypeDoc outputs to `typedoc-site/` → upload artifact → deploy to GitHub Pages

## Acceptance Criteria

- No TypeDoc artifacts tracked in git (except `docs/superpowers/`)
- `/typedoc-site` in `.gitignore`
- `yarn docs` generates output to `typedoc-site/`
- `typedoc-github-pages.yml` uploads from `./typedoc-site`
- GitHub Pages deployment still works after merge
