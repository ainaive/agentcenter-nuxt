<script setup lang="ts">
interface RelatedRow {
  id: string
  slug: string
  name: string
  nameZh?: string | null
  iconEmoji: string | null
  iconColor: string | null
}

const props = defineProps<{ related: RelatedRow[] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

function labelFor(r: RelatedRow): string {
  if (locale.value === "zh" && r.nameZh) return r.nameZh
  return r.name
}
</script>

<template>
  <div
    v-if="props.related.length > 0"
    class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5"
  >
    <h2 class="text-sm font-semibold mb-3 text-(--color-ink)">{{ t("extensions.related") }}</h2>
    <ul class="space-y-2">
      <li v-for="r in props.related" :key="r.id">
        <NuxtLink
          :to="localePath(`/extensions/${r.slug}`)"
          class="flex items-center gap-2 text-sm hover:text-(--color-accent)"
        >
          <span class="text-base">{{ r.iconEmoji }}</span>
          <span class="flex-1 truncate">{{ labelFor(r) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
