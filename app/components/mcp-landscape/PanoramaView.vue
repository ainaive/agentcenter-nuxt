<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import type {
  Group,
  GroupStats,
  Layer,
  McpDto,
  ToolDto,
} from "~~/shared/mcp-panorama"
import DomainCard from "./DomainCard.vue"
import LayerSummary from "./LayerSummary.vue"
import SectorCard from "./SectorCard.vue"

const props = defineProps<{
  layer: Layer
  stats: GroupStats
  groups: Group[]
  activeMcpId: number | null
}>()
const emit = defineEmits<{
  pick: [{ tool: ToolDto; mcp: McpDto }]
  filter: [McpStatus]
}>()

const gridCols = computed(() =>
  props.layer === "industry"
    ? "repeat(auto-fit, minmax(320px, 1fr))"
    : "repeat(auto-fit, minmax(520px, 1fr))",
)
</script>

<template>
  <div class="px-7 pb-7 flex flex-col gap-5">
    <LayerSummary
      :layer="layer"
      :stats="stats"
      :groups="groups"
      @filter="(s) => emit('filter', s)"
    />
    <div class="grid gap-3.5 items-start" :style="{ gridTemplateColumns: gridCols }">
      <template v-for="g in groups" :key="g.key">
        <SectorCard
          v-if="g.kind === 'sector'"
          :group="g"
          :active-mcp-id="activeMcpId"
          @pick="(p) => emit('pick', p)"
        />
        <DomainCard
          v-else
          :group="g"
          :active-mcp-id="activeMcpId"
          @pick="(p) => emit('pick', p)"
        />
      </template>
    </div>
  </div>
</template>
