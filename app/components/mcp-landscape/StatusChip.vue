<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"

const props = defineProps<{
  /** Status key, or "all". */
  value: McpStatus | "all"
  label: string
  count: number
  active: boolean
}>()

const emit = defineEmits<{ click: [] }>()

const dotClass = computed(() => {
  switch (props.value) {
    case "released": return "bg-(--color-status-released)"
    case "dev": return "bg-(--color-status-dev)"
    case "none": return "bg-(--color-status-none)"
    default: return ""
  }
})

const activeClass = computed(() => {
  if (!props.active) return "border-(--color-border) bg-(--color-card) text-(--color-ink)"
  switch (props.value) {
    case "released": return "border-(--color-status-released) bg-(--color-status-released-bg) text-(--color-status-released)"
    case "dev": return "border-(--color-status-dev) bg-(--color-status-dev-bg) text-(--color-status-dev)"
    case "none": return "border-(--color-status-none) bg-(--color-status-none-bg) text-(--color-status-none)"
    default: return "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
  }
})
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-[12px] cursor-pointer transition"
    :class="[activeClass, active ? 'font-semibold' : 'font-medium']"
    @click="emit('click')"
  >
    <span v-if="value !== 'all'" class="size-[6px] rounded-full" :class="dotClass" />
    <span>{{ label }}</span>
    <span
      class="font-mono text-[10px] px-1.5 py-[1px] rounded-full"
      :class="active ? 'bg-transparent' : 'bg-(--color-bg) text-(--color-ink-muted)'"
    >
      {{ count }}
    </span>
  </button>
</template>
