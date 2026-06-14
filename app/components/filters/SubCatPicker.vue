<script setup lang="ts">
import { SUB_CAT_KEY_LIST } from "~~/shared/validators/approvals"

// SubCat picker — mirrors OfficialTierPicker's affordance (Popover
// trigger reading "Category: {value}") so the queue page rail reads
// in the same vocabulary as the browse rail.
//
// `allowedSubCats` lets a caller bound the options to a subset (e.g.
// the cells the viewer covers, so a reviewer with only `cloud` cells
// doesn't see options that would just empty their queue). Omit the
// prop and the picker falls back to the full 9-leaf FUNC_TAXONOMY
// list — what super-admins want.

const props = defineProps<{
  allowedSubCats?: readonly string[]
}>()

const { t } = useI18n()
const { filters, update } = useFilters()

const open = ref(false)

const options = computed(() => {
  // Explicit on the three states so an empty array (viewer covers zero
  // subCats) doesn't silently fall through to "show everything":
  //   undefined → unbounded (super-admin case): full taxonomy
  //   []        → bounded to nothing: empty list (picker disables itself)
  //   non-empty → bounded subset
  if (props.allowedSubCats === undefined) return SUB_CAT_KEY_LIST
  if (props.allowedSubCats.length === 0) return []
  const allowed = props.allowedSubCats
  return SUB_CAT_KEY_LIST.filter((k) => allowed.includes(k))
})

// Disable the trigger entirely when there are no valid options.
// require-reviewer middleware already keeps zero-cell users off the
// queue page, so this is mostly a defensive correctness move — but
// the picker should still mean what it shows on its own terms.
const disabled = computed(() => options.value.length === 0)

const activeSubCat = computed<string | undefined>(() => filters.value.subCat)
const hasNarrow = computed(() => !!activeSubCat.value)

const triggerLabel = computed(() => {
  const prefix = t("filters.subCatPicker.triggerLabel")
  if (!activeSubCat.value) return `${prefix}: ${t("filters.subCat.all")}`
  return `${prefix}: ${t(`taxonomy.l1.${activeSubCat.value}`)}`
})

function selectSubCat(subCat: string | undefined) {
  update({ subCat })
}
</script>

<template>
  <Popover v-model:open="open">
    <FilterTrigger :label="triggerLabel" :active="hasNarrow" :disabled="disabled" />

    <PopoverContent align="start" :class="'w-[320px] p-3'">
      <p class="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-(--color-ink-muted)">
        {{ t("filters.subCatPicker.triggerLabel") }}
      </p>
      <div
        role="group"
        :aria-label="t('filters.subCatPicker.triggerLabel')"
        class="flex flex-wrap gap-1"
      >
        <FilterChip :active="!activeSubCat" @click="selectSubCat(undefined)">
          {{ t("filters.subCat.all") }}
        </FilterChip>
        <FilterChip
          v-for="key in options"
          :key="key"
          :active="activeSubCat === key"
          @click="selectSubCat(key)"
        >
          {{ t(`taxonomy.l1.${key}`) }}
        </FilterChip>
      </div>
    </PopoverContent>
  </Popover>
</template>
