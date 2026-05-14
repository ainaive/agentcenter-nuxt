<script setup lang="ts">
import { Network } from "lucide-vue-next"
import { toolDisplayName, type ToolDto } from "~~/shared/mcp-panorama"

const props = defineProps<{
  tool: ToolDto
  selected: boolean
}>()
const emit = defineEmits<{ pick: [ToolDto] }>()

const { locale } = useI18n()
const displayName = computed(() => toolDisplayName(props.tool, locale.value))
</script>

<template>
  <button
    type="button"
    class="w-full text-left bg-(--color-card) rounded-lg px-2.5 py-2 transition flex flex-col gap-1 cursor-pointer"
    :class="selected
      ? 'border-(--color-accent) shadow-[0_0_0_3px_rgba(135,80,55,0.12)]'
      : 'border-(--color-border) hover:border-(--color-ink-muted) hover:-translate-y-px'"
    style="border-width: 1px"
    @click="emit('pick', tool)"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-[13px] font-semibold tracking-tight truncate text-(--color-ink)">
        {{ displayName }}
      </span>
      <span
        v-if="tool.depsCount > 0"
        class="inline-flex items-center gap-1 font-mono text-[10px] text-(--color-ink-muted) shrink-0"
      >
        <Network :size="10" aria-hidden="true" />
        {{ tool.depsCount }}
      </span>
    </div>
    <div class="flex items-center justify-between gap-1.5 font-mono text-[10px] text-(--color-ink-muted)">
      <span class="truncate">{{ tool.ownerPrimary }}<span v-if="tool.ownerSecondary"> / {{ tool.ownerSecondary }}</span></span>
    </div>
  </button>
</template>
