<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"

const props = withDefaults(
  defineProps<{ status: McpStatus; size?: "sm" | "md" }>(),
  { size: "sm" },
)

const { t } = useI18n()
const label = computed(() => t(`mcpPanorama.status.${props.status}.short`))
</script>

<template>
  <span
    class="inline-flex items-center font-mono leading-snug whitespace-nowrap rounded-full"
    :class="[
      size === 'sm' ? 'gap-1.5 px-2 py-[2px] text-[11px]' : 'gap-1.5 px-2.5 py-[3px] text-[12px]',
      status === 'released' && 'bg-(--color-status-released-bg) text-(--color-status-released)',
      status === 'dev' && 'bg-(--color-status-dev-bg) text-(--color-status-dev)',
      status === 'none' && 'bg-(--color-status-none-bg) text-(--color-status-none)',
    ]"
  >
    <span
      class="rounded-full"
      :class="[
        size === 'sm' ? 'size-[5px]' : 'size-[6px]',
        status === 'released' && 'bg-(--color-status-released)',
        status === 'dev' && 'bg-(--color-status-dev)',
        status === 'none' && 'bg-(--color-status-none)',
      ]"
    />
    {{ label }}
  </span>
</template>
