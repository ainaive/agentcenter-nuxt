import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installExtension, listInstalled, uninstallExtension } from "./index";

let home: string;
const prevHome = process.env.HOME;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "ac-cli-"));
  process.env.HOME = home;
});

afterEach(() => {
  if (prevHome === undefined) delete process.env.HOME;
  else process.env.HOME = prevHome;
  rmSync(home, { recursive: true, force: true });
});

function bundle(parts: Record<string, string>): ArrayBuffer {
  const files: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(parts)) files[k] = strToU8(v);
  const z = zipSync(files);
  return z.buffer.slice(z.byteOffset, z.byteOffset + z.byteLength) as ArrayBuffer;
}

function manifest(category: string, install: string): string {
  return `[extension]\nslug="x"\nversion="1.0.0"\ncategory="${category}"\n\n[install.claude]\n${install}\n`;
}

const claude = (...p: string[]) => join(home, ".claude", ...p);

describe("installExtension — folder-drop categories", () => {
  for (const [category, sub] of [
    ["skills", "skills"],
    ["cli", "cli"],
    ["plugins", "plugins"],
  ] as const) {
    it(`${category} drops the bundle into ~/.claude/${sub}/{slug}`, async () => {
      const buf = bundle({
        "manifest.toml": manifest(category, `${sub} = "~/.claude/${sub}/{slug}"`),
        "content.txt": "hello",
      });
      const { destDir } = await installExtension("demo", category, buf);
      expect(destDir).toBe(claude(sub, "demo"));
      expect(readFileSync(join(destDir, "content.txt"), "utf8")).toBe("hello");
    });
  }
});

describe("installExtension — slash", () => {
  it("writes the command markdown to ~/.claude/commands/{slug}.md", async () => {
    const buf = bundle({
      "manifest.toml": manifest("slash", `commands = "~/.claude/commands/{slug}.md"`),
      "demo.md": "# /demo",
      "README.md": "readme",
    });
    const { destDir } = await installExtension("demo", "slash", buf);
    expect(destDir).toBe(claude("commands", "demo.md"));
    expect(readFileSync(destDir, "utf8")).toBe("# /demo");
  });
});

describe("installExtension — mcp", () => {
  it("extracts the server and registers an mcpServers entry", async () => {
    const buf = bundle({
      "manifest.toml": manifest(
        "mcp",
        `mcpConfig = "~/.claude/claude_desktop_config.json"\nmcpKey = "{slug}"`,
      ),
      "server.js": "// server",
    });
    const { destDir } = await installExtension("gh", "mcp", buf);
    expect(destDir).toBe(claude("mcp", "gh"));
    expect(existsSync(join(destDir, "server.js"))).toBe(true);

    const config = JSON.parse(readFileSync(claude("claude_desktop_config.json"), "utf8"));
    expect(config.mcpServers.gh.command).toBe("node");
    expect(config.mcpServers.gh.args[0]).toBe(join(destDir, "server.js"));
  });
});

describe("installExtension — postInstall", () => {
  it("returns the expanded postInstall message", async () => {
    const buf = bundle({
      "manifest.toml":
        manifest("skills", `skills = "~/.claude/skills/{slug}"`) +
        `\n[install.claude.postInstall]\nmessage = "configure {slug}"\n`,
      "skill.md": "x",
    });
    const { postInstall } = await installExtension("demo", "skills", buf);
    expect(postInstall).toBe("configure demo");
  });
});

describe("uninstallExtension + listInstalled", () => {
  it("lists installs across categories and removes wherever found", async () => {
    await installExtension(
      "askill",
      "skills",
      bundle({ "manifest.toml": manifest("skills", ""), "s.md": "x" }),
    );
    await installExtension(
      "ampc",
      "mcp",
      bundle({ "manifest.toml": manifest("mcp", `mcpKey = "{slug}"`), "server.js": "x" }),
    );

    const listed = listInstalled().map((e) => `${e.category}:${e.slug}`).sort();
    expect(listed).toContain("skills:askill");
    expect(listed).toContain("mcp:ampc");

    expect(uninstallExtension("askill")).toEqual(["skills"]);
    expect(uninstallExtension("ampc")).toEqual(["mcp"]);
    // mcp entry removed from the config
    const config = JSON.parse(readFileSync(claude("claude_desktop_config.json"), "utf8"));
    expect(config.mcpServers.ampc).toBeUndefined();
    // gone now
    expect(uninstallExtension("askill")).toEqual([]);
  });
});
