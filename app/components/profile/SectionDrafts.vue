<script setup lang="ts">
import { FileText } from "lucide-vue-next"
import type { ProfileDraftRow } from "~~/shared/types"

defineProps<{ rows: ProfileDraftRow[] }>()

const { t } = useI18n()
const localePath = useLocalePath()

function statusLabel(status: string | null): string | null {
  if (status === "scanning") return t("profile.draftStatus.scanning")
  if (status === "rejected") return t("profile.draftStatus.rejected")
  return null
}
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <FileText class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("profile.emptyDrafts.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("profile.emptyDrafts.body") }}
      </p>
      <NuxtLink
        :to="localePath('/publish/new')"
        class="mt-4 inline-flex items-center rounded-md bg-(--color-accent) text-(--color-accent-fg) px-3 py-1.5 text-sm hover:opacity-90"
      >
        {{ t("profile.publishOne") }}
      </NuxtLink>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="r in rows"
        :key="r.extensionId"
        class="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-card) p-4"
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
      </li>
    </ul>
  </div>
</template>
