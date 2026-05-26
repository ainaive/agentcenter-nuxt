<script setup lang="ts">
import type { DomainGroup, McpDto, ToolDto } from "~~/shared/mcp-panorama"
import CardHeader from "./CardHeader.vue"
import PdtBlock from "./PdtBlock.vue"

defineProps<{
  group: DomainGroup
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
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
      <PdtBlock
        v-for="pdt in group.pdts"
        :key="pdt.key"
        :pdt="pdt"
        :owner-domain-key="group.key"
        :active-mcp-id="activeMcpId"
        @pick="(p) => emit('pick', p)"
      />
    </div>
  </article>
</template>
