// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent, h, nextTick } from "vue"

import RequestOfficialDialog from "./RequestOfficialDialog.vue"

// `$fetch` is a Nitro global, not a Nuxt auto-import — same mock pattern
// used by `app/composables/usePublishWizard.nuxt.test.ts`. Reset between
// specs so a thrown 4xx in one doesn't bleed into the next.
const fetchMock = vi.fn()
const realFetch = (globalThis as { $fetch?: unknown }).$fetch

beforeEach(() => {
  fetchMock.mockReset()
  ;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
})

afterEach(() => {
  ;(globalThis as unknown as { $fetch: unknown }).$fetch = realFetch
})

// reka-ui's <Dialog>/<DialogContent> render into a portal that doesn't
// hydrate in the headless test env. Stub the dialog primitives with
// transparent passthroughs so the form sits straight in the DOM and we
// can drive it via the radio inputs and submit button.
const passthrough = (name: string) =>
  defineComponent({ name, render() { return h("div", this.$slots.default?.()) } })

const stubs = {
  Dialog: passthrough("Dialog"),
  DialogTrigger: passthrough("DialogTrigger"),
  DialogContent: passthrough("DialogContent"),
  DialogTitle: passthrough("DialogTitle"),
  DialogDescription: passthrough("DialogDescription"),
  DialogClose: passthrough("DialogClose"),
  Label: defineComponent({
    name: "LabelStub",
    props: { for: { type: String, required: false } },
    render() { return h("label", { for: this.for }, this.$slots.default?.()) },
  }),
  Textarea: defineComponent({
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
  }),
}

const PROPS = {
  extensionId: "ext-1",
  extensionName: "Web Search Pro",
  currentSubCat: "docs",
}

describe("RequestOfficialDialog", () => {
  it("renders the apply trigger button", async () => {
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const triggers = wrapper.findAll("button")
    expect(triggers.length).toBeGreaterThan(0)
    // The trigger text comes from approvals.applyForOfficial.
    expect(wrapper.text()).toContain("Apply for official")
  })

  it("subCat select defaults to the extension's current subCat", async () => {
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const select = wrapper.find<HTMLSelectElement>("#approvals-subCat")
    expect(select.element.value).toBe("docs")
  })

  it("subCat hint only renders when currentSubCat is null", async () => {
    const withCurrent = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    expect(withCurrent.text()).not.toContain("This extension has no category")

    const withoutCurrent = await mountSuspended(RequestOfficialDialog, {
      props: { ...PROPS, currentSubCat: null },
      global: { stubs },
    })
    expect(withoutCurrent.text()).toContain("This extension has no category")
  })

  it("clicking the Company tier label switches the selected radio", async () => {
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    expect(radios.length).toBe(2)
    // Default is productLine.
    expect(radios[0]!.element.checked).toBe(true)
    expect(radios[1]!.element.checked).toBe(false)
    await radios[1]!.setValue(true)
    expect(radios[1]!.element.checked).toBe(true)
  })

  it("submit POSTs to /api/internal/approvals/submit with the form body and emits 'submitted' on success", async () => {
    // Switch to Company tier so the dialog doesn't require a productLine
    // (which would need its own picker selection); existing-form coverage.
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    await radios[1]!.setValue(true)
    // Type a reason so we can prove it's threaded through and trimmed.
    const textarea = wrapper.find<HTMLTextAreaElement>("textarea")
    await textarea.setValue("  Used by every team in the org.  ")

    await wrapper.find("form").trigger("submit")
    await nextTick()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/internal/approvals/submit",
      expect.objectContaining({
        method: "POST",
        body: {
          extensionId: "ext-1",
          requestedTier: "company",
          subCat: "docs",
          productLineId: undefined,
          reason: "Used by every team in the org.",
        },
      }),
    )
    expect(wrapper.emitted("submitted")).toHaveLength(1)
  })

  it("empty reason becomes undefined in the submit body (so the validator doesn't store whitespace)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    await radios[1]!.setValue(true)
    await wrapper.find("form").trigger("submit")
    await nextTick()
    const body = fetchMock.mock.calls[0]![1].body as Record<string, unknown>
    expect(body.reason).toBeUndefined()
  })

  it("submit failure with a known error code surfaces the localized message via te()", async () => {
    fetchMock.mockRejectedValueOnce({
      statusMessage: "duplicate_pending_request",
    })
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    await radios[1]!.setValue(true)
    await wrapper.find("form").trigger("submit")
    await nextTick()
    await nextTick()
    // The catch maps the code to approvals.errors.duplicate_pending_request
    // which is defined in en.json — it should NOT fall back to generic.
    const errorText = wrapper.find("p.text-red-600").text()
    expect(errorText).toContain("already have a pending request")
  })

  it("submit failure with an unknown code falls back to the generic message", async () => {
    fetchMock.mockRejectedValueOnce({ statusMessage: "totally_unknown_code" })
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    await radios[1]!.setValue(true)
    await wrapper.find("form").trigger("submit")
    await nextTick()
    await nextTick()
    const errorText = wrapper.find("p.text-red-600").text()
    expect(errorText).toContain("Couldn't submit")
  })

  it("submit is a no-op when subCat is empty (button is disabled and $fetch is not called)", async () => {
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: { ...PROPS, currentSubCat: null },
      global: { stubs },
    })
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    await radios[1]!.setValue(true)
    expect(wrapper.find("#approvals-subCat").element.getAttribute("value") ?? "").toBe("")
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes("disabled")).toBeDefined()
    // Trigger anyway — the handler's canSubmit guard should short-circuit.
    await wrapper.find("form").trigger("submit")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("default productLine tier requires a productLine — submit is disabled until one is picked", async () => {
    const wrapper = await mountSuspended(RequestOfficialDialog, {
      props: PROPS,
      global: { stubs },
    })
    // Default tier is productLine, currentSubCat='docs' satisfies subCat,
    // but the productLine select is empty so the submit stays disabled.
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes("disabled")).toBeDefined()
    await wrapper.find("form").trigger("submit")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
