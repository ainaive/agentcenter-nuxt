// Seed real, downloadable bundles for a handful of catalog extensions so the
// install loop is demonstrable end-to-end (web download, conversational prompt,
// and `agentcenter install` all deliver a file).
//
// For each target slug it generates a valid `manifest.toml` + category content,
// zips it, uploads via the active storage backend (the local filesystem backend
// in dev — zero cloud setup), and upserts the `extension_versions` (status=ready)
// + `files` (scanStatus=clean) rows that `findLatestReadyBundleBySlug` needs.
//
// Idempotent: deterministic ids (`ver-<slug>-1.0.0` / `file-<slug>-1.0.0`) and
// upserts. Resolves extensions by slug, so it is independent of the id scheme;
// a missing slug is skipped with a warning, never fatal. Dev-only for now — not
// wired into vercel-build.

import { eq } from "drizzle-orm"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { strToU8, zipSync } from "fflate"
import { createHash } from "node:crypto"
import postgres from "postgres"
import { stringify as tomlStringify } from "smol-toml"

import { bundleKey, useStorage } from "../server/utils/storage"
import * as schema from "../shared/db/schema"
import { extensions, extensionVersions, files } from "../shared/db/schema"
import { defaultInstallPath } from "../shared/installs/paths"
import type { ExtensionCategory } from "../shared/types"
import { BundleManifestSchema } from "../shared/validators/manifest"

type Db = PostgresJsDatabase<typeof schema>

const VERSION = "1.0.0"

// One representative slug per category. Each must exist after `db:seed`
// (seed.ts + seed-catalog.ts); absent ones are skipped.
const TARGET_SLUGS = [
  "web-search-pro", // skills
  "github-mcp", // mcp
  "summarize", // slash
  "notion-sync", // plugins
  "git-blame-explain", // cli
]

// `[install.claude]` block per category — the destination key differs by type.
// The path value reuses the same map the web surface uses (defaultInstallPath).
function installBlock(category: ExtensionCategory, slug: string): Record<string, string> {
  const dest = defaultInstallPath(category, slug)
  switch (category) {
    case "skills":
      return { skills: dest }
    case "cli":
      return { cli: dest }
    case "plugins":
      return { plugins: dest }
    case "slash":
      return { commands: dest }
    case "mcp":
      return { mcpConfig: dest, mcpKey: slug }
  }
}

// Minimal category-appropriate payload so the unzipped bundle is plausible and
// the CLI installer has something to place. Keys are archive-relative paths.
function contentFiles(category: ExtensionCategory, slug: string, name: string, desc: string) {
  switch (category) {
    case "skills":
      return { "skill.md": `# ${name}\n\n${desc}\n` }
    case "slash":
      return { [`${slug}.md`]: `# /${slug}\n\n${desc}\n` }
    case "mcp":
      return {
        "server.js": `// ${name} — MCP server stub\nconsole.log(${JSON.stringify(`${name} ready`)})\n`,
      }
    case "plugins":
      return { "plugin.json": `${JSON.stringify({ name, slug, entry: "index.js" }, null, 2)}\n` }
    case "cli":
      return { [`${slug}.sh`]: `#!/usr/bin/env bash\n# ${name}\necho ${JSON.stringify(desc)}\n` }
  }
}

function buildManifest(ext: {
  slug: string
  name: string
  nameZh: string | null
  category: ExtensionCategory
  scope: "personal" | "org" | "enterprise"
  description: string | null
  descriptionZh: string | null
  tagline: string | null
  funcCat: string | null
  subCat: string | null
  l2: string | null
}) {
  const description = (ext.description ?? ext.tagline ?? `${ext.name} extension.`).slice(0, 280)
  const extension: Record<string, string> = {
    slug: ext.slug,
    name: ext.name,
    version: VERSION,
    category: ext.category,
    scope: ext.scope,
    description,
  }
  if (ext.nameZh) extension.nameZh = ext.nameZh
  if (ext.descriptionZh) extension.descriptionZh = ext.descriptionZh.slice(0, 280)
  if (ext.tagline) extension.tagline = ext.tagline

  const categorization: Record<string, string> = {
    funcCat: (ext.funcCat as string) ?? "tools",
    subCat: ext.subCat ?? "general",
  }
  if (ext.l2) categorization.l2 = ext.l2

  // Validate against the same schema the real scan job enforces, so a seeded
  // bundle is indistinguishable from a genuinely published one.
  const parsed = BundleManifestSchema.safeParse({ extension, categorization })
  if (!parsed.success) {
    throw new Error(`manifest for ${ext.slug} is invalid: ${parsed.error.message}`)
  }

  return {
    extension,
    categorization,
    install: { claude: installBlock(ext.category, ext.slug) },
  }
}

export async function seedBundles(db: Db): Promise<void> {
  const storage = await useStorage()
  let seeded = 0

  for (const slug of TARGET_SLUGS) {
    const [ext] = await db
      .select({
        id: extensions.id,
        slug: extensions.slug,
        name: extensions.name,
        nameZh: extensions.nameZh,
        category: extensions.category,
        scope: extensions.scope,
        description: extensions.description,
        descriptionZh: extensions.descriptionZh,
        tagline: extensions.tagline,
        funcCat: extensions.funcCat,
        subCat: extensions.subCat,
        l2: extensions.l2,
      })
      .from(extensions)
      .where(eq(extensions.slug, slug))
      .limit(1)

    if (!ext) {
      console.warn(`seed-bundles: skip "${slug}" — not found`)
      continue
    }

    const category = ext.category as ExtensionCategory
    const manifest = buildManifest({ ...ext, category })
    const desc = manifest.extension.description

    const archive: Record<string, Uint8Array> = {
      "manifest.toml": strToU8(tomlStringify(manifest)),
      "README.md": strToU8(`# ${ext.name}\n\n${desc}\n`),
    }
    for (const [path, body] of Object.entries(
      contentFiles(category, ext.slug, ext.name, desc),
    )) {
      archive[path] = strToU8(body)
    }

    const bytes = zipSync(archive)
    const key = bundleKey(ext.slug, VERSION)
    await storage.putObject(key, bytes, "application/zip")
    const checksum = createHash("sha256").update(bytes).digest("hex")

    const versionId = `ver-${ext.slug}-${VERSION}`
    const fileId = `file-${ext.slug}-${VERSION}`
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .insert(extensionVersions)
        .values({
          id: versionId,
          extensionId: ext.id,
          version: VERSION,
          status: "ready",
          sourceMethod: "zip",
          manifestJson: manifest,
          bundleFileId: fileId,
          publishedAt: now,
        })
        .onConflictDoUpdate({
          target: extensionVersions.id,
          set: {
            status: "ready",
            bundleFileId: fileId,
            manifestJson: manifest,
            publishedAt: now,
          },
        })

      await tx
        .insert(files)
        .values({
          id: fileId,
          extensionVersionId: versionId,
          r2Key: key,
          size: BigInt(bytes.length),
          checksumSha256: checksum,
          mimeType: "application/zip",
          scanStatus: "clean",
        })
        .onConflictDoUpdate({
          target: files.id,
          set: {
            r2Key: key,
            size: BigInt(bytes.length),
            checksumSha256: checksum,
            scanStatus: "clean",
          },
        })
    })

    seeded += 1
    console.log(`seed-bundles: ${ext.slug} (${category}) → ${key} [${bytes.length}B]`)
  }

  console.log(`seed-bundles: seeded ${seeded}/${TARGET_SLUGS.length} bundles`)
}

// ─── Standalone entry-point: `bun scripts/seed-bundles.ts` ────────────────────
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("seed-bundles: DATABASE_URL is not set")
    process.exit(1)
  }
  const client = postgres(url)
  const db = drizzle(client, { schema, casing: "snake_case" })

  console.log("seed-bundles: starting")
  await seedBundles(db)
  console.log("seed-bundles: done")
  await client.end()
}

const isEntry = import.meta.url === `file://${process.argv[1]}`
if (isEntry) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("seed-bundles: failed")
      console.error(err)
      process.exit(1)
    })
}
