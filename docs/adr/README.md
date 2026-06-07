# Architecture Decision Records

This directory holds the project's ADRs — short, immutable records that
capture *why* a load-bearing architectural choice was made and what
trade-offs were considered. They complement the moment-in-time decisions
already locked in `CLAUDE.md` (binding constraints) and `docs/plan.md`
(milestone state) by preserving the *reasoning* in a form that survives
the next refactor.

## When to write one

Write an ADR when:

- A choice will be expensive to reverse (schema shape, public contract
  preservation, auth model).
- The choice has plausible alternatives that a future contributor will
  reasonably wonder about — "why did they pick X over Y?".
- The choice introduces a new pattern other code will follow.

Skip an ADR for:

- One-off bug fixes, even big ones.
- Routine port / scaffolding work that follows existing patterns.
- Style choices already covered by lint rules or `CLAUDE.md` decisions.

## File naming

`NNNN-kebab-case-title.md`, four-digit zero-padded. Increment from the
highest existing number; never reuse a number. The title in the file
header matches the slug: `# ADR-NNNN: Title in title case`.

## Format

Each ADR carries four sections in this order:

```
## Status

One of: Proposed | Accepted | Superseded by NNNN | Deprecated.

## Context

What problem were we trying to solve, what constraints were binding,
and what alternatives were considered? Be concrete.

## Decision

What we chose, with just enough detail that someone reading it
can recognize the choice in the code.

## Consequences

What we gave up, what we made easier, and what follows from this.
Future ADRs that touch the same area should link here.
```

Don't add other sections. The format is intentionally cramped — long
ADRs go unread.

## Status lifecycle

- A new ADR ships in `Proposed` if it's debating an open choice.
- Once the choice is final (typically when the implementing PR merges),
  flip Status to `Accepted` and the date in the body.
- If a later ADR overrides an earlier one, the earlier ADR's Status
  becomes `Superseded by NNNN`; never delete the file.
- If the decision is reversed without a replacement, mark it
  `Deprecated` with a one-line reason at the top of the Status section.
