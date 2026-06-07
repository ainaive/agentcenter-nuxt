// Dev-seed reviewer matrix for the approval workflow. Each row maps a
// (tier, subCat, productLineId?) cell to one or more reviewer emails. For
// productLine-tier cells productLineId is required; for company-tier cells
// it must be omitted (the DB CHECK enforces both). The seed script
// resolves emails to user ids against the rows it just inserted, so the
// emails here must match `CREATORS` in `scripts/seed.ts`. Real prod
// assignment happens through the matrix UI.
//
// Spread the assignments so every cell has at least one reviewer and the
// reviewer-queue page has non-empty content under each demo persona.

export type SeedProductLine = "wireless" | "datacom" | "terminals" | "cloud"

export const APPROVAL_REVIEWERS: ReadonlyArray<{
  tier: "productLine" | "company"
  subCat: string
  productLineId?: SeedProductLine
  reviewerEmail: string
}> = [
  // Product-Line tier: per-(subCat × productLine) lieutenants. We fan each
  // subCat's reviewer across all four product lines so every cell of the
  // 9×4 grid has someone to take the page on a fresh seed.
  ...(["wireless", "datacom", "terminals", "cloud"] as const).flatMap(
    (pl): ReadonlyArray<{
      tier: "productLine"
      subCat: string
      productLineId: SeedProductLine
      reviewerEmail: string
    }> => [
      { tier: "productLine", subCat: "systemDesign", productLineId: pl, reviewerEmail: "amy@agentcenter.dev" },
      { tier: "productLine", subCat: "softDev",      productLineId: pl, reviewerEmail: "ben@agentcenter.dev" },
      { tier: "productLine", subCat: "testing",      productLineId: pl, reviewerEmail: "ben@agentcenter.dev" },
      { tier: "productLine", subCat: "network",      productLineId: pl, reviewerEmail: "cory@agentcenter.dev" },
      { tier: "productLine", subCat: "embedded",     productLineId: pl, reviewerEmail: "cory@agentcenter.dev" },
      { tier: "productLine", subCat: "cloud",        productLineId: pl, reviewerEmail: "dao@agentcenter.dev" },
      { tier: "productLine", subCat: "docs",         productLineId: pl, reviewerEmail: "eli@agentcenter.dev" },
      { tier: "productLine", subCat: "data",         productLineId: pl, reviewerEmail: "eli@agentcenter.dev" },
      { tier: "productLine", subCat: "vcs",          productLineId: pl, reviewerEmail: "fei@agentcenter.dev" },
    ],
  ),

  // Company tier: a smaller circle of senior reviewers. Per the delegation
  // rule, these are also the people who can manage productLine reviewers in
  // the same subCat (see ADR-0001 2026-06-08 addendum).
  { tier: "company", subCat: "systemDesign", reviewerEmail: "amy@agentcenter.dev" },
  { tier: "company", subCat: "softDev",      reviewerEmail: "amy@agentcenter.dev" },
  { tier: "company", subCat: "testing",      reviewerEmail: "amy@agentcenter.dev" },
  { tier: "company", subCat: "network",      reviewerEmail: "dao@agentcenter.dev" },
  { tier: "company", subCat: "embedded",     reviewerEmail: "dao@agentcenter.dev" },
  { tier: "company", subCat: "cloud",        reviewerEmail: "dao@agentcenter.dev" },
  { tier: "company", subCat: "docs",         reviewerEmail: "fei@agentcenter.dev" },
  { tier: "company", subCat: "data",         reviewerEmail: "fei@agentcenter.dev" },
  { tier: "company", subCat: "vcs",          reviewerEmail: "fei@agentcenter.dev" },
]

// First entry in `CREATORS` (amy) gets the super-admin membership unless
// `SEED_SUPER_ADMIN_EMAIL` overrides at runtime.
export const DEFAULT_SUPER_ADMIN_EMAIL = "amy@agentcenter.dev"
