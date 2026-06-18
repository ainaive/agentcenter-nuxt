import { parse } from "smol-toml";

// A single agent's `[install.<agent>]` block from manifest.toml. Keys vary by
// category (skills/cli/plugins/commands are destination templates; mcp uses
// mcpConfig + mcpKey). `postInstall.message` is shown after a successful
// install. All fields optional — the installer falls back to category defaults.
export interface InstallBlock {
  skills?: string;
  cli?: string;
  plugins?: string;
  commands?: string;
  mcpConfig?: string;
  mcpKey?: string;
  postInstall?: { message?: string };
}

export interface ParsedManifest {
  version?: string;
  install: Record<string, InstallBlock>; // keyed by agent name, e.g. "claude"
}

// Parse the bundle's manifest.toml out of an already-unzipped file map.
// Returns null (never throws) when the manifest is missing or malformed —
// the installer then uses built-in category defaults.
export function parseManifest(
  files: Record<string, Uint8Array>,
): ParsedManifest | null {
  const entry = files["manifest.toml"];
  if (!entry) return null;

  let raw: unknown;
  try {
    raw = parse(new TextDecoder().decode(entry));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;

  const r = raw as Record<string, unknown>;
  const ext = (r.extension ?? {}) as Record<string, unknown>;
  const install =
    r.install && typeof r.install === "object"
      ? (r.install as Record<string, InstallBlock>)
      : {};

  return {
    version: typeof ext.version === "string" ? ext.version : undefined,
    install,
  };
}

// The active agent's install block + its postInstall message.
export function installBlockFor(
  manifest: ParsedManifest | null,
  agent: string,
): InstallBlock {
  return manifest?.install?.[agent] ?? {};
}
