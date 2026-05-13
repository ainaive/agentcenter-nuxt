import type { ManifestFormValues } from "~~/shared/validators/manifest"
import { SLUG_PATTERN, SEMVER_PATTERN, SUMMARY_MAX } from "~~/shared/validators/manifest"

export type WizardStep = 0 | 1 | 2 | 3 | 4

export interface WizardError {
  msg: string
  detail?: string
}

export interface WizardInit {
  extensionId?: string
  versionId?: string
  bundleUploaded?: boolean
  formValues?: Partial<ManifestFormValues>
}

const DEFAULT_FORM: ManifestFormValues = {
  slug: "",
  name: "",
  nameZh: undefined,
  version: "1.0.0",
  category: "skills",
  scope: "personal",
  summary: "",
  taglineZh: undefined,
  readmeMd: undefined,
  iconColor: "indigo",
  tagIds: [],
  deptId: undefined,
  permissions: {},
  sourceMethod: "zip",
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export function usePublishWizard(init: WizardInit = {}) {
  const form = reactive<ManifestFormValues>({
    ...DEFAULT_FORM,
    ...init.formValues,
  })
  const extensionId = ref<string | null>(init.extensionId ?? null)
  const versionId = ref<string | null>(init.versionId ?? null)
  const bundleUploaded = ref(init.bundleUploaded ?? false)
  const step = ref<WizardStep>(init.bundleUploaded ? 3 : init.extensionId ? 1 : 0)
  const error = ref<WizardError | null>(null)
  const busy = ref(false)

  // Auto-derive slug from name as long as the user hasn't hand-edited slug.
  // We track that by snapshotting the auto-derived value and only re-deriving
  // when slug still matches the last auto-derived snapshot.
  let lastAutoSlug = slugFromName(form.name)
  watch(
    () => form.name,
    (name) => {
      const next = slugFromName(name)
      if (form.slug === lastAutoSlug || form.slug === "") {
        form.slug = next
        lastAutoSlug = next
      }
    },
  )

  const isLocked = computed(() => extensionId.value !== null)

  // Per-step validity. Same gates as the original wizard.
  const basicsValid = computed(() => {
    if (form.name.length < 2 || form.name.length > 80) return false
    if (!SLUG_PATTERN.test(form.slug) || form.slug.length < 3 || form.slug.length > 64) return false
    if (!SEMVER_PATTERN.test(form.version)) return false
    if (form.summary.length < 1 || form.summary.length > SUMMARY_MAX) return false
    return true
  })

  const bundleValid = computed(() => bundleUploaded.value)

  const listingValid = computed(() => {
    if (form.tagIds.length === 0) return false
    if ((form.readmeMd ?? "").length < 1) return false
    return true
  })

  const canSubmit = computed(
    () => basicsValid.value && bundleValid.value && listingValid.value,
  )

  function setError(msg: string, detail?: string) {
    error.value = { msg, detail }
  }

  function clearError() {
    error.value = null
  }

  // --- Step transitions ---

  async function advanceFromBasics(): Promise<boolean> {
    if (!basicsValid.value) return false
    clearError()
    busy.value = true
    try {
      if (!extensionId.value) {
        const result = await $fetch<{ ok: true; extensionId: string; versionId: string }>(
          "/api/internal/publish/create-draft",
          { method: "POST", body: form },
        )
        extensionId.value = result.extensionId
        versionId.value = result.versionId
      } else {
        await $fetch("/api/internal/publish/update-draft", {
          method: "POST",
          body: { extensionId: extensionId.value, values: form },
        })
      }
      step.value = 1
      return true
    } catch (err) {
      const data = (err as { data?: { error?: string; detail?: string } })?.data
      setError(data?.error ?? "unknown_error", data?.detail)
      return false
    } finally {
      busy.value = false
    }
  }

  function advanceFromBundle() {
    if (!bundleValid.value) return false
    step.value = 2
    return true
  }

  function advanceFromListing() {
    if (!listingValid.value) return false
    step.value = 3
    return true
  }

  async function submit(): Promise<boolean> {
    if (!canSubmit.value || !extensionId.value || !versionId.value) return false
    clearError()
    busy.value = true
    try {
      // Final persistence in case Listing was edited after Review jump-back.
      await $fetch("/api/internal/publish/update-draft", {
        method: "POST",
        body: { extensionId: extensionId.value, values: form },
      })
      await $fetch("/api/internal/publish/submit", {
        method: "POST",
        body: { versionId: versionId.value },
      })
      step.value = 4
      return true
    } catch (err) {
      const data = (err as { data?: { error?: string; detail?: string }; statusMessage?: string })
        ?.data
      setError(
        data?.error ?? (err as { statusMessage?: string })?.statusMessage ?? "unknown_error",
        data?.detail,
      )
      return false
    } finally {
      busy.value = false
    }
  }

  function jumpTo(target: WizardStep) {
    step.value = target
  }

  function markBundleUploaded() {
    bundleUploaded.value = true
  }

  return {
    form,
    step,
    extensionId,
    versionId,
    bundleUploaded,
    error,
    busy,
    isLocked,
    basicsValid,
    bundleValid,
    listingValid,
    canSubmit,
    advanceFromBasics,
    advanceFromBundle,
    advanceFromListing,
    submit,
    jumpTo,
    markBundleUploaded,
    setError,
    clearError,
  }
}

export type PublishWizard = ReturnType<typeof usePublishWizard>
