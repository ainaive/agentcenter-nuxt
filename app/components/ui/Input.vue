<script setup lang="ts">
import { cn } from "~/lib/utils"

const props = defineProps<{
  modelValue?: string | number | null
  class?: string
}>()

defineEmits<{
  (e: "update:modelValue", value: string | number): void
}>()
</script>

<template>
  <input
    :value="modelValue ?? ''"
    :class="cn(
      'flex h-9 w-full rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1 text-sm text-(--color-ink) placeholder:text-(--color-ink-muted) shadow-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 focus-visible:border-(--color-accent)/60',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
    @input="(event) => $emit('update:modelValue', (event.target as HTMLInputElement).value)"
  >
</template>
