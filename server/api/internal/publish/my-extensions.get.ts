import { getMyExtensions } from "~~/server/utils/publish"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { items: await getMyExtensions(user.id) }
})
