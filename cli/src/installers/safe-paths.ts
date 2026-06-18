import { homedir } from "os";
import { isAbsolute, resolve, sep } from "path";

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

export interface ManifestVars {
  slug: string;
  version: string;
  agent: string;
}

// Substitute the manifest tokens ({slug}/{version}/{agent}) in any string —
// used for both destination templates and the postInstall message.
export function expandTokens(template: string, vars: ManifestVars): string {
  return template
    .replaceAll("{slug}", vars.slug)
    .replaceAll("{version}", vars.version)
    .replaceAll("{agent}", vars.agent);
}

// Expand a manifest `[install.<agent>]` destination template: the manifest
// tokens and a leading `~` for the home directory.
export function expandDest(template: string, vars: ManifestVars): string {
  const expanded = expandTokens(template, vars);
  if (expanded === "~") return homedir();
  if (expanded.startsWith("~/") || expanded.startsWith("~\\")) {
    return resolve(homedir(), expanded.slice(2));
  }
  return expanded;
}

// Assert an install destination stays within the user's home directory.
// Manifest-provided paths are untrusted, so anything resolving outside `~`
// (absolute escapes, `../` traversal) is rejected; callers fall back to the
// built-in category default. Returns the absolute path.
export function safeHomePath(p: string): string {
  const home = homedir();
  const abs = isAbsolute(p) ? resolve(p) : resolve(home, p);
  if (abs !== home && !abs.startsWith(home + sep)) {
    throw new Error(`Install path escapes home directory: ${p}`);
  }
  return abs;
}
