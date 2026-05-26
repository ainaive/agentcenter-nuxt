<script setup lang="ts">
import {
  pdtDisplayTitle,
  type McpDto,
  type PdtBlock,
  type ToolDto,
} from "~~/shared/mcp-panorama"
import ToolMcpsCard from "./ToolMcpsCard.vue"

const props = defineProps<{
  pdt: PdtBlock
  ownerDomainKey: string
  activeMcpId: number | null
}>()
const emit = defineEmits<{ pick: [{ tool: ToolDto; mcp: McpDto }] }>()

const { locale } = useI18n()
const title = computed(() => pdtDisplayTitle(props.pdt, locale.value))

const mcpCount = computed(() =>
  props.pdt.items.reduce((acc, t) => acc + t.mcps.length, 0),
)
</script>

<template>
  <section
    :id="`pdt-${ownerDomainKey}-${pdt.key}`"
    class="bg-(--color-bg) rounded-lg px-2.5 py-2.5 flex flex-col gap-2 scroll-mt-20"
  >
    <header class="flex items-baseline justify-between gap-2 px-0.5">
      <span class="font-serif text-[13px] font-medium text-(--color-ink) tracking-tight truncate">
        {{ title }}
      </span>
      <span class="font-mono text-[10px] text-(--color-ink-muted) shrink-0">{{ mcpCount }}</span>
    </header>
    <div class="flex flex-col gap-1.5">
      <ToolMcpsCard
        v-for="tool in pdt.items"
        :key="tool.id"
        :tool="tool"
        :active-mcp-id="activeMcpId"
        @pick="(p) => emit('pick', p)"
      />
    </div>
  </section>
</template>
