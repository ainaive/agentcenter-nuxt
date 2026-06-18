import { homedir } from "os";
import { join } from "path";
import { unzipSync } from "fflate";

import { loadConfig } from "../config-store";
import { installBlockFor, parseManifest, type InstallBlock } from "../manifest";

import { listDirSlugs, removeDir, writeFilesTo } from "./dir-drop";
import {
  defaultMcpConfigPath,
  installMcp,
  listMcpSlugs,
  mcpServerDir,
  uninstallMcp,
} from "./mcp";
import {
  assertValidSlug,
  expandDest,
  expandTokens,
  safeHomePath,
  type ManifestVars,
} from "./safe-paths";
import { commandsDir, installSlash, listSlashSlugs, uninstallSlash } from "./slash";

export interface InstallResult {
  destDir: string;
  postInstall?: string;
}

export interface InstalledEntry {
  slug: string;
  category: string;
}

// Folder-drop categories: identical except the ~/.claude subdir + manifest key.
const DIR_CATEGORIES: Record<string, keyof InstallBlock> = {
  skills: "skills",
  cli: "cli",
  plugins: "plugins",
};

function claudeSubdir(sub: string): string {
  return join(homedir(), ".claude", sub);
}

// A manifest-provided destination wins (expanded + home-constrained); anything
// missing or unsafe falls back to the built-in category default.
function resolveDest(
  template: string | undefined,
  fallback: string,
  vars: ManifestVars,
): string {
  if (template) {
    try {
      return safeHomePath(expandDest(template, vars));
    } catch {
      // unsafe manifest path — fall back to the default
    }
  }
  return fallback;
}

export async function installExtension(
  slug: string,
  category: string,
  zipBuffer: ArrayBuffer,
): Promise<InstallResult> {
  assertValidSlug(slug);
  const files = unzipSync(new Uint8Array(zipBuffer));

  const { agent } = await loadConfig();
  const manifest = parseManifest(files);
  const block = installBlockFor(manifest, agent);
  const vars: ManifestVars = {
    slug,
    version: manifest?.version ?? "latest",
    agent,
  };
  const postInstall = block.postInstall?.message
    ? expandTokens(block.postInstall.message, vars)
    : undefined;

  const dirKey = DIR_CATEGORIES[category];
  if (dirKey) {
    const dest = resolveDest(
      block[dirKey] as string | undefined,
      join(claudeSubdir(category), slug),
      vars,
    );
    await writeFilesTo(dest, files);
    return { destDir: dest, postInstall };
  }

  if (category === "slash") {
    const dest = resolveDest(block.commands, join(commandsDir(), `${slug}.md`), vars);
    return { destDir: await installSlash(slug, files, dest), postInstall };
  }

  if (category === "mcp") {
    const configPath = resolveDest(block.mcpConfig, defaultMcpConfigPath(), vars);
    const key = block.mcpKey ? expandTokens(block.mcpKey, vars) : slug;
    const dest = await installMcp(slug, files, {
      serverDir: join(mcpServerDir(), slug),
      configPath,
      key,
    });
    return { destDir: dest, postInstall };
  }

  // Unknown category — safe skills-style directory drop.
  const dest = join(claudeSubdir("skills"), slug);
  await writeFilesTo(dest, files);
  return { destDir: dest, postInstall };
}

// Registry-independent uninstall: try every known location and remove wherever
// the slug is found. Returns the categories it removed from.
export function uninstallExtension(slug: string): string[] {
  assertValidSlug(slug);
  const removed: string[] = [];
  for (const cat of Object.keys(DIR_CATEGORIES)) {
    if (removeDir(join(claudeSubdir(cat), slug))) removed.push(cat);
  }
  if (uninstallSlash(slug)) removed.push("slash");
  if (uninstallMcp(slug)) removed.push("mcp");
  return removed;
}

export function listInstalled(): InstalledEntry[] {
  const out: InstalledEntry[] = [];
  for (const cat of Object.keys(DIR_CATEGORIES)) {
    for (const slug of listDirSlugs(claudeSubdir(cat))) {
      out.push({ slug, category: cat });
    }
  }
  for (const slug of listSlashSlugs()) out.push({ slug, category: "slash" });
  for (const slug of listMcpSlugs()) out.push({ slug, category: "mcp" });
  return out;
}
