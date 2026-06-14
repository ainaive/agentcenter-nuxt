<script setup lang="ts">
import type { McpDto, SectorGroup, ToolDto } from "~~/shared/mcp-panorama"
import CardHeader from "./CardHeader.vue"
import ToolMcpsCard from "./ToolMcpsCard.vue"

const props = defineProps<{
  group: SectorGroup
  activeMcpId: number | null
}>()
const emit = defineEmits<{
  pick: [{ tool: ToolDto; mcp: McpDto }]
  drill: [string]
}>()
</script>

<template>
  <Card as="article" padding="sm" class="flex flex-col gap-3">
    <CardHeader :group="group" @drill="emit('drill', props.group.key)" />
    <div class="bg-(--color-bg) rounded-lg p-2.5 flex flex-col gap-1.5">
      <ToolMcpsCard
        v-for="tool in group.items"
        :key="tool.id"
        :tool="tool"
        :active-mcp-id="activeMcpId"
        @pick="(p) => emit('pick', p)"
      />
    </div>
  </Card>
</template>
