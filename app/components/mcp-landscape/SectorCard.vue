<script setup lang="ts">
import type { SectorGroup, ToolDto } from "~~/shared/mcp-panorama"
import CardHeader from "./CardHeader.vue"
import ToolTile from "./ToolTile.vue"

defineProps<{
  group: SectorGroup
  activeId: number | null
}>()
const emit = defineEmits<{ pick: [ToolDto] }>()
</script>

<template>
  <article class="bg-(--color-card) border border-(--color-border) rounded-xl p-3.5 flex flex-col gap-3">
    <CardHeader :group="group" />
    <div class="flex flex-wrap gap-1.5">
      <ToolTile
        v-for="tool in group.items"
        :key="tool.id"
        :tool="tool"
        :active="activeId === tool.id"
        @pick="(t) => emit('pick', t)"
      />
    </div>
  </article>
</template>
