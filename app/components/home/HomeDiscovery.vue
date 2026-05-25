<script setup lang="ts">
import { ArrowRight, Search, Sparkles } from "lucide-vue-next"
import type { HomeTabKey } from "./HomeTabs.vue"
import type { ExtensionListItem } from "~~/shared/db/queries-types"
import type { TagFacet } from "~~/shared/types"

const { t } = useI18n()
const localePath = useLocalePath()

const activeTab = ref<HomeTabKey>("official")

type HomeQuery = {
  category: "skills"
  sort: "downloads" | "recent"
  filter?: "official"
}

const queryFor: Record<HomeTabKey, HomeQuery> = {
  official: { category: "skills", filter: "official", sort: "downloads" },
  popular: { category: "skills", sort: "downloads" },
  recent: { category: "skills", sort: "recent" },
}

const { data: gridData } = await useFetch("/api/internal/extensions", {
  key: "home-discovery-extensions",
  query: computed(() => queryFor[activeTab.value]),
  default: () => ({
    items: [] as ExtensionListItem[],
    total: 0,
    filters: {},
  }),
})

// Total of published skills (the only category the discovery section
// renders). Fetched once, independently of the active tab, so the heading
// number stays stable when the user flips between Recommended / Popular /
// Recent.
const { data: totalData } = await useFetch("/api/internal/extensions", {
  key: "home-discovery-total",
  query: { category: "skills" },
  default: () => ({
    items: [] as ExtensionListItem[],
    total: 0,
    filters: {},
  }),
})

const { data: facetsData } = await useFetch("/api/internal/facets", {
  key: "home-discovery-facets",
  default: () => ({
    creators: [],
    publishers: [],
    tags: [] as TagFacet[],
  }),
})

const items = computed(() => gridData.value.items.slice(0, 12))
const total = computed(() => totalData.value.total)
const tags = computed(() => facetsData.value.tags)

const searchInput = ref("")

function submitSearch() {
  const q = searchInput.value.trim()
  navigateTo(
    localePath({
      path: "/extensions",
      query: q ? { category: "skills", q } : { category: "skills" },
    }),
  )
}
</script>

<template>
  <section id="discovery" class="mx-auto max-w-7xl px-6 py-12 sm:py-16 scroll-mt-16">
    <h2 class="text-center font-serif text-3xl tracking-tight text-(--color-ink) sm:text-4xl">
      {{
        total > 0
          ? t("home.discoveryHeading", { count: total })
          : t("home.discoveryHeadingEmpty")
      }}
    </h2>

    <form class="mx-auto mt-8 flex max-w-3xl items-stretch gap-3" @submit.prevent="submitSearch">
      <Label for="home-search" class="sr-only">{{ t("home.discoverySearchPlaceholder") }}</Label>
      <div class="relative flex-1">
        <Search
          :size="16"
          aria-hidden="true"
          class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--color-ink-muted)"
        />
        <Input
          id="home-search"
          v-model="searchInput"
          type="search"
          :placeholder="t('home.discoverySearchPlaceholder')"
          class="h-11 pl-10"
        />
      </div>
      <Button type="submit" size="lg" class="shrink-0">
        <Sparkles aria-hidden="true" />
        {{ t("home.discoveryExploreAll") }}
      </Button>
    </form>

    <div class="mt-10">
      <HomeTabs v-model="activeTab" />
    </div>

    <div v-if="tags.length > 0" class="mt-5">
      <HomeTagRail :tags="tags" />
    </div>

    <div class="mt-6">
      <ExtGrid :items="items" />
    </div>

    <div v-if="items.length > 0" class="mt-10 text-center">
      <NuxtLink
        :to="localePath({ path: '/extensions', query: { category: 'skills' } })"
        class="inline-flex items-center gap-1 text-sm font-medium text-(--color-ink-muted) transition hover:text-(--color-ink)"
      >
        {{ t("home.viewMore") }}
        <ArrowRight :size="12" aria-hidden="true" />
      </NuxtLink>
    </div>
  </section>
</template>
