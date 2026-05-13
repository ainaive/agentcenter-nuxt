<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"
import type { Locale, TagFacet } from "~~/shared/types"
import { tagLabel } from "~~/shared/tags"

const props = defineProps<{
  tags: TagFacet[]
}>()

const { t, locale } = useI18n()
const { filters, update } = useFilters()

const TAG_COLLAPSE_LIMIT = 14

const open = ref(false)
const showAll = ref(false)

const activeTags = computed<string[]>(() => filters.value.tags ?? [])
const matchMode = computed(() => filters.value.tagMatch ?? "any")

const visibleTags = computed(() => {
  if (showAll.value) return props.tags
  return props.tags.slice(0, TAG_COLLAPSE_LIMIT)
})
const hiddenCount = computed(() => Math.max(0, props.tags.length - TAG_COLLAPSE_LIMIT))

function toggleTag(id: string) {
  const set = new Set(activeTags.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  const next = Array.from(set)
  update({ tags: next.length ? next : undefined })
}

function setMatch(mode: "any" | "all") {
  update({ tagMatch: mode === "any" ? undefined : mode })
}

function clearTags() {
  update({ tags: undefined, tagMatch: undefined })
}

function labelFor(id: string): string {
  return tagLabel(id, locale.value as Locale)
}
</script>

<template>
  <div class="w-full">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors"
      :class="activeTags.length
        ? 'border-(--color-accent)/40 bg-(--color-accent)/10 text-(--color-accent)'
        : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)'"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="font-semibold">{{ t("filters.tagsToggle") }}</span>
      <span
        v-if="activeTags.length"
        class="rounded-full bg-(--color-accent) text-(--color-accent-fg) font-mono text-[10px] px-1.5 py-0.5"
      >
        {{ activeTags.length }}
      </span>
      <ChevronDown
        :size="12"
        :class="['transition-transform', open ? '' : '-rotate-90']"
        aria-hidden="true"
      />
    </button>

    <div v-if="open" class="mt-3 rounded-md border border-(--color-border) bg-(--color-card) p-3">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tag in visibleTags"
          :key="tag.id"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors"
          :class="activeTags.includes(tag.id)
            ? 'border-(--color-accent) bg-(--color-accent) text-(--color-accent-fg)'
            : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'"
          @click="toggleTag(tag.id)"
        >
          <span>{{ labelFor(tag.id) }}</span>
          <span class="font-mono text-[10px] opacity-70">{{ tag.count }}</span>
        </button>
      </div>

      <div v-if="hiddenCount > 0" class="mt-3 flex justify-center">
        <button
          type="button"
          class="text-[11px] text-(--color-ink-muted) hover:text-(--color-ink)"
          @click="showAll = !showAll"
        >
          {{ showAll ? t("filters.showLess") : t("filters.showMoreCount", { count: hiddenCount }) }}
        </button>
      </div>

      <div
        v-if="activeTags.length"
        class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--color-border) pt-3"
      >
        <div class="flex items-center gap-2 text-[11px] text-(--color-ink-muted)">
          <span>{{ t("filters.matchModeGroupLabel") }}:</span>
          <div class="inline-flex overflow-hidden rounded-md border border-(--color-border)">
            <button
              type="button"
              class="px-2 py-0.5 transition-colors"
              :class="matchMode === 'any'
                ? 'bg-(--color-accent) text-(--color-accent-fg)'
                : 'text-(--color-ink-muted) hover:text-(--color-ink)'"
              @click="setMatch('any')"
            >
              {{ t("filters.tags.any") }}
            </button>
            <button
              type="button"
              class="px-2 py-0.5 transition-colors border-l border-(--color-border)"
              :class="matchMode === 'all'
                ? 'bg-(--color-accent) text-(--color-accent-fg)'
                : 'text-(--color-ink-muted) hover:text-(--color-ink)'"
              @click="setMatch('all')"
            >
              {{ t("filters.tags.all") }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="text-[11px] text-(--color-ink-muted) hover:text-(--color-ink)"
          @click="clearTags"
        >
          {{ t("filters.tags.clear") }}
        </button>
      </div>
    </div>
  </div>
</template>
