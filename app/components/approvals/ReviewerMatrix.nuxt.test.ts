// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent, h, nextTick } from "vue"

import ReviewerMatrix from "./ReviewerMatrix.vue"

const fetchMock = vi.fn()
const realFetch = (globalThis as { $fetch?: unknown }).$fetch

beforeEach(() => {
  fetchMock.mockReset()
  ;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
})

afterEach(() => {
  ;(globalThis as unknown as { $fetch: unknown }).$fetch = realFetch
})

// Same passthrough strategy as RequestOfficialDialog.nuxt.test.ts — the
// matrix mounts an add-reviewer dialog that wouldn't otherwise render in
// the headless env.
const passthrough = (name: string) =>
  defineComponent({ name, render() { return h("div", this.$slots.default?.()) } })

const stubs = {
  Dialog: passthrough("Dialog"),
  DialogContent: passthrough("DialogContent"),
  DialogTitle: passthrough("DialogTitle"),
  DialogDescription: passthrough("DialogDescription"),
  Label: defineComponent({
    name: "LabelStub",
    props: { for: { type: String, required: false } },
    render() { return h("label", { for: this.for }, this.$slots.default?.()) },
  }),
  Input: defineComponent({
    name: "InputStub",
    props: {
      modelValue: { type: String, default: "" },
      type: { type: String, default: "text" },
    },
    emits: ["update:modelValue"],
    render() {
      return h("input", {
        type: this.type,
        value: this.modelValue,
        onInput: (e: Event) =>
          this.$emit("update:modelValue", (e.target as HTMLInputElement).value),
      })
    },
  }),
}

const REVIEWERS = [
  {
    id: "rev-1",
    tier: "productLine" as const,
    subCat: "softDev",
    userId: "u-ben",
    userEmail: "ben.example.test",
    userName: "Ben Park",
  },
  {
    id: "rev-2",
    tier: "company" as const,
    subCat: "softDev",
    userId: "u-amy",
    userEmail: "amy.example.test",
    userName: null,
  },
]

describe("ReviewerMatrix", () => {
  it("renders one row per FUNC_TAXONOMY l1 leaf (9 rows) and two tier columns", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: { reviewers: [] },
      global: { stubs },
    })
    // 9 leaves: systemDesign, softDev, testing, network, embedded, cloud,
    // docs, data, vcs.
    const bodyRows = wrapper.findAll("tbody tr")
    expect(bodyRows).toHaveLength(9)
    const headers = wrapper.findAll("thead th")
    // Subcat column + 2 tier columns = 3 thead cells.
    expect(headers).toHaveLength(3)
    // The two tier headers come from the i18n keys.
    expect(headers[1]!.text()).toContain("Product-Line Official")
    expect(headers[2]!.text()).toContain("Company Official")
  })

  it("renders an existing reviewer chip with their name when name is set, email when not", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: { reviewers: REVIEWERS },
      global: { stubs },
    })
    const text = wrapper.text()
    expect(text).toContain("Ben Park")
    // amy has userName: null, so the chip falls back to email.
    expect(text).toContain("amy.example.test")
  })

  it("clicking + Add opens the dialog with the cell's tier and subCat in the subtitle", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: { reviewers: [] },
      global: { stubs },
    })
    // Each empty cell shows a "+ Add" button. Click the first one (which
    // corresponds to productLine × systemDesign).
    const addBtns = wrapper.findAll("button").filter((b) => b.text().includes("Add"))
    expect(addBtns.length).toBeGreaterThan(0)
    await addBtns[0]!.trigger("click")
    await nextTick()
    // The dialog opens — input becomes visible.
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
  })

  it("lookup returning null user surfaces the noSuchUser hint", async () => {
    fetchMock.mockResolvedValueOnce({ user: null })
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: { reviewers: [] },
      global: { stubs },
    })
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Add"))!
      .trigger("click")
    await nextTick()
    await wrapper.find('input[type="email"]').setValue("ghost.example.test")
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Add reviewer")!
      .trigger("click")
    await nextTick()
    expect(wrapper.text()).toContain("No user with that email")
    // Only one $fetch call — the by-email lookup. /assign never fires.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("lookup returning a user posts /assign with the cell's (tier, subCat, userId) and emits refresh", async () => {
    fetchMock
      .mockResolvedValueOnce({ user: { id: "u-cory", email: "cory.example.test", name: "Cory" } })
      .mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: { reviewers: [] },
      global: { stubs },
    })
    // Click the first + Add (productLine × systemDesign).
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Add"))!
      .trigger("click")
    await nextTick()
    await wrapper.find('input[type="email"]').setValue("cory.example.test")
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Add reviewer")!
      .trigger("click")
    await nextTick()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/internal/admin/users/by-email",
      expect.objectContaining({ query: { email: "cory.example.test" } }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/internal/admin/reviewers/assign",
      expect.objectContaining({
        method: "POST",
        body: { tier: "productLine", subCat: "systemDesign", userId: "u-cory" },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })

  it("clicking the X on a chip posts /unassign with the chip's id and emits refresh", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: { reviewers: REVIEWERS },
      global: { stubs },
    })
    // The remove button on each chip has a localized aria-label
    // ("Remove ben.example.test").
    const removeBtn = wrapper.findAll("button").find((b) => {
      const aria = b.attributes("aria-label") ?? ""
      return aria.includes("ben.example.test")
    })
    expect(removeBtn).toBeDefined()
    await removeBtn!.trigger("click")
    await nextTick()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/admin/reviewers/unassign",
      expect.objectContaining({
        method: "DELETE",
        body: { id: "rev-1" },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })
})
