<script setup lang="ts">
import { Loader2, X } from "lucide-vue-next"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"

// Company-tier matrix view. One column for each subCat × one tier — the
// previous productLine column moved to a sibling component, so what stays
// here is the simpler list of (subCat → admins). Edits in this view are
// super-admin-only; `canEdit=false` cells render the chip controls in a
// disabled state and the "+ Add" tile collapses to a read-only marker.

export interface CompanyReviewerRow {
  id: string
  subCat: string
  userId: string
  userEmail: string
  userName: string | null
  canEdit: boolean
}

const props = defineProps<{ reviewers: CompanyReviewerRow[] }>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t } = useI18n()

const subCats = computed(() =>
  FUNC_TAXONOMY.flatMap((cat) => cat.l1.map((leaf) => leaf.key)),
)

const cells = computed<Record<string, CompanyReviewerRow[]>>(() => {
  const out: Record<string, CompanyReviewerRow[]> = {}
  for (const r of props.reviewers) {
    if (!out[r.subCat]) out[r.subCat] = []
    out[r.subCat]!.push(r)
  }
  return out
})

function reviewersFor(subCat: string): CompanyReviewerRow[] {
  return cells.value[subCat] ?? []
}

// Add-reviewer flow state. The cell's editability follows the first row's
// `canEdit` flag (the server returns the same flag for every row in a
// cell); for empty cells we fall back to the injected viewer role.
const editingSubCat = ref<string | null>(null)
const newEmail = ref("")
const lookupError = ref<string | null>(null)
const busy = ref(false)

function openAdd(subCat: string) {
  if (!canEditCellOrEmpty(subCat)) return
  editingSubCat.value = subCat
  newEmail.value = ""
  lookupError.value = null
}

// Empty cells still need editing when the viewer is a super-admin; we
// can't infer canEdit from a row that doesn't exist. The page passes the
// viewer's role separately so we can fall back to it here.
const viewerIsSuperAdmin = inject<Ref<boolean>>("viewerIsSuperAdmin", ref(false))
function canEditCellOrEmpty(subCat: string): boolean {
  const rows = reviewersFor(subCat)
  if (rows.length > 0) return rows[0]!.canEdit
  return viewerIsSuperAdmin.value
}

function closeAdd() {
  editingSubCat.value = null
  newEmail.value = ""
  lookupError.value = null
}

async function addReviewer() {
  if (!editingSubCat.value || busy.value) return
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
        tier: "company",
        subCat: editingSubCat.value,
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

async function removeReviewer(row: CompanyReviewerRow) {
  if (busy.value || !row.canEdit) return
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
          <th class="border-b border-(--color-border) py-2 px-3 text-left text-xs font-semibold text-(--color-ink)">
            {{ t("extensions.officialTier.company") }}
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
          <td class="border-b border-(--color-border) py-3 px-3 align-top">
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="r in reviewersFor(subCat)"
                :key="r.id"
                class="inline-flex items-center gap-1 rounded-full border border-(--color-border) bg-(--color-card) px-2 py-0.5 text-xs"
                :class="r.canEdit ? '' : 'opacity-70'"
              >
                <span class="truncate max-w-[12rem]" :title="r.userEmail">
                  {{ r.userName || r.userEmail }}
                </span>
                <button
                  v-if="r.canEdit"
                  type="button"
                  :aria-label="t('admin.reviewers.matrix.removeAria', { user: r.userEmail })"
                  class="text-(--color-ink-muted) hover:text-red-600"
                  @click="removeReviewer(r)"
                >
                  <X class="size-3" aria-hidden="true" />
                </button>
              </li>
              <li v-if="canEditCellOrEmpty(subCat)">
                <button
                  type="button"
                  class="rounded-full border border-dashed border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:bg-(--color-sidebar)/60"
                  @click="openAdd(subCat)"
                >
                  + {{ t("admin.reviewers.matrix.add") }}
                </button>
              </li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>

    <Dialog :open="!!editingSubCat" @update:open="(v) => !v && closeAdd()">
      <DialogContent v-if="editingSubCat" class="max-w-sm">
        <DialogTitle class="font-serif text-lg text-(--color-ink)">
          {{ t("admin.reviewers.matrix.addTitle") }}
        </DialogTitle>
        <DialogDescription class="text-sm text-(--color-ink-muted)">
          {{
            t("admin.reviewers.matrix.addSubtitle", {
              tier: t("extensions.officialTier.company"),
              subCat: t(`taxonomy.l1.${editingSubCat}`),
            })
          }}
        </DialogDescription>
        <div class="space-y-3">
          <Label for="add-co-email" class="text-xs font-medium">
            {{ t("admin.reviewers.matrix.emailLabel") }}
          </Label>
          <Input
            id="add-co-email"
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
