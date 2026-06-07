<script setup lang="ts">
definePageMeta({
  middleware: ["require-auth", "require-reviewer"],
})

const { t } = useI18n()

const { data, refresh, pending } = await useFetch(
  "/api/internal/approvals/list",
  {
    query: { view: "queue" },
    default: () => ({ ok: true, requests: [] }),
  },
)

const rows = computed(() => data.value.requests)
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

    <p v-if="pending" class="text-sm text-(--color-ink-muted)">
      {{ t("admin.approvals.loading") }}
    </p>
    <ReviewerQueueTable
      v-else
      :rows="rows"
      @refresh="refresh"
    />
  </div>
</template>
