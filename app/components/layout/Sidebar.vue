<script setup lang="ts">
import {
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  Command,
  Compass,
  Folder,
  Globe2,
  Map,
  Plug,
  Plus,
  Upload,
  Zap,
} from "lucide-vue-next"
import type { Component } from "vue"

defineProps<{ collapsed: boolean }>()

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

type Category = "all" | "skills" | "mcp" | "slash" | "plugins"

const BROWSE_ITEMS: { key: Category; labelKey: string; Icon: Component }[] = [
  { key: "all", labelKey: "sidebar.allExtensions", Icon: Boxes },
  { key: "skills", labelKey: "sidebar.skills", Icon: Zap },
  { key: "mcp", labelKey: "sidebar.mcpServers", Icon: Globe2 },
  { key: "slash", labelKey: "sidebar.slashCommands", Icon: Command },
  { key: "plugins", labelKey: "sidebar.plugins", Icon: Plug },
]

const COLLECTION_PLACEHOLDERS = [
  { id: "p1", name: "My Tools" },
  { id: "p2", name: "Reviewed" },
]

const activeCategory = computed<Category>(() => {
  const raw = route.query.category
  if (typeof raw === "string" && ["skills", "mcp", "slash", "plugins"].includes(raw)) {
    return raw as Category
  }
  return "all"
})

type NavKey = "extensions" | "mcp-panorama" | "publish" | "docs"

const PRIMARY_NAV: { key: NavKey; to: string; labelKey: string; Icon: Component; disabled?: boolean }[] = [
  { key: "extensions", to: "/extensions", labelKey: "nav.explore", Icon: Compass },
  { key: "mcp-panorama", to: "/mcp-panorama", labelKey: "nav.mcpPanorama", Icon: Map },
  { key: "publish", to: "/publish", labelKey: "nav.publish", Icon: Upload },
  { key: "docs", to: "", labelKey: "nav.docs", Icon: BookOpen, disabled: true },
]

const expansion = reactive({
  sections: { explore: true, browse: true, collections: false },
})

function buildHref(updates: Record<string, string | null>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(route.query)) {
    if (typeof v === "string" && k !== "page") params.set(k, v)
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === null) params.delete(k)
    else params.set(k, v)
  }
  const qs = params.toString()
  const path = localePath("/extensions")
  return qs ? `${path}?${qs}` : path
}

function toggleSection(key: "explore" | "browse" | "collections") {
  expansion.sections[key] = !expansion.sections[key]
}
</script>

<template>
  <div v-if="!collapsed" class="min-w-[200px] flex-1 overflow-y-auto p-3 text-(--color-ink)">
    <!-- Primary nav section -->
    <div class="mb-1">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-bold tracking-wider uppercase text-(--color-ink-muted) hover:text-(--color-ink)"
        :aria-expanded="expansion.sections.explore"
        @click="toggleSection('explore')"
      >
        {{ t("sidebar.explore") }}
        <ChevronDown v-if="expansion.sections.explore" :size="14" aria-hidden="true" />
        <ChevronRight v-else :size="14" aria-hidden="true" />
      </button>
      <nav
        v-if="expansion.sections.explore"
        class="mt-0.5 flex flex-col gap-px"
        :aria-label="t('nav.explore')"
      >
        <template v-for="item in PRIMARY_NAV" :key="item.key">
          <span
            v-if="item.disabled"
            class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-(--color-ink-muted) cursor-not-allowed"
            :title="t('nav.comingSoon')"
            aria-disabled="true"
          >
            <component :is="item.Icon" :size="14" class="shrink-0" />
            <span class="flex-1 truncate">{{ t(item.labelKey) }}</span>
          </span>
          <NuxtLink
            v-else
            :to="localePath(item.to)"
            class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition hover:bg-(--color-sidebar)"
            active-class="bg-(--color-accent)/10 text-(--color-accent) font-semibold"
          >
            <component :is="item.Icon" :size="14" class="shrink-0" />
            <span class="flex-1 truncate">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </template>
      </nav>
    </div>

    <div class="bg-(--color-border) mx-1 my-3 h-px" />

    <!-- Browse section -->
    <div class="mb-1">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-bold tracking-wider uppercase text-(--color-ink-muted) hover:text-(--color-ink)"
        :aria-expanded="expansion.sections.browse"
        @click="toggleSection('browse')"
      >
        {{ t("sidebar.browse") }}
        <ChevronDown v-if="expansion.sections.browse" :size="14" aria-hidden="true" />
        <ChevronRight v-else :size="14" aria-hidden="true" />
      </button>
      <div v-if="expansion.sections.browse" class="mt-0.5 flex flex-col gap-px">
        <NuxtLink
          v-for="item in BROWSE_ITEMS"
          :key="item.key"
          :to="buildHref({ category: item.key === activeCategory ? null : (item.key === 'all' ? null : item.key) })"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition hover:bg-(--color-sidebar)"
          :class="activeCategory === item.key ? 'bg-(--color-accent)/10 text-(--color-accent) font-semibold' : 'text-(--color-ink)'"
        >
          <component :is="item.Icon" :size="14" class="shrink-0" />
          <span class="flex-1 truncate">{{ t(item.labelKey) }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="bg-(--color-border) mx-1 my-3 h-px" />

    <!-- Collections section (placeholders) -->
    <div class="mb-1">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-bold tracking-wider uppercase text-(--color-ink-muted) hover:text-(--color-ink)"
        :aria-expanded="expansion.sections.collections"
        @click="toggleSection('collections')"
      >
        {{ t("sidebar.collections") }}
        <ChevronDown v-if="expansion.sections.collections" :size="14" aria-hidden="true" />
        <ChevronRight v-else :size="14" aria-hidden="true" />
      </button>
      <div v-if="expansion.sections.collections" class="mt-0.5 flex flex-col gap-px">
        <div
          aria-disabled="true"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-(--color-ink-muted)"
        >
          <Folder :size="14" class="shrink-0" />
          <span class="flex-1">{{ t("sidebar.saved") }}</span>
        </div>
        <div
          v-for="col in COLLECTION_PLACEHOLDERS"
          :key="col.id"
          aria-disabled="true"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-(--color-ink-muted)"
        >
          <span class="bg-(--color-accent) size-1.5 shrink-0 rounded-full" />
          <span class="flex-1 truncate">{{ col.name }}</span>
        </div>
        <div
          aria-disabled="true"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-(--color-ink-muted) opacity-60"
        >
          <Plus :size="14" class="shrink-0" />
          <span class="flex-1">{{ t("sidebar.newGroup") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
