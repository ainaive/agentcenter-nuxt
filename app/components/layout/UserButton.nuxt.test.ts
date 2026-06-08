// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"

import UserButton from "./UserButton.vue"

// Shared mutable state for the mocked useAuth — each test rewrites
// sessionState before mountSuspended runs. vi.hoisted keeps the object
// available to the mockNuxtImport factory which is hoisted above imports.
const { sessionState } = vi.hoisted(() => ({
  sessionState: {
    current: {
      data: { user: null } as {
        data: {
          user: { id: string; name?: string; email: string } | null
        }
      }["data"],
    },
  },
}))

// `useSession()` only needs to expose a `.value` with the data tree —
// the component reads `session.value.data?.user`. Real reactivity isn't
// required because each test sets sessionState BEFORE mountSuspended;
// the user-id watcher's initial fire compares the seed value against
// itself and never triggers a refresh.
mockNuxtImport("useAuth", () => {
  return () => ({
    useSession: () => ({ value: sessionState.current }),
    signOut: vi.fn().mockResolvedValue(undefined),
  })
})

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

const stubs = { NuxtLink: NuxtLinkStub }

// useFetch resolves through the Nitro $fetch global — same override
// pattern used by usePublishWizard.nuxt.test.ts and ReviewerMatrix
// .nuxt.test.ts so test runs stay deterministic without hitting Nitro.
const fetchMock = vi.fn()
const realFetch = (globalThis as { $fetch?: unknown }).$fetch

const ANON = { isSuperAdmin: false, isReviewer: false, cells: [] }
const REVIEWER_NON_SUPER = {
  isSuperAdmin: false,
  isReviewer: true,
  cells: [{ tier: "company", subCat: "cloud", productLineId: null }],
}
const SUPER_ADMIN = { isSuperAdmin: true, isReviewer: true, cells: [] }

beforeEach(() => {
  fetchMock.mockReset()
  ;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
  sessionState.current = { data: { user: null } }
})

afterEach(() => {
  ;(globalThis as unknown as { $fetch: unknown }).$fetch = realFetch
})

describe("UserButton — admin row visibility", () => {
  it("anonymous: renders the Sign-in link with no admin rows", async () => {
    fetchMock.mockResolvedValue(ANON)
    const wrapper = await mountSuspended(UserButton, { global: { stubs } })
    expect(wrapper.text()).toContain("Sign in")
    expect(wrapper.text()).not.toContain("Approval queue")
    expect(wrapper.text()).not.toContain("Reviewer matrix")
  })

  it("signed-in non-reviewer: dropdown shows Profile + Sign out only", async () => {
    sessionState.current = {
      data: { user: { id: "u-bob", email: "bob@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(ANON)
    const wrapper = await mountSuspended(UserButton, { global: { stubs } })
    await wrapper.find("button").trigger("click")
    const text = wrapper.text()
    expect(text).toContain("Profile")
    expect(text).toContain("Sign out")
    expect(text).not.toContain("Approval queue")
    expect(text).not.toContain("Reviewer matrix")
  })

  it("cell-holder reviewer: dropdown shows both admin rows", async () => {
    sessionState.current = {
      data: { user: { id: "u-carl", email: "carl@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(REVIEWER_NON_SUPER)
    const wrapper = await mountSuspended(UserButton, { global: { stubs } })
    await wrapper.find("button").trigger("click")
    const text = wrapper.text()
    expect(text).toContain("Approval queue")
    expect(text).toContain("Reviewer matrix")
  })

  it("super-admin: dropdown shows both admin rows", async () => {
    sessionState.current = {
      data: { user: { id: "u-amy", email: "amy@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(SUPER_ADMIN)
    const wrapper = await mountSuspended(UserButton, { global: { stubs } })
    await wrapper.find("button").trigger("click")
    const text = wrapper.text()
    expect(text).toContain("Approval queue")
    expect(text).toContain("Reviewer matrix")
  })

  it("admin rows link to /admin/approvals and /admin/reviewers via localePath", async () => {
    sessionState.current = {
      data: { user: { id: "u-amy", email: "amy@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(SUPER_ADMIN)
    const wrapper = await mountSuspended(UserButton, { global: { stubs } })
    await wrapper.find("button").trigger("click")
    const hrefs = wrapper.findAll("a").map((a) => a.attributes("href") ?? "")
    expect(hrefs.some((h) => h.endsWith("/admin/approvals"))).toBe(true)
    expect(hrefs.some((h) => h.endsWith("/admin/reviewers"))).toBe(true)
  })
})
