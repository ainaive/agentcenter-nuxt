import { getLandscape, type Layer } from "~~/server/utils/queries/mcp-landscape"

export default defineEventHandler(async (event) => {
  const raw = getQuery(event).layer
  const layer: Layer = raw === "industry" ? "industry" : "public"
  try {
    return await getLandscape(layer)
  } catch (err) {
    console.error("[api/internal/mcp-landscape] db error:", err)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load MCP landscape",
    })
  }
})
