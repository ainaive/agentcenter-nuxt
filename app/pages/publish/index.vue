<script setup lang="ts">
import { Plus } from "lucide-vue-next"

definePageMeta({ middleware: ["require-auth", "require-onboard"] })

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data, refresh, pending } = await useFetch("/api/internal/publish/my-extensions", {
  default: () => ({ items: [] }),
})

const items = computed(() => data.value.items)

type Item = (typeof items.value)[number]

function stageLabel(item: {
  latestStatus: string | null
  latestBundleFileId: string | null
  visibility: string
}) {
  if (item.visibility === "published") return t("publish.stage.published")
  if (item.latestStatus === "rejected") return t("publish.stage.rejected")
  if (item.latestStatus === "ready") return t("publish.stage.ready")
  if (item.latestStatus === "scanning") return t("publish.stage.scanning")
  if (!item.latestBundleFileId) return t("publish.stage.needsBundle")
  return t("publish.stage.readyToSubmit")
}

function tierLabel(tier: "productLine" | "company" | null): string {
  if (tier === "productLine") return t("extensions.officialTier.productLine")
  if (tier === "company") return t("extensions.officialTier.company")
  return t("extensions.officialTier.unofficial")
}

function canApply(item: Item): boolean {
  // Only published, unofficial extensions with no pending request can apply.
  return (
    item.visibility === "published" &&
    item.officialTier === null &&
    item.pendingRequest === null
  )
}

// Tier revocation annotation. Renders when a super-admin previously
// revoked the extension and it has not been re-elevated since (the
// repo clears revokedAt on the next setExtensionOfficialTier call).
//
// Explicit locale + UTC timezone so SSR and hydration render the same
// string — `toLocaleDateString()` without arguments would pick up the
// server's locale/timezone on first paint and the browser's on hydrate,
// producing a mismatch warning whenever they differ.
function formatRevokedAt(value: string | Date | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d)
}
function revokedByDisplay(item: Item): string {
  return item.revokedByName?.trim() || item.revokedByEmail || ""
}
function showRevocation(item: Item): boolean {
  return (
    item.officialTier === null &&
    !!item.revokedAt &&
    !!item.revocationNote
  )
}
</script>

<template>
  <div class="px-6 py-8 max-w-5xl mx-auto">
    <header class="flex items-baseline justify-between mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">{{ t("publish.title") }}</h1>
      <NuxtLink
        :to="localePath('/publish/new')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-(--color-accent) text-(--color-accent-fg) text-sm font-semibold hover:opacity-90"
      >
        <Plus :size="14" aria-hidden="true" />
        {{ t("publish.new") }}
      </NuxtLink>
    </header>

    <DashboardSkeleton v-if="pending" :rows="3" />
    <EmptyState
      v-else-if="items.length === 0"
      :description="t('publish.emptyDashboard')"
    />

    <ul v-else class="space-y-2">
      <Card
        v-for="item in items"
        :key="item.id"
        as="li"
        padding="sm"
        class="flex items-center gap-4"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ item.name }}</span>
            <span class="text-xs text-(--color-ink-muted) font-mono">
              {{ item.slug }}@{{ item.latestVersion }}
            </span>
            <span
              v-if="item.officialTier"
              class="rounded-sm border border-(--color-ink)/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-ink)"
            >
              {{ tierLabel(item.officialTier) }}
            </span>
          </div>
          <div class="mt-0.5 flex items-center gap-2 text-xs text-(--color-ink-muted)">
            <span>{{ stageLabel(item) }}</span>
            <span
              v-if="item.pendingRequest"
              class="inline-flex items-center gap-1 rounded-sm border border-(--color-border) px-1.5 py-0.5"
            >
              {{ t("approvals.pendingFor", { tier: tierLabel(item.pendingRequest.requestedTier) }) }}
            </span>
          </div>
          <p
            v-if="showRevocation(item)"
            class="mt-1 text-xs text-(--color-ink-muted)"
          >
            {{
              t("approvals.revokedAnnotation", {
                date: formatRevokedAt(item.revokedAt),
                admin: revokedByDisplay(item),
                note: item.revocationNote,
              })
            }}
          </p>
        </div>

        <NuxtLink
          v-if="item.visibility === 'draft'"
          :to="localePath(`/publish/${item.id}/edit`)"
          class="text-xs text-(--color-accent) underline-offset-4 hover:underline"
        >
          {{ t("publish.wizard.review.edit") }}
        </NuxtLink>
        <DiscardButton
          v-if="item.visibility === 'draft'"
          :extension-id="item.id"
          :extension-name="item.name"
          @discarded="refresh"
        />
        <RequestOfficialDialog
          v-if="canApply(item)"
          :extension-id="item.id"
          :extension-name="item.name"
          :current-sub-cat="item.subCat"
          @submitted="refresh"
        />
      </Card>
    </ul>
  </div>
</template>
