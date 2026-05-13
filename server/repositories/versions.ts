import { and, desc, eq, inArray, sql } from "drizzle-orm"

import { extensions, extensionVersions, files } from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `extension_versions` table accessor. Same conventions as
// `extensions.ts` — Drizzle imports stay scoped to this file.

export type VersionStatus = "pending" | "scanning" | "ready" | "rejected"

export interface VersionWithScopeRow {
  status: VersionStatus
  extensionId: string
  scope: "personal" | "org" | "enterprise"
}

// Used by the scan-result orchestrator: it needs both the version's current
// status (to verify it's in `scanning`) and the parent extension's scope (to
// decide whether to auto-publish).
export async function findByIdWithScope(
  db: Transactable,
  versionId: string,
): Promise<VersionWithScopeRow | null> {
  const [row] = await db
    .select({
      status: extensionVersions.status,
      extensionId: extensionVersions.extensionId,
      scope: extensions.scope,
    })
    .from(extensionVersions)
    .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
    .where(eq(extensionVersions.id, versionId))
    .limit(1)
  return row ?? null
}

export interface VersionRow {
  id: string
  extensionId: string
  version: string
  status: VersionStatus
  publishedAt: Date | null
  createdAt: Date
  changelog: string | null
  bundleFileId: string | null
}

export async function findById(
  db: Transactable,
  versionId: string,
): Promise<{ id: string; extensionId: string; status: VersionStatus } | null> {
  const [row] = await db
    .select({
      id: extensionVersions.id,
      extensionId: extensionVersions.extensionId,
      status: extensionVersions.status,
    })
    .from(extensionVersions)
    .where(eq(extensionVersions.id, versionId))
    .limit(1)
  return row ?? null
}

// Detail-page version history: id, version, changelog, status, publishedAt.
export async function listForExtension(db: Transactable, extensionId: string) {
  return db
    .select({
      id: extensionVersions.id,
      version: extensionVersions.version,
      changelog: extensionVersions.changelog,
      status: extensionVersions.status,
      publishedAt: extensionVersions.publishedAt,
    })
    .from(extensionVersions)
    .where(eq(extensionVersions.extensionId, extensionId))
    .orderBy(sql`${extensionVersions.publishedAt} DESC NULLS LAST`)
}

export interface VersionCandidate {
  version: string
  publishedAt: Date | null
  createdAt: Date
}

// Used by install: returns published-ready versions ordered newest-first.
// The ordering matches what `pickInstallVersion` (commit 8) expects.
export async function listLatestReadyForExtension(
  db: Transactable,
  extensionId: string,
): Promise<VersionCandidate[]> {
  return db
    .select({
      version: extensionVersions.version,
      publishedAt: extensionVersions.publishedAt,
      createdAt: extensionVersions.createdAt,
    })
    .from(extensionVersions)
    .where(
      and(
        eq(extensionVersions.extensionId, extensionId),
        eq(extensionVersions.status, "ready"),
      ),
    )
    .orderBy(
      sql`${extensionVersions.publishedAt} DESC NULLS LAST`,
      desc(extensionVersions.createdAt),
    )
}

export interface ReadyBundleRow {
  r2Key: string
}

// Used by the public bundle redirect: joins extension → version → file in
// one query and returns the latest ready bundle's storage key.
export async function findLatestReadyBundleBySlug(
  db: Transactable,
  slug: string,
): Promise<ReadyBundleRow | null> {
  const [row] = await db
    .select({ r2Key: files.r2Key })
    .from(extensionVersions)
    .innerJoin(files, eq(files.id, extensionVersions.bundleFileId))
    .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
    .where(
      and(eq(extensions.slug, slug), eq(extensionVersions.status, "ready")),
    )
    .orderBy(
      sql`${extensionVersions.publishedAt} DESC NULLS LAST`,
      desc(extensionVersions.createdAt),
    )
    .limit(1)
  return row ?? null
}

export interface VersionStatusUpdate {
  status: VersionStatus
  publishedAt?: Date | null
}

export async function updateStatus(
  db: Transactable,
  versionId: string,
  payload: VersionStatusUpdate,
): Promise<void> {
  await db
    .update(extensionVersions)
    .set(payload)
    .where(eq(extensionVersions.id, versionId))
}

// Atomic guarded transition for `submit` — only updates rows whose current
// status is in the `from` list. Returns whether a row was changed so the
// caller can map "no row" to its domain error.
export async function updateStatusGuarded(
  db: Transactable,
  versionId: string,
  spec: { from: VersionStatus[]; to: VersionStatus },
): Promise<{ updated: boolean }> {
  const rows = await db
    .update(extensionVersions)
    .set({ status: spec.to })
    .where(
      and(
        eq(extensionVersions.id, versionId),
        inArray(extensionVersions.status, spec.from),
      ),
    )
    .returning({ id: extensionVersions.id })
  return { updated: rows.length > 0 }
}
