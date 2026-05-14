<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next"
import { toolDisplayName, type ToolDto } from "~~/shared/mcp-panorama"

const props = withDefaults(
  defineProps<{
    tool: ToolDto
    active?: boolean
    /** Compact = used inside PdtBlock or dense panorama mode. */
    compact?: boolean
  }>(),
  { active: false, compact: false },
)

const emit = defineEmits<{ pick: [ToolDto] }>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const displayName = computed(() => toolDisplayName(props.tool, locale.value))
const isReleased = computed(() => props.tool.status === "released")
const showDeps = computed(() => props.tool.depsCount >= 10)

const tooltip = computed(() => {
  const statusLabel = t(`mcpPanorama.status.${props.tool.status}.label`)
  if (isReleased.value) return `${displayName.value} · ${t("mcpPanorama.detail.openInMarketplace")} →`
  return `${displayName.value} · ${statusLabel} (${t("mcpPanorama.detail.notAvailable")})`
})

const baseClass = computed(() => [
  "group inline-flex items-center gap-1.5 rounded-md text-[12px] leading-tight font-medium tracking-tight no-underline relative shrink-0 transition-all border",
  // status colors
  props.tool.status === "released"
    && "bg-(--color-status-released-bg) text-(--color-status-released) border-(--color-status-released)/20 border-l-[3px] border-l-(--color-status-released)",
  props.tool.status === "dev"
    && "bg-(--color-status-dev-bg) text-(--color-status-dev) border-(--color-status-dev)/20 border-l-[3px] border-l-(--color-status-dev)",
  props.tool.status === "none"
    && "bg-(--color-status-none-bg) text-(--color-status-none) border-(--color-status-none)/20 border-l-[3px] border-l-(--color-status-none)",
  // density
  props.compact ? "px-[7px] py-[3px] text-[11px]" : "px-[9px] py-[5px]",
  // active ring
  props.active && isReleased.value && "ring-2 ring-(--color-status-released)/30",
  // hover (only when clickable)
  isReleased.value && "cursor-pointer hover:-translate-y-px hover:border-(--color-status-released) hover:shadow-[0_4px_12px_-4px] hover:shadow-(--color-status-released)/40",
])

function onClick(e: MouseEvent) {
  // Allow native open-in-new-tab for cmd/ctrl/shift/middle-click.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
  emit("pick", props.tool)
}
</script>

<template>
  <NuxtLink
    v-if="isReleased && tool.extensionSlug"
    :to="localePath(`/extensions/${tool.extensionSlug}`)"
    :title="tooltip"
    :class="baseClass"
    @click="onClick"
  >
    <span class="whitespace-nowrap shrink-0">{{ displayName }}</span>
    <span
      v-if="showDeps"
      class="font-mono text-[9px] font-semibold rounded px-1 py-0 bg-(--color-status-released) text-(--color-card)"
    >{{ tool.depsCount }}</span>
    <ChevronRight :size="9" class="shrink-0 opacity-70" aria-hidden="true" />
  </NuxtLink>
  <span
    v-else
    :title="tooltip"
    aria-disabled="true"
    :class="[...baseClass, 'select-none cursor-default']"
  >
    <span class="whitespace-nowrap shrink-0">{{ displayName }}</span>
    <span
      v-if="showDeps"
      class="font-mono text-[9px] font-semibold rounded px-1 py-0 text-(--color-card)"
      :class="[
        tool.status === 'dev' && 'bg-(--color-status-dev)',
        tool.status === 'none' && 'bg-(--color-status-none)',
      ]"
    >{{ tool.depsCount }}</span>
  </span>
</template>
