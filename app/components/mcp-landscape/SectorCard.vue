<script setup lang="ts">
import type { McpDto, SectorGroup, ToolDto } from "~~/shared/mcp-panorama"
import CardHeader from "./CardHeader.vue"
import ToolMcpsCard from "./ToolMcpsCard.vue"

defineProps<{
  group: SectorGroup
  activeMcpId: number | null
}>()
const emit = defineEmits<{
  pick: [{ tool: ToolDto; mcp: McpDto }]
}>()
</script>

<template>
  <article
    :id="`group-${group.key}`"
    class="bg-(--color-card) border border-(--color-border) rounded-xl p-3.5 flex flex-col gap-3 scroll-mt-20"
  >
    <CardHeader :group="group" />
    <div class="bg-(--color-bg) rounded-lg p-2.5 flex flex-col gap-1.5">
      <ToolMcpsCard
        v-for="tool in group.items"
        :key="tool.id"
        :tool="tool"
        :active-mcp-id="activeMcpId"
        @pick="(p) => emit('pick', p)"
      />
    </div>
  </article>
</template>
