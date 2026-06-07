// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent, h, nextTick } from "vue"

import SectionRequests from "./SectionRequests.vue"
import type { ProfileRequestRow } from "~~/shared/types"

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

const stubs = { NuxtLink: NuxtLinkStub }

function row(overrides: Partial<ProfileRequestRow> = {}): ProfileRequestRow {
  return {
    requestId: "req-1",
    extensionId: "ext-1",
    slug: "web-search-pro",
    name: "Web Search Pro",
    category: "skills",
    iconColor: "#4f6ef7",
    requestedTier: "productLine",
    subCat: "docs",
    status: "pending",
    reason: null,
    reviewerNote: null,
    createdAt: "2026-06-01T10:00:00Z",
    decidedAt: null,
    ...overrides,
  }
}

describe("SectionRequests", () => {
  it("renders the empty state when rows is empty", async () => {
    const wrapper = await mountSuspended(SectionRequests, {
      props: { rows: [] },
      global: { stubs },
    })
    expect(wrapper.text()).toContain("No approval requests yet")
    expect(wrapper.findAll("li")).toHaveLength(0)
  })

  it("renders the tier chip, status chip, and requested-on date for every row", async () => {
    const wrapper = await mountSuspended(SectionRequests, {
      props: { rows: [row()] },
      global: { stubs },
    })
    const li = wrapper.find("li")
    expect(li.text()).toContain("Product-Line Official")
    expect(li.text()).toContain("Pending")
    expect(li.text()).toContain("Web Search Pro")
  })

  it("decidedOn timestamp and reviewer note both render only when present", async () => {
    const pending = await mountSuspended(SectionRequests, {
      props: { rows: [row()] },
      global: { stubs },
    })
    expect(pending.text()).not.toContain("Decided")
    expect(pending.text()).not.toContain("Reviewer note")

    const rejected = await mountSuspended(SectionRequests, {
      props: {
        rows: [
          row({
            status: "rejected",
            decidedAt: "2026-06-05T10:00:00Z",
            reviewerNote: "Needs a maintainer contact.",
          }),
        ],
      },
      global: { stubs },
    })
    expect(rejected.text()).toContain("Decided")
    expect(rejected.text()).toContain("Reviewer note")
    expect(rejected.text()).toContain("Needs a maintainer contact.")
  })

  it("withdraw button only renders for pending rows", async () => {
    const pending = await mountSuspended(SectionRequests, {
      props: { rows: [row()] },
      global: { stubs },
    })
    expect(pending.findAll("button").some((b) => b.text() === "Withdraw")).toBe(
      true,
    )
    const approved = await mountSuspended(SectionRequests, {
      props: { rows: [row({ status: "approved", decidedAt: "2026-06-05T10:00:00Z" })] },
      global: { stubs },
    })
    expect(approved.findAll("button").some((b) => b.text() === "Withdraw")).toBe(
      false,
    )
  })

  it("withdraw POSTs to /withdraw with the requestId and emits refresh", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(SectionRequests, {
      props: { rows: [row()] },
      global: { stubs },
    })
    const btn = wrapper.findAll("button").find((b) => b.text() === "Withdraw")!
    await btn.trigger("click")
    await nextTick()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/approvals/withdraw",
      expect.objectContaining({
        method: "POST",
        body: { requestId: "req-1" },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })

  it("a failed withdraw does not emit refresh", async () => {
    fetchMock.mockRejectedValueOnce(new Error("server down"))
    const wrapper = await mountSuspended(SectionRequests, {
      props: { rows: [row()] },
      global: { stubs },
    })
    const btn = wrapper.findAll("button").find((b) => b.text() === "Withdraw")!
    await btn.trigger("click")
    await nextTick()
    await nextTick()
    expect(wrapper.emitted("refresh")).toBeUndefined()
  })
})
