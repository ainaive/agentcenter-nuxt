<script setup lang="ts">
import type { ManifestFormValues } from "~~/shared/validators/manifest"

definePageMeta({ middleware: ["require-auth", "require-onboard"] })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

interface DraftResponse {
  extensionId: string
  versionId: string
  bundleUploaded: boolean
  formValues: ManifestFormValues
}

const id = computed(() => String(route.params.id ?? ""))

const { data, error } = await useFetch<DraftResponse>(
  "/api/internal/publish/get-draft",
  { query: computed(() => ({ extensionId: id.value })) },
)

// Preserve the backend's status code so a 400 / 409 / auth failure doesn't
// get rewritten as 404. The error-boundary renders the matching message.
if (error.value) {
  const statusCode = error.value.statusCode ?? 500
  throw createError({
    statusCode,
    statusMessage: error.value.statusMessage ?? t("publish.errors.generic"),
  })
}
if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t("publish.errors.notFound"),
  })
}
</script>

<template>
  <div class="px-6 py-8 max-w-6xl mx-auto">
    <header class="mb-6 flex items-baseline justify-between">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
        {{ t("publish.wizard.headerEdit") }}
      </h1>
      <NuxtLink
        :to="localePath('/publish')"
        class="text-sm text-(--color-ink-muted) underline-offset-4 hover:underline"
      >
        {{ t("publish.wizard.success.back") }}
      </NuxtLink>
    </header>

    <UploadWizard
      v-if="data"
      :init="{
        extensionId: data.extensionId,
        versionId: data.versionId,
        bundleUploaded: data.bundleUploaded,
        formValues: data.formValues,
      }"
    />
  </div>
</template>
