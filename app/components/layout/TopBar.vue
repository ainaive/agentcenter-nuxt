<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

type CategoryKey = "skills" | "mcp" | "slash" | "plugins"

const CATEGORY_ITEMS: { key: CategoryKey; labelKey: string }[] = [
  { key: "skills", labelKey: "sidebar.skills" },
  { key: "mcp", labelKey: "sidebar.mcpServers" },
  { key: "slash", labelKey: "sidebar.slashCommands" },
  { key: "plugins", labelKey: "sidebar.plugins" },
]

const localeExtensionsPath = computed(() => localePath("/extensions"))

function isCategoryActive(key: CategoryKey): boolean {
  if (route.path !== localeExtensionsPath.value) return false
  return route.query.category === key
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl h-full flex items-center gap-4 px-5">
    <NuxtLink
      :to="localePath('/')"
      class="font-serif text-lg tracking-tight hover:opacity-80"
    >
      AgentCenter
    </NuxtLink>

    <nav
      class="hidden md:flex items-center gap-1 text-sm flex-1"
      :aria-label="t('nav.primary')"
    >
      <NuxtLink
        v-for="item in CATEGORY_ITEMS"
        :key="item.key"
        :to="{ path: localeExtensionsPath, query: { category: item.key } }"
        class="px-3 py-1.5 rounded text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-sidebar)"
        :class="isCategoryActive(item.key) ? 'text-(--color-ink) font-semibold bg-(--color-sidebar)/60' : ''"
      >
        {{ t(item.labelKey) }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/collections')"
        class="px-3 py-1.5 rounded text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-sidebar)"
        active-class="text-(--color-ink) font-semibold bg-(--color-sidebar)/60"
      >
        {{ t("nav.collections") }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/publish')"
        class="px-3 py-1.5 rounded text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-sidebar)"
        active-class="text-(--color-ink) font-semibold bg-(--color-sidebar)/60"
      >
        {{ t("nav.publish") }}
      </NuxtLink>
    </nav>

    <ThemeSwitch />
    <LocaleSwitch />
    <UserButton />
  </div>
</template>
