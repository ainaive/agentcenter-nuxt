<script setup lang="ts">
import type { HTMLAttributes, InputHTMLAttributes } from "vue"
import { cn } from "~/lib/utils"

const props = defineProps<{
  modelValue?: string | number | null
  type?: InputHTMLAttributes["type"]
  class?: HTMLAttributes["class"]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number | null): void
}>()

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  if (props.type === "number") {
    emit("update:modelValue", el.value === "" ? null : Number(el.value))
    return
  }
  emit("update:modelValue", el.value)
}
</script>

<template>
  <input
    :type="props.type ?? 'text'"
    :value="modelValue ?? ''"
    :class="cn(
      'flex h-9 w-full rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1 text-sm text-(--color-ink) placeholder:text-(--color-ink-muted) shadow-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 focus-visible:border-(--color-accent)/60',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
    @input="onInput"
  >
</template>
