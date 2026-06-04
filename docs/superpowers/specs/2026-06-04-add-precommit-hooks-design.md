# Pre-commit Hooks Design

## Overview

Add Husky + lint-staged to enforce code quality on every commit. Lightweight approach: lint and format only, typecheck and test deferred to CI.

## Packages

- `husky` — manages `.husky/` git hooks
- `lint-staged` — runs linters/formatters on staged files only

## Hook Flow

`.husky/pre-commit`:

```sh
lint-staged
```

## lint-staged Config

`.lintstagedrc.json`:

```json
{
    "src/**/*.ts": ["biome lint --write", "prettier --write"],
    "*.{yml,yaml,json}": ["prettier --check"]
}
```

### Behavior by file type

| File pattern        | Action                                    | Auto-fix?                               |
| ------------------- | ----------------------------------------- | --------------------------------------- |
| `src/**/*.ts`       | Biome lint --write, then Prettier --write | Yes — lint-staged re-stages fixed files |
| `*.{yml,yaml,json}` | Prettier --check                          | No — blocks commit if malformed         |

### Design decisions

- **No typecheck or test in hook** — deferred to CI for speed
- **Biome lint --write on .ts only** — Biome is configured for `./src`; config files are excluded
- **Prettier --check (not --write) on YAML/JSON** — these are indentation-sensitive; auto-fix could silently break CI workflows. Block and require manual fix instead
- **lint-staged handles re-staging** — auto-fixed `.ts` files are automatically re-staged by lint-staged

## package.json Changes

- Add `"prepare": "husky"` script
- Add `husky` + `lint-staged` to `devDependencies`

## Acceptance Criteria

- `yarn install` + `yarn prepare` sets up hooks
- Committing a `.ts` file with lint/format issues auto-fixes them and commits
- Committing a malformed `.yml`/`.json` blocks with a Prettier warning
- No typecheck or test runs in the hook
- `yarn test` still passes after setup
