<script setup lang="ts">
import { FileText } from "lucide-vue-next"
import type { ProfileDraftRow } from "~~/shared/types"

defineProps<{ rows: ProfileDraftRow[] }>()

const { t } = useI18n()
const localePath = useLocalePath()

function statusLabel(status: string | null): string | null {
  if (status === "scanning") return t("profile.draftStatus.scanning")
  // org/enterprise extensions sit at `ready` while a super-admin reviews them.
  if (status === "ready") return t("profile.draftStatus.awaitingReview")
  if (status === "rejected") return t("profile.draftStatus.rejected")
  return null
}
</script>

<template>
  <div>
    <EmptyState
      v-if="rows.length === 0"
      :icon="FileText"
      :title="t('profile.emptyDrafts.title')"
      :description="t('profile.emptyDrafts.body')"
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
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ r.name }}</span>
            <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ r.slug }}</span>
          </div>
          <div
            v-if="statusLabel(r.latestStatus)"
            class="mt-0.5 text-xs text-(--color-ink-muted)"
          >
            {{ statusLabel(r.latestStatus) }}
          </div>
        </div>
        <NuxtLink
          :to="localePath(`/publish/${r.extensionId}/edit`)"
          class="text-xs text-(--color-accent) underline-offset-4 hover:underline"
        >
          {{ t("profile.continueDraft") }}
        </NuxtLink>
      </Card>
    </ul>
  </div>
</template>
