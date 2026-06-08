<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"

import type { Filters } from "~~/shared/validators/filters"

// Single popover that owns both the `tier` and `productLineId` filter keys.
// Replaces the two inline pill rails (OfficialTierPill + ProductLinePill)
// so the listing filter rail stays one quiet row (locked decision #3).

type Tier = NonNullable<Filters["tier"]>
const TIER_KEYS = ["unofficial", "productLine", "company"] as const

interface ProductLine {
  id: string
  labelEn: string
  labelZh: string
  sortOrder: number
}

const { t, locale } = useI18n()
const { filters, update } = useFilters()

const open = ref(false)

// useState dedups the fetch across other consumers (publish dialog) and
// across multiple instances on the same page — the list is small enough
// that doing this once per session is the right grain.
const productLines = useState<ProductLine[]>("productLines", () => [])
const productLinesLoaded = useState<boolean>("productLines:loaded", () => false)

async function ensureProductLines() {
  if (productLinesLoaded.value) return
  try {
    const res = await $fetch("/api/internal/product-lines")
    productLines.value = res.productLines
    productLinesLoaded.value = true
  } catch (err) {
    console.error("[filters] failed to load product lines", err)
  }
}

// Load on first popover open AND when the URL already pre-selects a
// productLine on cold load, so the trigger label can render the line
// name without forcing the user to open the popover.
watch(
  open,
  (next) => {
    if (next) void ensureProductLines()
  },
)
watch(
  () => filters.value.tier,
  (next) => {
    if (next === "productLine") void ensureProductLines()
  },
  { immediate: true },
)

const orderedLines = computed(() =>
  [...productLines.value].sort((a, b) => a.sortOrder - b.sortOrder),
)
function lineLabel(line: ProductLine): string {
  return locale.value === "zh" ? line.labelZh : line.labelEn
}
function lineLabelById(id: string | undefined): string | null {
  if (!id) return null
  const line = productLines.value.find((l) => l.id === id)
  return line ? lineLabel(line) : id
}

const activeTier = computed<Tier | undefined>(() => filters.value.tier)
const activeLineId = computed<string | undefined>(
  () => filters.value.productLineId,
)
const hasNarrow = computed(() => !!activeTier.value)

// Trigger label — "Official: {value}".
//
// - undefined tier        → "Official: All"
// - unofficial / company  → "Official: <tier label>"
// - productLine, no line  → "Official: Product-Line"
// - productLine + line    → "Official: <line label>" (more specific reads)
const triggerLabel = computed(() => {
  const prefix = t("filters.tierPicker.triggerLabel")
  if (!activeTier.value) return `${prefix}: ${t("filters.tier.all")}`
  if (activeTier.value === "productLine") {
    const line = lineLabelById(activeLineId.value)
    if (line) return `${prefix}: ${line}`
    return `${prefix}: ${t("filters.tier.productLine")}`
  }
  return `${prefix}: ${t(`filters.tier.${activeTier.value}`)}`
})

function selectTier(tier: Tier | undefined) {
  // Atomic update: switching away from productLine clears productLineId in
  // the same navigation so the URL never carries a stale line on a tier
  // that doesn't accept one (mirrors the iff-rule on the server side).
  update({
    tier,
    productLineId: tier === "productLine" ? filters.value.productLineId : undefined,
  })
}

function selectLine(productLineId: string | undefined) {
  update({ productLineId })
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger
      :class="[
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[12px] transition-colors',
        hasNarrow
          ? 'border-(--color-ink)/20 bg-(--color-card) text-(--color-ink) font-semibold'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)',
      ]"
    >
      <span class="truncate max-w-[140px]">{{ triggerLabel }}</span>
      <ChevronDown :size="12" aria-hidden="true" />
    </PopoverTrigger>

    <PopoverContent align="start" :class="'w-[320px] p-3 space-y-3'">
      <!-- Tier row -->
      <div>
        <p class="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-(--color-ink-muted)">
          {{ t("filters.tierLabel") }}
        </p>
        <div
          role="group"
          :aria-label="t('filters.tierLabel')"
          class="flex flex-wrap gap-1"
        >
          <button
            type="button"
            :aria-pressed="!activeTier"
            class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
            :class="
              !activeTier
                ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
                : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
            "
            @click="selectTier(undefined)"
          >
            {{ t("filters.tier.all") }}
          </button>
          <button
            v-for="key in TIER_KEYS"
            :key="key"
            type="button"
            :aria-pressed="activeTier === key"
            class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
            :class="
              activeTier === key
                ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
                : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
            "
            @click="selectTier(key)"
          >
            {{ t(`filters.tier.${key}`) }}
          </button>
        </div>
      </div>

      <!-- Product line row — only when productLine tier is active -->
      <div v-if="activeTier === 'productLine'">
        <p class="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-(--color-ink-muted)">
          {{ t("filters.productLineLabel") }}
        </p>
        <div
          role="group"
          :aria-label="t('filters.productLineLabel')"
          class="flex flex-wrap gap-1"
        >
          <button
            type="button"
            :aria-pressed="!activeLineId"
            class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
            :class="
              !activeLineId
                ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
                : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
            "
            @click="selectLine(undefined)"
          >
            {{ t("filters.productLine.all") }}
          </button>
          <button
            v-for="line in orderedLines"
            :key="line.id"
            type="button"
            :aria-pressed="activeLineId === line.id"
            class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
            :class="
              activeLineId === line.id
                ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
                : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
            "
            @click="selectLine(line.id)"
          >
            {{ lineLabel(line) }}
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
