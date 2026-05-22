import { z } from "zod"

// Input schemas for the collections feature. Mirrors the lightweight,
// constant-led style used in `profile.ts` so the API handlers can call
// `.parse(raw)` directly and the UI can import the same `_MAX` constants for
// inline character counters.
export const COLLECTION_NAME_MIN = 1
export const COLLECTION_NAME_MAX = 100
export const COLLECTION_DESC_MAX = 500

export const CollectionVisibility = z.enum(["private", "public"])
export type CollectionVisibility = z.infer<typeof CollectionVisibility>

export const CreateCollectionInput = z.object({
  name: z.string().trim().min(COLLECTION_NAME_MIN).max(COLLECTION_NAME_MAX),
  nameZh: z
    .string()
    .trim()
    .max(COLLECTION_NAME_MAX)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  description: z
    .string()
    .trim()
    .max(COLLECTION_DESC_MAX)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  descriptionZh: z
    .string()
    .trim()
    .max(COLLECTION_DESC_MAX)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  visibility: CollectionVisibility.default("private"),
})

export type CreateCollectionInput = z.infer<typeof CreateCollectionInput>

export const UpdateCollectionInput = CreateCollectionInput.partial()
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInput>

export const AddItemInput = z.object({
  extensionId: z.string().min(1),
})
export type AddItemInput = z.infer<typeof AddItemInput>
