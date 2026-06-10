# ADR-0002: CLI as a fifth extension type

## Status

Accepted — 2026-06-10 (shipped via PR #52 on branch
`feat/cli-extension-type`).

## Context

The product needed a fifth `extension_category` value to cover
publisher-uploaded CLI tools (executables, npm/uv packages, or
combinations) — a shape that didn't sit cleanly inside the four
existing categories (`skills`, `mcp`, `slash`, `plugins`). The
shape of the change was open along four axes, each with plausible
alternatives:

1. **What is a "CLI extension," semantically?** It could be an
   executable installed onto `PATH`, a Claude-invokable tool living
   under `~/.claude/cli/{slug}`, or an npm/uv package the AgentCenter
   CLI installs on the user's behalf. Each carries a different
   install model and a different blast radius.
2. **How does it differ from `plugins`?** Claude Code plugins already
   ship bundled scripts and binaries. The distinction needed to be
   sharp enough that publishers don't have to guess which category
   their work belongs in.
3. **Is widening the `category` enum on the frozen `/api/v1`
   contract a breaking change?** Older CLI binaries that
   strict-validate the enum will reject `cli` rows; lenient clients
   will simply skip unknown values.
4. **Should the same PR also harden the installer's path-traversal
   defense?** The new `cli.ts` installer was a verbatim copy of
   `skills.ts`, which has a pre-existing path-traversal bug visible
   to anyone reading the new file. Fixing only the new copy would
   leave the original vulnerable while still satisfying the review
   bot.

## Decision

Four locked decisions, taken together:

1. **Payload is a directory drop into `~/.claude/cli/{slug}` —
   PATH wiring stays the user's job.** The installer extracts the
   uploaded zip into that directory and stops; whether the
   contents are a single binary, an npm project requiring
   `npm install`, or a Python package requiring `uv tool install`
   is for the publisher to spell out via
   `[install.<agent>.postInstall].message`. The marketplace does
   not silently add things to `PATH` (blast-radius concern) and
   does not run package managers on the user's machine (trust
   concern). Users who want a PATH shortcut symlink it themselves
   once.

2. **The `cli` category sits alongside `plugins`, not under it.**
   `plugins` is "Claude Code plugin bundles" (which Claude loads
   automatically); `cli` is "user-invoked tooling" (which the user
   runs directly from a shell). Same bundle shape, different
   destination, different runtime — distinct enough that the
   filter rail and the per-category landing pages stay legible.

3. **Enum widening is additive, not a `/api/v1` break.** The
   `category` enum gains `cli` via `ALTER TYPE … ADD VALUE`; no
   existing field shape changes. The companion CLI binary must
   ship in lockstep so users can actually install `cli` rows, but
   the API itself is forward-compatible. Conventional Commits
   reflect this — no `!` marker, no `BREAKING CHANGE:` footer.

4. **The path-traversal hardening lands on both installers in the
   same PR.** Slug validation and `resolveInside()` were extracted
   into `cli/src/installers/safe-paths.ts` and wired through both
   `skills.ts` and the new `cli.ts`. Fixing only the new file
   would have left the pre-existing skills installer vulnerable;
   fixing both keeps the two paths consistent so the next person
   copying the installer pattern can't accidentally drop the
   guard.

## Consequences

What this makes easier:

- Adding a sixth or seventh extension type follows the same
  template documented here: widen the enum (one migration),
  update every type-level single source of truth, add an
  installer with the right destination, drop catalog seeds, add
  i18n labels. The fanout is mechanical because the surface area
  is now exactly the surface area I had to touch this round.
- Publishers who ship a CLI tool have an obvious home for it
  instead of stuffing a binary into a `plugins` bundle and hoping
  Claude doesn't try to load it as a plugin manifest.
- Both installers now refuse zip entries that try to escape their
  install root, so the worst a malicious bundle can do is
  overwrite its own slug's directory — not someone else's
  skill, plugin, or `~/.ssh/`.

What we gave up:

- The `ExtensionCategory` enum is now duplicated in **eleven**
  places (one canonical type + one Drizzle pgEnum + four
  validator z.enums + five local component duplicates). The PR
  flagged this as tech debt; a follow-up should consolidate into
  a single shared const that the validators import. Crossing the
  shared/server/app/cli boundary makes the consolidation a
  separate ADR-worthy change rather than something to bolt on
  here.
- The catalog seed (`shared/data/catalog.ts`) now carries 32 CLI
  entries that have to be maintained as editorial content. The
  alternative — letting publishers populate the category — would
  have left a freshly-deployed Vercel environment with an empty
  `/cli` listing and an empty CLI tab in `/admin/approvals`. The
  editorial guard in `shared/data/catalog.test.ts` (lower bound
  on entries spread across subCats) protects the commitment.
- A user who wants their CLI tool on `PATH` has to run a one-line
  `ln -s` after install. We chose "explicit and inert" over
  "convenient and surprising"; making the default convenient
  would have required either touching shell rc files, dropping
  a wrapper into a system-managed `bin/`, or a privilege model
  the marketplace doesn't have.

## Notes

- The `subCat` default for `cli` is `tools/cli` (see
  `server/utils/publish.ts:defaultClassification`). This puts
  uncategorized CLI submissions into a sensible bucket on the
  taxonomy filter rail; publishers can override during publish.
- The full implementation plan and per-commit split is preserved
  at `/Users/hutusi/.claude/plans/i-am-thinking-of-merry-locket.md`
  for the duration of this branch.
