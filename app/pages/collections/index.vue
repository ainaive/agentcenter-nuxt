<script setup lang="ts">
import { FolderOpen } from "lucide-vue-next"

import CollectionCard from "~/components/collection/CollectionCard.vue"

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const page = computed(() => {
  const raw = Number.parseInt(String(route.query.page ?? "1"), 10)
  return Number.isFinite(raw) && raw > 0 ? raw : 1
})

const { data, pending, error } = await useFetch(
  "/api/internal/collections/public",
  { query: computed(() => ({ page: page.value })) },
)

const totalPages = computed(() => {
  if (!data.value) return 1
  return Math.max(1, Math.ceil(data.value.total / data.value.pageSize))
})

function pageLink(n: number) {
  return { path: localePath("/collections"), query: { page: n } }
}
</script>

<template>
  <div class="px-6 py-8 max-w-6xl mx-auto">
    <header class="mb-8">
      <h1 class="font-serif text-3xl text-(--color-ink)">
        {{ t("collections.browse.title") }}
      </h1>
      <p class="mt-2 text-sm text-(--color-ink-muted)">
        {{ t("collections.browse.subtitle") }}
      </p>
    </header>

    <p v-if="error" class="text-sm text-red-600">
      {{ error.statusMessage ?? error.message }}
    </p>

    <div v-else-if="pending" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-32 animate-pulse rounded-(--radius-card) border border-(--color-border) bg-(--color-card)/40"
      />
    </div>

    <div
      v-else-if="!data || data.items.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <FolderOpen class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("collections.browse.empty") }}
      </h3>
    </div>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CollectionCard
          v-for="item in data.items"
          :key="item.slug"
          :slug="item.slug"
          :name="item.name"
          :name-zh="item.nameZh"
          :description="item.description"
          :description-zh="item.descriptionZh"
          :item-count="item.itemCount"
          :owner-name="item.ownerName"
          :show-owner="true"
          visibility="public"
        />
      </div>

      <nav
        v-if="totalPages > 1"
        class="mt-8 flex items-center justify-center gap-2"
        :aria-label="t('collections.browse.pagination')"
      >
        <NuxtLink
          v-for="n in totalPages"
          :key="n"
          :to="pageLink(n)"
          class="rounded-md border px-3 py-1.5 text-sm transition-colors"
          :class="n === page
            ? 'border-(--color-border) bg-(--color-sidebar) text-(--color-ink) font-medium'
            : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'"
        >
          {{ n }}
        </NuxtLink>
      </nav>
    </template>
  </div>
</template>
