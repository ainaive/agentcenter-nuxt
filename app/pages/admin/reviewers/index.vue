<script setup lang="ts">
// Matrix admin surface. The 2026-06-09b redesign widens the gate to
// `require-reviewer` so any matrix admin (not just super-admins) can
// reach the page; per-cell authorisation still happens server-side.
//
// The unified-table UI lands in the next commit — this revision wires
// the new 5-coord API and renders the raw cell list so the page is
// reachable and the data flow is exercised end-to-end before the grid
// arrives. See `app/components/approvals/ReviewerMatrix.vue` for the
// upcoming redesign.
definePageMeta({
  middleware: ["require-auth", "require-reviewer"],
})

const { t } = useI18n()

const { data, pending } = await useFetch("/api/internal/admin/reviewers", {
  default: () => ({
    ok: true,
    admins: [],
    productLines: [],
    viewer: { isSuperAdmin: false, coveringCells: [] },
  }),
})

const admins = computed(() => data.value.admins)
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
    <ul v-else class="space-y-1 text-sm">
      <li
        v-for="row in admins"
        :key="row.id"
        class="rounded border border-(--color-border) px-3 py-2 text-(--color-ink)"
      >
        <span class="font-mono text-xs text-(--color-ink-muted)">
          {{ row.extensionCategory }} · {{ row.tier }}
          {{ row.productLineId ? `· ${row.productLineId}` : "" }} ·
          {{ row.categoryLevel }}:{{ row.categoryKey }}
        </span>
        <span class="ml-2">
          {{ row.userName || row.userEmail }}
        </span>
      </li>
    </ul>
  </div>
</template>
