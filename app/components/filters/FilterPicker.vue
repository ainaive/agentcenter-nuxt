<script setup lang="ts">
export interface FilterOption {
  id: string
  label: string
  count?: number
}

// The list-shape filter picker: a popover with an "any" row and a
// scrollable, count-badged option list. Drives the Creator and Publisher
// pickers, which differ only in how they map their facets to options.
const props = defineProps<{
  options: FilterOption[]
  activeId?: string
  /** Trigger text shown when nothing is selected. */
  label: string
  anyLabel: string
  emptyLabel: string
  maxWidth?: string
}>()

const emit = defineEmits<{ select: [id: string | undefined] }>()

const open = ref(false)

const activeOption = computed(
  () => props.options.find((o) => o.id === props.activeId) ?? null,
)

function choose(id: string | undefined) {
  emit("select", id)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <FilterTrigger
      :label="activeOption ? activeOption.label : label"
      :active="!!activeOption"
      :max-width="maxWidth"
    />

    <PopoverContent align="start" class="w-[280px] p-0">
      <div v-if="options.length === 0" class="p-4 text-sm text-(--color-ink-muted)">
        {{ emptyLabel }}
      </div>
      <div v-else class="max-h-72 overflow-y-auto py-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
          :class="activeOption ? '' : 'font-semibold'"
          @click="choose(undefined)"
        >
          <span>{{ anyLabel }}</span>
        </button>
        <button
          v-for="o in options"
          :key="o.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
          :class="activeOption?.id === o.id ? 'font-semibold' : ''"
          @click="choose(o.id)"
        >
          <span class="truncate">{{ o.label }}</span>
          <span
            v-if="o.count !== undefined"
            class="font-mono text-[11px] text-(--color-ink-muted) shrink-0"
          >
            {{ o.count }}
          </span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
