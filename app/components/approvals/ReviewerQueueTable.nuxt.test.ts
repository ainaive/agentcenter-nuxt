// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent, h, nextTick } from "vue"

import ReviewerQueueTable from "./ReviewerQueueTable.vue"

const fetchMock = vi.fn()
const realFetch = (globalThis as { $fetch?: unknown }).$fetch

beforeEach(() => {
  fetchMock.mockReset()
  ;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
})

afterEach(() => {
  ;(globalThis as unknown as { $fetch: unknown }).$fetch = realFetch
})

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  render() { return h("a", { href: this.to }, this.$slots.default?.()) },
})

const TextareaStub = defineComponent({
  name: "TextareaStub",
  props: {
    modelValue: { type: String, default: "" },
    maxlength: { type: Number, required: false },
  },
  emits: ["update:modelValue"],
  render() {
    return h("textarea", {
      value: this.modelValue,
      maxlength: this.maxlength,
      onInput: (e: Event) =>
        this.$emit("update:modelValue", (e.target as HTMLTextAreaElement).value),
    })
  },
})

const stubs = { NuxtLink: NuxtLinkStub, Textarea: TextareaStub }

const ROW = {
  id: "req-1",
  extensionId: "ext-1",
  requestedTier: "productLine" as const,
  subCat: "softDev",
  requestedByUserId: "u-pub",
  reason: "Used by every team.",
  createdAt: "2026-06-01T10:00:00Z",
}

describe("ReviewerQueueTable", () => {
  it("renders the empty state when rows is empty", async () => {
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [] },
      global: { stubs },
    })
    expect(wrapper.text()).toContain("No pending requests")
    expect(wrapper.findAll("li")).toHaveLength(0)
  })

  it("renders one row per request with tier label, subCat label, and reason", async () => {
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    const li = wrapper.find("li")
    expect(li.exists()).toBe(true)
    // Tier label comes from extensions.officialTier.productLine = "Product-Line Official".
    expect(li.text()).toContain("Product-Line Official")
    // SubCat label comes from taxonomy.l1.softDev = "Software Dev".
    expect(li.text()).toContain("Software Dev")
    expect(li.text()).toContain("Used by every team.")
  })

  it("approve POSTs decision=approve with no note and emits refresh on success", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    const approveBtn = wrapper.findAll("button").find((b) => b.text() === "Approve")!
    expect(approveBtn).toBeDefined()
    await approveBtn.trigger("click")
    await nextTick()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/approvals/decide",
      expect.objectContaining({
        method: "POST",
        body: { requestId: "req-1", decision: "approve", note: undefined },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })

  it("reject opens the inline note form; the approve/reject buttons disappear while editing", async () => {
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    expect(wrapper.find("textarea").exists()).toBe(false)
    const rejectBtn = wrapper.findAll("button").find((b) => b.text() === "Reject")!
    await rejectBtn.trigger("click")
    await nextTick()
    expect(wrapper.find("textarea").exists()).toBe(true)
    // The Approve / Reject buttons are gone; Cancel + Confirm reject take over.
    expect(wrapper.findAll("button").map((b) => b.text())).toContain("Confirm reject")
    expect(wrapper.findAll("button").map((b) => b.text())).toContain("Cancel")
  })

  it("confirm reject sends decision=reject with the trimmed note", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Reject")!
      .trigger("click")
    await nextTick()
    await wrapper.find("textarea").setValue("  Missing maintainer contact.  ")
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Confirm reject")!
      .trigger("click")
    await nextTick()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/approvals/decide",
      expect.objectContaining({
        method: "POST",
        body: {
          requestId: "req-1",
          decision: "reject",
          note: "Missing maintainer contact.",
        },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })

  it("cancel reject closes the inline form without firing $fetch", async () => {
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Reject")!
      .trigger("click")
    await nextTick()
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Cancel")!
      .trigger("click")
    await nextTick()
    expect(wrapper.find("textarea").exists()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reject with an empty note sends note=undefined (so the reviewer can decline without writing anything)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Reject")!
      .trigger("click")
    await nextTick()
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Confirm reject")!
      .trigger("click")
    await nextTick()
    const body = fetchMock.mock.calls[0]![1].body as Record<string, unknown>
    expect(body.note).toBeUndefined()
  })

  it("a failed decide keeps the UI in the inline form and does NOT emit refresh", async () => {
    fetchMock.mockRejectedValueOnce(new Error("server down"))
    const wrapper = await mountSuspended(ReviewerQueueTable, {
      props: { rows: [ROW] },
      global: { stubs },
    })
    const approveBtn = wrapper.findAll("button").find((b) => b.text() === "Approve")!
    await approveBtn.trigger("click")
    await nextTick()
    await nextTick()
    expect(wrapper.emitted("refresh")).toBeUndefined()
  })
})
