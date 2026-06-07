<script setup lang="ts">
// Inline product-line picker that only surfaces when the tier filter is
// already narrowed to `productLine`. Lives next to OfficialTierPill on the
// single-row quiet pill rail (locked decision #3). The "All" option clears
// the productLineId narrow but keeps the tier=productLine narrow in place.

const { t, locale } = useI18n()
const { filters, update } = useFilters()

interface ProductLine {
  id: string
  labelEn: string
  labelZh: string
  sortOrder: number
}

const productLines = ref<ProductLine[]>([])
const loaded = ref(false)

async function load() {
  if (loaded.value) return
  try {
    const res = await $fetch("/api/internal/product-lines")
    productLines.value = res.productLines
    loaded.value = true
  } catch (err) {
    console.error("[filters] failed to load product lines", err)
  }
}

const visible = computed(() => filters.value.tier === "productLine")

// Load lazily — only fetch when the rail actually surfaces.
watch(
  visible,
  (next) => {
    if (next) void load()
  },
  { immediate: true },
)

const active = computed(() => filters.value.productLineId ?? "all")
const orderedLines = computed(() =>
  [...productLines.value].sort((a, b) => a.sortOrder - b.sortOrder),
)
function lineLabel(line: ProductLine): string {
  return locale.value === "zh" ? line.labelZh : line.labelEn
}

function onClick(productLineId: string | undefined) {
  update({ productLineId })
}
</script>

<template>
  <div
    v-if="visible"
    role="group"
    :aria-label="t('filters.productLineLabel')"
    class="flex flex-wrap gap-1"
  >
    <button
      type="button"
      :aria-pressed="active === 'all'"
      class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
      :class="
        active === 'all'
          ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
          : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
      "
      @click="onClick(undefined)"
    >
      {{ t("filters.productLine.all") }}
    </button>
    <button
      v-for="line in orderedLines"
      :key="line.id"
      type="button"
      :aria-pressed="active === line.id"
      class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
      :class="
        active === line.id
          ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
          : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
      "
      @click="onClick(line.id)"
    >
      {{ lineLabel(line) }}
    </button>
  </div>
</template>
