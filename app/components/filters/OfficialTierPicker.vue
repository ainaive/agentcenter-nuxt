<script setup lang="ts">
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
    <FilterTrigger :label="triggerLabel" :active="hasNarrow" />

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
          <FilterChip :active="!activeTier" @click="selectTier(undefined)">
            {{ t("filters.tier.all") }}
          </FilterChip>
          <FilterChip
            v-for="key in TIER_KEYS"
            :key="key"
            :active="activeTier === key"
            @click="selectTier(key)"
          >
            {{ t(`filters.tier.${key}`) }}
          </FilterChip>
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
          <FilterChip :active="!activeLineId" @click="selectLine(undefined)">
            {{ t("filters.productLine.all") }}
          </FilterChip>
          <FilterChip
            v-for="line in orderedLines"
            :key="line.id"
            :active="activeLineId === line.id"
            @click="selectLine(line.id)"
          >
            {{ lineLabel(line) }}
          </FilterChip>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
