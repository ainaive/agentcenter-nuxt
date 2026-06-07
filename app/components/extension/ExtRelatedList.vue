<script setup lang="ts">
import { Star } from "lucide-vue-next"
import { deptPath } from "~~/shared/data/departments"
import type { Locale } from "~~/shared/types"

interface RelatedRow {
  id: string
  slug: string
  name: string
  nameZh?: string | null
  iconEmoji: string | null
  iconColor: string | null
  downloadsCount?: number
  officialTier?: "productLine" | "company" | null
  deptId?: string | null
  starsAvg?: string | null
}

const props = defineProps<{ related: RelatedRow[] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const TIER_CLASS = {
  productLine: "badge-product-line",
  company: "badge-company",
} as const

function labelFor(r: RelatedRow): string {
  if (locale.value === "zh" && r.nameZh) return r.nameZh
  return r.name
}

function deptLeafFor(r: RelatedRow): string | null {
  if (!r.deptId) return null
  const trail = deptPath(r.deptId, locale.value as Locale)
  return trail.length > 0 ? (trail[trail.length - 1] ?? null) : null
}

function ratingFor(r: RelatedRow): string | null {
  if (!r.starsAvg) return null
  const n = Number(r.starsAvg)
  if (Number.isNaN(n) || n <= 0) return null
  return n.toFixed(1)
}
</script>

<template>
  <div
    v-if="props.related.length > 0"
    class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6"
  >
    <h2 class="font-serif text-base font-semibold tracking-tight mb-4 text-(--color-ink)">
      {{ t("extensions.related") }}
    </h2>
    <ul class="space-y-3">
      <li v-for="r in props.related" :key="r.id">
        <NuxtLink
          :to="localePath(`/extensions/${r.slug}`)"
          class="group flex items-start gap-3"
        >
          <span class="shrink-0 text-[18px] leading-none mt-0.5">{{ r.iconEmoji }}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="truncate text-[13px] font-medium text-(--color-ink) group-hover:text-(--color-accent) transition-colors">
                {{ labelFor(r) }}
              </span>
              <span
                v-if="r.officialTier"
                class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="TIER_CLASS[r.officialTier]"
              >
                {{ t(`extensions.officialTier.${r.officialTier}`) }}
              </span>
            </div>
            <div
              v-if="deptLeafFor(r) || ratingFor(r)"
              class="mt-0.5 flex items-center gap-1.5 text-[11px] text-(--color-ink-muted)"
            >
              <span v-if="deptLeafFor(r)" class="truncate">{{ deptLeafFor(r) }}</span>
              <span
                v-if="deptLeafFor(r) && ratingFor(r)"
                aria-hidden="true"
                class="text-(--color-ink-muted)/50"
              >·</span>
              <span v-if="ratingFor(r)" class="inline-flex items-center gap-0.5">
                <Star :size="10" class="fill-amber-500 text-amber-500" aria-hidden="true" />
                <span class="font-mono">{{ ratingFor(r) }}</span>
              </span>
            </div>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
