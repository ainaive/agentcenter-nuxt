// @vitest-environment nuxt
import { describe, expect, it, vi } from "vitest"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { computed, defineComponent, h, ref } from "vue"
import type { Filters } from "~~/shared/validators/filters"
import FuncCategoryPicker from "./FuncCategoryPicker.vue"

// Stub the Popover primitives so the picker's content is unconditionally
// rendered in tests — we only care about logic, not portal/Teleport.
const Pass = defineComponent({
  name: "PopoverPass",
  setup: (_, { slots }) => () => h("div", slots.default?.()),
})

const stubs = {
  Popover: Pass,
  PopoverTrigger: Pass,
  PopoverContent: Pass,
}

// useFilters is the picker's only contact with the URL. Mock it directly
// so we can read what the picker tries to write without going through
// vue-router (which behaves oddly under mountSuspended's isolated app).
const updateSpy = vi.fn()
const filtersRef = ref<Filters>({})

mockNuxtImport("useFilters", () => () => ({
  filters: computed(() => filtersRef.value),
  update: (partial: Partial<Filters>) => {
    updateSpy(partial)
    filtersRef.value = { ...filtersRef.value, ...partial }
  },
  hrefForFilters: () => "/extensions",
}))

function mount(initial: Filters = {}) {
  updateSpy.mockClear()
  filtersRef.value = initial
  return mountSuspended(FuncCategoryPicker, { global: { stubs } })
}

describe("FuncCategoryPicker", () => {
  it("trigger label reads 'All functions' when no funcCat is selected", async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain("All functions")
  })

  it("trigger label reflects the active funcCat / subCat / l2 trail", async () => {
    const wrapper = await mount({
      funcCat: "workTask",
      subCat: "systemDesign",
      l2: "archDesign",
    })
    const text = wrapper.text()
    expect(text).toContain("Work Task")
    expect(text).toContain("System Design")
    expect(text).toContain("Architecture Design")
  })

  it("writes funcCat alone when the user picks a top-level row", async () => {
    const wrapper = await mount()
    const businessRow = wrapper.findAll("button").find((b) =>
      b.text().trim() === "Business",
    )
    expect(businessRow).toBeDefined()
    await businessRow!.trigger("click")
    expect(updateSpy).toHaveBeenCalledWith({
      funcCat: "business",
      subCat: undefined,
      l2: undefined,
    })
  })

  it("writes the full funcCat / subCat / l2 triple when an L2 row is clicked", async () => {
    const wrapper = await mount({ funcCat: "workTask", subCat: "systemDesign" })
    const l2Row = wrapper.findAll("button").find((b) =>
      b.text().trim() === "Functional Design",
    )
    expect(l2Row).toBeDefined()
    await l2Row!.trigger("click")
    expect(updateSpy).toHaveBeenCalledWith({
      funcCat: "workTask",
      subCat: "systemDesign",
      l2: "funcDesign",
    })
  })

  it("clears all three keys when 'All functions' chip is clicked", async () => {
    const wrapper = await mount({
      funcCat: "workTask",
      subCat: "systemDesign",
      l2: "archDesign",
    })
    const allChip = wrapper.findAll("button").find((b) =>
      b.text().trim() === "All functions",
    )
    expect(allChip).toBeDefined()
    await allChip!.trigger("click")
    expect(updateSpy).toHaveBeenCalledWith({
      funcCat: undefined,
      subCat: undefined,
      l2: undefined,
    })
  })
})
