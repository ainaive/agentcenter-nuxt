<script setup lang="ts">
import { Award } from "lucide-vue-next"

import type { ProfileRequestRow } from "~~/shared/types"

defineProps<{ rows: ProfileRequestRow[] }>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t } = useI18n()
const localePath = useLocalePath()
const busyId = ref<string | null>(null)

function tierLabel(tier: "productLine" | "company"): string {
  return t(`extensions.officialTier.${tier}`)
}

function statusLabel(status: ProfileRequestRow["status"]): string {
  return t(`approvals.status.${status}`)
}

function statusBadgeClass(status: ProfileRequestRow["status"]): string {
  if (status === "approved") {
    return "border-green-600/40 bg-green-50/40 text-green-800 dark:bg-green-900/10 dark:text-green-300"
  }
  if (status === "rejected") {
    return "border-red-300/40 bg-red-50/40 text-red-700 dark:bg-red-900/10 dark:text-red-300"
  }
  if (status === "withdrawn") {
    return "border-(--color-border) bg-(--color-card)/60 text-(--color-ink-muted)"
  }
  // pending — neutral chip, no accent fill per design rule #11
  return "border-(--color-ink)/35 bg-(--color-card) text-(--color-ink) font-semibold"
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

async function withdraw(row: ProfileRequestRow) {
  if (busyId.value) return
  busyId.value = row.requestId
  try {
    await $fetch("/api/internal/approvals/withdraw", {
      method: "POST",
      body: { requestId: row.requestId },
    })
    emit("refresh")
  } catch (err) {
    console.error("[approvals] withdraw failed", err)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <Award class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("approvals.emptyRequests.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("approvals.emptyRequests.body") }}
      </p>
      <NuxtLink
        :to="localePath('/publish')"
        class="mt-4 inline-flex items-center rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-sidebar)/60"
      >
        {{ t("approvals.gotoPublish") }}
      </NuxtLink>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="r in rows"
        :key="r.requestId"
        class="rounded-lg border border-(--color-border) bg-(--color-card) p-4"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="localePath(`/extensions/${r.slug}`)"
                class="font-semibold text-(--color-ink) hover:underline"
              >
                {{ r.name }}
              </NuxtLink>
              <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ r.slug }}</span>
              <span
                class="rounded-sm border border-(--color-ink)/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink)"
              >
                {{ tierLabel(r.requestedTier) }}
              </span>
              <span
                class="rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                :class="statusBadgeClass(r.status)"
              >
                {{ statusLabel(r.status) }}
              </span>
            </div>
            <div class="mt-1 text-xs text-(--color-ink-muted)">
              {{ t("approvals.requestedOn", { date: formatDate(r.createdAt) }) }}
              <template v-if="r.decidedAt">
                · {{ t("approvals.decidedOn", { date: formatDate(r.decidedAt) }) }}
              </template>
              · {{ t(`taxonomy.l1.${r.subCat}`) }}
            </div>
            <p
              v-if="r.reviewerNote"
              class="mt-2 rounded-md bg-(--color-sidebar)/40 p-2 text-sm text-(--color-ink)"
            >
              <span class="font-semibold">{{ t("approvals.reviewerNote") }}:</span>
              {{ r.reviewerNote }}
            </p>
          </div>
          <button
            v-if="r.status === 'pending'"
            type="button"
            class="text-xs text-(--color-ink-muted) hover:text-red-600 disabled:opacity-50"
            :disabled="busyId === r.requestId"
            @click="withdraw(r)"
          >
            {{ t("approvals.withdraw") }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
