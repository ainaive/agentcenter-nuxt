<script setup lang="ts">
import type { DomainGroup, McpDto, ToolDto } from "~~/shared/mcp-panorama"
import CardHeader from "./CardHeader.vue"
import PdtBlock from "./PdtBlock.vue"

const props = defineProps<{
  group: DomainGroup
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
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
      <PdtBlock
        v-for="pdt in group.pdts"
        :key="pdt.key"
        :pdt="pdt"
        :active-mcp-id="activeMcpId"
        @pick="(p) => emit('pick', p)"
      />
    </div>
  </Card>
</template>
