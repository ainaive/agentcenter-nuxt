// Dev-seed reviewer matrix for the approval workflow. Each row maps a
// (tier, subCat) cell to one or more reviewer emails. The seed script
// resolves emails to user ids against the rows it just inserted, so the
// emails here must match `CREATORS` in `scripts/seed.ts`. Real prod
// assignment happens through the super-admin matrix UI.
//
// Spread the assignments so every cell has at least one reviewer and the
// reviewer-queue page has non-empty content under each demo persona.

export const APPROVAL_REVIEWERS: ReadonlyArray<{
  tier: "productLine" | "company"
  subCat: string
  reviewerEmail: string
}> = [
  // Product-Line tier: per-line lieutenants.
  { tier: "productLine", subCat: "systemDesign", reviewerEmail: "amy@agentcenter.dev" },
  { tier: "productLine", subCat: "softDev",      reviewerEmail: "ben@agentcenter.dev" },
  { tier: "productLine", subCat: "testing",      reviewerEmail: "ben@agentcenter.dev" },
  { tier: "productLine", subCat: "network",      reviewerEmail: "cory@agentcenter.dev" },
  { tier: "productLine", subCat: "embedded",     reviewerEmail: "cory@agentcenter.dev" },
  { tier: "productLine", subCat: "cloud",        reviewerEmail: "dao@agentcenter.dev" },
  { tier: "productLine", subCat: "docs",         reviewerEmail: "eli@agentcenter.dev" },
  { tier: "productLine", subCat: "data",         reviewerEmail: "eli@agentcenter.dev" },
  { tier: "productLine", subCat: "vcs",          reviewerEmail: "fei@agentcenter.dev" },

  // Company tier: a smaller circle of senior reviewers.
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
