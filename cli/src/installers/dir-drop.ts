import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "fs";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";

import { resolveInside } from "./safe-paths";

// Shared folder-drop logic for the skills/cli/plugins (and mcp server) installers:
// they differ only in their base directory. `destDir` is the already-resolved,
// home-constrained install path.

// Drop an unzipped file map into destDir. Staged into a sibling temp dir and
// swapped in atomically, so a mid-write failure (or a rejected traversal entry)
// leaves any existing install untouched rather than wiping it. Each entry is
// guarded with resolveInside so a malicious zip can't escape the staging dir.
export async function writeFilesTo(
  destDir: string,
  files: Record<string, Uint8Array>,
): Promise<void> {
  const parent = dirname(destDir);
  mkdirSync(parent, { recursive: true });
  const staging = mkdtempSync(join(parent, ".ac-stage-"));
  try {
    for (const [entryPath, content] of Object.entries(files)) {
      if (entryPath.endsWith("/")) continue; // skip directory entries
      const dest = resolveInside(staging, entryPath);
      const p = dirname(dest);
      if (!existsSync(p)) mkdirSync(p, { recursive: true });
      await writeFile(dest, content);
    }
  } catch (err) {
    // Discard the partial staging dir; the existing install is untouched.
    rmSync(staging, { recursive: true, force: true });
    throw err;
  }
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
  renameSync(staging, destDir);
}

export function removeDir(destDir: string): boolean {
  if (!existsSync(destDir)) return false;
  rmSync(destDir, { recursive: true, force: true });
  return true;
}

export function listDirSlugs(baseDir: string): string[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir).filter(
    (name: string) =>
      !name.startsWith(".") && statSync(join(baseDir, name)).isDirectory(),
  );
}
