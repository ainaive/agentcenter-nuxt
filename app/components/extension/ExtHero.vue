<script setup lang="ts">
import { Download, Star } from "lucide-vue-next"
import type { Locale } from "~~/shared/types"
import { deptPath } from "~~/shared/data/departments"

const props = defineProps<{
  id: string
  name: string
  description: string | null
  iconEmoji: string | null
  iconColor: string | null
  starsAvg: string
  downloadsCount: number
  deptId: string | null
  shareUrl: string
}>()

const { locale } = useI18n()

const deptTrail = computed(() =>
  props.deptId ? deptPath(props.deptId, locale.value as Locale).join(" / ") : null,
)

function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
}
</script>

<template>
  <header class="mb-6">
    <div class="flex items-start gap-4">
      <div
        class="flex size-14 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] text-[24px]"
        :style="{
          background: `${iconColor ?? '#888'}1c`,
          borderColor: `${iconColor ?? '#888'}33`,
        }"
      >
        {{ iconEmoji }}
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">{{ name }}</h1>
        <p v-if="description" class="mt-2 text-(--color-ink-muted)">{{ description }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-(--color-ink-muted)">
          <div class="flex items-center gap-1">
            <Star :size="14" class="fill-amber-500 text-amber-500" aria-hidden="true" />
            <span class="font-semibold">{{ Number(starsAvg).toFixed(1) }}</span>
          </div>
          <div class="flex items-center gap-1">
            <Download :size="14" aria-hidden="true" />
            <span class="font-mono">{{ formatCount(downloadsCount) }}</span>
          </div>
          <span v-if="deptTrail">· {{ deptTrail }}</span>
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <InstallButton :extension-id="id" />
      <SaveButton :extension-id="id" />
      <ShareButton :url="shareUrl" />
    </div>
  </header>
</template>
