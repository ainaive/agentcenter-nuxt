import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { unzipSync } from "fflate";

const SKILLS_DIR = join(homedir(), ".claude", "skills");

export async function installSkill(slug: string, zipBuffer: ArrayBuffer): Promise<string> {
  const destDir = join(SKILLS_DIR, slug);
  if (!existsSync(SKILLS_DIR)) mkdirSync(SKILLS_DIR, { recursive: true });
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  const files = unzipSync(new Uint8Array(zipBuffer));
  try {
    for (const [entryPath, content] of Object.entries(files)) {
      if (entryPath.endsWith("/")) continue; // skip directory entries
      const dest = join(destDir, entryPath);
      const parentDir = dirname(dest);
      if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
      await writeFile(dest, content);
    }
  } catch (err) {
    // Don't leave half-written skills on disk; the next install attempt will then
    // start from a clean slate instead of merging onto a corrupt tree.
    rmSync(destDir, { recursive: true, force: true });
    throw err;
  }

  return destDir;
}

export async function uninstallSkill(slug: string): Promise<boolean> {
  const destDir = join(SKILLS_DIR, slug);
  if (!existsSync(destDir)) return false;
  rmSync(destDir, { recursive: true, force: true });
  return true;
}

export function listInstalledSlugs(): string[] {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR).filter((name: string) =>
    statSync(join(SKILLS_DIR, name)).isDirectory()
  );
}
