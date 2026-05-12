import { serve } from "inngest/node"
import { inngest, getInngestFunctions } from "~~/server/utils/inngest"

export default defineEventHandler(async (event) => {
  const functions = await getInngestFunctions()
  // INNGEST_SIGNING_KEY is read by serve() from env automatically.
  const handler = serve({ client: inngest, functions })
  return handler(event.node.req, event.node.res)
})
