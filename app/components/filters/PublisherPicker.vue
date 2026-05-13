<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"
import type { PublisherFacet } from "~~/shared/types"

const props = defineProps<{
  publishers: PublisherFacet[]
}>()

const { t, locale } = useI18n()
const { filters, update } = useFilters()

const open = ref(false)

const activePublisher = computed<PublisherFacet | null>(() => {
  const id = filters.value.publisher
  if (!id) return null
  return props.publishers.find((p) => p.id === id) ?? null
})

function publisherLabel(p: PublisherFacet): string {
  if (locale.value === "zh" && p.nameZh) return p.nameZh
  return p.name
}

function selectPublisher(id: string | undefined) {
  update({ publisher: id })
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger
      :class="[
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors',
        activePublisher
          ? 'border-(--color-accent)/40 bg-(--color-accent)/10 text-(--color-accent)'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)',
      ]"
    >
      <span class="font-semibold">{{ t("filters.publisher.label") }}:</span>
      <span class="truncate max-w-[140px]">
        {{ activePublisher ? publisherLabel(activePublisher) : t("filters.publisher.any") }}
      </span>
      <ChevronDown :size="12" aria-hidden="true" />
    </PopoverTrigger>

    <PopoverContent align="start" :class="'w-[280px] p-0'">
      <div v-if="publishers.length === 0" class="p-4 text-sm text-(--color-ink-muted)">
        {{ t("filters.publisher.empty") }}
      </div>
      <div v-else class="max-h-72 overflow-y-auto py-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-(--color-sidebar)"
          :class="!activePublisher ? 'text-(--color-accent) font-medium' : 'text-(--color-ink)'"
          @click="selectPublisher(undefined)"
        >
          <span>{{ t("filters.publisher.any") }}</span>
        </button>
        <button
          v-for="p in publishers"
          :key="p.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-(--color-sidebar)"
          :class="activePublisher?.id === p.id ? 'text-(--color-accent) font-medium' : 'text-(--color-ink)'"
          @click="selectPublisher(p.id)"
        >
          <span class="truncate">{{ publisherLabel(p) }}</span>
          <span class="font-mono text-[11px] text-(--color-ink-muted) shrink-0">
            {{ p.count }}
          </span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
