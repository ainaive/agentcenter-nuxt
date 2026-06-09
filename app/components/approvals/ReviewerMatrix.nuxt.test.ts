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
  coveringCells: [],
}

const ADMINS = [
  // Skills × company × all wildcard — Amy.
  {
    id: "adm-skills-co-all",
    extensionCategory: "skills" as const,
    tier: "company" as const,
    productLineId: null,
    categoryLevel: "all" as const,
    categoryKey: "*",
    userId: "u-amy",
    userEmail: "amy.example.test",
    userName: null,
    canEdit: true,
  },
  // Skills × productLine wireless × macro=softDev — Ben.
  {
    id: "adm-skills-pl-macro",
    extensionCategory: "skills" as const,
    tier: "productLine" as const,
    productLineId: "wireless",
    categoryLevel: "macro" as const,
    categoryKey: "softDev",
    userId: "u-ben",
    userEmail: "ben.example.test",
    userName: "Ben Park",
    canEdit: true,
  },
  // MCP × company × micro=reqAnalysis — Cory. Lives on a different
  // extensionCategory tab, so the default (skills) view should NOT
  // surface this row.
  {
    id: "adm-mcp-co-micro",
    extensionCategory: "mcp" as const,
    tier: "company" as const,
    productLineId: null,
    categoryLevel: "micro" as const,
    categoryKey: "reqAnalysis",
    userId: "u-cory",
    userEmail: "cory.example.test",
    userName: "Cory",
    canEdit: true,
  },
]

describe("ReviewerMatrix (unified)", () => {
  it("renders one column per (Company + product line) for the active ext-type", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    const headers = wrapper.findAll("thead th")
    // Row-label column + Company + 2 product lines.
    expect(headers).toHaveLength(4)
    expect(headers[1]!.text()).toContain("Company Official")
    expect(headers[2]!.text()).toContain("Wireless")
    expect(headers[3]!.text()).toContain("Datacom")
  })

  it("renders the All row plus 9 macro rows (micros collapsed by default)", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    // tbody rows = All (1) + macros (9) + micros that are rendered for
    // expanded macros (0 by default). Vue's v-show keeps collapsed rows
    // in the DOM, so we count visible ones via [aria-expanded].
    const macroToggles = wrapper.findAll("th[scope='row'] button[aria-expanded]")
    expect(macroToggles).toHaveLength(9)
    expect(
      macroToggles.every((b) => b.attributes("aria-expanded") === "false"),
    ).toBe(true)
  })

  it("expanding a macro row reveals its three micro rows", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    const sysDesignToggle = wrapper
      .findAll("th[scope='row'] button[aria-expanded]")
      .find((b) => b.text().includes("System Design"))
    await sysDesignToggle!.trigger("click")
    await nextTick()
    expect(sysDesignToggle!.attributes("aria-expanded")).toBe("true")
    // The three l2 children of systemDesign now have visible rows.
    expect(wrapper.text()).toContain("Requirements Analysis")
    expect(wrapper.text()).toContain("Functional Design")
    expect(wrapper.text()).toContain("Architecture Design")
  })

  it("filters cells by extensionCategory — MCP chips don't show in the Skills tab", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: ADMINS,
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    // Skills tab is default.
    expect(wrapper.text()).toContain("amy.example.test")
    expect(wrapper.text()).toContain("Ben Park")
    expect(wrapper.text()).not.toContain("Cory")

    // Switch to MCP — only Cory's chip surfaces.
    const mcpTab = wrapper
      .findAll("button[role='tab']")
      .find((b) => b.text().includes("MCP"))
    await mcpTab!.trigger("click")
    await nextTick()
    expect(wrapper.text()).toContain("Cory")
    expect(wrapper.text()).not.toContain("amy.example.test")
    expect(wrapper.text()).not.toContain("Ben Park")
  })

  it("renders email as the chip label when name is null", async () => {
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: ADMINS,
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    // Amy has userName=null — chip falls back to email.
    expect(wrapper.text()).toContain("amy.example.test")
  })

  it("posts the 5-coord payload when adding to a macro cell", async () => {
    fetchMock
      .mockResolvedValueOnce({
        user: { id: "u-dee", email: "dee.example.test", name: "Dee" },
      })
      .mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: [],
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    // The All-row × Company cell renders its "+ Add" button first in
    // iteration order, then each product-line column. Click the first
    // one we find that isn't a tab.
    const addBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Add") && !b.attributes("role"))
    await addBtn!.trigger("click")
    await nextTick()
    await wrapper.find('input[type="email"]').setValue("dee.example.test")
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Add admin")!
      .trigger("click")
    await nextTick()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/internal/admin/reviewers/assign",
      expect.objectContaining({
        method: "POST",
        body: {
          extensionCategory: "skills",
          tier: "company",
          productLineId: undefined,
          categoryLevel: "all",
          categoryKey: "*",
          userId: "u-dee",
        },
      }),
    )
    expect(wrapper.emitted("refresh")).toHaveLength(1)
  })

  it("hides the '+ Add' tile in cells the viewer's coveringCells don't reach", async () => {
    // Viewer is a Skills × productLine=wireless × macro=softDev admin
    // (not a super-admin). They can edit (skills, wireless × any cat
    // under softDev) and nothing else. The All row's wireless cell
    // should have NO add button (level='all' is not covered by a
    // macro=softDev admin).
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: [],
        productLines: PRODUCT_LINES,
        viewer: {
          isSuperAdmin: false,
          coveringCells: [
            {
              extensionCategory: "skills",
              tier: "productLine",
              productLineId: "wireless",
              categoryLevel: "macro",
              categoryKey: "softDev",
            },
          ],
        },
      },
      global: { stubs },
    })
    // Expand softDev so we can inspect both the macro and micro rows.
    const softDevToggle = wrapper
      .findAll("th[scope='row'] button[aria-expanded]")
      .find((b) => b.text().includes("Software Dev"))
    await softDevToggle!.trigger("click")
    await nextTick()

    // Editable cells: macro=softDev × wireless + each of its 3 micro
    // rows × wireless = 4 add tiles. The Company column on the same rows
    // is NOT covered (a PL admin can't reach the Company column).
    const addCount = wrapper
      .findAll("button")
      .filter((b) => b.text().includes("Add") && !b.attributes("role"))
      .length
    expect(addCount).toBe(4)
  })

  it("DELETE calls unassign with the row id", async () => {
    fetchMock.mockResolvedValue({ ok: true })
    const wrapper = await mountSuspended(ReviewerMatrix, {
      props: {
        admins: ADMINS,
        productLines: PRODUCT_LINES,
        viewer: SUPER_VIEWER,
      },
      global: { stubs },
    })
    // Amy's chip in the All × Company cell has the remove button.
    const removeBtn = wrapper
      .findAll("button[aria-label]")
      .find((b) => b.attributes("aria-label")?.includes("Remove"))
    await removeBtn!.trigger("click")
    await nextTick()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/admin/reviewers/unassign",
      expect.objectContaining({
        method: "DELETE",
        body: { id: "adm-skills-co-all" },
      }),
    )
  })
})
