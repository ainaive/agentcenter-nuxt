import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for GET /api/v1/extensions/:slug (docs/api.md §114–155).

const extensionsDetailResponseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  nameZh: z.string().nullable(),
  category: z.enum(["skills", "mcp", "slash", "plugins"]),
  scope: z.enum(["personal", "org", "enterprise"]),
  badge: z.enum(["official", "popular", "new"]).nullable(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  descriptionZh: z.string().nullable(),
  tags: z.array(z.string()),
  funcCat: z.enum(["workTask", "business", "tools"]).nullable(),
  subCat: z.string().nullable(),
  l2: z.string().nullable(),
  license: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  repoUrl: z.string().nullable(),
  // `compatibilityJson` is a freeform manifest object — Zod accepts any
  // record or null, but never a non-object scalar.
  compatibilityJson: z.record(z.string(), z.unknown()).nullable(),
  downloadsCount: z.number().int(),
  starsAvg: z.string(),
  ratingsCount: z.number().int(),
  publishedAt: z.string().datetime().nullable(),
  version: z.string(),
  bundleUrl: z.string(),
})

const DOCUMENTED_PAYLOAD = {
  slug: "web-search",
  name: "Web Search",
  nameZh: "网页搜索",
  category: "skills",
  scope: "personal",
  badge: "official",
  tagline: "One-line tagline",
  description: "Longer description.",
  descriptionZh: "更长的描述。",
  tags: ["search", "api"],
  funcCat: "workTask",
  subCat: "softDev",
  l2: "frontend",
  license: "MIT",
  homepageUrl: "https://example.com",
  repoUrl: "https://github.com/example/web-search",
  compatibilityJson: { agent: "claude", minVersion: "1.0" },
  downloadsCount: 1248,
  starsAvg: "4.7",
  ratingsCount: 42,
  publishedAt: "2026-01-15T08:30:00.000Z",
  version: "latest",
  bundleUrl: "/api/v1/extensions/web-search/bundle",
}

describe("contract: GET /api/v1/extensions/:slug", () => {
  it("documented example payload parses against the shape schema", () => {
    const parsed = extensionsDetailResponseSchema.safeParse(DOCUMENTED_PAYLOAD)
    expect(parsed.success).toBe(true)
  })

  it("accepts the minimal published shape (most metadata nullable)", () => {
    const parsed = extensionsDetailResponseSchema.safeParse({
      ...DOCUMENTED_PAYLOAD,
      nameZh: null,
      tagline: null,
      description: null,
      descriptionZh: null,
      badge: null,
      funcCat: null,
      subCat: null,
      l2: null,
      license: null,
      homepageUrl: null,
      repoUrl: null,
      compatibilityJson: null,
      publishedAt: null,
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects a non-string bundleUrl", () => {
    const parsed = extensionsDetailResponseSchema.safeParse({
      ...DOCUMENTED_PAYLOAD,
      bundleUrl: 42,
    })
    expect(parsed.success).toBe(false)
  })
})
