import { verifications } from "~~/shared/db/schema/auth"

const EXPIRY_MS = 10 * 60 * 1000

function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `${part()}-${part()}`
}

export default defineEventHandler(async (event) => {
  const deviceCode = crypto.randomUUID()
  const userCode = generateUserCode()
  const expiresAt = new Date(Date.now() + EXPIRY_MS)
  const db = useDb()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(verifications).values({
        id: crypto.randomUUID(),
        identifier: `dc:poll:${deviceCode}`,
        value: JSON.stringify({ userCode, authorized: false, token: null, userId: null }),
        expiresAt,
      })
      await tx.insert(verifications).values({
        id: crypto.randomUUID(),
        identifier: `dc:user:${userCode}`,
        value: deviceCode,
        expiresAt,
      })
    })
  } catch (err) {
    console.error("[device/code] db error:", err)
    apiError(event, "Failed to create device code.", 500, "server_error")
  }

  return {
    deviceCode,
    userCode,
    verificationUri: "/cli/auth",
    expiresIn: EXPIRY_MS / 1000,
  }
})
