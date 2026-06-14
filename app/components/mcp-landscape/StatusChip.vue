<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import { mcpStatusClasses } from "~/lib/mcp-status"

const props = defineProps<{
  /** Status key, or "all". */
  value: McpStatus | "all"
  label: string
  count: number
  active: boolean
}>()

const emit = defineEmits<{ click: [] }>()

const dotClass = computed(() =>
  props.value === "all" ? "" : mcpStatusClasses(props.value).dot,
)

const activeClass = computed(() => {
  if (!props.active) return "border-(--color-border) bg-(--color-card) text-(--color-ink)"
  // The "all" toggle is a filter pill — neutral ink active state, not an
  // accent fill (locked decision #11). Status pills keep their own colour.
  if (props.value === "all") return "border-(--color-ink)/25 bg-(--color-ink)/8 text-(--color-ink)"
  const c = mcpStatusClasses(props.value)
  return `${c.border} ${c.surface}`
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
