<script setup lang="ts">
import { Download, Star, ExternalLink, Github } from "lucide-vue-next"
import type { Locale } from "~~/shared/types"
import { deptPath } from "~~/shared/data/departments"
import { tagLabel } from "~~/shared/tags"

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()

const slug = computed(() => String(route.params.slug ?? ""))

const { data } = await useFetch("/api/internal/extension-detail", {
  query: computed(() => ({ slug: slug.value })),
})

if (!data.value) {
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
const deptTrail = computed(() =>
  ext.value.deptId ? deptPath(ext.value.deptId, locale.value as Locale).join(" / ") : null,
)

function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
}
</script>

<template>
  <div class="px-6 py-8 max-w-7xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <main class="min-w-0">
        <header class="mb-6 flex items-start gap-4">
          <div
            class="flex size-14 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] text-[24px]"
            :style="{
              background: `${ext.iconColor ?? '#888'}1c`,
              borderColor: `${ext.iconColor ?? '#888'}33`,
            }"
          >
            {{ ext.iconEmoji }}
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">{{ name }}</h1>
            <p v-if="description" class="mt-2 text-(--color-ink-muted)">{{ description }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-(--color-ink-muted)">
              <div class="flex items-center gap-1">
                <Star :size="14" class="fill-amber-500 text-amber-500" aria-hidden="true" />
                <span class="font-semibold">{{ Number(ext.starsAvg).toFixed(1) }}</span>
              </div>
              <div class="flex items-center gap-1">
                <Download :size="14" aria-hidden="true" />
                <span class="font-mono">{{ formatCount(ext.downloadsCount) }}</span>
              </div>
              <span v-if="deptTrail" class="text-(--color-ink-muted)">· {{ deptTrail }}</span>
            </div>
          </div>
        </header>

        <Markdown v-if="ext.readmeMd" :source="ext.readmeMd" class="mt-8" />
        <p v-else class="text-(--color-ink-muted) italic">{{ t("extensions.noReadme") }}</p>

        <div v-if="ext.tagIds.length > 0" class="mt-8 flex flex-wrap gap-1.5">
          <span
            v-for="tag in ext.tagIds"
            :key="tag"
            class="border border-(--color-border) text-(--color-ink-muted) rounded px-2 py-0.5 font-mono text-[11px] font-semibold"
          >
            #{{ tagLabel(tag, locale as Locale) }}
          </span>
        </div>
      </main>

      <aside class="space-y-6">
        <div class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5">
          <h2 class="text-sm font-semibold mb-3 text-(--color-ink)">{{ t("extensions.about") }}</h2>
          <dl class="space-y-2 text-sm">
            <div v-if="ext.licenseSpdx" class="flex justify-between">
              <dt class="text-(--color-ink-muted)">{{ t("extensions.license") }}</dt>
              <dd class="font-mono text-(--color-ink)">{{ ext.licenseSpdx }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-(--color-ink-muted)">{{ t("extensions.scope") }}</dt>
              <dd class="text-(--color-ink) capitalize">{{ ext.scope }}</dd>
            </div>
            <div v-if="ext.publishedAt" class="flex justify-between">
              <dt class="text-(--color-ink-muted)">{{ t("extensions.published") }}</dt>
              <dd class="text-(--color-ink)">{{ new Date(ext.publishedAt).toISOString().slice(0, 10) }}</dd>
            </div>
          </dl>
          <div v-if="ext.homepageUrl || ext.repoUrl" class="mt-4 pt-4 border-t border-(--color-border) space-y-2">
            <a
              v-if="ext.homepageUrl"
              :href="ext.homepageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 text-sm text-(--color-ink) hover:text-(--color-accent)"
            >
              <ExternalLink :size="14" aria-hidden="true" />
              {{ t("extensions.homepage") }}
            </a>
            <a
              v-if="ext.repoUrl"
              :href="ext.repoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 text-sm text-(--color-ink) hover:text-(--color-accent)"
            >
              <Github :size="14" aria-hidden="true" />
              {{ t("extensions.repository") }}
            </a>
          </div>
        </div>

        <div v-if="related.length > 0" class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5">
          <h2 class="text-sm font-semibold mb-3 text-(--color-ink)">{{ t("extensions.related") }}</h2>
          <ul class="space-y-2">
            <li v-for="r in related" :key="r.id">
              <NuxtLink
                :to="localePath(`/extensions/${r.slug}`)"
                class="flex items-center gap-2 text-sm hover:text-(--color-accent)"
              >
                <span class="text-base">{{ r.iconEmoji }}</span>
                <span class="flex-1 truncate">{{ r.name }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>
