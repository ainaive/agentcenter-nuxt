// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import { slugFromName, usePublishWizard } from "./usePublishWizard"

// `$fetch` is a Nitro global, not a Nuxt auto-import — mockNuxtImport can't
// touch it. Override the global directly. This is what `useAsyncData` /
// the composable's `$fetch(...)` call resolves to at runtime.
const fetchMock = vi.fn()
const realFetch = (globalThis as { $fetch?: unknown }).$fetch

beforeEach(() => {
  fetchMock.mockReset()
  ;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
})

afterEach(() => {
  ;(globalThis as unknown as { $fetch: unknown }).$fetch = realFetch
})

describe("slugFromName (pure)", () => {
  it("lowercases and replaces non-alphanumerics with single dashes", () => {
    expect(slugFromName("Hello World")).toBe("hello-world")
    expect(slugFromName("Foo & Bar — Baz")).toBe("foo-bar-baz")
  })

  it("strips leading and trailing dashes", () => {
    expect(slugFromName("  hi  ")).toBe("hi")
    expect(slugFromName("__abc__")).toBe("abc")
  })

  it("caps at 40 chars", () => {
    expect(slugFromName("a".repeat(50)).length).toBe(40)
  })

  it("returns the empty string for input with no alphanumerics", () => {
    expect(slugFromName("!!!---???")).toBe("")
  })
})

describe("usePublishWizard — initial state", () => {
  it("starts at step 0 with empty defaults when no init data is passed", () => {
    const w = usePublishWizard()
    expect(w.step.value).toBe(0)
    expect(w.form.slug).toBe("")
    expect(w.bundleUploaded.value).toBe(false)
    expect(w.isLocked.value).toBe(false)
  })

  it("starts at step 1 (Bundle) when init has an extensionId but no bundleUploaded", () => {
    const w = usePublishWizard({ extensionId: "ext-1", versionId: "ver-1" })
    expect(w.step.value).toBe(1)
    expect(w.isLocked.value).toBe(true)
  })

  it("starts at step 3 (Review) when init has bundleUploaded", () => {
    const w = usePublishWizard({
      extensionId: "ext-1",
      versionId: "ver-1",
      bundleUploaded: true,
    })
    expect(w.step.value).toBe(3)
  })
})

describe("usePublishWizard — auto-slug", () => {
  it("derives slug from name on first edit", async () => {
    const w = usePublishWizard()
    w.form.name = "Hello World"
    await nextTick()
    expect(w.form.slug).toBe("hello-world")
  })

  it("stops overwriting slug once the user hand-edits it", async () => {
    const w = usePublishWizard()
    w.form.name = "Initial Name"
    await nextTick()
    expect(w.form.slug).toBe("initial-name")
    w.form.slug = "my-custom-slug"
    w.form.name = "New Name"
    await nextTick()
    expect(w.form.slug).toBe("my-custom-slug")
  })
})

describe("usePublishWizard — validity gates", () => {
  it("basicsValid requires name length 2..80, slug pattern, semver, summary length", () => {
    const w = usePublishWizard()
    expect(w.basicsValid.value).toBe(false)

    w.form.name = "Skill"
    w.form.slug = "valid-slug"
    w.form.version = "1.0.0"
    w.form.summary = "ok"
    expect(w.basicsValid.value).toBe(true)

    w.form.version = "not-a-semver"
    expect(w.basicsValid.value).toBe(false)
    w.form.version = "1.0.0"

    w.form.slug = "no"
    expect(w.basicsValid.value).toBe(false)
  })

  it("listingValid requires at least one tag and a non-empty readme", () => {
    const w = usePublishWizard()
    expect(w.listingValid.value).toBe(false)
    w.form.tagIds = ["one"]
    expect(w.listingValid.value).toBe(false)
    w.form.readmeMd = "## hi"
    expect(w.listingValid.value).toBe(true)
  })

  it("canSubmit composes basics + bundle + listing", () => {
    const w = usePublishWizard()
    w.form.name = "Skill"
    w.form.slug = "skill-x"
    w.form.version = "1.0.0"
    w.form.summary = "ok"
    w.form.tagIds = ["one"]
    w.form.readmeMd = "## hi"
    expect(w.canSubmit.value).toBe(false)
    w.markBundleUploaded()
    expect(w.canSubmit.value).toBe(true)
  })
})

function fillBasics(w: ReturnType<typeof usePublishWizard>) {
  w.form.name = "Skill"
  w.form.slug = "skill-x"
  w.form.version = "1.0.0"
  w.form.summary = "ok"
}

describe("usePublishWizard — advanceFromBasics", () => {
  it("calls create-draft on first advance and stores returned ids", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      extensionId: "ext-1",
      versionId: "ver-1",
    })
    const w = usePublishWizard()
    fillBasics(w)
    const ok = await w.advanceFromBasics()
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/publish/create-draft",
      expect.objectContaining({ method: "POST" }),
    )
    expect(w.extensionId.value).toBe("ext-1")
    expect(w.versionId.value).toBe("ver-1")
    expect(w.step.value).toBe(1)
  })

  it("calls update-draft on subsequent advances when extensionId is already set", async () => {
    fetchMock.mockResolvedValueOnce(undefined)
    const w = usePublishWizard({ extensionId: "ext-1", versionId: "ver-1" })
    fillBasics(w)
    const ok = await w.advanceFromBasics()
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/publish/update-draft",
      expect.any(Object),
    )
  })

  it("populates error and stays on the step when $fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce({
      data: { error: "slug_taken", detail: "Another extension already uses this slug." },
    })
    const w = usePublishWizard()
    fillBasics(w)
    const ok = await w.advanceFromBasics()
    expect(ok).toBe(false)
    expect(w.error.value?.msg).toBe("slug_taken")
    expect(w.step.value).toBe(0)
  })

  it("returns false without calling $fetch when basics are invalid", async () => {
    const w = usePublishWizard()
    const ok = await w.advanceFromBasics()
    expect(ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("usePublishWizard — submit", () => {
  it("calls update-draft + submit and advances to step 4 on success", async () => {
    fetchMock.mockResolvedValue(undefined)
    const w = usePublishWizard({
      extensionId: "ext-1",
      versionId: "ver-1",
      bundleUploaded: true,
    })
    fillBasics(w)
    w.form.tagIds = ["one"]
    w.form.readmeMd = "## hi"

    const ok = await w.submit()
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/publish/update-draft",
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/publish/submit",
      expect.any(Object),
    )
    expect(w.step.value).toBe(4)
  })

  it("populates error and stays on the current step when submit fails", async () => {
    fetchMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ data: { error: "scan_failed" } })
    const w = usePublishWizard({
      extensionId: "ext-1",
      versionId: "ver-1",
      bundleUploaded: true,
    })
    fillBasics(w)
    w.form.tagIds = ["one"]
    w.form.readmeMd = "## hi"
    w.step.value = 3

    const ok = await w.submit()
    expect(ok).toBe(false)
    expect(w.error.value?.msg).toBe("scan_failed")
    expect(w.step.value).toBe(3)
  })

  it("returns false without calling $fetch when canSubmit is false", async () => {
    const w = usePublishWizard()
    const ok = await w.submit()
    expect(ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("usePublishWizard — misc transitions", () => {
  it("jumpTo sets step directly", () => {
    const w = usePublishWizard()
    w.jumpTo(2)
    expect(w.step.value).toBe(2)
  })

  it("markBundleUploaded flips the flag", () => {
    const w = usePublishWizard()
    expect(w.bundleUploaded.value).toBe(false)
    w.markBundleUploaded()
    expect(w.bundleUploaded.value).toBe(true)
  })

  it("setError populates and clearError nulls out the error state", () => {
    const w = usePublishWizard()
    w.setError("msg", "detail")
    expect(w.error.value).toEqual({ msg: "msg", detail: "detail" })
    w.clearError()
    expect(w.error.value).toBeNull()
  })
})
