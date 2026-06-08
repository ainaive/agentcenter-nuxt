<script setup lang="ts">
import { Loader2, X } from "lucide-vue-next"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"

// Product-Line tier matrix view. A 2-D grid of (subCat × productLine);
// each cell holds the reviewers for that pair. Cells where the viewer is
// not authorised render their controls disabled — typically a company
// admin of subCat X only edits the row for X.

export interface ProductLineReviewerRow {
  id: string
  subCat: string
  productLineId: string
  userId: string
  userEmail: string
  userName: string | null
  canEdit: boolean
}

export interface ProductLine {
  id: string
  labelEn: string
  labelZh: string
  sortOrder: number
}

const props = defineProps<{
  reviewers: ProductLineReviewerRow[]
  productLines: ProductLine[]
  viewerCompanySubCats: string[]
}>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t, locale } = useI18n()

const subCats = computed(() =>
  FUNC_TAXONOMY.flatMap((cat) => cat.l1.map((leaf) => leaf.key)),
)

const orderedLines = computed(() =>
  [...props.productLines].sort((a, b) => a.sortOrder - b.sortOrder),
)

function lineLabel(line: ProductLine): string {
  return locale.value === "zh" ? line.labelZh : line.labelEn
}

const cells = computed<Record<string, ProductLineReviewerRow[]>>(() => {
  const out: Record<string, ProductLineReviewerRow[]> = {}
  for (const r of props.reviewers) {
    const key = `${r.subCat}::${r.productLineId}`
    if (!out[key]) out[key] = []
    out[key]!.push(r)
  }
  return out
})

function reviewersFor(subCat: string, productLineId: string): ProductLineReviewerRow[] {
  return cells.value[`${subCat}::${productLineId}`] ?? []
}

const viewerIsSuperAdmin = inject<Ref<boolean>>("viewerIsSuperAdmin", ref(false))

// A cell is editable when the viewer is a super-admin OR is a company
// admin of the cell's subCat. We mirror the server's `requireCellAdmin`
// so the UI can decide before issuing a request.
function canEditCell(subCat: string): boolean {
  return (
    viewerIsSuperAdmin.value ||
    props.viewerCompanySubCats.includes(subCat)
  )
}

interface EditingCell {
  subCat: string
  productLineId: string
}
const editingCell = ref<EditingCell | null>(null)
const newEmail = ref("")
const lookupError = ref<string | null>(null)
const busy = ref(false)

function openAdd(subCat: string, productLineId: string) {
  if (!canEditCell(subCat)) return
  editingCell.value = { subCat, productLineId }
  newEmail.value = ""
  lookupError.value = null
}

function closeAdd() {
  editingCell.value = null
  newEmail.value = ""
  lookupError.value = null
}

function lineForId(id: string): ProductLine | undefined {
  return props.productLines.find((l) => l.id === id)
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
        tier: "productLine",
        subCat: editingCell.value.subCat,
        productLineId: editingCell.value.productLineId,
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

async function removeReviewer(row: ProductLineReviewerRow) {
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
          <th
            v-for="line in orderedLines"
            :key="line.id"
            class="border-b border-(--color-border) py-2 px-3 text-left text-xs font-semibold text-(--color-ink)"
          >
            {{ lineLabel(line) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="subCat in subCats" :key="subCat">
          <th
            scope="row"
            class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-3 px-3 text-left font-medium text-(--color-ink)"
            :class="canEditCell(subCat) ? '' : 'opacity-60'"
          >
            {{ t(`taxonomy.l1.${subCat}`) }}
          </th>
          <td
            v-for="line in orderedLines"
            :key="`${subCat}::${line.id}`"
            class="border-b border-(--color-border) py-3 px-3 align-top"
            :class="canEditCell(subCat) ? '' : 'bg-(--color-sidebar)/30'"
          >
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="r in reviewersFor(subCat, line.id)"
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
              <li v-if="canEditCell(subCat)">
                <button
                  type="button"
                  class="rounded-full border border-dashed border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:bg-(--color-sidebar)/60"
                  @click="openAdd(subCat, line.id)"
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
            t("admin.reviewers.matrix.addSubtitleProductLine", {
              line: lineForId(editingCell.productLineId)
                ? lineLabel(lineForId(editingCell.productLineId)!)
                : editingCell.productLineId,
              subCat: t(`taxonomy.l1.${editingCell.subCat}`),
            })
          }}
        </DialogDescription>
        <div class="space-y-3">
          <Label for="add-pl-email" class="text-xs font-medium">
            {{ t("admin.reviewers.matrix.emailLabel") }}
          </Label>
          <Input
            id="add-pl-email"
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
