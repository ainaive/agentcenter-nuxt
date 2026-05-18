<script setup lang="ts">
import { ChevronDown, ChevronRight } from "lucide-vue-next"
import { FUNC_CAT_COLORS, FUNC_TAXONOMY } from "~~/shared/taxonomy"
import type { FuncCatKey } from "~~/shared/types"

const { t } = useI18n()
const { filters, update } = useFilters()

const open = ref(false)

interface Row {
  depth: 0 | 1 | 2
  funcCat: FuncCatKey
  l1Key?: string
  l2Key?: string
  hasChildren: boolean
  isActive: boolean
}

const triggerLabel = computed(() => {
  const { funcCat, subCat, l2 } = filters.value
  if (!funcCat) return t("filters.funcCat.all")
  const parts: string[] = [t(`taxonomy.funcCat.${funcCat}`)]
  if (subCat) parts.push(t(`taxonomy.l1.${subCat}`))
  if (l2) parts.push(t(`taxonomy.l2.${l2}`))
  return parts.join(" / ")
})

const expandedPath = computed<Set<string>>(() => {
  const set = new Set<string>()
  const { funcCat, subCat } = filters.value
  if (funcCat) set.add(`fc:${funcCat}`)
  if (funcCat && subCat) set.add(`l1:${funcCat}.${subCat}`)
  return set
})

const expanded = ref<Set<string>>(new Set(expandedPath.value))

watch(open, (isOpen) => {
  if (isOpen) {
    expanded.value = new Set(expandedPath.value)
    if (expanded.value.size === 0) {
      // Default-open the first funcCat so the panel never lands empty.
      expanded.value.add(`fc:${FUNC_TAXONOMY[0]!.key}`)
    }
  }
})

function toggleExpand(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function selectAll() {
  update({ funcCat: undefined, subCat: undefined, l2: undefined })
  open.value = false
}

function selectFuncCat(key: FuncCatKey) {
  update({ funcCat: key, subCat: undefined, l2: undefined })
  open.value = false
}

function selectL1(funcCat: FuncCatKey, l1Key: string) {
  update({ funcCat, subCat: l1Key, l2: undefined })
  open.value = false
}

function selectL2(funcCat: FuncCatKey, l1Key: string, l2Key: string) {
  update({ funcCat, subCat: l1Key, l2: l2Key })
  open.value = false
}

const visibleRows = computed<Row[]>(() => {
  const out: Row[] = []
  const { funcCat: activeCat, subCat: activeSub, l2: activeL2 } = filters.value
  for (const cat of FUNC_TAXONOMY) {
    const catKey = `fc:${cat.key}`
    const catExpanded = expanded.value.has(catKey)
    out.push({
      depth: 0,
      funcCat: cat.key,
      hasChildren: cat.l1.length > 0,
      isActive: activeCat === cat.key && !activeSub && !activeL2,
    })
    if (!catExpanded) continue
    for (const l1 of cat.l1) {
      const l1Key = `l1:${cat.key}.${l1.key}`
      const l1Expanded = expanded.value.has(l1Key)
      out.push({
        depth: 1,
        funcCat: cat.key,
        l1Key: l1.key,
        hasChildren: l1.l2.length > 0,
        isActive: activeCat === cat.key && activeSub === l1.key && !activeL2,
      })
      if (!l1Expanded) continue
      for (const l2Key of l1.l2) {
        out.push({
          depth: 2,
          funcCat: cat.key,
          l1Key: l1.key,
          l2Key,
          hasChildren: false,
          isActive:
            activeCat === cat.key && activeSub === l1.key && activeL2 === l2Key,
        })
      }
    }
  }
  return out
})

function rowLabel(row: Row): string {
  if (row.depth === 0) return t(`taxonomy.funcCat.${row.funcCat}`)
  if (row.depth === 1) return t(`taxonomy.l1.${row.l1Key}`)
  return t(`taxonomy.l2.${row.l2Key}`)
}

function rowExpandKey(row: Row): string | null {
  if (row.depth === 0) return `fc:${row.funcCat}`
  if (row.depth === 1) return `l1:${row.funcCat}.${row.l1Key}`
  return null
}

function onRowSelect(row: Row) {
  if (row.depth === 0) selectFuncCat(row.funcCat)
  else if (row.depth === 1) selectL1(row.funcCat, row.l1Key!)
  else selectL2(row.funcCat, row.l1Key!, row.l2Key!)
}

const hasActive = computed(() => Boolean(filters.value.funcCat))
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger
      :class="[
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors',
        hasActive
          ? 'border-(--color-ink)/35 bg-(--color-card) text-(--color-ink) font-semibold'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)',
      ]"
    >
      <span class="font-semibold">{{ t("filters.funcCat.label") }}:</span>
      <span class="truncate max-w-[200px]">{{ triggerLabel }}</span>
      <ChevronDown :size="12" aria-hidden="true" />
    </PopoverTrigger>

    <PopoverContent align="start" :class="'w-[320px] p-0'">
      <div class="flex items-center gap-2 border-b border-(--color-border) px-3 py-2">
        <button
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
          :class="!hasActive
            ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
            : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'"
          @click="selectAll"
        >
          {{ t("filters.funcCat.all") }}
        </button>
      </div>

      <div class="max-h-72 overflow-y-auto py-1">
        <div
          v-for="row in visibleRows"
          :key="`${row.depth}:${row.funcCat}:${row.l1Key ?? ''}:${row.l2Key ?? ''}`"
          class="flex items-center"
          :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
        >
          <button
            v-if="row.hasChildren && rowExpandKey(row)"
            type="button"
            class="grid size-5 place-items-center rounded text-(--color-ink-muted) hover:text-(--color-ink)"
            :aria-label="expanded.has(rowExpandKey(row)!)
              ? t('filters.dept.collapse')
              : t('filters.dept.expand')"
            @click="toggleExpand(rowExpandKey(row)!)"
          >
            <ChevronDown
              v-if="expanded.has(rowExpandKey(row)!)"
              :size="12"
              aria-hidden="true"
            />
            <ChevronRight v-else :size="12" aria-hidden="true" />
          </button>
          <span v-else class="block size-5" />
          <button
            type="button"
            class="flex flex-1 items-center gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-(--color-sidebar)"
            :class="row.isActive
              ? 'text-(--color-accent) font-medium'
              : 'text-(--color-ink)'"
            @click="onRowSelect(row)"
          >
            <span
              v-if="row.depth === 0"
              class="size-[7px] shrink-0 rounded-sm"
              :style="{ background: FUNC_CAT_COLORS[row.funcCat] }"
              aria-hidden="true"
            />
            <span
              v-else-if="row.depth === 1"
              class="w-[2px] self-stretch shrink-0 rounded"
              :style="{ background: FUNC_CAT_COLORS[row.funcCat], opacity: 0.5 }"
              aria-hidden="true"
            />
            <span v-else class="size-[3px] shrink-0 rounded-full bg-(--color-ink-muted)" aria-hidden="true" />
            <span class="truncate">{{ rowLabel(row) }}</span>
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
