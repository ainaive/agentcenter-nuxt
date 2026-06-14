<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"

// The shared quiet-pill trigger for the listing filter rail (locked
// decision #3). Owns the bordered pill + active/disabled states + the
// chevron so every picker (Creator, Publisher, Dept, OfficialTier,
// SubCat) reads identically. Drop it inside a <Popover>.
withDefaults(
  defineProps<{
    label: string
    active?: boolean
    disabled?: boolean
    maxWidth?: string
  }>(),
  { maxWidth: "140px" },
)
</script>

<template>
  <PopoverTrigger
    :disabled="disabled"
    :class="[
      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[12px] transition-colors',
      disabled
        ? 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted)/60 cursor-not-allowed'
        : active
          ? 'border-(--color-ink)/20 bg-(--color-card) text-(--color-ink) font-semibold'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)',
    ]"
  >
    <span class="truncate" :style="{ maxWidth }">{{ label }}</span>
    <ChevronDown :size="12" aria-hidden="true" />
  </PopoverTrigger>
</template>
