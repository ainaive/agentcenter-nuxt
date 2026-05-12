# Contributing

## Workflow

All changes go through a feature branch and a pull request. There is no direct-to-`main` work.

```bash
git checkout main && git pull
git checkout -b <type>/<short-name>     # see "Branch names" below

# ... make your changes ...

bun run validate                        # lint + typecheck + tests, mirrors CI
git push -u origin HEAD
gh pr create                            # or open via the GitHub UI
```

### Branch names

Use a short type prefix matching the kind of work, then a hyphenated name:

- `feat/<name>` — new feature
- `fix/<name>` — bug fix
- `refactor/<name>` — refactor without behaviour change
- `test/<name>` — test-only changes
- `docs/<name>` — documentation only
- `chore/<name>` — tooling, dependency bumps, configuration

The `<name>` should describe the area, not the ticket — e.g. `fix/sidebar-i18n`, not `fix/issue-42`.

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). **One commit per step** — finer than "one per feature." Tests usually ship with their code in the same commit. Full rules and tooling layout in [`docs/plan.md` §13](./docs/plan.md#13-commit--pr-rules); the summary below is enough for normal contributors.

```text
<type>(<scope>): <one-line summary, lowercase, no trailing period>

<optional body — wraps at 72 chars. Why, not what.
Reference incidents or invariants the diff doesn't show.>

<optional footer — BREAKING CHANGE, Closes #N, …>
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `revert`, `style`.

**Scopes**:
- During v1: phase scope `p<N>-<short>` matching `docs/plan.md` §10. Example: `feat(p3-browse): ExtCard component + test`.
- Hotfixes during v1 and post-v1 work: feature scope (short noun for area). Example: `fix(filter-bar): preserve dept on locale switch`.

**Step granularity** — calibration:

| Right | Wrong |
|---|---|
| `chore(p0): install @nuxt/eslint and base config` | `feat: rename variable in ext-card.vue` (too small) |
| `feat(p2-db): add extension drizzle schema` | `feat(p3-browse): browse page` (too big, 8 files) |
| `feat(p3-browse): ExtCard component + test` | |
| `feat(p3-browse): wire ExtCard into home grid` | |

Always split: schema vs. application code, refactor vs. feature, generated code vs. source, dep install vs. first use.

**Per-commit vs. per-PR gates**:
- Per commit: compiles + `bun run typecheck` passes.
- Per PR head: full `bun run validate` (lint + typecheck + test + coverage). Coverage is a PR-boundary property.

**Breaking the `/api/v1` contract**: requires `!` after the scope and a `BREAKING CHANGE:` footer. CI's contract test fails without them. Example: `feat(p7-api)!: bundle endpoint returns 410 for archived versions`.

**Hooks** (auto-installed via `husky`):
- `commit-msg` runs `commitlint` — rejects non-conventional messages.
- `pre-commit` runs `lint-staged` — ESLint on staged files only; fast.
- `pre-push` runs `bun run validate` — full lint + typecheck + test before sharing.

**Hard rules**:
- No `--amend` once pushed.
- No `--force` / `--force-with-lease`.
- No `--no-verify`. If a hook is wrong, fix the hook in its own commit.
- No squash-and-amend dance to clean up a PR. PRs merge with their commit history intact.

**Merge strategy**: PRs land as merge commits — not squashed, not rebased. Per-step history is preserved on `main`. Address reviewer changes with new commits on the PR branch, not force-pushes.

If you need to undo work after pushing, prefer a corrective commit (or `revert`) over rewriting history.

### Pull requests

The PR title should be a Conventional Commit summary. The body should cover:

- **Summary** — what changed, in 1–3 bullets
- **Test plan** — what you ran locally / what reviewers should verify

For non-trivial changes, also include:

- **Why** — motivation, constraints, or what bug/incident this addresses
- **Tradeoffs** — alternatives you considered and why this one won

CI runs on every push to a PR (`.github/workflows/ci.yml` — lint, typecheck, vitest). Address review findings before merging.

### Local validation

Run `bun run validate` before pushing. It chains four steps in the same order CI runs them, failing fast:

```bash
bun run prepare     # nuxi prepare — generates .nuxt/types/* (needed for typecheck)
bun run lint        # @nuxt/eslint
bun run typecheck   # nuxi typecheck (vue-tsc)
bun run test        # vitest run
```

`nuxi prepare` must run before `typecheck` so `vue-tsc` can resolve auto-imported symbols (`useFetch`, `useAsyncData`, components, composables). CI runs it after `bun install`. If you see `vue-tsc` errors about missing types right after a fresh checkout, run `bun run prepare`.

E2E tests (`bun run test:e2e`) require a live dev server with a seeded database — run them locally on demand, not on every PR. They run nightly in CI via `.github/workflows/e2e.yml`.

For the full rationale and locked tooling decisions, see [`docs/plan.md`](./docs/plan.md#11-validate-pipeline).

## Project conventions

### Locked decisions

A handful of product/architecture decisions are locked for v1 and shouldn't be revisited inside a normal PR. They're listed in [`CLAUDE.md`](./CLAUDE.md#locked-product-decisions). If a PR needs to change one, update `CLAUDE.md` and `docs/plan.md` in the same commit as the code change.

### Tests live next to the code

- `shared/**/*.test.ts`, `server/**/*.test.ts`, `cli/**/*.test.ts` — unit tests, colocated with their source
- `app/components/**/*.test.ts` — component tests, colocated, run via `@nuxt/test-utils` + happy-dom
- `tests/e2e/**/*.spec.ts` — Playwright E2E

When you add code under `shared/`, `server/`, `app/components/`, or `cli/`, add or update its colocated test file. The Vitest glob picks them up automatically.

### Style

- TypeScript strict — no `any` unless there's a specific reason and a comment.
- Prefer editing existing files over creating new ones.
- No comments unless the *why* is non-obvious. Don't explain what the code does — name things well instead.
- Match the project's terse, factual voice in code, commits, and PR descriptions. No marketing language.
- Components are Single File Components (`.vue`) with `<script setup lang="ts">`. PascalCase filenames (`ExtCard.vue`); auto-imported by Nuxt.
- Use `useFetch` / `useAsyncData` for SSR-friendly data; `$fetch` from event handlers and mutations.
- Keep server logic in `server/`; keep schema, validators, search, and types in `shared/` so both sides can import them.

### Coverage & layering (CI-enforced)

These rules are enforced in CI, not "would be nice." Read [`docs/plan.md`](./docs/plan.md#12-coverage--maintainability) for the full thresholds.

- **`shared/**` code must ship with tests at ≥ 95% line coverage.** This is the highest-leverage code in the repo; reviewers reject PRs that ship without.
- **A PR cannot drop file-level coverage by more than 3 points.** If you refactor a function, keep its tests or add new ones.
- **Layer boundaries**: `app/` does not import from `server/` (use `$fetch`). `server/` does not import from `app/`. `shared/` imports from neither. Enforced by `no-restricted-imports` in `eslint.config.mjs`.
- **No barrel files** (`index.ts` re-export aggregations). Single exception: `shared/db/schema/index.ts` for the Drizzle namespace. Import from source.
- **No DB mocks.** If you'd reach for one, push the logic into `shared/` and unit-test the pure function instead; let Playwright cover integration.

Run `bun run test:coverage` locally before pushing — it produces an HTML report at `coverage/index.html` so you can see exactly which lines are uncovered.

## Getting help

- Architecture and phase plan: [`docs/plan.md`](./docs/plan.md)
- Project rules (also followed by AI agents): [`CLAUDE.md`](./CLAUDE.md)
