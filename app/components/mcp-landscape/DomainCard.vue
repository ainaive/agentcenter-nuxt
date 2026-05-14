<script setup lang="ts">
import type { DomainGroup, ToolDto } from "~~/shared/mcp-panorama"
import CardHeader from "./CardHeader.vue"
import PdtBlock from "./PdtBlock.vue"

defineProps<{
  group: DomainGroup
  activeId: number | null
}>()
const emit = defineEmits<{ pick: [ToolDto] }>()
</script>

<template>
  <article class="bg-(--color-card) border border-(--color-border) rounded-xl p-3.5 flex flex-col gap-3">
    <CardHeader :group="group" />
    <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
      <PdtBlock
        v-for="pdt in group.pdts"
        :key="pdt.key"
        :pdt="pdt"
        :active-id="activeId"
        @pick="(t) => emit('pick', t)"
      />
    </div>
  </article>
</template>
