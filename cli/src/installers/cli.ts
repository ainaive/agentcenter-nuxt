import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { unzipSync } from "fflate";

import { assertValidSlug, resolveInside } from "./safe-paths";

const CLI_DIR = join(homedir(), ".claude", "cli");

export async function installCli(slug: string, zipBuffer: ArrayBuffer): Promise<string> {
  assertValidSlug(slug);
  const destDir = resolveInside(CLI_DIR, slug);
  if (!existsSync(CLI_DIR)) mkdirSync(CLI_DIR, { recursive: true });
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  const files = unzipSync(new Uint8Array(zipBuffer));
  try {
    for (const [entryPath, content] of Object.entries(files)) {
      if (entryPath.endsWith("/")) continue; // skip directory entries
      const dest = resolveInside(destDir, entryPath);
      const parentDir = dirname(dest);
      if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
      await writeFile(dest, content);
    }
  } catch (err) {
    rmSync(destDir, { recursive: true, force: true });
    throw err;
  }

  return destDir;
}

export async function uninstallCli(slug: string): Promise<boolean> {
  assertValidSlug(slug);
  const destDir = resolveInside(CLI_DIR, slug);
  if (!existsSync(destDir)) return false;
  rmSync(destDir, { recursive: true, force: true });
  return true;
}

export function listInstalledCliSlugs(): string[] {
  if (!existsSync(CLI_DIR)) return [];
  return readdirSync(CLI_DIR).filter((name: string) =>
    statSync(join(CLI_DIR, name)).isDirectory()
  );
}
