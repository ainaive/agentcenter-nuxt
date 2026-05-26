<script setup lang="ts">
import { ChevronDown, Upload } from "lucide-vue-next"
import type { RouteLocationRaw } from "vue-router"

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

type CategoryKey = "skills" | "mcp" | "slash" | "plugins"

const PRIMARY_ITEMS: { key: CategoryKey; labelKey: string }[] = [
  { key: "skills", labelKey: "sidebar.skills" },
  { key: "mcp", labelKey: "sidebar.mcpServers" },
]

const MORE_ITEMS: { key: CategoryKey; labelKey: string }[] = [
  { key: "slash", labelKey: "sidebar.slashCommands" },
  { key: "plugins", labelKey: "sidebar.plugins" },
]

const localeExtensionsPath = computed(() => localePath("/extensions"))
const baseName = computed(() => (route.name?.toString() ?? "").split("___")[0] ?? "")

function hrefFor(key: CategoryKey): RouteLocationRaw {
  if (key === "mcp") return localePath("/mcp")
  return { path: localeExtensionsPath.value, query: { category: key } }
}

function isCategoryActive(key: CategoryKey): boolean {
  if (key === "mcp") return baseName.value === "mcp" || baseName.value === "mcp-panorama"
  if (route.path !== localeExtensionsPath.value) return false
  return route.query.category === key
}

const isMoreActive = computed(() => MORE_ITEMS.some(it => isCategoryActive(it.key)))
const moreOpen = ref(false)
</script>

<template>
  <div class="mx-auto w-full max-w-7xl h-full flex items-center gap-4 px-5">
    <NuxtLink
      :to="localePath('/')"
      class="font-serif text-lg tracking-tight hover:opacity-80"
    >
      AgentCenter
    </NuxtLink>

    <NuxtLink
      :to="{ path: localeExtensionsPath, query: { category: 'skills' } }"
      class="md:hidden text-sm text-(--color-ink-muted) hover:text-(--color-ink)"
    >
      {{ t("nav.browse") }}
    </NuxtLink>

    <nav
      class="hidden md:flex items-center gap-1 text-sm flex-1"
      :aria-label="t('nav.primary')"
    >
      <NuxtLink
        :to="localePath({ path: '/', hash: '#discovery' })"
        class="relative px-3 py-1.5 text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
      >
        {{ t("nav.trending") }}
      </NuxtLink>

      <NuxtLink
        v-for="item in PRIMARY_ITEMS"
        :key="item.key"
        :to="hrefFor(item.key)"
        class="relative px-3 py-1.5 text-(--color-ink-muted) transition-colors hover:text-(--color-ink) after:absolute after:inset-x-3 after:-bottom-px after:h-px after:bg-transparent"
        :class="isCategoryActive(item.key) ? 'text-(--color-ink) font-semibold after:bg-(--color-ink)' : ''"
      >
        {{ t(item.labelKey) }}
      </NuxtLink>

      <NuxtLink
        :to="localePath('/collections')"
        class="relative px-3 py-1.5 text-(--color-ink-muted) transition-colors hover:text-(--color-ink) after:absolute after:inset-x-3 after:-bottom-px after:h-px after:bg-transparent"
        active-class="text-(--color-ink) font-semibold after:bg-(--color-ink)"
      >
        {{ t("nav.collections") }}
      </NuxtLink>

      <Popover v-model:open="moreOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="relative inline-flex items-center gap-1 px-3 py-1.5 text-(--color-ink-muted) transition-colors hover:text-(--color-ink) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) after:absolute after:inset-x-3 after:-bottom-px after:h-px after:bg-transparent"
            :class="isMoreActive ? 'text-(--color-ink) font-semibold after:bg-(--color-ink)' : ''"
            :aria-label="t('nav.more')"
          >
            {{ t("nav.more") }}
            <ChevronDown :size="14" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          :side-offset="8"
          class="w-48 p-1 rounded-lg shadow-lg"
        >
          <NuxtLink
            v-for="item in MORE_ITEMS"
            :key="item.key"
            :to="hrefFor(item.key)"
            class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-sidebar) hover:text-(--color-ink)"
            :class="isCategoryActive(item.key) ? 'text-(--color-ink) font-semibold' : ''"
            @click="moreOpen = false"
          >
            <span
              class="w-[1.5px] shrink-0 self-stretch rounded bg-(--color-ink)"
              :class="isCategoryActive(item.key) ? 'opacity-100' : 'opacity-0'"
            />
            <span class="flex-1">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </PopoverContent>
      </Popover>
    </nav>

    <NuxtLink
      :to="localePath('/publish')"
      class="hidden md:inline-flex size-8 rounded-full items-center justify-center border border-transparent text-(--color-ink-muted) hover:bg-(--color-sidebar) hover:text-(--color-ink) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      :aria-label="t('nav.publish')"
      :title="t('nav.publish')"
      active-class="text-(--color-ink)"
    >
      <Upload :size="16" aria-hidden="true" />
    </NuxtLink>

    <ThemeSwitch />
    <LocaleSwitch />
    <UserButton />
  </div>
</template>
