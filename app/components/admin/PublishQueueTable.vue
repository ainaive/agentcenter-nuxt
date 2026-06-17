<script setup lang="ts">
import { Loader2 } from "lucide-vue-next"

import type { PublishReviewRow } from "~~/shared/types"

const props = defineProps<{ rows: PublishReviewRow[] }>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t } = useI18n()
const localePath = useLocalePath()

const busyId = ref<string | null>(null)

function formatDate(d: string): string {
  return new Date(d).toLocaleString()
}

async function publish(row: PublishReviewRow) {
  if (busyId.value) return
  busyId.value = row.versionId
  try {
    await $fetch("/api/internal/publish-review/approve", {
      method: "POST",
      body: { versionId: row.versionId },
    })
    emit("refresh")
  } catch (err) {
    console.error("[publish-review] publish failed", err)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <EmptyState
      v-if="props.rows.length === 0"
      :description="t('admin.publishQueue.empty')"
    />

    <ul v-else class="space-y-2">
      <Card v-for="row in props.rows" :key="row.versionId" as="li" padding="sm">
        <div class="flex items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="localePath(`/extensions/${row.slug}`)"
                class="font-semibold text-(--color-ink) hover:underline"
              >
                {{ row.name }}
              </NuxtLink>
              <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ row.slug }}</span>
              <span class="rounded-sm border border-(--color-border) px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-(--color-ink-muted)">
                {{ row.category }}
              </span>
              <span class="rounded-sm border border-(--color-ink)/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink)">
                {{ row.scope }}
              </span>
            </div>
            <div class="mt-1 text-xs text-(--color-ink-muted)">
              v{{ row.version }} · {{ t("admin.publishQueue.scannedOn", { date: formatDate(row.createdAt) }) }}
            </div>
          </div>

          <div class="flex flex-col items-end gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-semibold text-(--color-accent-fg) hover:opacity-90 disabled:opacity-50"
              :disabled="busyId === row.versionId"
              @click="publish(row)"
            >
              <Loader2 v-if="busyId === row.versionId" class="size-3 animate-spin" aria-hidden="true" />
              {{ t("admin.publishQueue.publish") }}
            </button>
          </div>
        </div>
      </Card>
    </ul>
  </div>
</template>
