<script setup lang="ts">
import { Upload } from "lucide-vue-next"
import type { ProfilePublishedRow } from "~~/shared/types"

defineProps<{ rows: ProfilePublishedRow[] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const fmt = computed(() => {
  const nf = new Intl.NumberFormat(locale.value === "zh" ? "zh-CN" : "en-US")
  return (n: number) => nf.format(n)
})
</script>

<template>
  <div>
    <EmptyState
      v-if="rows.length === 0"
      :icon="Upload"
      :title="t('profile.emptyPublished.title')"
      :description="t('profile.emptyPublished.body')"
    >
      <template #cta>
        <Button as-child size="sm">
          <NuxtLink :to="localePath('/publish/new')">{{ t("profile.publishOne") }}</NuxtLink>
        </Button>
      </template>
    </EmptyState>

    <ul v-else class="space-y-2">
      <Card
        v-for="r in rows"
        :key="r.extensionId"
        as="li"
        padding="sm"
        class="flex items-center gap-4"
      >
        <NuxtLink :to="localePath(`/extensions/${r.slug}`)" class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ r.name }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wide text-(--color-ink-muted)">
              {{ r.category }}
            </span>
          </div>
          <div class="mt-0.5 flex items-center gap-3 text-xs text-(--color-ink-muted) font-mono">
            <span v-if="r.latestVersion">v{{ r.latestVersion }}</span>
            <span>{{ fmt(r.downloadsCount) }} {{ t("profile.installsShort") }}</span>
            <span v-if="Number(r.starsAvg) > 0">{{ Number(r.starsAvg).toFixed(1) }} ★</span>
          </div>
        </NuxtLink>
      </Card>
    </ul>
  </div>
</template>
