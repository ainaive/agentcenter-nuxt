import { hashPassword } from "better-auth/crypto"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { APPROVAL_REQUESTS } from "../shared/data/approval-requests"
import {
  APPROVAL_REVIEWERS,
  DEFAULT_SUPER_ADMIN_EMAIL,
} from "../shared/data/approval-reviewers"
import { COLLECTIONS } from "../shared/data/collections"
import { DEPARTMENTS } from "../shared/data/departments"
import { EXTENSIONS } from "../shared/data/extensions"
import * as schema from "../shared/db/schema"
import {
  accounts,
  approvalRequests,
  approvalReviewers,
  collectionItems,
  collections,
  departments,
  extensions,
  extensionTags,
  memberships,
  organizations,
  tags,
  users,
} from "../shared/db/schema"
import { TAG_LABELS } from "../shared/tags"
import type { Department } from "../shared/types"
import { seedMcpLandscape } from "./seed-mcp-landscape"

const ORG_ID = "default"

const CREATORS = [
  { id: "user-amy", email: "amy@agentcenter.dev", name: "Amy Chen" },
  { id: "user-ben", email: "ben@agentcenter.dev", name: "Ben Park" },
  { id: "user-cory", email: "cory@agentcenter.dev", name: "Cory Liu" },
  { id: "user-dao", email: "dao@agentcenter.dev", name: "Dao Tran" },
  { id: "user-eli", email: "eli@agentcenter.dev", name: "Eli Smith" },
  { id: "user-fei", email: "fei@agentcenter.dev", name: "Fei Wang" },
]

interface FlatDept {
  id: string
  orgId: string
  parentId: string | null
  name: string
  nameZh: string
  pathDepth: number
}

function flattenDepts(
  list: Department[],
  depth = 0,
  parentId: string | null = null,
  out: FlatDept[] = [],
): FlatDept[] {
  for (const d of list) {
    out.push({
      id: d.id,
      orgId: ORG_ID,
      parentId,
      name: d.name,
      nameZh: d.nameZh,
      pathDepth: depth,
    })
    if (d.children) flattenDepts(d.children, depth + 1, d.id, out)
  }
  return out
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const CATEGORY_LABELS = {
  skills: "skill",
  mcp: "MCP server",
  slash: "slash command",
  plugins: "plugin",
} as const

function generateReadme(ext: (typeof EXTENSIONS)[number]): string {
  const kind = CATEGORY_LABELS[ext.category]
  const installCmd = `agentcenter install ${slugify(ext.name)}`
  return `# ${ext.name}

${ext.desc}

## Overview

${ext.name} is a ${kind} published by **${ext.author}**. It plugs into your
agent runtime so you can ${ext.desc.toLowerCase().replace(/\.$/, "")} without
hand-rolling integrations.

## Install

\`\`\`bash
${installCmd}
\`\`\`

After installing, restart your agent to pick up the new ${kind}.

## Compatibility

- **Claude** — supported on the latest agent runtimes
- **Other agents** — install paths can be customized via \`agentcenter config\`

## Tags

${ext.tags.map((t) => `\`${t}\``).join(" · ")}
`
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("seed: DATABASE_URL is not set")
    process.exit(1)
  }
  const client = postgres(url)
  const db = drizzle(client, { schema, casing: "snake_case" })

  console.log("seed: starting")
  console.log("seed: truncating catalog tables")
  // Orgs + tags CASCADE through extensions and their dependents (versions,
  // installs, ratings, extension_tags, approval_requests). approval_reviewers
  // only cascades from `users` (which we don't truncate to preserve dev
  // identities), so include it explicitly — otherwise a re-run hits the
  // appr-rev-0 PK collision below.
  await db.execute(
    sql`TRUNCATE TABLE ${organizations}, ${tags}, ${approvalReviewers} RESTART IDENTITY CASCADE`,
  )

  const authorOrgIdMap = new Map<string, string>()
  const usedSlugs = new Set<string>([ORG_ID])
  for (const e of EXTENSIONS) {
    if (authorOrgIdMap.has(e.author)) continue
    const base = slugify(e.author) || `author-${authorOrgIdMap.size}`
    let slug = base
    for (let n = 1; usedSlugs.has(slug); n++) slug = `${base}-${n}`
    usedSlugs.add(slug)
    authorOrgIdMap.set(e.author, slug)
  }
  const orgRows = [
    {
      id: ORG_ID,
      slug: "default",
      name: "Default Organization",
      nameZh: "默认组织",
    },
    ...Array.from(authorOrgIdMap.entries()).map(([author, id]) => ({
      id,
      slug: id,
      name: author,
      nameZh: null,
    })),
  ]
  console.log(`seed: inserting ${orgRows.length} organizations`)
  await db.insert(organizations).values(orgRows)

  console.log(`seed: upserting ${CREATORS.length} creator users`)
  await db.insert(users).values(CREATORS).onConflictDoNothing()

  // Plant Better-Auth credential rows so the demo identities can actually
  // sign in via /sign-in. Matches what Better-Auth itself writes during
  // /sign-up/email (see node_modules/better-auth/dist/api/routes/sign-up.mjs):
  //   providerId="credential", accountId=userId, password=hashed scrypt.
  // Deterministic id + onConflictDoUpdate makes re-running the seed safe
  // and lets `SEED_PASSWORD=newvalue bun run db:seed` rotate the password.
  // SEED_PASSWORD is required — we deliberately do NOT ship a default so a
  // misconfigured environment can't quietly hand out predictable credentials.
  const seedPassword = process.env.SEED_PASSWORD
  if (!seedPassword) {
    throw new Error(
      "seed: SEED_PASSWORD env var is required to plant credential accounts " +
        "(e.g. SEED_PASSWORD=dev-only-password bun run db:seed)",
    )
  }
  const passwordHash = await hashPassword(seedPassword)
  const accountRows = CREATORS.map((u) => ({
    id: `acc-credential-${u.id}`,
    userId: u.id,
    accountId: u.id,
    providerId: "credential",
    password: passwordHash,
  }))
  console.log(
    `seed: planting ${accountRows.length} credential accounts (password from SEED_PASSWORD or default)`,
  )
  await db
    .insert(accounts)
    .values(accountRows)
    .onConflictDoUpdate({
      target: accounts.id,
      set: { password: passwordHash, updatedAt: new Date() },
    })

  const flatDepts = flattenDepts(DEPARTMENTS)
  console.log(`seed: inserting ${flatDepts.length} departments`)
  await db.insert(departments).values(flatDepts)

  const tagRows = Object.entries(TAG_LABELS).map(([id, label]) => ({
    id,
    labelEn: label.en,
    labelZh: label.zh,
  }))
  console.log(`seed: inserting ${tagRows.length} tags`)
  await db.insert(tags).values(tagRows)

  const extRows = EXTENSIONS.map((e, i) => {
    const creator = CREATORS[i % CREATORS.length]!
    const ownerOrgId = authorOrgIdMap.get(e.author)
    if (!ownerOrgId) throw new Error(`no org for author ${e.author}`)
    return {
      id: `ext-${e.id}`,
      slug: slugify(e.name),
      category: e.category,
      badge: e.badge ?? null,
      // Demo seed only. Production extensions earn officialTier through
      // the approval workflow; the seed pre-stamps a handful so the new
      // badge styling and filter pill have visible coverage on a fresh DB.
      officialTier: e.officialTier ?? null,
      // CHECK constraint: productLineId is required iff officialTier='productLine'.
      // Default to 'wireless' for legacy seed rows that pre-date the dimension.
      productLineId:
        e.officialTier === "productLine"
          ? (e.productLineId ?? "wireless")
          : null,
      scope: e.scope,
      funcCat: e.funcCat,
      subCat: e.subCat,
      publisherUserId: creator.id,
      ownerOrgId,
      deptId: e.dept,
      iconEmoji: e.icon,
      iconColor: e.color,
      visibility: "published" as const,
      name: e.name,
      nameZh: e.nameZh,
      description: e.desc,
      descriptionZh: e.descZh,
      readmeMd: generateReadme(e),
      downloadsCount: e.downloads,
      starsAvg: String(e.stars),
      ratingsCount: 0,
      publishedAt: new Date(),
    }
  })
  console.log(`seed: inserting ${extRows.length} extensions`)
  await db.insert(extensions).values(extRows)

  const seen = new Set<string>()
  const membershipRows: {
    id: string
    userId: string
    orgId: string
    role: "publisher" | "superAdmin"
  }[] = []
  for (const row of extRows) {
    const key = `${row.publisherUserId}|${row.ownerOrgId}`
    if (seen.has(key)) continue
    seen.add(key)
    membershipRows.push({
      id: `mem-${row.publisherUserId}-${row.ownerOrgId}`,
      userId: row.publisherUserId,
      orgId: row.ownerOrgId,
      role: "publisher",
    })
  }

  // Promote one user to super-admin so the /admin/reviewers matrix is
  // reachable in dev. SEED_SUPER_ADMIN_EMAIL overrides the default.
  const superAdminEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL
  const superAdmin = CREATORS.find((u) => u.email === superAdminEmail)
  if (superAdmin) {
    membershipRows.push({
      id: `mem-superadmin-${superAdmin.id}`,
      userId: superAdmin.id,
      orgId: ORG_ID,
      role: "superAdmin",
    })
    console.log(`seed: promoting ${superAdmin.email} to superAdmin`)
  } else {
    console.warn(
      `seed: SEED_SUPER_ADMIN_EMAIL=${superAdminEmail} did not match any creator — no super-admin seeded`,
    )
  }
  console.log(`seed: inserting ${membershipRows.length} memberships`)
  await db.insert(memberships).values(membershipRows)

  // Reviewer matrix: every (tier, subCat[, productLineId]) cell gets at least
  // one assignment from APPROVAL_REVIEWERS. Emails that don't resolve to a
  // creator are skipped with a warning so a typo doesn't break the seed. The
  // DB CHECK enforces productLineId presence per tier; we mirror it here so a
  // bad shape in the seed file fails loudly instead of at INSERT time.
  const reviewerRows = APPROVAL_REVIEWERS.flatMap((r, i) => {
    const reviewer = CREATORS.find((u) => u.email === r.reviewerEmail)
    if (!reviewer) {
      console.warn(
        `seed: approval reviewer email ${r.reviewerEmail} did not match any creator — skipping`,
      )
      return []
    }
    const requiresPl = r.tier === "productLine"
    if (requiresPl && !r.productLineId) {
      console.warn(
        `seed: approval reviewer #${i} (${r.tier}/${r.subCat}) missing productLineId — skipping`,
      )
      return []
    }
    if (!requiresPl && r.productLineId) {
      console.warn(
        `seed: approval reviewer #${i} (${r.tier}/${r.subCat}) carries productLineId on a company-tier row — skipping`,
      )
      return []
    }
    return [
      {
        id: `appr-rev-${i}`,
        tier: r.tier,
        subCat: r.subCat,
        productLineId: r.productLineId ?? null,
        userId: reviewer.id,
      },
    ]
  })
  console.log(`seed: inserting ${reviewerRows.length} approval reviewers`)
  await db.insert(approvalReviewers).values(reviewerRows)

  const extTagRows = EXTENSIONS.flatMap((e) =>
    e.tags.map((tagKey) => ({
      extensionId: `ext-${e.id}`,
      tagId: tagKey,
    })),
  )
  console.log(`seed: inserting ${extTagRows.length} extension-tag links`)
  await db.insert(extensionTags).values(extTagRows)

  // Email and slug → id maps shared by the approval-request block below
  // and the editorial-collections block further down. Hoisted here so
  // both sections look up against the same table.
  const userIdByEmail = new Map(CREATORS.map((u) => [u.email, u.id]))
  const extIdBySlug = new Map(extRows.map((r) => [r.slug, r.id]))

  // Approval requests — a small spread covering every UI state. Pending
  // rows light up the reviewer queue; the approved row also stamps the
  // parent extension's officialTier so the publisher's view matches what
  // the real workflow's transactional approve would have produced. NOTE:
  // these rows are inserted directly, bypassing `submitRequest`, so no
  // `extension/approval.requested` Inngest event fires for them — that's
  // expected on a fresh seed and not a bug in the workflow.
  const approvalRequestRows: {
    id: string
    extensionId: string
    requestedTier: "productLine" | "company"
    subCat: string
    productLineId: string | null
    requestedByUserId: string
    reason: string | null
    status: "pending" | "approved" | "rejected"
    decidedByUserId: string | null
    decidedAt: Date | null
    reviewerNote: string | null
  }[] = []
  const officialTierStamps: {
    extensionId: string
    tier: "productLine" | "company"
    productLineId: string | null
  }[] = []
  for (const [i, r] of APPROVAL_REQUESTS.entries()) {
    const extensionId = extIdBySlug.get(r.extensionSlug)
    if (!extensionId) {
      console.warn(
        `seed: approval request #${i} references unknown extension slug "${r.extensionSlug}" — skipping`,
      )
      continue
    }
    const publisherId = userIdByEmail.get(r.publisherEmail)
    if (!publisherId) {
      console.warn(
        `seed: approval request #${i} references unknown publisher ${r.publisherEmail} — skipping`,
      )
      continue
    }
    let decidedByUserId: string | null = null
    if (r.decidedByEmail) {
      decidedByUserId = userIdByEmail.get(r.decidedByEmail) ?? null
      if (!decidedByUserId) {
        console.warn(
          `seed: approval request #${i} references unknown decider ${r.decidedByEmail} — leaving decidedByUserId null`,
        )
      }
    }
    const isDecided = r.status === "approved" || r.status === "rejected"
    // Defensive: the orchestrator enforces at-most-one-pending-per-extension
    // at runtime; the seed must boot the marketplace in a state that already
    // honors it. The current data file picks distinct extensions for the two
    // pending rows, but a future edit could silently violate the invariant
    // without this guard — skip with a warning instead.
    if (
      r.status === "pending" &&
      approvalRequestRows.some(
        (existing) =>
          existing.extensionId === extensionId && existing.status === "pending",
      )
    ) {
      console.warn(
        `seed: approval request #${i} would be a second pending row for "${r.extensionSlug}" — skipping to preserve the at-most-one-pending invariant`,
      )
      continue
    }
    const requiresPl = r.requestedTier === "productLine"
    if (requiresPl && !r.productLineId) {
      console.warn(
        `seed: approval request #${i} (${r.requestedTier}/${r.subCat}) missing productLineId — skipping`,
      )
      continue
    }
    if (!requiresPl && r.productLineId) {
      console.warn(
        `seed: approval request #${i} carries productLineId on a company-tier row — skipping`,
      )
      continue
    }
    approvalRequestRows.push({
      id: `appr-req-${i}`,
      extensionId,
      requestedTier: r.requestedTier,
      subCat: r.subCat,
      productLineId: r.productLineId ?? null,
      requestedByUserId: publisherId,
      reason: r.reason ?? null,
      status: r.status,
      decidedByUserId,
      decidedAt: isDecided ? new Date() : null,
      reviewerNote: r.reviewerNote ?? null,
    })
    if (r.status === "approved") {
      officialTierStamps.push({
        extensionId,
        tier: r.requestedTier,
        productLineId: r.productLineId ?? null,
      })
    }
  }
  if (approvalRequestRows.length > 0) {
    console.log(`seed: inserting ${approvalRequestRows.length} approval requests`)
    await db.insert(approvalRequests).values(approvalRequestRows)
  }
  for (const stamp of officialTierStamps) {
    await db
      .update(extensions)
      .set({ officialTier: stamp.tier, productLineId: stamp.productLineId })
      .where(sql`${extensions.id} = ${stamp.extensionId}`)
  }
  if (officialTierStamps.length > 0) {
    console.log(
      `seed: stamped officialTier on ${officialTierStamps.length} extensions to match approved requests`,
    )
  }

  // Wipe and re-seed editorial public collections so the /collections browse
  // page has realistic material in dev/staging. CASCADE clears
  // collection_items as well. Anything a real signed-in user created
  // (including the system 'Saved' row) goes too — re-running the seed is
  // explicitly a "reset to demo state" operation.
  console.log(`seed: re-seeding ${COLLECTIONS.length} editorial collections`)
  await db.execute(sql`TRUNCATE TABLE ${collections} CASCADE`)

  // `userIdByEmail` and `extIdBySlug` are hoisted above the approval
  // requests block so both sections share the same lookup tables.
  const now = new Date()
  const collectionRows = COLLECTIONS.map((c) => {
    const ownerId = userIdByEmail.get(c.ownerEmail)
    if (!ownerId) {
      throw new Error(
        `seed: editorial collection "${c.slug}" references unknown owner ${c.ownerEmail}`,
      )
    }
    return {
      id: crypto.randomUUID(),
      slug: c.slug,
      ownerUserId: ownerId,
      name: c.name,
      nameZh: c.nameZh,
      description: c.description,
      descriptionZh: c.descriptionZh,
      systemKind: null,
      visibility: "public" as const,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    }
  })
  await db.insert(collections).values(collectionRows)

  const itemRows = COLLECTIONS.flatMap((c, i) =>
    c.extensionSlugs.map((extSlug) => {
      const extId = extIdBySlug.get(extSlug)
      if (!extId) {
        throw new Error(
          `seed: editorial collection "${c.slug}" references unknown extension slug "${extSlug}"`,
        )
      }
      return {
        collectionId: collectionRows[i]!.id,
        extensionId: extId,
      }
    }),
  )
  console.log(`seed: inserting ${itemRows.length} collection items`)
  await db.insert(collectionItems).values(itemRows)

  // ─── MCP Panorama landscape ────────────────────────────────────────────────
  // Shared with scripts/seed-mcp-landscape.ts (the standalone Vercel-build
  // seed). Both go through the same upsert path so the demo and prod stay
  // in sync. Uses ON CONFLICT so re-running is safe.
  await seedMcpLandscape(db)

  console.log("seed: done")
  await client.end()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed: failed")
    console.error(err)
    process.exit(1)
  })
