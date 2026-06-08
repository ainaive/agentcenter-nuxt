<script setup lang="ts">
// Tabbed shell over the two tier-specific matrix views.
// Company tab — (subCat × admin). Super-admin-only edits.
// Product-Line tab — (subCat × productLine) grid. Edits permitted for
//   super-admins anywhere and for company admins of the row's subCat
//   (delegation rule from ADR-0001, 2026-06-08 addendum).
// The active tab persists in the URL hash so deep links survive a reload.

type Tab = "company" | "productLine"

export interface ReviewerRow {
  id: string
  tier: Tab
  subCat: string
  productLineId: string | null
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

export interface Viewer {
  isSuperAdmin: boolean
  companySubCats: string[]
}

const props = defineProps<{
  reviewers: ReviewerRow[]
  productLines: ProductLine[]
  viewer: Viewer
}>()
const emit = defineEmits<{ (e: "refresh"): void }>()

const { t } = useI18n()

const route = useRoute()
const router = useRouter()

function hashToTab(hash: string): Tab {
  return hash === "#tab=productLine" ? "productLine" : "company"
}

const activeTab = ref<Tab>(hashToTab(route.hash))

watch(activeTab, (next) => {
  router.replace({ hash: `#tab=${next}` })
})

// Reverse binding so browser back / forward (or any external hash change)
// keeps the UI in sync with the URL. Guard against the loop the assignment
// would otherwise trigger via the watcher above.
watch(
  () => route.hash,
  (next) => {
    const tab = hashToTab(next)
    if (activeTab.value !== tab) activeTab.value = tab
  },
)

// Provide a Ref<boolean> for the subviews so they don't need to thread
// the viewer prop themselves. Wrapped as a computed so reactivity follows
// the prop without an explicit re-broadcast.
const viewerIsSuperAdmin = computed(() => props.viewer.isSuperAdmin)
provide("viewerIsSuperAdmin", viewerIsSuperAdmin)

const companyRows = computed(() =>
  props.reviewers
    .filter((r) => r.tier === "company")
    .map((r) => ({
      id: r.id,
      subCat: r.subCat,
      userId: r.userId,
      userEmail: r.userEmail,
      userName: r.userName,
      canEdit: r.canEdit,
    })),
)

const productLineRows = computed(() =>
  props.reviewers
    .filter((r): r is ReviewerRow & { productLineId: string } =>
      r.tier === "productLine" && r.productLineId !== null,
    )
    .map((r) => ({
      id: r.id,
      subCat: r.subCat,
      productLineId: r.productLineId,
      userId: r.userId,
      userEmail: r.userEmail,
      userName: r.userName,
      canEdit: r.canEdit,
    })),
)
</script>

<template>
  <div class="space-y-4">
    <div
      role="tablist"
      class="inline-flex items-center gap-1 rounded-lg border border-(--color-border) bg-(--color-card) p-1"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'company'"
        class="rounded-md px-3 py-1.5 text-sm font-medium"
        :class="
          activeTab === 'company'
            ? 'bg-(--color-bg) text-(--color-ink) shadow-sm'
            : 'text-(--color-ink-muted) hover:text-(--color-ink)'
        "
        @click="activeTab = 'company'"
      >
        {{ t("admin.reviewers.matrix.tabs.company") }}
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'productLine'"
        class="rounded-md px-3 py-1.5 text-sm font-medium"
        :class="
          activeTab === 'productLine'
            ? 'bg-(--color-bg) text-(--color-ink) shadow-sm'
            : 'text-(--color-ink-muted) hover:text-(--color-ink)'
        "
        @click="activeTab = 'productLine'"
      >
        {{ t("admin.reviewers.matrix.tabs.productLine") }}
      </button>
    </div>

    <p
      v-if="!viewer.isSuperAdmin"
      class="text-xs text-(--color-ink-muted)"
    >
      {{ t("admin.reviewers.matrix.delegationNote") }}
    </p>

    <ReviewerMatrixCompany
      v-if="activeTab === 'company'"
      :reviewers="companyRows"
      @refresh="emit('refresh')"
    />
    <ReviewerMatrixProductLine
      v-else
      :reviewers="productLineRows"
      :product-lines="productLines"
      :viewer-company-sub-cats="viewer.companySubCats"
      @refresh="emit('refresh')"
    />
  </div>
</template>
