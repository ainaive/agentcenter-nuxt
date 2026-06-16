// Pluggable storage backend. Activated by env: setting R2_ACCOUNT_ID picks
// the Cloudflare R2 backend; otherwise SUPABASE_URL picks Supabase Storage.
// R2 wins when both are configured — explicit R2 envs are treated as opt-in.
// Outside production, when neither is configured, a local-filesystem backend
// kicks in so dev/test/demo work with zero cloud setup (see makeLocalBackend).

import { resolve as resolvePath, sep as pathSep } from "node:path"

interface StorageBackend {
  bundleKey(slug: string, version: string): string
  putObject(key: string, bytes: Uint8Array, contentType?: string): Promise<void>
  getSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>
}

export function bundleKey(slug: string, version: string): string {
  return `bundles/${slug}/${version}/bundle.zip`
}

// ── Local filesystem backend (dev only) ──────────────────────────────────────
// Objects live at <root>/<key>; the dev-storage Nitro route serves/accepts them
// over HTTP so signed-URL upload (publish wizard) and download (bundle endpoint)
// both work locally. `resolveLocalKeyPath` is the shared path-traversal guard,
// reused by that route.

const LOCAL_STORAGE_DIR_DEFAULT = ".data/storage"

export function localStorageRoot(): string {
  return resolvePath(process.env.LOCAL_STORAGE_DIR ?? LOCAL_STORAGE_DIR_DEFAULT)
}

export function resolveLocalKeyPath(key: string): string {
  const root = localStorageRoot()
  const full = resolvePath(root, key)
  if (full !== root && !full.startsWith(root + pathSep)) {
    throw new Error(`storage key escapes root: ${key}`)
  }
  return full
}

let _backend: StorageBackend | undefined

async function makeBackend(): Promise<StorageBackend> {
  if (process.env.R2_ACCOUNT_ID) return makeR2Backend()
  if (process.env.SUPABASE_URL) return makeSupabaseBackend()
  if (process.env.NODE_ENV !== "production") return makeLocalBackend()
  throw new Error(
    "Storage is not configured — set either SUPABASE_URL (+ SUPABASE_SERVICE_ROLE_KEY + SUPABASE_BUCKET) " +
      "or R2_ACCOUNT_ID (+ R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET). See .env.example.",
  )
}

export async function useStorage(): Promise<StorageBackend> {
  if (!_backend) _backend = await makeBackend()
  return _backend
}

async function makeSupabaseBackend(): Promise<StorageBackend> {
  const url = requireEnv("SUPABASE_URL")
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  const bucket = process.env.SUPABASE_BUCKET ?? "agentcenter-bundles"
  const { createClient } = await import("@supabase/supabase-js")
  const client = createClient(url, key, { auth: { persistSession: false } })

  return {
    bundleKey,
    async putObject(objectKey, bytes, contentType = "application/octet-stream") {
      const { error } = await client.storage
        .from(bucket)
        .upload(objectKey, bytes, { upsert: true, contentType })
      if (error) throw error
    },
    async getSignedUploadUrl(objectKey, _contentType, expiresInSeconds = 300) {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUploadUrl(objectKey, { upsert: true })
      if (error || !data) throw error ?? new Error("Failed to create signed upload URL")
      void expiresInSeconds
      return data.signedUrl
    },
    async getSignedDownloadUrl(objectKey, expiresInSeconds = 3600) {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(objectKey, expiresInSeconds)
      if (error || !data) throw error ?? new Error("Failed to create signed download URL")
      return data.signedUrl
    },
  }
}

async function makeR2Backend(): Promise<StorageBackend> {
  const accountId = requireEnv("R2_ACCOUNT_ID")
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID")
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY")
  const bucket = process.env.R2_BUCKET ?? "agentcenter-bundles"
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3")
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner")

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  return {
    bundleKey,
    async putObject(objectKey, bytes, contentType = "application/octet-stream") {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: bytes,
          ContentType: contentType,
        }),
      )
    },
    async getSignedUploadUrl(objectKey, contentType, expiresInSeconds = 300) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
      })
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
    },
    async getSignedDownloadUrl(objectKey, expiresInSeconds = 3600) {
      const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
    },
  }
}

export async function makeLocalBackend(): Promise<StorageBackend> {
  const { mkdir, writeFile } = await import("node:fs/promises")
  const { dirname } = await import("node:path")
  const appUrl = (process.env.NUXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "")

  return {
    bundleKey,
    async putObject(objectKey, bytes) {
      const full = resolveLocalKeyPath(objectKey)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, bytes)
    },
    // Upload + download resolve to the dev-storage route, which reads/writes
    // the same on-disk root. No real signing — this backend only runs outside
    // production.
    async getSignedUploadUrl(objectKey) {
      return `${appUrl}/api/dev-storage/${objectKey}`
    },
    async getSignedDownloadUrl(objectKey) {
      return `${appUrl}/api/dev-storage/${objectKey}`
    },
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} env var. See .env.example.`)
  return value
}
