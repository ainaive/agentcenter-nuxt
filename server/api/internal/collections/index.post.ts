import * as collectionsRepo from "~~/server/repositories/collections"
import { CreateCollectionInput } from "~~/shared/validators/collection"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) =>
    CreateCollectionInput.parse(raw),
  )
  const db = useDb()
  const created = await collectionsRepo.create(db, {
    ownerUserId: user.id,
    input: body,
  })
  return {
    ok: true as const,
    slug: created.slug,
    id: created.id,
    visibility: created.visibility,
  }
})
