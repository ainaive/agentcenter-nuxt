import { resolve, sep } from "path";

// Mirrors shared/validators/manifest.ts SLUG_PATTERN. Duplicated here to
// keep the CLI binary self-contained (no cross-package imports into the
// Nuxt app). If the canonical pattern changes, update both.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid slug: ${JSON.stringify(slug)}`);
  }
}

// Resolve `unsafePath` against `baseDir` and assert the result stays inside
// `baseDir`. Defends against zip entries like `../../etc/passwd` and absolute
// paths slipped past `join()`.
export function resolveInside(baseDir: string, unsafePath: string): string {
  const resolved = resolve(baseDir, unsafePath);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + sep)) {
    throw new Error(`Path escapes install root: ${unsafePath}`);
  }
  return resolved;
}
