import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { localStorageRoot, makeLocalBackend, resolveLocalKeyPath } from "./storage"

let dir: string
const prev = process.env.LOCAL_STORAGE_DIR

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "acstore-"))
  process.env.LOCAL_STORAGE_DIR = dir
})

afterAll(() => {
  if (prev === undefined) delete process.env.LOCAL_STORAGE_DIR
  else process.env.LOCAL_STORAGE_DIR = prev
  rmSync(dir, { recursive: true, force: true })
})

describe("local storage backend", () => {
  it("resolves a key under the configured root", () => {
    const p = resolveLocalKeyPath("bundles/x/1.0.0/bundle.zip")
    expect(p.startsWith(localStorageRoot())).toBe(true)
  })

  it("rejects keys that escape the root (path traversal)", () => {
    expect(() => resolveLocalKeyPath("../escape.zip")).toThrow()
    expect(() => resolveLocalKeyPath("bundles/../../etc/passwd")).toThrow()
  })

  it("putObject writes bytes that read back identically", async () => {
    const backend = await makeLocalBackend()
    const key = "bundles/demo/1.0.0/bundle.zip"
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    await backend.putObject(key, bytes, "application/zip")
    expect(new Uint8Array(readFileSync(resolveLocalKeyPath(key)))).toEqual(bytes)
  })

  it("signs download/upload URLs to the dev-storage route", async () => {
    const backend = await makeLocalBackend()
    const key = "bundles/demo/1.0.0/bundle.zip"
    expect(await backend.getSignedDownloadUrl(key)).toContain(`/api/dev-storage/${key}`)
    expect(await backend.getSignedUploadUrl(key, "application/zip")).toContain(
      `/api/dev-storage/${key}`,
    )
  })
})
