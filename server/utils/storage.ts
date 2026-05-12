// Pluggable storage backend. Activated by env: setting R2_ACCOUNT_ID picks
// the Cloudflare R2 backend; otherwise SUPABASE_URL picks Supabase Storage.
// R2 wins when both are configured — explicit R2 envs are treated as opt-in.

interface StorageBackend {
  bundleKey(slug: string, version: string): string
  getSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>
}

export function bundleKey(slug: string, version: string): string {
  return `bundles/${slug}/${version}/bundle.zip`
}

let _backend: StorageBackend | undefined

async function makeBackend(): Promise<StorageBackend> {
  if (process.env.R2_ACCOUNT_ID) return makeR2Backend()
  if (process.env.SUPABASE_URL) return makeSupabaseBackend()
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

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} env var. See .env.example.`)
  return value
}
