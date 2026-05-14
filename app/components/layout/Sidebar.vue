<script setup lang="ts">
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Command,
  Folder,
  Globe2,
  LayoutGrid,
  Plug,
  Plus,
  Zap,
} from "lucide-vue-next"
import { FUNC_CAT_COLORS, FUNC_TAXONOMY } from "~~/shared/taxonomy"
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

const activeFuncCat = computed(() => (typeof route.query.funcCat === "string" ? route.query.funcCat : null))
const activeSubCat = computed(() => (typeof route.query.subCat === "string" ? route.query.subCat : null))
const activeL2 = computed(() => (typeof route.query.l2 === "string" ? route.query.l2 : null))

const expansion = reactive({
  sections: { browse: true, categories: true, collections: false },
  funcCats: {} as Record<string, boolean>,
  l1: {} as Record<string, boolean>,
})

if (activeFuncCat.value) expansion.funcCats[activeFuncCat.value] = true
else expansion.funcCats.workTask = true
if (activeSubCat.value) expansion.l1[activeSubCat.value] = true

watch(activeFuncCat, (next) => {
  if (next) expansion.funcCats[next] = true
})
watch(activeSubCat, (next) => {
  if (next) expansion.l1[next] = true
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

function toggleSection(key: "browse" | "categories" | "collections") {
  expansion.sections[key] = !expansion.sections[key]
}
function toggleFuncCat(key: string) {
  expansion.funcCats[key] = !expansion.funcCats[key]
}
function toggleL1(key: string) {
  expansion.l1[key] = !expansion.l1[key]
}
</script>

<template>
  <div v-if="!collapsed" class="min-w-[200px] flex-1 overflow-y-auto p-3 text-(--color-ink)">
    <!-- MCP Panorama callout — prominent entry to the service-landscape page. -->
    <NuxtLink
      :to="localePath('/mcp-panorama')"
      class="mb-3 flex items-center gap-2.5 rounded-md border border-(--color-accent)/25 bg-(--color-accent)/8 px-2.5 py-2 text-(--color-ink) transition hover:bg-(--color-accent)/12"
    >
      <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--color-accent) text-(--color-accent-fg)">
        <LayoutGrid :size="14" aria-hidden="true" />
      </span>
      <span class="flex flex-1 flex-col leading-tight">
        <span class="text-[12.5px] font-semibold text-(--color-ink)">
          {{ t("sidebar.mcpPanorama.title") }}
        </span>
        <span class="text-[11px] text-(--color-accent)">
          {{ t("sidebar.mcpPanorama.subtitle") }}
        </span>
      </span>
    </NuxtLink>

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

    <!-- Categories section -->
    <div class="mb-1">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-bold tracking-wider uppercase text-(--color-ink-muted) hover:text-(--color-ink)"
        :aria-expanded="expansion.sections.categories"
        @click="toggleSection('categories')"
      >
        {{ t("sidebar.categories") }}
        <ChevronDown v-if="expansion.sections.categories" :size="14" aria-hidden="true" />
        <ChevronRight v-else :size="14" aria-hidden="true" />
      </button>
      <div v-if="expansion.sections.categories" class="mt-0.5 flex flex-col gap-px">
        <NuxtLink
          :to="buildHref({ funcCat: null, subCat: null, l2: null })"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium hover:bg-(--color-sidebar)"
          :class="!activeFuncCat ? 'bg-(--color-accent)/10 text-(--color-accent) font-semibold' : 'text-(--color-ink)'"
        >
          <span class="bg-(--color-ink-muted) size-1.5 shrink-0 rounded-full" />
          <span class="flex-1">{{ t("sidebar.all") }}</span>
        </NuxtLink>

        <div v-for="cat in FUNC_TAXONOMY" :key="cat.key">
          <div class="flex items-center">
            <NuxtLink
              :to="buildHref({ funcCat: activeFuncCat === cat.key && !activeSubCat && !activeL2 ? null : cat.key, subCat: null, l2: null })"
              class="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition hover:bg-(--color-sidebar)"
              :class="activeFuncCat === cat.key && !activeSubCat && !activeL2 ? 'bg-(--color-accent)/10 text-(--color-accent)' : 'text-(--color-ink)'"
            >
              <span class="size-[7px] shrink-0 rounded-sm" :style="{ background: FUNC_CAT_COLORS[cat.key] }" />
              <span class="flex-1">{{ t(`taxonomy.funcCat.${cat.key}`) }}</span>
            </NuxtLink>
            <button
              type="button"
              class="text-(--color-ink-muted) hover:text-(--color-ink) rounded p-1 transition-colors"
              :aria-label="`${expansion.funcCats[cat.key] ? t('filters.dept.collapse') : t('filters.dept.expand')} ${t(`taxonomy.funcCat.${cat.key}`)}`"
              :aria-expanded="expansion.funcCats[cat.key] ?? false"
              @click="toggleFuncCat(cat.key)"
            >
              <ChevronDown v-if="expansion.funcCats[cat.key]" :size="12" aria-hidden="true" />
              <ChevronRight v-else :size="12" aria-hidden="true" />
            </button>
          </div>

          <div v-if="expansion.funcCats[cat.key]">
            <div v-for="l1 in cat.l1" :key="l1.key" class="ml-2">
              <div class="flex items-center">
                <NuxtLink
                  :to="buildHref({ funcCat: cat.key, subCat: activeSubCat === l1.key ? null : l1.key, l2: null })"
                  class="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium hover:bg-(--color-sidebar)"
                  :class="activeSubCat === l1.key && !activeL2 ? 'bg-(--color-accent)/10 text-(--color-accent)' : 'text-(--color-ink)'"
                >
                  <span
                    class="w-[1.5px] shrink-0 self-stretch rounded"
                    :style="{ background: FUNC_CAT_COLORS[cat.key], opacity: activeSubCat === l1.key && !activeL2 ? 1 : 0.35 }"
                  />
                  <span class="flex-1">{{ t(`taxonomy.l1.${l1.key}`) }}</span>
                </NuxtLink>
                <button
                  v-if="l1.l2.length > 0"
                  type="button"
                  class="text-(--color-ink-muted) hover:text-(--color-ink) rounded p-1"
                  :aria-label="`${expansion.l1[l1.key] ? t('filters.dept.collapse') : t('filters.dept.expand')} ${t(`taxonomy.l1.${l1.key}`)}`"
                  :aria-expanded="expansion.l1[l1.key] ?? false"
                  @click="toggleL1(l1.key)"
                >
                  <ChevronDown v-if="expansion.l1[l1.key]" :size="11" aria-hidden="true" />
                  <ChevronRight v-else :size="11" aria-hidden="true" />
                </button>
              </div>

              <div v-if="expansion.l1[l1.key]">
                <NuxtLink
                  v-for="l2key in l1.l2"
                  :key="l2key"
                  :to="buildHref({ funcCat: cat.key, subCat: l1.key, l2: activeL2 === l2key ? null : l2key })"
                  class="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 pl-6 text-left text-[12px] hover:bg-(--color-sidebar)"
                  :class="activeL2 === l2key ? 'bg-(--color-accent)/10 text-(--color-accent)' : 'text-(--color-ink)/85'"
                >
                  <span class="bg-(--color-ink-muted) size-[3px] shrink-0 rounded-full" />
                  {{ t(`taxonomy.l2.${l2key}`) }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
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
