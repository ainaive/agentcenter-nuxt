import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";

import { assertValidSlug } from "./safe-paths";

// Slash commands install as a single markdown file ~/.claude/commands/{slug}.md.

export function commandsDir(): string {
  return join(homedir(), ".claude", "commands");
}

// Write the command markdown to destFile (resolved by the dispatcher). Picks
// `{slug}.md` from the bundle, else the lone non-README `.md`.
export async function installSlash(
  slug: string,
  files: Record<string, Uint8Array>,
  destFile: string,
): Promise<string> {
  assertValidSlug(slug);
  const content = pickCommandFile(slug, files);
  if (!content) {
    throw new Error(`No command markdown found in the bundle for "${slug}".`);
  }
  mkdirSync(dirname(destFile), { recursive: true });
  await writeFile(destFile, content);
  return destFile;
}

function pickCommandFile(
  slug: string,
  files: Record<string, Uint8Array>,
): Uint8Array | null {
  if (files[`${slug}.md`]) return files[`${slug}.md`];
  const md = Object.entries(files).filter(
    ([p]) => p.endsWith(".md") && p !== "README.md",
  );
  return md[0]?.[1] ?? null;
}

export function uninstallSlash(slug: string): boolean {
  assertValidSlug(slug);
  const file = join(commandsDir(), `${slug}.md`);
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}

export function listSlashSlugs(): string[] {
  const dir = commandsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n: string) => n.endsWith(".md"))
    .map((n: string) => n.slice(0, -3));
}
