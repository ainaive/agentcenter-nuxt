import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { strToU8 } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installMcp } from "./mcp";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ac-mcp-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function files(parts: Record<string, string>): Record<string, Uint8Array> {
  const o: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(parts)) o[k] = strToU8(v);
  return o;
}

describe("installMcp", () => {
  it("merges into an existing config, preserves other entries, writes a .bak", async () => {
    const configPath = join(dir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: { other: { command: "node", args: ["o.js"] } },
        theme: "dark",
      }),
    );
    const serverDir = join(dir, "srv");

    await installMcp("gh", files({ "server.js": "//" }), {
      serverDir,
      configPath,
      key: "gh",
    });

    const cfg = JSON.parse(readFileSync(configPath, "utf8"));
    expect(cfg.mcpServers.other).toBeDefined(); // preserved
    expect(cfg.theme).toBe("dark"); // preserved
    expect(cfg.mcpServers.gh.command).toBe("node");
    expect(cfg.mcpServers.gh.args[0]).toBe(join(serverDir, "server.js"));
    expect(existsSync(`${configPath}.bak`)).toBe(true);
  });

  it("detects a python entry point", async () => {
    const configPath = join(dir, "config.json");
    await installMcp("py", files({ "server.py": "#" }), {
      serverDir: join(dir, "srv"),
      configPath,
      key: "py",
    });
    expect(JSON.parse(readFileSync(configPath, "utf8")).mcpServers.py.command).toBe(
      "python3",
    );
  });

  it("places files but skips the config when the command can't be detected", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const configPath = join(dir, "config.json");
    const serverDir = join(dir, "srv");

    const result = await installMcp("mystery", files({ "thing.bin": "x" }), {
      serverDir,
      configPath,
      key: "mystery",
    });

    expect(result).toBe(serverDir);
    expect(existsSync(join(serverDir, "thing.bin"))).toBe(true);
    expect(existsSync(configPath)).toBe(false); // never touched the config
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
