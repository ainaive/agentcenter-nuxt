import {
  listPublishedCreators,
  listPublishedPublishers,
  listTagsWithCounts,
  type CreatorFacet,
  type PublisherFacet,
  type TagFacet,
} from "~~/server/utils/queries/facets"

export default defineEventHandler(async (): Promise<{
  creators: CreatorFacet[]
  publishers: PublisherFacet[]
  tags: TagFacet[]
}> => {
  try {
    const [creators, publishers, tags] = await Promise.all([
      listPublishedCreators(),
      listPublishedPublishers(),
      listTagsWithCounts(),
    ])
    return { creators, publishers, tags }
  } catch (err) {
    console.error("[api/internal/facets] db error:", err)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load filter facets",
    })
  }
})
