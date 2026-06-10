// Dev-seed admin matrix for the redesigned approval workflow. Each row
// maps a 5-coord cell to one admin email:
//   (extensionCategory × tier × productLineId? × categoryLevel × categoryKey)
//
// The DB CHECKs enforce both shape rules — productLineId iff
// tier='productLine', and categoryKey='*' iff categoryLevel='all'. The
// seed script mirrors both here so a bad row in this file fails loudly
// instead of at INSERT time.
//
// Emails resolve against `CREATORS` in `scripts/seed.ts`. Real prod
// assignment happens through the matrix UI.
//
// Coverage strategy: every ext-type tab has at least one cell with a
// visible admin so the unified table doesn't render an empty
// matrix on a fresh seed. Skills is the demo tab and gets the densest
// coverage (All + every macro + a few PL + a micro example); the other
// three are sparser. The four seeded `approval_requests` rows in
// `approval-requests.ts` each have at least one covering admin so the
// `/admin/approvals` queue lights up under multiple personas.

export type SeedProductLine = "wireless" | "datacom" | "terminals" | "cloud"
export type SeedExtensionCategory = "skills" | "mcp" | "slash" | "plugins" | "cli"
export type SeedAdminCategoryLevel = "all" | "macro" | "micro"

export interface SeedApprovalAdmin {
  extensionCategory: SeedExtensionCategory
  tier: "productLine" | "company"
  productLineId?: SeedProductLine
  categoryLevel: SeedAdminCategoryLevel
  // '*' when categoryLevel='all'; a FUNC_TAXONOMY l1 key for 'macro';
  // an l2 key for 'micro'.
  categoryKey: string
  reviewerEmail: string
}

export const APPROVAL_ADMINS: ReadonlyArray<SeedApprovalAdmin> = [
  // --- Universal All admins (one per ext-type) ---
  // Amy holds (anyExtType, company, All) — the global fallback so every
  // company-tier request has a reviewer even before category-specific
  // admins are seeded.
  { extensionCategory: "skills",  tier: "company", categoryLevel: "all", categoryKey: "*", reviewerEmail: "amy@agentcenter.dev" },
  { extensionCategory: "mcp",     tier: "company", categoryLevel: "all", categoryKey: "*", reviewerEmail: "amy@agentcenter.dev" },
  { extensionCategory: "slash",   tier: "company", categoryLevel: "all", categoryKey: "*", reviewerEmail: "amy@agentcenter.dev" },
  { extensionCategory: "plugins", tier: "company", categoryLevel: "all", categoryKey: "*", reviewerEmail: "amy@agentcenter.dev" },

  // --- Skills tab: every macro covered ---
  // Three people split the nine macros along funcCat lines.
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "systemDesign", reviewerEmail: "ben@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "softDev",      reviewerEmail: "ben@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "testing",      reviewerEmail: "ben@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "network",      reviewerEmail: "cory@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "embedded",     reviewerEmail: "cory@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "cloud",        reviewerEmail: "cory@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "docs",         reviewerEmail: "eli@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "data",         reviewerEmail: "eli@agentcenter.dev" },
  { extensionCategory: "skills", tier: "company", categoryLevel: "macro", categoryKey: "vcs",          reviewerEmail: "fei@agentcenter.dev" },

  // --- Skills tab: per-product-line All admins ---
  // Routing requires exact tier+PL match, so a company-tier admin can't
  // pick up a PL request. These ensure every Skills × PL request has at
  // least one queue subscriber.
  { extensionCategory: "skills", tier: "productLine", productLineId: "wireless",  categoryLevel: "all", categoryKey: "*", reviewerEmail: "dao@agentcenter.dev" },
  { extensionCategory: "skills", tier: "productLine", productLineId: "datacom",   categoryLevel: "all", categoryKey: "*", reviewerEmail: "fei@agentcenter.dev" },
  { extensionCategory: "skills", tier: "productLine", productLineId: "terminals", categoryLevel: "all", categoryKey: "*", reviewerEmail: "eli@agentcenter.dev" },
  { extensionCategory: "skills", tier: "productLine", productLineId: "cloud",     categoryLevel: "all", categoryKey: "*", reviewerEmail: "ben@agentcenter.dev" },

  // --- Skills tab: a couple of macro × PL refinements + one micro ---
  // These coexist with the All row above — a publisher request matches
  // every covering admin, so dedup happens in SQL (SELECT DISTINCT).
  { extensionCategory: "skills", tier: "productLine", productLineId: "wireless", categoryLevel: "macro", categoryKey: "softDev",  reviewerEmail: "ben@agentcenter.dev" },
  { extensionCategory: "skills", tier: "productLine", productLineId: "wireless", categoryLevel: "macro", categoryKey: "network",  reviewerEmail: "cory@agentcenter.dev" },
  { extensionCategory: "skills", tier: "productLine", productLineId: "wireless", categoryLevel: "micro", categoryKey: "backend",  reviewerEmail: "ben@agentcenter.dev" },

  // --- MCP tab: a couple of macros + one PL All ---
  { extensionCategory: "mcp", tier: "company",     categoryLevel: "macro", categoryKey: "softDev", reviewerEmail: "ben@agentcenter.dev" },
  { extensionCategory: "mcp", tier: "company",     categoryLevel: "macro", categoryKey: "network", reviewerEmail: "cory@agentcenter.dev" },
  { extensionCategory: "mcp", tier: "productLine", productLineId: "wireless", categoryLevel: "all", categoryKey: "*", reviewerEmail: "dao@agentcenter.dev" },

  // --- Slash tab: macros covering the seeded pending /translate request ---
  // /translate is owned by ben at subCat=docs; the e2e suite exercises
  // (slash, productLine, wireless) so Eli needs to cover that exact
  // column-tier shape. Without this row the e2e queue would be empty.
  { extensionCategory: "slash", tier: "company",     categoryLevel: "macro", categoryKey: "docs", reviewerEmail: "fei@agentcenter.dev" },
  { extensionCategory: "slash", tier: "productLine", productLineId: "wireless", categoryLevel: "macro", categoryKey: "docs", reviewerEmail: "eli@agentcenter.dev" },

  // --- Plugins tab: cover the seeded pending mqtt-bridge request ---
  // mqtt-bridge is plugins × productLine wireless × network. Without a
  // matching admin the PL queue is empty for everyone but super-admins.
  { extensionCategory: "plugins", tier: "productLine", productLineId: "wireless", categoryLevel: "all", categoryKey: "*",      reviewerEmail: "dao@agentcenter.dev" },
  { extensionCategory: "plugins", tier: "company",     categoryLevel: "macro",    categoryKey: "data", reviewerEmail: "eli@agentcenter.dev" },
]

// First entry in `CREATORS` (amy) gets the super-admin membership unless
// `SEED_SUPER_ADMIN_EMAIL` overrides at runtime.
export const DEFAULT_SUPER_ADMIN_EMAIL = "amy@agentcenter.dev"
