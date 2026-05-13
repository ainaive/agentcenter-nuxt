# Accessibility memo — items needing design input

Carried over from the Next.js sweep and refreshed for the Nuxt rewrite. The
fixes that didn't need design input are already applied: i18n on hardcoded
ARIA labels and filter copy, `aria-expanded` / `aria-pressed` / `role="group"`
across toggleable widgets, `role="search"` and an `aria-label` on the topbar
search input, a skip-to-content link, and converting the sidebar's
"Installed / Saved" rows from focusable buttons-that-do-nothing into
non-interactive placeholders.

What follows is the punch-list that needs a product or design call before
code moves.

## Status after the Nuxt rewrite

The original sweep (Next.js PR #16) was against `@base-ui/react` primitives.
The Nuxt rewrite uses **reka-ui** through the shadcn-vue primitives that
landed in P15. Reka-ui's primitives ship many of the keyboard / focus /
ARIA guarantees that needed manual work in the Next.js codebase. The items
below are the ones that **still** need a call regardless of which primitive
library backs them.

A fresh re-scan against the Vue components is overdue — the codebase has
turned over heavily. Treat this as a starting point, not a confirmed list.

## 1. UserButton popover semantics

`app/components/layout/UserButton.vue` is a hand-rolled popover. Migrate it
to the shadcn-vue `Popover` primitives (reka-ui's PopoverRoot /
PopoverTrigger / PopoverContent are already wired in `app/components/ui/`)
so we get `aria-haspopup`, `Esc` to close with focus restore, and arrow-key
navigation for free.

This is a straight swap, ~30 LOC. Open product question: do we also want a
`Settings` link in the menu (now that `/profile` exists)? Currently the
only item is `Sign out`.

## 2. Color contrast on `text-(--color-ink-muted)`

`--color-ink-muted: oklch(48% 0.015 60)` against the ivory `--color-bg` of
`oklch(98.5%)` lands around **3.5 : 1**. WCAG AA requires **4.5 : 1** for
body text and **3 : 1** for large/UI text. We use the muted ink on plenty
of small body text (sidebar counts at `[11px]`, card descriptions at
`[12.5px]`, metadata rows in the About card, hint copy in empty states).

Likely failing surfaces:

- Sidebar function-cat / L1 / L2 counts (`[11px]`)
- ExtCard descriptions and tag chips (`[12.5px] / [11px]`)
- ExtAboutCard metadata rows
- Empty-state hint paragraphs
- Profile section list captions

Two options:

- **A — Darken `--color-ink-muted`** to ~`oklch(40% ...)` so current usages
  clear AA. Will affect the "soft / editorial" feel.
- **B — Reserve the muted token for ≥ 14 px text**, define a darker
  caption token for smaller text. More plumbing.

Needs a designer eye.

## 3. Global `focus-visible` ring

Inconsistent today: shadcn-vue primitives generally include
`focus-visible:ring-2 focus-visible:ring-(--color-accent)/40`, but several
hand-rolled buttons across `filters/`, `extension/`, and `profile/` declare
`outline-none` with no replacement, or use ad-hoc ring styles.

Suggested fix: a single rule in `app/assets/css/tailwind.css`:

```css
:where(button, a, input, select, textarea, [role="button"]):focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

Then audit individual `outline-none` declarations to see which still need a
custom override. ~Half a day's work but the visual fingerprint is
project-wide.

## 4. Parked follow-ups

- **Sidebar "Installed" / "Saved" rows** are still non-interactive
  placeholders with hardcoded `0` counts. The `/profile` page (P18) now
  has the real data; wire the sidebar through `useFetch('/api/internal/profile/me')`
  for live counts.
- **Top-bar `Docs` link** is a non-interactive placeholder. Decide where
  docs live — external URL, an MDX route, or a redirect to the existing
  `docs/` md files rendered server-side — then re-enable.

## 5. Mobile a11y not covered

Touch targets, swipe gestures, screen-reader pass on iOS / Android — out of
scope for the static sweep. Worth a separate session with a real device
once the responsive layout settles.

## 6. Wizard a11y is new

The 4-step publish wizard (P17) hasn't been through an a11y pass. Open
questions:

- Are the step-rail numbers announced correctly? `aria-current="step"` is
  not set today.
- Drag-drop zone in WizardBundle needs a keyboard-equivalent (the
  click-to-pick path works, but the drop zone should announce as
  "drop a .zip here or click to choose").
- Live preview should be `aria-live="polite"` so changes to the listing
  card / manifest are announced as you type — currently silent.
