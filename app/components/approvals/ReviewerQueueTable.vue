<script setup lang="ts">
import { Loader2 } from "lucide-vue-next"

import { APPROVAL_NOTE_MAX } from "~~/shared/validators/approvals"

interface QueueRow {
  id: string
  extensionId: string
  requestedTier: "productLine" | "company"
  subCat: string
  productLineId: string | null
  requestedByUserId: string
  reason: string | null
  createdAt: string | Date
}

interface ProductLine {
  id: string
  labelEn: string
  labelZh: string
}

const props = defineProps<{
  rows: QueueRow[]
  productLines?: ProductLine[]
}>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const productLineLabelById = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const line of props.productLines ?? []) {
    out[line.id] = locale.value === "zh" ? line.labelZh : line.labelEn
  }
  return out
})

function productLineLabel(id: string | null): string {
  if (!id) return ""
  return productLineLabelById.value[id] ?? id
}

const rejecting = ref<string | null>(null)
const rejectNote = ref("")
const busyId = ref<string | null>(null)

function tierLabel(tier: "productLine" | "company"): string {
  return t(`extensions.officialTier.${tier}`)
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleString()
}

async function decide(row: QueueRow, decision: "approve" | "reject") {
  if (busyId.value) return
  busyId.value = row.id
  try {
    await $fetch("/api/internal/approvals/decide", {
      method: "POST",
      body: {
        requestId: row.id,
        decision,
        note: decision === "reject" ? rejectNote.value.trim() || undefined : undefined,
      },
    })
    rejecting.value = null
    rejectNote.value = ""
    emit("refresh")
  } catch (err) {
    console.error("[approvals] decide failed", err)
  } finally {
    busyId.value = null
  }
}

function openReject(row: QueueRow) {
  rejecting.value = row.id
  rejectNote.value = ""
}

function cancelReject() {
  rejecting.value = null
  rejectNote.value = ""
}
</script>

<template>
  <div>
    <EmptyState
      v-if="props.rows.length === 0"
      :description="t('admin.approvals.empty')"
    />

    <ul v-else class="space-y-2">
      <Card
        v-for="row in props.rows"
        :key="row.id"
        as="li"
        padding="sm"
      >
        <div class="flex items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="localePath(`/extensions/${row.extensionId}`)"
                class="font-semibold text-(--color-ink) hover:underline"
              >
                {{ row.extensionId }}
              </NuxtLink>
              <span
                class="rounded-sm border border-(--color-ink)/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink)"
              >
                {{ tierLabel(row.requestedTier) }}
              </span>
              <span class="rounded-sm border border-(--color-border) px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-(--color-ink-muted)">
                {{ t(`taxonomy.l1.${row.subCat}`) }}
              </span>
              <span
                v-if="row.productLineId"
                class="rounded-sm border border-(--color-border) px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-(--color-ink-muted)"
              >
                {{ productLineLabel(row.productLineId) }}
              </span>
            </div>
            <div class="mt-1 text-xs text-(--color-ink-muted)">
              {{ t("admin.approvals.requestedOn", { date: formatDate(row.createdAt) }) }}
            </div>
            <p
              v-if="row.reason"
              class="mt-2 rounded-md bg-(--color-sidebar)/40 p-2 text-sm text-(--color-ink)"
            >
              {{ row.reason }}
            </p>
          </div>

          <div class="flex flex-col items-end gap-2">
            <template v-if="rejecting !== row.id">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md bg-(--color-accent) px-3 py-1.5 text-xs font-semibold text-(--color-accent-fg) hover:opacity-90 disabled:opacity-50"
                :disabled="busyId === row.id"
                @click="decide(row, 'approve')"
              >
                <Loader2 v-if="busyId === row.id" class="size-3 animate-spin" aria-hidden="true" />
                {{ t("admin.approvals.approve") }}
              </button>
              <button
                type="button"
                class="rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-xs font-semibold text-(--color-ink) hover:bg-(--color-sidebar)/60 disabled:opacity-50"
                :disabled="busyId === row.id"
                @click="openReject(row)"
              >
                {{ t("admin.approvals.reject") }}
              </button>
            </template>
            <div v-else class="w-72 space-y-2">
              <Textarea
                v-model="rejectNote"
                :maxlength="APPROVAL_NOTE_MAX"
                :placeholder="t('admin.approvals.rejectNotePlaceholder')"
                rows="3"
                class="w-full"
              />
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="text-xs text-(--color-ink-muted) hover:text-(--color-ink)"
                  @click="cancelReject"
                >
                  {{ t("admin.approvals.cancel") }}
                </button>
                <button
                  type="button"
                  class="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  :disabled="busyId === row.id"
                  @click="decide(row, 'reject')"
                >
                  {{ t("admin.approvals.confirmReject") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </ul>
  </div>
</template>
