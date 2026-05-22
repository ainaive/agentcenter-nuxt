import * as collectionsRepo from "~~/server/repositories/collections"
import { CreateCollectionInput } from "~~/shared/validators/collection"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) =>
    CreateCollectionInput.parse(raw),
  )
  try {
    const created = await collectionsRepo.create(useDb(), {
      ownerUserId: user.id,
      input: body,
    })
    return {
      ok: true as const,
      slug: created.slug,
      id: created.id,
      visibility: created.visibility,
    }
  } catch (err) {
    throw mapCollectionError(err)
  }
})
