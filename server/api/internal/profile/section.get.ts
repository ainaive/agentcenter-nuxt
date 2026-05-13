import {
  getActivityForUser,
  getDraftsForUser,
  getInstalledForUser,
  getPublishedForUser,
  getSavedForUser,
} from "~~/server/utils/queries/profile"
import type {
  ProfileActivityEvent,
  ProfileDraftRow,
  ProfileInstalledRow,
  ProfilePublishedRow,
  ProfileSavedRow,
} from "~~/shared/types"

export type SectionKey = "installed" | "published" | "drafts" | "saved" | "activity"

const KEYS: ReadonlySet<SectionKey> = new Set(["installed", "published", "drafts", "saved", "activity"])

export type SectionResponse =
  | { section: "installed"; rows: ProfileInstalledRow[] }
  | { section: "published"; rows: ProfilePublishedRow[] }
  | { section: "drafts"; rows: ProfileDraftRow[] }
  | { section: "saved"; rows: ProfileSavedRow[] }
  | { section: "activity"; rows: ProfileActivityEvent[] }

// Map Date fields to ISO strings so the endpoint's return type matches what
// crosses the wire. JSON serialization would convert these anyway, but typing
// them as Date and serializing them as string is a footgun that hides
// type/runtime drift.
export default defineEventHandler(async (event): Promise<SectionResponse> => {
  const session = await requireUser(event)
  const raw = getQuery(event).section
  const section = typeof raw === "string" ? raw : "installed"
  if (!KEYS.has(section as SectionKey)) {
    throw createError({ statusCode: 400, statusMessage: "unknown_section" })
  }

  switch (section as SectionKey) {
    case "installed": {
      const rows = await getInstalledForUser(session.id)
      return {
        section: "installed",
        rows: rows.map((r) => ({ ...r, installedAt: r.installedAt.toISOString() })),
      }
    }
    case "published":
      // No Date fields on this row.
      return { section: "published", rows: await getPublishedForUser(session.id) }
    case "drafts": {
      const rows = await getDraftsForUser(session.id)
      return {
        section: "drafts",
        rows: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
      }
    }
    case "saved": {
      const rows = await getSavedForUser(session.id)
      return {
        section: "saved",
        rows: rows.map((r) => ({ ...r, savedAt: r.savedAt.toISOString() })),
      }
    }
    case "activity": {
      const rows = await getActivityForUser(session.id)
      return {
        section: "activity",
        rows: rows.map((r) => ({ ...r, at: r.at.toISOString() }) as ProfileActivityEvent),
      }
    }
  }
})
