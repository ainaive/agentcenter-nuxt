<script setup lang="ts">
import { Upload } from "lucide-vue-next"
import type { ProfilePublishedRow } from "~~/shared/types"

defineProps<{ rows: ProfilePublishedRow[] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const fmt = computed(() => {
  const nf = new Intl.NumberFormat(locale.value === "zh" ? "zh-CN" : "en-US")
  return (n: number) => nf.format(n)
})
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <Upload class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("profile.emptyPublished.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("profile.emptyPublished.body") }}
      </p>
      <NuxtLink
        :to="localePath('/publish/new')"
        class="mt-4 inline-flex items-center rounded-md bg-(--color-accent) text-(--color-accent-fg) px-3 py-1.5 text-sm hover:opacity-90"
      >
        {{ t("profile.publishOne") }}
      </NuxtLink>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="r in rows"
        :key="r.extensionId"
        class="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-card) p-4"
      >
        <NuxtLink :to="localePath(`/extensions/${r.slug}`)" class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ r.name }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wide text-(--color-ink-muted)">
              {{ r.category }}
            </span>
          </div>
          <div class="mt-0.5 flex items-center gap-3 text-xs text-(--color-ink-muted) font-mono">
            <span v-if="r.latestVersion">v{{ r.latestVersion }}</span>
            <span>{{ fmt(r.downloadsCount) }} {{ t("profile.installsShort") }}</span>
            <span v-if="Number(r.starsAvg) > 0">{{ Number(r.starsAvg).toFixed(1) }} ★</span>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
