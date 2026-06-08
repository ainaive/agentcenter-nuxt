<script setup lang="ts">
import { l1KeyFor } from "~~/shared/taxonomy"

definePageMeta({
  middleware: ["require-auth", "require-reviewer"],
})

const { t } = useI18n()
const route = useRoute()

// Mirror the listing rail's URL contract — the same query keys (tier,
// subCat, productLineId) drive both pickers AND the queue fetch, so any
// picker click triggers a refresh via the `query` reactive ref.
const listQuery = computed(() => ({
  view: "queue" as const,
  tier: route.query.tier ?? undefined,
  subCat: route.query.subCat ?? undefined,
  productLineId: route.query.productLineId ?? undefined,
}))

const { data, refresh, pending } = await useFetch(
  "/api/internal/approvals/list",
  {
    query: listQuery,
    default: () => ({ ok: true, requests: [] }),
  },
)
const { data: productLinesData } = await useFetch(
  "/api/internal/product-lines",
  {
    default: () => ({ ok: true, productLines: [] }),
  },
)
// admin/me returns the viewer's covered cells alongside the role flags so
// the smart pickers can offer only the subCats the viewer actually owns.
// Super-admins get every cell in the matrix (via `isSuperAdmin`); regular
// reviewers see their own assignment list.
const { data: adminMe } = await useFetch("/api/internal/admin/me", {
  default: () => ({
    isSuperAdmin: false,
    isReviewer: false,
    cells: [] as Array<{
      extensionCategory: "skills" | "mcp" | "slash" | "plugins"
      tier: "productLine" | "company"
      productLineId: string | null
      categoryLevel: "all" | "macro" | "micro"
      categoryKey: string
    }>,
  }),
})

const rows = computed(() => data.value.requests)
const productLines = computed(() => productLinesData.value.productLines)

// Super-admins narrow against the full taxonomy; non-super reviewers narrow
// only against the macro keys they actually cover. Omitting `allowedSubCats`
// signals "full grid" to the picker.
//   - An `all` cell carries the wildcard — any subCat is allowed.
//   - A `macro` cell contributes its key (an l1 leaf) directly.
//   - A `micro` cell contributes its parent l1 via `l1KeyFor` so the
//     picker offers the broader leaf even when the reviewer only owns
//     a single l2 underneath it.
const allowedSubCats = computed<readonly string[] | undefined>(() => {
  if (adminMe.value.isSuperAdmin) return undefined
  if (adminMe.value.cells.some((c) => c.categoryLevel === "all")) {
    return undefined
  }
  const keys = new Set<string>()
  for (const c of adminMe.value.cells) {
    if (c.categoryLevel === "macro") keys.add(c.categoryKey)
    else if (c.categoryLevel === "micro") {
      const parent = l1KeyFor(c.categoryKey)
      if (parent) keys.add(parent)
    }
  }
  return Array.from(keys)
})
</script>

<template>
  <div class="px-6 py-8 max-w-5xl mx-auto">
    <header class="mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
        {{ t("admin.approvals.title") }}
      </h1>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("admin.approvals.subtitle") }}
      </p>
    </header>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <OfficialTierPicker />
      <SubCatPicker :allowed-sub-cats="allowedSubCats" />
    </div>

    <p v-if="pending" class="text-sm text-(--color-ink-muted)">
      {{ t("admin.approvals.loading") }}
    </p>
    <ReviewerQueueTable
      v-else
      :rows="rows"
      :product-lines="productLines"
      @refresh="refresh"
    />
  </div>
</template>
