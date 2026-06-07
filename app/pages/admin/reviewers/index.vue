<script setup lang="ts">
definePageMeta({
  middleware: ["require-auth", "require-super-admin"],
})

const { t } = useI18n()

const { data, refresh, pending } = await useFetch(
  "/api/internal/admin/reviewers",
  {
    default: () => ({ ok: true, reviewers: [] }),
  },
)

const reviewers = computed(() => data.value.reviewers)
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
      @refresh="refresh"
    />
  </div>
</template>
