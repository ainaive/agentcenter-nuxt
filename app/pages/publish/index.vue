<script setup lang="ts">
import { Plus } from "lucide-vue-next"

definePageMeta({ middleware: ["require-auth", "require-onboard"] })

const { t } = useI18n()
const localePath = useLocalePath()

const { data, refresh, pending } = await useFetch("/api/internal/publish/my-extensions", {
  default: () => ({ items: [] }),
})

const items = computed(() => data.value.items)

function stageLabel(item: { latestStatus: string | null; latestBundleFileId: string | null; visibility: string }) {
  if (item.visibility === "published") return t("publish.stage.published")
  if (item.latestStatus === "rejected") return t("publish.stage.rejected")
  if (item.latestStatus === "ready") return t("publish.stage.ready")
  if (item.latestStatus === "scanning") return t("publish.stage.scanning")
  if (!item.latestBundleFileId) return t("publish.stage.needsBundle")
  return t("publish.stage.readyToSubmit")
}
</script>

<template>
  <div class="px-6 py-8 max-w-5xl mx-auto">
    <header class="flex items-baseline justify-between mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">{{ t("publish.title") }}</h1>
      <NuxtLink
        :to="localePath('/publish/new')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-(--color-accent) text-(--color-accent-fg) text-sm font-semibold hover:opacity-90"
      >
        <Plus :size="14" aria-hidden="true" />
        {{ t("publish.new") }}
      </NuxtLink>
    </header>

    <DashboardSkeleton v-if="pending" :rows="3" />
    <div
      v-else-if="items.length === 0"
      class="rounded-lg border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <p class="text-(--color-ink-muted)">{{ t("publish.emptyDashboard") }}</p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-card) p-4"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ item.name }}</span>
            <span class="text-xs text-(--color-ink-muted) font-mono">
              {{ item.slug }}@{{ item.latestVersion }}
            </span>
          </div>
          <div class="mt-0.5 text-xs text-(--color-ink-muted)">{{ stageLabel(item) }}</div>
        </div>
        <NuxtLink
          v-if="item.visibility === 'draft'"
          :to="localePath(`/publish/${item.id}/edit`)"
          class="text-xs text-(--color-accent) underline-offset-4 hover:underline"
        >
          {{ t("publish.wizard.review.edit") }}
        </NuxtLink>
        <DiscardButton
          v-if="item.visibility === 'draft'"
          :extension-id="item.id"
          :extension-name="item.name"
          @discarded="refresh"
        />
      </li>
    </ul>
  </div>
</template>
