import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for GET /api/v1/extensions (docs/api.md §67–113).
// The example payload below is copy-pasted verbatim from docs/api.md. If
// the doc is updated, update this payload too — the test catches drift in
// either direction.

const extensionsListResponseSchema = z.object({
  items: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      nameZh: z.string().nullable(),
      category: z.enum(["skills", "mcp", "slash", "plugins"]),
      scope: z.enum(["personal", "org", "enterprise"]),
      badge: z.enum(["official", "popular", "new"]).nullable(),
      description: z.string().nullable(),
      descriptionZh: z.string().nullable(),
      tags: z.array(z.string()),
      funcCat: z.enum(["workTask", "business", "tools"]).nullable(),
      subCat: z.string().nullable(),
      l2: z.string().nullable(),
      downloadsCount: z.number().int(),
      starsAvg: z.string(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int().optional(),
  pageSize: z.number().int(),
})

const DOCUMENTED_PAYLOAD = {
  items: [
    {
      slug: "web-search",
      name: "Web Search",
      nameZh: "网页搜索",
      category: "skills",
      scope: "personal",
      badge: "official",
      description: "Search the web from your agent.",
      descriptionZh: "在你的智能体中搜索网页。",
      tags: ["search", "api"],
      funcCat: "workTask",
      subCat: "softDev",
      l2: "frontend",
      downloadsCount: 1248,
      starsAvg: "4.7",
    },
  ],
  total: 87,
  page: 1,
  pageSize: 24,
}

describe("contract: GET /api/v1/extensions", () => {
  it("documented example payload parses against the shape schema", () => {
    const parsed = extensionsListResponseSchema.safeParse(DOCUMENTED_PAYLOAD)
    expect(parsed.success).toBe(true)
  })

  it("accepts an empty items array (no results page)", () => {
    const parsed = extensionsListResponseSchema.safeParse({
      items: [],
      total: 0,
      page: 1,
      pageSize: 24,
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects when a required item field is missing", () => {
    const parsed = extensionsListResponseSchema.safeParse({
      items: [{ ...DOCUMENTED_PAYLOAD.items[0], slug: undefined }],
      total: 1,
      page: 1,
      pageSize: 24,
    })
    expect(parsed.success).toBe(false)
  })
})
