import {
  getActivityForUser,
  getDraftsForUser,
  getInstalledForUser,
  getPublishedForUser,
  getSavedForUser,
  type ProfileActivityEvent,
  type ProfileDraftRow,
  type ProfileInstalledRow,
  type ProfilePublishedRow,
  type ProfileSavedRow,
} from "~~/server/utils/queries/profile"

export type SectionKey = "installed" | "published" | "drafts" | "saved" | "activity"

const KEYS: ReadonlySet<SectionKey> = new Set(["installed", "published", "drafts", "saved", "activity"])

export type SectionResponse =
  | { section: "installed"; rows: ProfileInstalledRow[] }
  | { section: "published"; rows: ProfilePublishedRow[] }
  | { section: "drafts"; rows: ProfileDraftRow[] }
  | { section: "saved"; rows: ProfileSavedRow[] }
  | { section: "activity"; rows: ProfileActivityEvent[] }

export default defineEventHandler(async (event): Promise<SectionResponse> => {
  const session = await requireUser(event)
  const raw = getQuery(event).section
  const section = typeof raw === "string" ? raw : "installed"
  if (!KEYS.has(section as SectionKey)) {
    throw createError({ statusCode: 400, statusMessage: "unknown_section" })
  }

  switch (section as SectionKey) {
    case "installed":
      return { section: "installed", rows: await getInstalledForUser(session.id) }
    case "published":
      return { section: "published", rows: await getPublishedForUser(session.id) }
    case "drafts":
      return { section: "drafts", rows: await getDraftsForUser(session.id) }
    case "saved":
      return { section: "saved", rows: await getSavedForUser(session.id) }
    case "activity":
      return { section: "activity", rows: await getActivityForUser(session.id) }
  }
})
