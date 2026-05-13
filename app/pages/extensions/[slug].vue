<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const requestUrl = useRequestURL()

const slug = computed(() => String(route.params.slug ?? ""))

const { data } = await useFetch("/api/internal/extension-detail", {
  query: computed(() => ({ slug: slug.value })),
})

if (!data.value || !data.value.ext) {
  throw createError({ statusCode: 404, statusMessage: "Extension not found" })
}

const ext = computed(() => data.value!.ext)
const related = computed(() => data.value!.related ?? [])

const name = computed(() =>
  locale.value === "zh" && ext.value.nameZh ? ext.value.nameZh : ext.value.name,
)
const description = computed(() =>
  locale.value === "zh" && ext.value.descriptionZh
    ? ext.value.descriptionZh
    : ext.value.description,
)
const publishedAt = computed(() =>
  ext.value.publishedAt ? new Date(ext.value.publishedAt).toISOString() : null,
)
const permissions = computed(
  () => (ext.value.permissions ?? null) as Record<string, unknown> | null,
)
const shareUrl = computed(() => `${requestUrl.origin}/${locale.value}/extensions/${slug.value}`)

// Using nuxt-og-image's bundled "Frame" template until we ship brand-matched
// custom OG components (deferred — Nuxt 4's `app/` layout breaks the
// module's `components/OgImage/` scan).
defineOgImageComponent("Frame", {
  title: name.value,
  description: description.value ?? "",
})
</script>

<template>
  <div class="px-6 py-8 max-w-7xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <main class="min-w-0">
        <ExtHero
          :id="ext.id"
          :name="name"
          :description="description"
          :icon-emoji="ext.iconEmoji"
          :icon-color="ext.iconColor"
          :stars-avg="ext.starsAvg"
          :downloads-count="ext.downloadsCount"
          :dept-id="ext.deptId"
          :share-url="shareUrl"
        />

        <ExtTabs
          :readme-md="ext.readmeMd"
          :tag-ids="ext.tagIds"
          :slug="ext.slug"
          :permissions="permissions"
        />
      </main>

      <aside class="space-y-6">
        <ExtAboutCard
          :license-spdx="ext.licenseSpdx"
          :scope="ext.scope"
          :published-at="publishedAt"
          :homepage-url="ext.homepageUrl"
          :repo-url="ext.repoUrl"
        />
        <ExtRelatedList :related="related" />
      </aside>
    </div>
  </div>
</template>
