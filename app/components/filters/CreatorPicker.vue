<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"
import type { CreatorFacet } from "~~/shared/types"

const props = defineProps<{
  creators: CreatorFacet[]
}>()

const { t } = useI18n()
const { filters, update } = useFilters()

const open = ref(false)

const activeCreator = computed<CreatorFacet | null>(() => {
  const id = filters.value.creator
  if (!id) return null
  return props.creators.find((c) => c.id === id) ?? null
})

function creatorLabel(c: CreatorFacet): string {
  return c.name && c.name.trim() ? c.name : c.email
}

function selectCreator(id: string | undefined) {
  update({ creator: id })
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger
      :class="[
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors',
        activeCreator
          ? 'border-(--color-accent)/40 bg-(--color-accent)/10 text-(--color-accent)'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)',
      ]"
    >
      <span class="font-semibold">{{ t("filters.creator.label") }}:</span>
      <span class="truncate max-w-[140px]">
        {{ activeCreator ? creatorLabel(activeCreator) : t("filters.creator.any") }}
      </span>
      <ChevronDown :size="12" aria-hidden="true" />
    </PopoverTrigger>

    <PopoverContent align="start" :class="'w-[280px] p-0'">
      <div v-if="creators.length === 0" class="p-4 text-sm text-(--color-ink-muted)">
        {{ t("filters.creator.empty") }}
      </div>
      <div v-else class="max-h-72 overflow-y-auto py-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-(--color-sidebar)"
          :class="!activeCreator ? 'text-(--color-accent) font-medium' : 'text-(--color-ink)'"
          @click="selectCreator(undefined)"
        >
          <span>{{ t("filters.creator.any") }}</span>
        </button>
        <button
          v-for="c in creators"
          :key="c.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-(--color-sidebar)"
          :class="activeCreator?.id === c.id ? 'text-(--color-accent) font-medium' : 'text-(--color-ink)'"
          @click="selectCreator(c.id)"
        >
          <span class="truncate">{{ creatorLabel(c) }}</span>
          <span class="font-mono text-[11px] text-(--color-ink-muted) shrink-0">
            {{ c.count }}
          </span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
