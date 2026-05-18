<script setup lang="ts">
import {
  ChevronDown,
  Command,
  Globe2,
  Menu,
  Plug,
  Search,
  Zap,
} from "lucide-vue-next"
import type { Component } from "vue"

defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ "toggle-sidebar": [] }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const q = ref<string>(typeof route.query.q === "string" ? route.query.q : "")

watch(
  () => route.query.q,
  (next) => {
    q.value = typeof next === "string" ? next : ""
  },
)

function onSubmit() {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (typeof v === "string" && k !== "q" && k !== "page") query[k] = v
  }
  const trimmed = q.value.trim()
  if (trimmed) query.q = trimmed
  router.push({ path: localePath("/extensions"), query })
}

type ExploreKey = "skills" | "mcp" | "slash" | "plugins"

const EXPLORE_ITEMS: { key: ExploreKey; labelKey: string; Icon: Component }[] = [
  { key: "skills", labelKey: "sidebar.skills", Icon: Zap },
  { key: "mcp", labelKey: "sidebar.mcpServers", Icon: Globe2 },
  { key: "slash", labelKey: "sidebar.slashCommands", Icon: Command },
  { key: "plugins", labelKey: "sidebar.plugins", Icon: Plug },
]

const exploreOpen = ref(false)

// Explore is "active" whenever the user is on the extensions index,
// regardless of which category filter is applied. The dropdown is
// type-first navigation — users must pick a category to enter — but
// `/extensions` (no filter) is still reachable as a fallback, so the
// trigger should still light up there.
const localeExtensionsPath = computed(() => localePath("/extensions"))
const exploreActive = computed(() =>
  route.path === localeExtensionsPath.value
  || route.path.startsWith(`${localeExtensionsPath.value}/`),
)
</script>

<template>
  <div class="contents">
    <button
      type="button"
      class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      :aria-label="t('nav.toggleSidebar')"
      :aria-expanded="!collapsed"
      @click="emit('toggle-sidebar')"
    >
      <Menu :size="20" aria-hidden="true" />
    </button>

    <NuxtLink
      :to="localePath('/')"
      class="font-serif text-lg tracking-tight hover:opacity-80"
    >
      AgentCenter
    </NuxtLink>

    <form
      role="search"
      class="flex-1 max-w-xl mx-auto relative"
      @submit.prevent="onSubmit"
    >
      <label class="sr-only" for="topbar-search">{{ t("nav.searchLabel") }}</label>
      <Search
        :size="16"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted) pointer-events-none"
        aria-hidden="true"
      />
      <input
        id="topbar-search"
        v-model="q"
        type="search"
        :placeholder="t('search.placeholder')"
        class="w-full h-9 pl-9 pr-3 rounded-md border border-transparent bg-(--color-sidebar)/60 text-sm transition-colors focus:outline-none focus:border-(--color-border) focus:bg-(--color-bg) focus:ring-2 focus:ring-(--color-accent)"
      >
    </form>

    <nav class="hidden md:flex items-center gap-1 text-sm" :aria-label="t('nav.explore')">
      <Popover v-model:open="exploreOpen">
        <PopoverTrigger
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-sidebar)"
          :class="exploreActive ? 'text-(--color-ink) font-semibold bg-(--color-sidebar)/60' : ''"
        >
          {{ t("nav.explore") }}
          <ChevronDown :size="12" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" :class="'w-[200px] p-1'">
          <NuxtLink
            v-for="item in EXPLORE_ITEMS"
            :key="item.key"
            :to="{ path: localeExtensionsPath, query: { category: item.key } }"
            class="flex items-center gap-2.5 rounded-md px-2 py-2 text-[14px] text-(--color-ink) hover:bg-(--color-card)"
            @click="exploreOpen = false"
          >
            <component :is="item.Icon" :size="16" class="shrink-0" />
            <span class="flex-1 truncate">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </PopoverContent>
      </Popover>
      <NuxtLink
        :to="localePath('/mcp-panorama')"
        class="px-3 py-1.5 rounded text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-sidebar)"
        active-class="text-(--color-ink) font-semibold bg-(--color-sidebar)/60"
      >
        {{ t("nav.mcpPanorama") }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/publish')"
        class="px-3 py-1.5 rounded text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-sidebar)"
        active-class="text-(--color-ink) font-semibold bg-(--color-sidebar)/60"
      >
        {{ t("nav.publish") }}
      </NuxtLink>
      <span
        class="px-3 py-1.5 rounded text-(--color-ink-muted) cursor-not-allowed"
        :title="t('nav.comingSoon')"
        aria-disabled="true"
      >
        {{ t("nav.docs") }}
      </span>
    </nav>

    <ThemeSwitch />
    <LocaleSwitch />
    <UserButton />
  </div>
</template>
