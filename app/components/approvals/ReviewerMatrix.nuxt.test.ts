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

const PRODUCT_LINES = [
  { id: "wireless", labelEn: "Wireless", labelZh: "无线", sortOrder: 10 },
  { id: "datacom", labelEn: "Datacom", labelZh: "数通", sortOrder: 20 },
]

const SUPER_VIEWER = {
  isSuperAdmin: true,
  companySubCats: [] as string[],
}

const REVIEWERS = [
  {
    id: "rev-pl",
    tier: "productLine" as const,
    subCat: "softDev",
    productLineId: "wireless" as string | null,
    userId: "u-ben",
    userEmail: "ben.example.test",
    userName: "Ben Park",
    canEdit: true,
  },
  {
    id: "rev-co",
    tier: "company" as const,
    subCat: "softDev",
    productLineId: null as string | null,
    userId: "u-amy",
    userEmail: "amy.example.test",
    userName: null,
    canEdit: true,
  },
]

describe("ReviewerMatrix shell", () => {
  it("defaults to the Company tab and renders one Company-tier column", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        reviewers: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    // Company tab is active → 9 subCat rows × 1 tier column.
    const bodyRows = wrapper.findAll("tbody tr")
    expect(bodyRows).toHaveLength(9)
    const headers = wrapper.findAll("thead th")
    expect(headers).toHaveLength(2)
    expect(headers[1]!.text()).toContain("Company Official")
  })

  it("switching to the Product-Line tab renders one column per product line", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        reviewers: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    const plTab = wrapper
      .findAll("button[role='tab']")
      .find((b) => b.text().includes("Product-Line"))
    await plTab!.trigger("click")
    await nextTick()
    const headers = wrapper.findAll("thead th")
    // SubCat column + 2 product lines.
    expect(headers).toHaveLength(3)
    expect(headers[1]!.text()).toContain("Wireless")
    expect(headers[2]!.text()).toContain("Datacom")
  })

  it("renders the existing company-tier chip with email fallback when name is null", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        reviewers: REVIEWERS,
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    expect(wrapper.text()).toContain("amy.example.test")
  })

  it("renders the existing productLine-tier chip in the right cell after switching tabs", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        reviewers: REVIEWERS,
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    const plTab = wrapper
      .findAll("button[role='tab']")
      .find((b) => b.text().includes("Product-Line"))
    await plTab!.trigger("click")
    await nextTick()
    expect(wrapper.text()).toContain("Ben Park")
  })

  it("posts /assign with productLineId when adding to a productLine cell", async () => {
    fetchMock
      .mockResolvedValueOnce({ user: { id: "u-cory", email: "cory.example.test", name: "Cory" } })
      .mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        reviewers: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    const plTab = wrapper
      .findAll("button[role='tab']")
      .find((b) => b.text().includes("Product-Line"))
    await plTab!.trigger("click")
    await nextTick()
    // First "+ Add" button in the productLine grid sits at
    // (systemDesign × wireless) — the first cell in iteration order.
    const addBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Add") && !b.attributes("role"))
    await addBtn!.trigger("click")
    await nextTick()
    await wrapper.find('input[type="email"]').setValue("cory.example.test")
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Add reviewer")!
      .trigger("click")
    await nextTick()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/internal/admin/reviewers/assign",
      expect.objectContaining({
        method: "POST",
        body: {
          tier: "productLine",
          subCat: "systemDesign",
          productLineId: "wireless",
          userId: "u-cory",
        },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })

  it("greys non-editable productLine cells when the viewer is not authorised", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        reviewers: [],
        productLines: PRODUCT_LINES,
        viewer: {
          isSuperAdmin: false,
          companySubCats: ["cloud"],
        },
      },
      global: { stubs },
    })
    const plTab = wrapper
      .findAll("button[role='tab']")
      .find((b) => b.text().includes("Product-Line"))
    await plTab!.trigger("click")
    await nextTick()
    // Cells outside subCat='cloud' have no "+ Add" button rendered.
    const addCount = wrapper
      .findAll("button")
      .filter((b) => b.text().includes("Add") && !b.attributes("role"))
      .length
    // Two product lines × 1 editable subCat = 2 add buttons.
    expect(addCount).toBe(2)
  })
})
