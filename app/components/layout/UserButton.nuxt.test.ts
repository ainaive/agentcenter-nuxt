// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime"
import { defineComponent, nextTick, ref } from "vue"

import UserButton from "./UserButton.vue"

// Shared session state for the mocked useAuth. A real Vue ref so the
// component's `watch(() => session.value.data?.user?.id...)` actually
// fires when a test mutates the user mid-test — needed to cover the
// post-mount re-probe path.
type Session = {
  data: { user: { id: string; name?: string; email: string } | null }
}
const sessionState = ref<Session>({ data: { user: null } })

mockNuxtImport("useAuth", () => {
  return () => ({
    useSession: () => sessionState,
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

// Track every mounted wrapper so afterEach can unmount it. Without
// this, prior tests' components stay alive across the suite and their
// session-user-id watcher fires on the next test's sessionState reset
// — phantom probes that consume mocked responses out of order.
let mounted: Awaited<ReturnType<typeof mountSuspended>>[] = []
async function mount() {
  const w = await mountSuspended(UserButton, { global: { stubs } })
  mounted.push(w)
  return w
}

beforeEach(() => {
  fetchMock.mockReset()
  ;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
  sessionState.value = { data: { user: null } }
})

afterEach(() => {
  for (const w of mounted) w.unmount()
  mounted = []
  ;(globalThis as unknown as { $fetch: unknown }).$fetch = realFetch
})

describe("UserButton — admin row visibility", () => {
  it("anonymous: renders the Sign-in link with no admin rows", async () => {
    fetchMock.mockResolvedValue(ANON)
    const wrapper = await mount()
    expect(wrapper.text()).toContain("Sign in")
    expect(wrapper.text()).not.toContain("Approval queue")
    expect(wrapper.text()).not.toContain("Reviewer matrix")
  })

  it("signed-in non-reviewer: dropdown shows Profile + Sign out only", async () => {
    sessionState.value = {
      data: { user: { id: "u-bob", email: "bob@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(ANON)
    const wrapper = await mount()
    await wrapper.find("button").trigger("click")
    const text = wrapper.text()
    expect(text).toContain("Profile")
    expect(text).toContain("Sign out")
    expect(text).not.toContain("Approval queue")
    expect(text).not.toContain("Reviewer matrix")
  })

  it("cell-holder reviewer: dropdown shows both admin rows", async () => {
    sessionState.value = {
      data: { user: { id: "u-carl", email: "carl@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(REVIEWER_NON_SUPER)
    const wrapper = await mount()
    await wrapper.find("button").trigger("click")
    const text = wrapper.text()
    expect(text).toContain("Approval queue")
    expect(text).toContain("Reviewer matrix")
  })

  it("super-admin: dropdown shows both admin rows", async () => {
    sessionState.value = {
      data: { user: { id: "u-amy", email: "amy@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(SUPER_ADMIN)
    const wrapper = await mount()
    await wrapper.find("button").trigger("click")
    const text = wrapper.text()
    expect(text).toContain("Approval queue")
    expect(text).toContain("Reviewer matrix")
  })

  it("admin rows link to /admin/approvals and /admin/reviewers via localePath", async () => {
    sessionState.value = {
      data: { user: { id: "u-amy", email: "amy@agentcenter.dev" } },
    }
    fetchMock.mockResolvedValue(SUPER_ADMIN)
    const wrapper = await mount()
    await wrapper.find("button").trigger("click")
    const hrefs = wrapper.findAll("a").map((a) => a.attributes("href") ?? "")
    expect(hrefs.some((h) => h.endsWith("/admin/approvals"))).toBe(true)
    expect(hrefs.some((h) => h.endsWith("/admin/reviewers"))).toBe(true)
  })

  it("re-probes admin/me when the session user id changes after mount", async () => {
    // Mount with user A (non-reviewer). The component fires its first
    // probe on mount. Then swap to user B (super-admin); the user-id
    // watcher must fire a second probe.
    sessionState.value = {
      data: { user: { id: "u-bob", email: "bob@agentcenter.dev" } },
    }
    // First call returns ANON, every later call returns SUPER_ADMIN —
    // guards against the unlikely-but-cheap case where some lifecycle
    // path fires an extra probe and we'd otherwise hand back undefined.
    fetchMock.mockResolvedValueOnce(ANON).mockResolvedValue(SUPER_ADMIN)
    const wrapper = await mount()
    await wrapper.find("button").trigger("click")
    expect(wrapper.text()).not.toContain("Approval queue")
    const callsBefore = fetchMock.mock.calls.length

    sessionState.value = {
      data: { user: { id: "u-amy", email: "amy@agentcenter.dev" } },
    }
    await nextTick()
    // Let the in-flight $fetch resolve and the template react.
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(fetchMock).toHaveBeenLastCalledWith("/api/internal/admin/me")
    expect(wrapper.text()).toContain("Approval queue")
    expect(wrapper.text()).toContain("Reviewer matrix")
  })
})
