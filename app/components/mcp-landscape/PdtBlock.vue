<script setup lang="ts">
import { pdtDisplayTitle, type PdtBlock, type ToolDto } from "~~/shared/mcp-panorama"
import ToolTile from "./ToolTile.vue"

const props = defineProps<{
  pdt: PdtBlock
  activeId: number | null
}>()
const emit = defineEmits<{ pick: [ToolDto] }>()

const { locale } = useI18n()
const title = computed(() => pdtDisplayTitle(props.pdt, locale.value))
</script>

<template>
  <div class="bg-(--color-bg) border border-(--color-border) rounded-lg p-2.5 flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[12px] font-semibold text-(--color-ink) tracking-tight">{{ title }}</span>
      <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ pdt.items.length }}</span>
    </div>
    <div class="flex flex-wrap gap-1">
      <ToolTile
        v-for="tool in pdt.items"
        :key="tool.id"
        :tool="tool"
        :active="activeId === tool.id"
        compact
        @pick="(t) => emit('pick', t)"
      />
    </div>
  </div>
</template>
