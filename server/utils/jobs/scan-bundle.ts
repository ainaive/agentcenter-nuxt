import { unzipSync } from "fflate"
import { parse } from "smol-toml"
import { z } from "zod"

import * as filesRepo from "~~/server/repositories/files"
import { BundleManifestSchema } from "~~/shared/validators/manifest"

import {
  recordScanResult,
  VersionStateError,
} from "../extensions-state"
import { inngest } from "../inngest"

const eventDataSchema = z.object({
  versionId: z.string().min(1),
  fileId: z.string().min(1),
})

export const scanBundle = inngest.createFunction(
  {
    id: "scan-bundle",
    triggers: [{ event: "extension/scan.requested" }],
  },
  async ({ event, step }) => {
    const parsedEvent = eventDataSchema.safeParse(event.data)
    if (!parsedEvent.success) {
      console.error("[scan-bundle] invalid event payload", parsedEvent.error)
      return { ok: false, reason: "invalid_event" }
    }
    const { versionId, fileId } = parsedEvent.data

    const scanResult = await step.run("download-and-scan", async () => {
      const db = useDb()
      const fileRow = await filesRepo.findById(db, fileId)
      if (!fileRow) return { ok: false as const, reason: "file_not_found", checksum: "" }

      const storage = await useStorage()
      const signedUrl = await storage.getSignedDownloadUrl(fileRow.r2Key, 120)
      const res = await fetch(signedUrl)
      if (!res.ok) throw new Error(`storage fetch failed: ${res.status}`)
      const arrayBuf = await res.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuf)

      const hashBuf = await crypto.subtle.digest("SHA-256", uint8)
      const checksum = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      let entries: ReturnType<typeof unzipSync>
      try {
        entries = unzipSync(uint8)
      } catch (err) {
        console.error("[scan-bundle] unzip failed", err)
        return { ok: false as const, reason: "invalid_zip", checksum }
      }
      const manifestEntry = entries["manifest.toml"]
      if (!manifestEntry) {
        return { ok: false as const, reason: "missing_manifest", checksum }
      }

      let raw: unknown
      try {
        raw = parse(new TextDecoder().decode(manifestEntry))
      } catch {
        return { ok: false as const, reason: "invalid_toml", checksum }
      }

      const parsed = BundleManifestSchema.safeParse(raw)
      if (!parsed.success) {
        return {
          ok: false as const,
          reason: parsed.error.issues[0]?.message ?? "schema_error",
          checksum,
        }
      }
      return { ok: true as const, checksum }
    })

    const scanReport = {
      manifestOk: scanResult.ok,
      reason: scanResult.ok ? null : scanResult.reason,
      checksum: scanResult.checksum,
      scannedAt: new Date().toISOString(),
    }

    await step.run("record-scan-result", async () => {
      try {
        if (scanResult.ok) {
          await recordScanResult(versionId, fileId, {
            ok: true,
            checksum: scanResult.checksum,
            scanReport,
          })
        } else {
          await recordScanResult(versionId, fileId, {
            ok: false,
            reason: scanResult.reason,
            scanReport,
          })
        }
      } catch (err) {
        if (err instanceof VersionStateError) {
          console.warn(
            `[scan-bundle] version ${versionId} state transition rejected (${err.code}); treating as idempotent retry`,
          )
          return
        }
        throw err
      }
    })

    if (!scanResult.ok) return { ok: false, reason: scanResult.reason }

    await step.sendEvent("enqueue-index", {
      name: "extension/index.requested",
      data: { versionId },
    })

    return { ok: true, checksum: scanResult.checksum }
  },
)
