<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next"

const { t } = useI18n()
const localePath = useLocalePath()

const { data } = await useFetch("/api/internal/extensions", {
  query: { sort: "downloads" },
  default: () => ({ items: [], total: 0, filters: {} }),
})

const trending = computed(() => data.value.items.slice(0, 8))
const totalCount = computed(() => data.value.total)
</script>

<template>
  <div class="px-6 py-8 max-w-7xl mx-auto">
    <section
      class="relative overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-gradient-to-br from-(--color-accent)/10 via-(--color-card) to-(--color-card) p-8 mb-10"
    >
      <p class="font-mono uppercase text-[11px] tracking-widest text-(--color-accent) mb-3">
        {{ t("home.featuredLabel") }}
      </p>
      <h1 class="font-serif text-4xl tracking-tight max-w-2xl mb-3 text-(--color-ink)">
        AgentCenter
      </h1>
      <p class="text-(--color-ink-muted) max-w-xl mb-6">
        {{ t("home.featuredDescription") }}
      </p>
      <NuxtLink
        :to="localePath('/extensions')"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-(--color-accent) text-(--color-accent-fg) text-sm font-medium hover:opacity-90"
      >
        {{ t("home.viewExtension") }}
        <ArrowRight :size="14" aria-hidden="true" />
      </NuxtLink>
    </section>

    <header class="flex items-baseline justify-between mb-5">
      <h2 class="font-serif text-2xl tracking-tight text-(--color-ink)">
        {{ t("home.trendingTitle") }}
      </h2>
      <NuxtLink
        :to="localePath('/extensions')"
        class="text-sm text-(--color-ink-muted) hover:text-(--color-ink) inline-flex items-center gap-1"
      >
        {{ t("home.browseAll", { count: totalCount }) }}
        <ArrowRight :size="12" aria-hidden="true" />
      </NuxtLink>
    </header>

    <ExtGrid :items="trending" />
  </div>
</template>
