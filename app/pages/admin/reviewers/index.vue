<script setup lang="ts">
// The page guard widens to `require-reviewer` because company-tier admins
// can now manage productLine reviewers in their own subCats. Per-cell
// authorisation still happens server-side; the UI only uses the viewer
// metadata to grey non-editable cells.
definePageMeta({
  middleware: ["require-auth", "require-reviewer"],
})

const { t } = useI18n()

const { data, refresh, pending } = await useFetch(
  "/api/internal/admin/reviewers",
  {
    default: () => ({
      ok: true,
      reviewers: [],
      productLines: [],
      viewer: { isSuperAdmin: false, companySubCats: [] },
    }),
  },
)

const reviewers = computed(() => data.value.reviewers)
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
      :reviewers="reviewers"
      :product-lines="productLines"
      :viewer="viewer"
      @refresh="refresh"
    />
  </div>
</template>
