import type { ExtensionCategory } from "../types"

/**
 * Per-category default install destination, shown in the web "Install" surface
 * (the conversational prompt and the direct-download steps).
 *
 * These mirror the CLI's hard-coded installers
 * (`cli/src/installers/{skills,cli}.ts`) and `docs/manifest-spec.md`.
 * Manifest-driven per-agent paths are a future feature; until then these are
 * the canonical defaults. The CLI is a separate, self-contained binary so it
 * keeps its own copy (the same way `cli/src/installers/safe-paths.ts`
 * duplicates the slug regex) — keep the two in sync when manifest-driven
 * routing lands.
 *
 * `mcp` is special: it registers a server entry keyed by slug inside a shared
 * config file rather than dropping a folder, so the returned path is the
 * config file and the slug-keyed nuance is carried by the surrounding copy.
 */
export function defaultInstallPath(category: ExtensionCategory, slug: string): string {
  switch (category) {
    case "skills":
      return `~/.claude/skills/${slug}`
    case "cli":
      return `~/.claude/cli/${slug}`
    case "plugins":
      return `~/.claude/plugins/${slug}`
    case "slash":
      return `~/.claude/commands/${slug}.md`
    case "mcp":
      return "~/.claude/claude_desktop_config.json"
  }
}
