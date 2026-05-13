<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "~/lib/utils"

const props = defineProps<{
  modelValue?: string | null
  class?: HTMLAttributes["class"]
}>()

defineEmits<{
  (e: "update:modelValue", value: string): void
}>()
</script>

<template>
  <textarea
    :value="modelValue ?? ''"
    :class="cn(
      'flex min-h-[80px] w-full rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-ink) placeholder:text-(--color-ink-muted) shadow-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 focus-visible:border-(--color-accent)/60',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
    @input="(event) => $emit('update:modelValue', (event.target as HTMLTextAreaElement).value)"
  />
</template>
