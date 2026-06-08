<script setup lang="ts">
// Matrix admin surface. The 2026-06-09b redesign widens the gate to
// `require-reviewer` so any matrix admin (not just super-admins) can
// reach the page; per-cell authorisation still happens server-side.
// `ReviewerMatrix.vue` is the single unified table — see
// `app/components/approvals/ReviewerMatrix.vue`.
definePageMeta({
  middleware: ["require-auth", "require-reviewer"],
})

const { t } = useI18n()

const { data, refresh, pending } = await useFetch(
  "/api/internal/admin/reviewers",
  {
    default: () => ({
      ok: true,
      admins: [],
      productLines: [],
      viewer: { isSuperAdmin: false, coveringCells: [] },
    }),
  },
)

const admins = computed(() => data.value.admins)
const productLines = computed(() => data.value.productLines)
const viewer = computed(() => data.value.viewer)
</script>

<template>
  <div class="px-6 py-8 max-w-6xl mx-auto">
    <header class="mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
        {{ t("admin.reviewers.title") }}
      </h1>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("admin.reviewers.subtitle") }}
      </p>
    </header>

    <p v-if="pending" class="text-sm text-(--color-ink-muted)">
      {{ t("admin.reviewers.loading") }}
    </p>
    <ReviewerMatrix
      v-else
      :admins="admins"
      :product-lines="productLines"
      :viewer="viewer"
      @refresh="refresh"
    />
  </div>
</template>
