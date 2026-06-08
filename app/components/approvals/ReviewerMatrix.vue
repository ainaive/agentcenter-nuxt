<script setup lang="ts">
import { ChevronDown, ChevronRight, Loader2, X } from "lucide-vue-next"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"

// Redesigned matrix shell — see ADR-0001 (2026-06-09b). The vertical axis
// is a 3-tier hierarchy (All → Macro = FUNC_TAXONOMY l1 → Micro = l2);
// the horizontal axis fuses Company and the product lines into one
// table; and the previous Tier tabs become an `extension_category`
// toggle. Per-cell `canEdit` flows from the API based on the 2-D cover
// relation; non-editable cells render the chip controls in a disabled
// state and skip the "+ Add" tile.

type ExtensionCategory = "skills" | "mcp" | "slash" | "plugins"
type Tier = "productLine" | "company"
type CategoryLevel = "all" | "macro" | "micro"
const EXTENSION_CATEGORIES: readonly ExtensionCategory[] = [
  "skills",
  "mcp",
  "slash",
  "plugins",
] as const

export interface AdminCellRow {
  id: string
  extensionCategory: ExtensionCategory
  tier: Tier
  productLineId: string | null
  categoryLevel: CategoryLevel
  categoryKey: string
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

export interface CoveringCell {
  extensionCategory: ExtensionCategory
  tier: Tier
  productLineId: string | null
  categoryLevel: CategoryLevel
  categoryKey: string
}

export interface Viewer {
  isSuperAdmin: boolean
  coveringCells: CoveringCell[]
}

const props = defineProps<{
  admins: AdminCellRow[]
  productLines: ProductLine[]
  viewer: Viewer
}>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t } = useI18n()

const route = useRoute()
const router = useRouter()

function hashToCategory(hash: string): ExtensionCategory {
  const m = hash.match(/#cat=(skills|mcp|slash|plugins)/)
  return (m?.[1] as ExtensionCategory) ?? "skills"
}

const activeCategory = ref<ExtensionCategory>(hashToCategory(route.hash))

watch(activeCategory, (next) => {
  router.replace({ hash: `#cat=${next}` })
})

watch(
  () => route.hash,
  (next) => {
    const cat = hashToCategory(next)
    if (activeCategory.value !== cat) activeCategory.value = cat
  },
)

// Columns: a fixed "Company" column first, then product lines in
// sortOrder. Each renders against (tier, productLineId).
interface Column {
  key: string
  tier: Tier
  productLineId: string | null
  label: string
}
const columns = computed<Column[]>(() => {
  const pls = [...props.productLines].sort((a, b) => a.sortOrder - b.sortOrder)
  return [
    {
      key: "company",
      tier: "company",
      productLineId: null,
      label: t("extensions.officialTier.company"),
    },
    ...pls.map((pl) => ({
      key: `pl:${pl.id}`,
      tier: "productLine" as const,
      productLineId: pl.id,
      label: pl.labelEn === pl.labelZh ? pl.labelEn : pl.labelEn,
    })),
  ]
})

// Macro rows (one per FUNC_TAXONOMY l1 leaf), grouped visually by their
// funcCat parent for a colour hint along the leading edge.
interface MacroRow {
  funcCat: string
  macroKey: string
  microKeys: readonly string[]
}
const macros = computed<MacroRow[]>(() =>
  FUNC_TAXONOMY.flatMap((node) =>
    node.l1.map((leaf) => ({
      funcCat: node.key,
      macroKey: leaf.key,
      microKeys: leaf.l2,
    })),
  ),
)

// `expanded[macroKey] = true` reveals the three micro rows nested under
// it. The toggle uses a chevron — collapsed is the default to keep the
// page short on first load.
const expanded = reactive<Record<string, boolean>>({})

// Index admins by composite cell key — one Map keyed by
// `cat|tier|pl|level|cKey`. Faster than re-scanning the full array per
// cell and keeps the template terse.
function cellKey(
  cat: ExtensionCategory,
  tier: Tier,
  productLineId: string | null,
  level: CategoryLevel,
  key: string,
): string {
  return `${cat}|${tier}|${productLineId ?? ""}|${level}|${key}`
}
const adminsByCell = computed<Map<string, AdminCellRow[]>>(() => {
  const out = new Map<string, AdminCellRow[]>()
  for (const r of props.admins) {
    const k = cellKey(
      r.extensionCategory,
      r.tier,
      r.productLineId,
      r.categoryLevel,
      r.categoryKey,
    )
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(r)
  }
  return out
})

function adminsFor(
  tier: Tier,
  productLineId: string | null,
  level: CategoryLevel,
  key: string,
): AdminCellRow[] {
  return (
    adminsByCell.value.get(
      cellKey(activeCategory.value, tier, productLineId, level, key),
    ) ?? []
  )
}

// A cell that has no admin rows still needs to know if the viewer is
// allowed to add one — `coveringCells` carries that signal. Mirrors
// `findCoveringAdmin` on the server: same extensionCategory + cover on
// both axes. Centralising the rule here keeps the chip dialog and the
// "+ Add" tile in lockstep.
function viewerCovers(
  tier: Tier,
  productLineId: string | null,
  level: CategoryLevel,
  key: string,
): boolean {
  if (props.viewer.isSuperAdmin) return true
  for (const c of props.viewer.coveringCells) {
    if (c.extensionCategory !== activeCategory.value) continue
    // Column-tier cover: (company, null) ⊇ (productLine, X) ⊇ self.
    const colOk =
      (c.tier === "company" && c.productLineId === null) ||
      (c.tier === tier && c.productLineId === productLineId)
    if (!colOk) continue
    // Category cover: all/macro/micro ancestor walk.
    if (c.categoryLevel === "all" && c.categoryKey === "*") return true
    if (
      c.categoryLevel === "macro" &&
      level !== "all" &&
      (key === c.categoryKey || (level === "micro" && parentOf(key) === c.categoryKey))
    ) {
      return true
    }
    if (
      c.categoryLevel === "micro" &&
      level === "micro" &&
      c.categoryKey === key
    ) {
      return true
    }
  }
  return false
}

// l2 → l1 map for the cover walk above. The wider helper lives in
// `shared/taxonomy.ts` (`l1KeyFor`); we materialise the lookup once here
// to avoid the function-call overhead inside the template.
const PARENT_OF: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>()
  for (const macro of FUNC_TAXONOMY) {
    for (const leaf of macro.l1) {
      for (const l2 of leaf.l2) map.set(l2, leaf.key)
    }
  }
  return map
})()
function parentOf(microKey: string): string | undefined {
  return PARENT_OF.get(microKey)
}

// Picker dialog state — one dialog shared across every "+ Add" tile.
interface TargetCell {
  tier: Tier
  productLineId: string | null
  categoryLevel: CategoryLevel
  categoryKey: string
}
const editingCell = ref<TargetCell | null>(null)
const newEmail = ref("")
const lookupError = ref<string | null>(null)
const busy = ref(false)

function openAdd(cell: TargetCell) {
  if (!viewerCovers(cell.tier, cell.productLineId, cell.categoryLevel, cell.categoryKey)) {
    return
  }
  editingCell.value = cell
  newEmail.value = ""
  lookupError.value = null
}

function closeAdd() {
  editingCell.value = null
  newEmail.value = ""
  lookupError.value = null
}

async function addAdmin() {
  const cell = editingCell.value
  if (!cell || busy.value) return
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
        extensionCategory: activeCategory.value,
        tier: cell.tier,
        productLineId: cell.productLineId ?? undefined,
        categoryLevel: cell.categoryLevel,
        categoryKey: cell.categoryKey,
        userId: user.id,
      },
    })
    closeAdd()
    emit("refresh")
  } catch (err) {
    console.error("[admins] add failed", err)
    lookupError.value = t("admin.reviewers.matrix.genericError")
  } finally {
    busy.value = false
  }
}

async function removeAdmin(row: AdminCellRow) {
  if (busy.value || !row.canEdit) return
  busy.value = true
  try {
    await $fetch("/api/internal/admin/reviewers/unassign", {
      method: "DELETE",
      body: { id: row.id },
    })
    emit("refresh")
  } catch (err) {
    console.error("[admins] remove failed", err)
  } finally {
    busy.value = false
  }
}

function labelForCellHeader(level: CategoryLevel, key: string): string {
  if (level === "all") return t("admin.reviewers.matrix.level.all")
  if (level === "macro") return t(`taxonomy.l1.${key}`)
  return t(`taxonomy.l2.${key}`)
}

function dialogLevelLabel(cell: TargetCell): string {
  return labelForCellHeader(cell.categoryLevel, cell.categoryKey)
}

function dialogColumnLabel(cell: TargetCell): string {
  if (cell.tier === "company") return t("extensions.officialTier.company")
  const pl = props.productLines.find((p) => p.id === cell.productLineId)
  return pl?.labelEn ?? cell.productLineId ?? ""
}
</script>

<template>
  <div class="space-y-4">
    <!-- Extension-category toggle (4 buttons). Replaces the pre-redesign
         Company/Product-Line tab pair. -->
    <div
      role="tablist"
      :aria-label="t('admin.reviewers.matrix.categoryAxisLabel')"
      class="inline-flex items-center gap-1 rounded-lg border border-(--color-border) bg-(--color-card) p-1"
    >
      <button
        v-for="cat in EXTENSION_CATEGORIES"
        :key="cat"
        type="button"
        role="tab"
        :aria-selected="activeCategory === cat"
        class="rounded-md px-3 py-1.5 text-sm font-medium"
        :class="
          activeCategory === cat
            ? 'bg-(--color-bg) text-(--color-ink) shadow-sm'
            : 'text-(--color-ink-muted) hover:text-(--color-ink)'
        "
        @click="activeCategory = cat"
      >
        {{ t(`admin.reviewers.matrix.cat.${cat}`) }}
      </button>
    </div>

    <p
      v-if="!viewer.isSuperAdmin"
      class="text-xs text-(--color-ink-muted)"
    >
      {{ t("admin.reviewers.matrix.delegationNote") }}
    </p>

    <div class="overflow-x-auto">
      <table class="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-2 px-3 text-left text-xs font-semibold text-(--color-ink-muted)"
            >
              {{ t("admin.reviewers.matrix.subCatColumn") }}
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              class="border-b border-(--color-border) py-2 px-3 text-left text-xs font-semibold text-(--color-ink)"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- All row (wildcard, single sticky row at the top). -->
          <tr>
            <th
              scope="row"
              class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-3 px-3 text-left font-semibold text-(--color-ink)"
            >
              {{ t("admin.reviewers.matrix.level.all") }}
            </th>
            <td
              v-for="col in columns"
              :key="`all-${col.key}`"
              class="border-b border-(--color-border) py-3 px-3 align-top"
            >
              <ul class="flex flex-wrap gap-1.5">
                <li
                  v-for="r in adminsFor(col.tier, col.productLineId, 'all', '*')"
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
                    @click="removeAdmin(r)"
                  >
                    <X class="size-3" aria-hidden="true" />
                  </button>
                </li>
                <li v-if="viewerCovers(col.tier, col.productLineId, 'all', '*')">
                  <button
                    type="button"
                    class="rounded-full border border-dashed border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:bg-(--color-sidebar)/60"
                    @click="
                      openAdd({
                        tier: col.tier,
                        productLineId: col.productLineId,
                        categoryLevel: 'all',
                        categoryKey: '*',
                      })
                    "
                  >
                    + {{ t("admin.reviewers.matrix.add") }}
                  </button>
                </li>
              </ul>
            </td>
          </tr>

          <!-- Macro rows. Each has a chevron that toggles its three micro
               children. The micro rows stay rendered in the DOM only when
               their parent is expanded — keeps the page light on first load. -->
          <template v-for="macro in macros" :key="macro.macroKey">
            <tr>
              <th
                scope="row"
                class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-3 px-3 text-left font-medium text-(--color-ink)"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 text-left"
                  :aria-expanded="!!expanded[macro.macroKey]"
                  @click="expanded[macro.macroKey] = !expanded[macro.macroKey]"
                >
                  <ChevronDown
                    v-if="expanded[macro.macroKey]"
                    class="size-3.5 text-(--color-ink-muted)"
                    aria-hidden="true"
                  />
                  <ChevronRight
                    v-else
                    class="size-3.5 text-(--color-ink-muted)"
                    aria-hidden="true"
                  />
                  {{ t(`taxonomy.l1.${macro.macroKey}`) }}
                </button>
              </th>
              <td
                v-for="col in columns"
                :key="`macro-${macro.macroKey}-${col.key}`"
                class="border-b border-(--color-border) py-3 px-3 align-top"
              >
                <ul class="flex flex-wrap gap-1.5">
                  <li
                    v-for="r in adminsFor(col.tier, col.productLineId, 'macro', macro.macroKey)"
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
                      @click="removeAdmin(r)"
                    >
                      <X class="size-3" aria-hidden="true" />
                    </button>
                  </li>
                  <li v-if="viewerCovers(col.tier, col.productLineId, 'macro', macro.macroKey)">
                    <button
                      type="button"
                      class="rounded-full border border-dashed border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:bg-(--color-sidebar)/60"
                      @click="
                        openAdd({
                          tier: col.tier,
                          productLineId: col.productLineId,
                          categoryLevel: 'macro',
                          categoryKey: macro.macroKey,
                        })
                      "
                    >
                      + {{ t("admin.reviewers.matrix.add") }}
                    </button>
                  </li>
                </ul>
              </td>
            </tr>
            <tr
              v-for="micro in macro.microKeys"
              v-show="expanded[macro.macroKey]"
              :key="`micro-${micro}`"
            >
              <th
                scope="row"
                class="sticky left-0 z-10 bg-(--color-bg) border-b border-(--color-border) py-2 pl-9 pr-3 text-left text-sm text-(--color-ink-muted)"
              >
                {{ t(`taxonomy.l2.${micro}`) }}
              </th>
              <td
                v-for="col in columns"
                :key="`micro-${micro}-${col.key}`"
                class="border-b border-(--color-border) py-2 px-3 align-top"
              >
                <ul class="flex flex-wrap gap-1.5">
                  <li
                    v-for="r in adminsFor(col.tier, col.productLineId, 'micro', micro)"
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
                      @click="removeAdmin(r)"
                    >
                      <X class="size-3" aria-hidden="true" />
                    </button>
                  </li>
                  <li v-if="viewerCovers(col.tier, col.productLineId, 'micro', micro)">
                    <button
                      type="button"
                      class="rounded-full border border-dashed border-(--color-border) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:bg-(--color-sidebar)/60"
                      @click="
                        openAdd({
                          tier: col.tier,
                          productLineId: col.productLineId,
                          categoryLevel: 'micro',
                          categoryKey: micro,
                        })
                      "
                    >
                      + {{ t("admin.reviewers.matrix.add") }}
                    </button>
                  </li>
                </ul>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <Dialog :open="!!editingCell" @update:open="(v) => !v && closeAdd()">
      <DialogContent v-if="editingCell" class="max-w-sm">
        <DialogTitle class="font-serif text-lg text-(--color-ink)">
          {{ t("admin.reviewers.matrix.addTitle") }}
        </DialogTitle>
        <DialogDescription class="text-sm text-(--color-ink-muted)">
          {{
            t("admin.reviewers.matrix.addSubtitleUnified", {
              cat: t(`admin.reviewers.matrix.cat.${activeCategory}`),
              column: dialogColumnLabel(editingCell),
              level: dialogLevelLabel(editingCell),
            })
          }}
        </DialogDescription>
        <div class="space-y-3">
          <Label for="add-admin-email" class="text-xs font-medium">
            {{ t("admin.reviewers.matrix.emailLabel") }}
          </Label>
          <Input
            id="add-admin-email"
            v-model="newEmail"
            type="email"
            :placeholder="t('admin.reviewers.matrix.emailPlaceholder')"
            @keydown.enter="addAdmin"
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
            @click="addAdmin"
          >
            <Loader2 v-if="busy" class="size-3.5 animate-spin" aria-hidden="true" />
            {{ t("admin.reviewers.matrix.confirmAdd") }}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
