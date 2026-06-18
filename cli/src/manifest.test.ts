import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";

import { installBlockFor, parseManifest } from "./manifest";

function files(toml: string): Record<string, Uint8Array> {
  return { "manifest.toml": strToU8(toml) };
}

const TOML = `
[extension]
slug = "web-search-pro"
version = "1.2.0"
category = "skills"

[install.claude]
skills = "~/.claude/skills/{slug}"

[install.claude.postInstall]
message = "Set your key: agentcenter config set {slug}.apiKey <key>"
`;

describe("parseManifest", () => {
  it("parses the extension version + per-agent install block", () => {
    const m = parseManifest(files(TOML));
    expect(m?.version).toBe("1.2.0");
    expect(m?.install.claude?.skills).toBe("~/.claude/skills/{slug}");
    expect(m?.install.claude?.postInstall?.message).toContain("apiKey");
  });

  it("returns null when manifest.toml is absent", () => {
    expect(parseManifest({ "skill.md": strToU8("# x") })).toBeNull();
  });

  it("returns null on malformed TOML (never throws)", () => {
    expect(parseManifest(files("[unterminated"))).toBeNull();
  });

  it("tolerates a manifest with no [install] table", () => {
    const m = parseManifest(files(`[extension]\nslug = "x"\nversion = "1.0.0"\n`));
    expect(m?.install).toEqual({});
  });
});

describe("installBlockFor", () => {
  it("returns the active agent's block, or {} when missing", () => {
    const m = parseManifest(files(TOML));
    expect(installBlockFor(m, "claude").skills).toBe("~/.claude/skills/{slug}");
    expect(installBlockFor(m, "other")).toEqual({});
    expect(installBlockFor(null, "claude")).toEqual({});
  });
});
