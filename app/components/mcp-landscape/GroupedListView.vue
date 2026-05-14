<script setup lang="ts">
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  STATUS_ORDER,
  type Group,
  type Layer,
  type ToolDto,
} from "~~/shared/mcp-panorama"
import ToolCard from "./ToolCard.vue"

const props = defineProps<{
  layer: Layer
  groups: Group[]
  activeId: number | null
}>()
const emit = defineEmits<{ pick: [ToolDto] }>()

const { locale, t } = useI18n()

interface FlatGroup {
  key: string
  title: string
  subtitle?: string
  items: ToolDto[]
}

const flatGroups = computed<FlatGroup[]>(() => {
  if (props.layer === "industry") {
    return props.groups.map((g) => ({
      key: g.key,
      title: groupDisplayTitle(g, locale.value),
      items: g.items,
    }))
  }
  // Public: split each domain by PDT into separate sections.
  const out: FlatGroup[] = []
  for (const g of props.groups) {
    if (g.kind !== "domain") continue
    for (const p of g.pdts) {
      out.push({
        key: `${g.key}.${p.key}`,
        title: groupDisplayTitle(g, locale.value),
        subtitle: pdtDisplayTitle(p, locale.value),
        items: p.items,
      })
    }
  }
  return out
})

function itemsByStatus(items: ToolDto[], status: typeof STATUS_ORDER[number]) {
  return items.filter((t) => t.status === status)
}
</script>

<template>
  <div class="px-7 pb-7 flex flex-col gap-5">
    <section v-for="g in flatGroups" :key="g.key">
      <div class="flex items-baseline justify-between px-1 pb-2.5">
        <div class="flex items-baseline gap-2.5">
          <h3 class="font-serif text-[20px] font-medium tracking-tight m-0 text-(--color-ink)">
            {{ g.title }}
          </h3>
          <span v-if="g.subtitle" class="font-mono text-[13px] text-(--color-ink-muted)">
            / {{ g.subtitle }}
          </span>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="flex h-1.5 w-[120px] rounded overflow-hidden bg-(--color-border)">
            <template v-for="s in STATUS_ORDER" :key="s">
              <div
                v-if="itemsByStatus(g.items, s).length > 0"
                :class="[
                  s === 'released' && 'bg-(--color-status-released)',
                  s === 'dev' && 'bg-(--color-status-dev)',
                  s === 'none' && 'bg-(--color-status-none)',
                ]"
                :style="{ width: `${(itemsByStatus(g.items, s).length / g.items.length) * 100}%` }"
              />
            </template>
          </div>
          <span class="font-mono text-[11px] text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.depsCount", { count: g.items.length }) }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 border border-(--color-border) rounded-xl p-3 bg-(--color-card)">
        <div v-for="s in STATUS_ORDER" :key="s" class="flex flex-col gap-2">
          <div class="flex items-center gap-1.5 pb-2 border-b border-dashed border-(--color-border)">
            <span
              class="size-[6px] rounded-full"
              :class="[
                s === 'released' && 'bg-(--color-status-released)',
                s === 'dev' && 'bg-(--color-status-dev)',
                s === 'none' && 'bg-(--color-status-none)',
              ]"
            />
            <span class="font-mono text-[11px] text-(--color-ink-muted) tracking-wide">
              {{ t(`mcpPanorama.status.${s}.short`) }} · {{ itemsByStatus(g.items, s).length }}
            </span>
          </div>
          <span
            v-if="itemsByStatus(g.items, s).length === 0"
            class="font-mono text-[11px] text-(--color-ink-muted) italic pt-1 opacity-60"
          >—</span>
          <ToolCard
            v-for="tool in itemsByStatus(g.items, s)"
            :key="tool.id"
            :tool="tool"
            :selected="activeId === tool.id"
            @pick="(t) => emit('pick', t)"
          />
        </div>
      </div>
    </section>
  </div>
</template>
