<script setup lang="ts">
import { Building2, Download, Star } from "lucide-vue-next"
import { deptPath, MY_DEPT_ID } from "~~/shared/data/departments"
import type { ExtensionListItem } from "~~/shared/db/queries-types"
import type { Locale } from "~~/shared/types"

const props = defineProps<{ ext: ExtensionListItem }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const TIER_CLASS = {
  productLine: "badge-product-line",
  company: "badge-company",
} as const

const name = computed(() =>
  locale.value === "zh" && props.ext.nameZh ? props.ext.nameZh : props.ext.name,
)
const desc = computed(() =>
  locale.value === "zh" && props.ext.descriptionZh
    ? props.ext.descriptionZh
    : props.ext.description,
)

const deptTrail = computed(() =>
  props.ext.deptId ? deptPath(props.ext.deptId, locale.value as Locale) : null,
)
const deptLeaf = computed(() =>
  deptTrail.value && deptTrail.value.length > 0
    ? deptTrail.value[deptTrail.value.length - 1]
    : null,
)
const isMine = computed(() => {
  const id = props.ext.deptId
  if (!id) return false
  return id === MY_DEPT_ID || id.startsWith(`${MY_DEPT_ID}.`)
})

function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
}

const ratingLabel = computed(() => {
  const raw = props.ext.starsAvg
  if (raw === null || raw === undefined || raw === "") return null
  const n = Number(raw)
  if (Number.isNaN(n)) return null
  return n.toFixed(1)
})
</script>

<template>
  <article
    class="group relative flex flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-(--color-accent)/30 hover:shadow-[0_2px_10px_-4px_oklch(0_0_0_/_0.08)]"
  >
    <div class="flex items-center gap-3">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-[8px] border-[1.5px] text-[18px]"
        :style="{
          background: `${ext.iconColor ?? '#888'}1c`,
          borderColor: `${ext.iconColor ?? '#888'}33`,
        }"
      >
        {{ ext.iconEmoji }}
      </div>
      <div class="flex min-w-0 flex-1 items-center gap-1.5">
        <NuxtLink
          :to="localePath(`/extensions/${ext.slug}`)"
          class="truncate text-[15px] font-semibold tracking-tight transition-colors hover:text-(--color-accent) after:absolute after:inset-0 after:content-['']"
        >
          {{ name }}
        </NuxtLink>
        <span
          v-if="ext.officialTier"
          class="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          :class="TIER_CLASS[ext.officialTier]"
        >
          {{ t(`extensions.officialTier.${ext.officialTier}`) }}
        </span>
      </div>
    </div>

    <p
      v-if="desc"
      class="text-(--color-ink-muted) text-[13px] leading-[1.55] overflow-hidden"
      style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;"
    >
      {{ desc }}
    </p>

    <div class="mt-auto flex items-center gap-2 pt-1 text-(--color-ink-muted) font-mono text-[12px]">
      <span
        v-if="deptLeaf"
        class="inline-flex min-w-0 items-center gap-1"
        :class="isMine ? 'text-(--color-accent)' : ''"
      >
        <Building2 :size="12" aria-hidden="true" />
        <span class="truncate font-semibold">{{ deptLeaf }}</span>
      </span>
      <span v-if="deptLeaf" aria-hidden="true" class="text-(--color-ink-muted)/50">·</span>
      <template v-if="ratingLabel">
        <span class="inline-flex items-center gap-1">
          <Star :size="12" class="fill-amber-500 text-amber-500" aria-hidden="true" />
          <span class="font-semibold text-(--color-ink)">{{ ratingLabel }}</span>
        </span>
        <span aria-hidden="true" class="text-(--color-ink-muted)/50">·</span>
      </template>
      <span class="inline-flex items-center gap-1">
        <Download :size="12" aria-hidden="true" />
        <span>{{ formatCount(ext.downloadsCount) }}</span>
      </span>
    </div>
  </article>
</template>
