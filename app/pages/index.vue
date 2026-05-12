<script setup lang="ts">
import { ArrowRight, Download } from "lucide-vue-next"

const { t } = useI18n()
const localePath = useLocalePath()

const skeletonCount = 6
</script>

<template>
  <div class="px-6 py-8 max-w-7xl mx-auto">
    <!-- Featured banner placeholder -->
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

    <!-- Trending heading + browse all -->
    <header class="flex items-baseline justify-between mb-5">
      <h2 class="font-serif text-2xl tracking-tight text-(--color-ink)">
        {{ t("home.trendingTitle") }}
      </h2>
      <NuxtLink
        :to="localePath('/extensions')"
        class="text-sm text-(--color-ink-muted) hover:text-(--color-ink) inline-flex items-center gap-1"
      >
        {{ t("home.browseAll", { count: "—" }) }}
        <ArrowRight :size="12" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Skeleton grid (lands in P3 with real data) -->
    <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      <div
        v-for="i in skeletonCount"
        :key="i"
        class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5 min-h-[180px] flex flex-col gap-3"
      >
        <div class="h-6 w-3/4 bg-(--color-sidebar) rounded animate-pulse" />
        <div class="h-4 w-full bg-(--color-sidebar) rounded animate-pulse" />
        <div class="h-4 w-5/6 bg-(--color-sidebar) rounded animate-pulse" />
        <div class="flex-1" />
        <div class="flex items-center gap-2 text-xs text-(--color-ink-muted)">
          <Download :size="12" aria-hidden="true" />
          <span>{{ t("home.installsCount", { count: "—" }) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
