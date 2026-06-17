<script setup lang="ts">
definePageMeta({
  middleware: ["require-auth", "require-super-admin"],
})

const { t } = useI18n()

const { data, refresh, pending } = await useFetch(
  "/api/internal/publish-review/queue",
  {
    default: () => ({ ok: true, rows: [] }),
  },
)
const rows = computed(() => data.value.rows)
</script>

<template>
  <div class="px-6 py-8 max-w-5xl mx-auto">
    <header class="mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
        {{ t("admin.publishQueue.title") }}
      </h1>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("admin.publishQueue.subtitle") }}
      </p>
    </header>

    <p v-if="pending" class="text-sm text-(--color-ink-muted)">
      {{ t("admin.publishQueue.loading") }}
    </p>
    <PublishQueueTable v-else :rows="rows" @refresh="refresh" />
  </div>
</template>
