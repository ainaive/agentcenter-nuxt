<script setup lang="ts">
import { ChevronDown, ChevronRight } from "lucide-vue-next"
import type { Department, Locale } from "~~/shared/types"
import { DEPARTMENTS, MY_DEPT_ID, deptPath, findDept } from "~~/shared/data/departments"

const { t, locale } = useI18n()
const { filters, update } = useFilters()

const open = ref(false)

const activeDept = computed<Department | null>(() => {
  const id = filters.value.dept
  if (!id) return null
  return findDept(id)
})

const triggerLabel = computed(() => {
  if (!activeDept.value) return t("filters.dept.all")
  if (activeDept.value.id === MY_DEPT_ID) return t("filters.dept.mine")
  const segments = deptPath(activeDept.value.id, locale.value as Locale)
  return segments.join(" / ")
})

// Path of dept IDs from the active dept up to (and including) the root.
const expandedPath = computed<Set<string>>(() => {
  const set = new Set<string>()
  const targetId = filters.value.dept ?? MY_DEPT_ID
  const parts = targetId.split(".")
  for (let i = 1; i <= parts.length; i++) {
    set.add(parts.slice(0, i).join("."))
  }
  return set
})

// Local mutable expansion state — seeded from expandedPath, then user can override.
const expanded = ref<Set<string>>(new Set(expandedPath.value))

watch(open, (isOpen) => {
  if (isOpen) expanded.value = new Set(expandedPath.value)
})

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function selectDept(id: string | undefined) {
  update({ dept: id })
  open.value = false
}

const orgRootId = computed(() => MY_DEPT_ID.split(".")[0])

function flatten(dept: Department, depth: number): Array<{ dept: Department; depth: number }> {
  const out: Array<{ dept: Department; depth: number }> = [{ dept, depth }]
  if (dept.children && expanded.value.has(dept.id)) {
    for (const child of dept.children) {
      out.push(...flatten(child, depth + 1))
    }
  }
  return out
}

const visibleRows = computed(() =>
  DEPARTMENTS.flatMap((d) => flatten(d, 0)),
)

function deptName(d: Department): string {
  return locale.value === "zh" ? d.nameZh : d.name
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger
      :class="[
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors',
        activeDept
          ? 'border-(--color-accent)/40 bg-(--color-accent)/10 text-(--color-accent)'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink-muted) hover:text-(--color-ink)',
      ]"
    >
      <span class="font-semibold">{{ t("filters.dept.label") }}:</span>
      <span class="truncate max-w-[180px]">{{ triggerLabel }}</span>
      <ChevronDown :size="12" aria-hidden="true" />
    </PopoverTrigger>

    <PopoverContent align="start" :class="'w-[360px] p-0'">
      <div class="flex items-center gap-2 border-b border-(--color-border) px-3 py-2">
        <button
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
          :class="filters.dept === MY_DEPT_ID
            ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
            : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'"
          @click="selectDept(MY_DEPT_ID)"
        >
          {{ t("filters.dept.mine") }}
        </button>
        <button
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
          :class="filters.dept === orgRootId
            ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
            : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'"
          @click="selectDept(orgRootId)"
        >
          {{ t("filters.dept.org") }}
        </button>
        <button
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
          :class="!filters.dept
            ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
            : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'"
          @click="selectDept(undefined)"
        >
          {{ t("filters.dept.all") }}
        </button>
      </div>

      <div class="max-h-72 overflow-y-auto py-1">
        <div
          v-for="row in visibleRows"
          :key="row.dept.id"
          class="flex items-center"
          :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
        >
          <button
            v-if="row.dept.children && row.dept.children.length"
            type="button"
            class="grid size-5 place-items-center rounded text-(--color-ink-muted) hover:text-(--color-ink)"
            :aria-label="expanded.has(row.dept.id)
              ? t('filters.dept.collapse')
              : t('filters.dept.expand')"
            @click="toggleExpand(row.dept.id)"
          >
            <ChevronDown v-if="expanded.has(row.dept.id)" :size="12" aria-hidden="true" />
            <ChevronRight v-else :size="12" aria-hidden="true" />
          </button>
          <span v-else class="block size-5" />
          <button
            type="button"
            class="flex flex-1 items-center justify-between gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-(--color-sidebar)"
            :class="filters.dept === row.dept.id
              ? 'text-(--color-accent) font-medium'
              : 'text-(--color-ink)'"
            @click="selectDept(row.dept.id)"
          >
            <span class="truncate">{{ deptName(row.dept) }}</span>
            <span
              v-if="row.dept.id === MY_DEPT_ID"
              class="font-mono text-[10px] text-(--color-ink-muted) bg-(--color-sidebar) px-1.5 py-0.5 rounded"
            >
              {{ t("filters.dept.mineBadge") }}
            </span>
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
