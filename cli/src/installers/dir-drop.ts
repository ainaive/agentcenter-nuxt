import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";

import { resolveInside } from "./safe-paths";

// Shared folder-drop logic for the skills/cli/plugins (and mcp server) installers:
// they differ only in their base directory. `destDir` is the already-resolved,
// home-constrained install path.

// Drop an unzipped file map into destDir (cleared first). Each entry is guarded
// with resolveInside so a malicious zip can't escape destDir.
export async function writeFilesTo(
  destDir: string,
  files: Record<string, Uint8Array>,
): Promise<void> {
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  try {
    for (const [entryPath, content] of Object.entries(files)) {
      if (entryPath.endsWith("/")) continue; // skip directory entries
      const dest = resolveInside(destDir, entryPath);
      const parent = dirname(dest);
      if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
      await writeFile(dest, content);
    }
  } catch (err) {
    // Don't leave a half-written tree on disk; the next install starts clean.
    rmSync(destDir, { recursive: true, force: true });
    throw err;
  }
}

export function removeDir(destDir: string): boolean {
  if (!existsSync(destDir)) return false;
  rmSync(destDir, { recursive: true, force: true });
  return true;
}

export function listDirSlugs(baseDir: string): string[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir).filter((name: string) =>
    statSync(join(baseDir, name)).isDirectory(),
  );
}
