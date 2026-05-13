<script setup lang="ts">
import type { Locale, ProfileStats } from "~~/shared/types"
import { deptPath } from "~~/shared/data/departments"

const props = defineProps<{
  name: string | null
  email: string
  defaultDeptId: string | null
  createdAt: string
  stats: ProfileStats
}>()

const { t, locale } = useI18n()

const displayName = computed(() => {
  if (props.name && props.name.trim()) return props.name.trim()
  return props.email
})

const initials = computed(() => {
  const source = (props.name && props.name.trim()) || props.email
  const parts = source.trim().split(/\s+/).slice(0, 2)
  const initial = parts.map((p) => p.charAt(0)).join("")
  return (initial || source.charAt(0) || "?").toUpperCase()
})

const deptLabel = computed(() => {
  if (!props.defaultDeptId) return t("profile.deptUnset")
  const path = deptPath(props.defaultDeptId, locale.value as Locale)
  return path.length ? path.join(" · ") : t("profile.deptUnset")
})

const joinedLabel = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
  })
  return t("profile.joined", { date: fmt.format(new Date(props.createdAt)) })
})

const fmtCount = computed(() => {
  const nf = new Intl.NumberFormat(locale.value === "zh" ? "zh-CN" : "en-US")
  return (n: number) => nf.format(n)
})
</script>

<template>
  <header class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6">
    <div class="flex items-center gap-4">
      <div
        class="grid size-[72px] shrink-0 place-items-center rounded-full bg-(--color-accent) text-(--color-accent-fg) font-serif text-2xl font-semibold"
      >
        {{ initials }}
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="truncate font-serif text-2xl text-(--color-ink)">{{ displayName }}</h1>
        <p class="mt-1 text-sm text-(--color-ink-muted)">
          <span>{{ t("profile.role") }}</span>
          <span class="mx-2">·</span>
          <span>{{ deptLabel }}</span>
          <span class="mx-2">·</span>
          <span>{{ joinedLabel }}</span>
        </p>
      </div>
    </div>

    <dl class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <dt class="text-[11px] font-mono uppercase tracking-widest text-(--color-ink-muted)">
          {{ t("profile.stats.installed") }}
        </dt>
        <dd class="mt-1 font-serif text-2xl text-(--color-ink)">{{ fmtCount(stats.installedCount) }}</dd>
      </div>
      <div>
        <dt class="text-[11px] font-mono uppercase tracking-widest text-(--color-ink-muted)">
          {{ t("profile.stats.published") }}
        </dt>
        <dd class="mt-1 font-serif text-2xl text-(--color-ink)">{{ fmtCount(stats.publishedCount) }}</dd>
      </div>
      <div>
        <dt class="text-[11px] font-mono uppercase tracking-widest text-(--color-ink-muted)">
          {{ t("profile.stats.installs") }}
        </dt>
        <dd class="mt-1 font-serif text-2xl text-(--color-ink)">{{ fmtCount(stats.totalInstallsOfMine) }}</dd>
      </div>
      <div>
        <dt class="text-[11px] font-mono uppercase tracking-widest text-(--color-ink-muted)">
          {{ t("profile.stats.rating") }}
        </dt>
        <dd class="mt-1 font-serif text-2xl text-(--color-ink)">
          {{ stats.avgRatingOfMine != null ? stats.avgRatingOfMine.toFixed(1) + " ★" : "—" }}
        </dd>
      </div>
    </dl>
  </header>
</template>
