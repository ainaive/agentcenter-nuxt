<script setup lang="ts">
import { Loader2, X } from "lucide-vue-next"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"

type Tier = "productLine" | "company"
const TIERS: Tier[] = ["productLine", "company"]

interface ReviewerRow {
  id: string
  tier: Tier
  subCat: string
  userId: string
  userEmail: string
  userName: string | null
}

interface CellState {
  tier: Tier
  subCat: string
  reviewers: ReviewerRow[]
}

const props = defineProps<{ reviewers: ReviewerRow[] }>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t } = useI18n()

const subCats = computed(() =>
  FUNC_TAXONOMY.flatMap((cat) => cat.l1.map((leaf) => leaf.key)),
)

const cells = computed<Record<string, ReviewerRow[]>>(() => {
  const out: Record<string, ReviewerRow[]> = {}
  for (const r of props.reviewers) {
    const key = `${r.tier}::${r.subCat}`
    if (!out[key]) out[key] = []
    out[key].push(r)
  }
  return out
})

function reviewersForCell(tier: Tier, subCat: string): ReviewerRow[] {
  return cells.value[`${tier}::${subCat}`] ?? []
}

// Add-reviewer flow state
const editingCell = ref<CellState | null>(null)
const newEmail = ref("")
const lookupError = ref<string | null>(null)
const busy = ref(false)

function openAdd(tier: Tier, subCat: string) {
  editingCell.value = { tier, subCat, reviewers: reviewersForCell(tier, subCat) }
  newEmail.value = ""
  lookupError.value = null
}

function closeAdd() {
  editingCell.value = null
  newEmail.value = ""
  lookupError.value = null
}

async function addReviewer() {
  if (!editingCell.value || busy.value) return
  const email = newEmail.value.trim()
  if (!email) return
  busy.value = true
  lookupError.value = null
  try {
    const { user } = await $fetch("/api/internal/admin/users/by-email", {
      query: { email },
    })
    if (!user) {
      lookupError.value = t("admin.reviewers.matrix.noSuchUser")
      return
    }
    await $fetch("/api/internal/admin/reviewers/assign", {
      method: "POST",
      body: {
        tier: editingCell.value.tier,
        subCat: editingCell.value.subCat,
        userId: user.id,
      },
    })
    closeAdd()
    emit("refresh")
  } catch (err) {
    console.error("[reviewers] add failed", err)
    lookupError.value = t("admin.reviewers.matrix.genericError")
  } finally {
    busy.value = false
  }
}

async function removeReviewer(row: ReviewerRow) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch("/api/internal/admin/reviewers/unassign", {
      method: "DELETE",
      body: { id: row.id },
    })
    emit("refresh")
  } catch (err) {
    console.error("[reviewers] remove failed", err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-separate border-spacing-0 text-sm">
      <thead>
        <tr>
          <th class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-2 px-3 text-left text-xs font-semibold text-(--color-ink-muted)">
            {{ t("admin.reviewers.matrix.subCatColumn") }}
          </th>
          <th
            v-for="tier in TIERS"
            :key="tier"
            class="border-b border-(--color-border) py-2 px-3 text-left text-xs font-semibold text-(--color-ink)"
          >
            {{ t(`extensions.officialTier.${tier}`) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="subCat in subCats" :key="subCat">
          <th
            scope="row"
            class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-3 px-3 text-left font-medium text-(--color-ink)"
          >
            {{ t(`taxonomy.l1.${subCat}`) }}
          </th>
          <td
            v-for="tier in TIERS"
            :key="`${tier}::${subCat}`"
            class="border-b border-(--color-border) py-3 px-3 align-top"
          >
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="r in reviewersForCell(tier, subCat)"
                :key="r.id"
                class="inline-flex items-center gap-1 rounded-full border border-(--color-border) bg-(--color-card) px-2 py-0.5 text-xs"
              >
                <span class="truncate max-w-[12rem]" :title="r.userEmail">
                  {{ r.userName || r.userEmail }}
                </span>
                <button
                  type="button"
                  :aria-label="t('admin.reviewers.matrix.removeAria', { user: r.userEmail })"
                  class="text-(--color-ink-muted) hover:text-red-600"
                  @click="removeReviewer(r)"
                >
                  <X class="size-3" aria-hidden="true" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  class="rounded-full border border-dashed border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:bg-(--color-sidebar)/60"
                  @click="openAdd(tier, subCat)"
                >
                  + {{ t("admin.reviewers.matrix.add") }}
                </button>
              </li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>

    <Dialog :open="!!editingCell" @update:open="(v) => !v && closeAdd()">
      <DialogContent v-if="editingCell" class="max-w-sm">
        <DialogTitle class="font-serif text-lg text-(--color-ink)">
          {{ t("admin.reviewers.matrix.addTitle") }}
        </DialogTitle>
        <DialogDescription class="text-sm text-(--color-ink-muted)">
          {{
            t("admin.reviewers.matrix.addSubtitle", {
              tier: t(`extensions.officialTier.${editingCell.tier}`),
              subCat: t(`taxonomy.l1.${editingCell.subCat}`),
            })
          }}
        </DialogDescription>
        <div class="space-y-3">
          <Label for="add-reviewer-email" class="text-xs font-medium">
            {{ t("admin.reviewers.matrix.emailLabel") }}
          </Label>
          <Input
            id="add-reviewer-email"
            v-model="newEmail"
            type="email"
            :placeholder="t('admin.reviewers.matrix.emailPlaceholder')"
            @keydown.enter="addReviewer"
          />
          <p v-if="lookupError" class="text-sm text-red-600">{{ lookupError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="text-sm text-(--color-ink-muted) hover:text-(--color-ink)"
            @click="closeAdd"
          >
            {{ t("admin.reviewers.matrix.cancel") }}
          </button>
          <button
            type="button"
            :disabled="busy || !newEmail.trim()"
            class="inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-semibold text-(--color-accent-fg) hover:opacity-90 disabled:opacity-50"
            @click="addReviewer"
          >
            <Loader2 v-if="busy" class="size-3.5 animate-spin" aria-hidden="true" />
            {{ t("admin.reviewers.matrix.confirmAdd") }}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
