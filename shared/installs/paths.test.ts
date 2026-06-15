import { describe, expect, it } from "vitest"

import { defaultInstallPath } from "./paths"

describe("defaultInstallPath", () => {
  it("maps skills to the claude skills dir", () => {
    expect(defaultInstallPath("skills", "my-skill")).toBe("~/.claude/skills/my-skill")
  })

  it("maps cli to the claude cli dir", () => {
    expect(defaultInstallPath("cli", "my-tool")).toBe("~/.claude/cli/my-tool")
  })

  it("maps plugins to the claude plugins dir", () => {
    expect(defaultInstallPath("plugins", "my-plugin")).toBe("~/.claude/plugins/my-plugin")
  })

  it("maps slash to a single command markdown file", () => {
    expect(defaultInstallPath("slash", "my-cmd")).toBe("~/.claude/commands/my-cmd.md")
  })

  it("maps mcp to the shared desktop config file (slug-independent path)", () => {
    expect(defaultInstallPath("mcp", "my-server")).toBe(
      "~/.claude/claude_desktop_config.json",
    )
  })
})
