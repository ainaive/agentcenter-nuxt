<script setup lang="ts">
import { Download, Star } from "lucide-vue-next"
import type { ExtensionBadge, Locale } from "~~/shared/types"
import { deptPath } from "~~/shared/data/departments"

const props = defineProps<{
  id: string
  name: string
  description: string | null
  iconEmoji: string | null
  iconColor: string | null
  badge: ExtensionBadge | null
  starsAvg: string
  downloadsCount: number
  updatedAt: string | null
  deptId: string | null
  shareUrl: string
}>()

const { t, locale } = useI18n()

const BADGE_CLASS = {
  official: "badge-official",
  popular: "badge-popular",
  new: "badge-new",
} as const

const deptTrail = computed(() =>
  props.deptId ? deptPath(props.deptId, locale.value as Locale).join(" / ") : null,
)

function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
]

const updatedRelative = computed(() => {
  if (!props.updatedAt) return null
  const then = new Date(props.updatedAt).getTime()
  if (Number.isNaN(then)) return null
  const diffMs = then - Date.now()
  if (diffMs > 0) return null
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: "auto" })
  for (const [unit, ms] of UNITS) {
    const value = Math.trunc(diffMs / ms)
    if (Math.abs(value) >= 1) return rtf.format(value, unit)
  }
  return rtf.format(0, "day")
})
</script>

<template>
  <header class="mb-6">
    <div class="flex items-start gap-5">
      <div
        class="flex size-16 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] text-[28px]"
        :style="{
          background: `${iconColor ?? '#888'}1c`,
          borderColor: `${iconColor ?? '#888'}33`,
        }"
      >
        {{ iconEmoji }}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 class="font-serif text-4xl tracking-tight text-(--color-ink)">{{ name }}</h1>
          <span
            v-if="badge"
            class="rounded px-1.5 py-0.5 text-[11px] font-semibold"
            :class="BADGE_CLASS[badge]"
          >
            {{ t(`extensions.badges.${badge}`) }}
          </span>
        </div>
        <p
          v-if="description"
          class="mt-3 text-[17px] leading-[1.55] text-(--color-ink-muted)"
        >
          {{ description }}
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-(--color-ink-muted)">
          <span class="inline-flex items-center gap-1">
            <Star :size="14" class="fill-amber-500 text-amber-500" aria-hidden="true" />
            <span class="font-semibold text-(--color-ink)">{{ Number(starsAvg).toFixed(1) }}</span>
          </span>
          <span aria-hidden="true" class="text-(--color-ink-muted)/50">·</span>
          <span class="inline-flex items-center gap-1">
            <Download :size="14" aria-hidden="true" />
            <span class="font-mono">{{ formatCount(downloadsCount) }}</span>
          </span>
          <template v-if="updatedRelative">
            <span aria-hidden="true" class="text-(--color-ink-muted)/50">·</span>
            <span>{{ t("extensions.updated", { relative: updatedRelative }) }}</span>
          </template>
          <template v-if="deptTrail">
            <span aria-hidden="true" class="text-(--color-ink-muted)/50">·</span>
            <span>{{ deptTrail }}</span>
          </template>
        </div>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <InstallButton :extension-id="id" size="lg" />
      <SaveButton :extension-id="id" />
      <ShareButton :url="shareUrl" />
    </div>
  </header>
</template>
