<script setup lang="ts">
import { X } from "lucide-vue-next"
import { deptPath } from "~~/shared/data/departments"
import { tagLabel } from "~~/shared/tags"
import type {
  CreatorFacet,
  Locale,
  PublisherFacet,
  TagFacet,
} from "~~/shared/types"

const props = defineProps<{
  count: number
  creators: CreatorFacet[]
  publishers: PublisherFacet[]
  tags: TagFacet[]
}>()

const { t, locale } = useI18n()
const { filters, update } = useFilters()

interface Chip {
  key: string
  label: string
  removeLabel: string
  onDismiss: () => void
}

function creatorName(id: string): string {
  const c = props.creators.find((x) => x.id === id)
  if (!c) return id
  return c.name ?? c.email
}

function publisherName(id: string): string {
  const p = props.publishers.find((x) => x.id === id)
  if (!p) return id
  return locale.value === "zh" && p.nameZh ? p.nameZh : p.name
}

const chips = computed<Chip[]>(() => {
  const f = filters.value
  const out: Chip[] = []

  if (f.q) {
    const label = `"${f.q}"`
    out.push({
      key: "q",
      label,
      removeLabel: label,
      onDismiss: () => update({ q: undefined }),
    })
  }
  if (f.scope) {
    const label = t(`filters.scope.${f.scope}`)
    out.push({
      key: "scope",
      label,
      removeLabel: label,
      onDismiss: () => update({ scope: undefined }),
    })
  }
  if (f.dept) {
    const trail = deptPath(f.dept, locale.value as Locale)
    const label = trail.length > 0 ? trail.join(" / ") : f.dept
    out.push({
      key: "dept",
      label,
      removeLabel: label,
      onDismiss: () => update({ dept: undefined }),
    })
  }
  if (f.creator) {
    const label = creatorName(f.creator)
    out.push({
      key: "creator",
      label,
      removeLabel: label,
      onDismiss: () => update({ creator: undefined }),
    })
  }
  if (f.publisher) {
    const label = publisherName(f.publisher)
    out.push({
      key: "publisher",
      label,
      removeLabel: label,
      onDismiss: () => update({ publisher: undefined }),
    })
  }
  if (f.filter) {
    const label = t(`filters.chips.${f.filter}`)
    out.push({
      key: "filter",
      label,
      removeLabel: label,
      onDismiss: () => update({ filter: undefined }),
    })
  }
  if (f.tags && f.tags.length > 0) {
    for (const id of f.tags) {
      const label = `#${tagLabel(id, locale.value as Locale)}`
      out.push({
        key: `tag:${id}`,
        label,
        removeLabel: label,
        onDismiss: () => {
          const next = (filters.value.tags ?? []).filter((x) => x !== id)
          update({
            tags: next.length ? next : undefined,
            tagMatch: next.length ? filters.value.tagMatch : undefined,
          })
        },
      })
    }
  }

  return out
})

const hasChips = computed(() => chips.value.length > 0)

function clearAll() {
  update({
    q: undefined,
    scope: undefined,
    dept: undefined,
    creator: undefined,
    publisher: undefined,
    filter: undefined,
    tags: undefined,
    tagMatch: undefined,
  })
}
</script>

<template>
  <div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
    <p class="text-(--color-ink-muted) font-mono text-[12px]">
      {{ count > 0 ? t("extensions.summary.showing", { count }) : t("extensions.summary.showingZero") }}
    </p>

    <div v-if="hasChips" class="flex flex-1 flex-wrap items-center gap-1.5">
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        :aria-label="t('extensions.summary.removeFilter', { label: chip.removeLabel })"
        class="inline-flex items-center gap-1 rounded-full border border-(--color-border) bg-(--color-card) px-2 py-0.5 text-[11px] font-semibold text-(--color-ink-muted) transition-colors hover:border-(--color-ink)/40 hover:text-(--color-ink)"
        @click="chip.onDismiss()"
      >
        <span class="max-w-[14ch] truncate">{{ chip.label }}</span>
        <X :size="11" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="ml-1 text-[11px] font-semibold text-(--color-ink-muted) underline-offset-2 transition-colors hover:text-(--color-ink) hover:underline"
        @click="clearAll()"
      >
        {{ t("extensions.summary.clearAll") }}
      </button>
    </div>

    <SortSelect class="ml-auto" />
  </div>
</template>
