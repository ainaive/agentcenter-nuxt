<script setup lang="ts">
import { Building2, Check, ChevronDown } from "lucide-vue-next"
import type { Department, Locale } from "~~/shared/types"
import { DEPARTMENTS, deptPath } from "~~/shared/data/departments"

const value = defineModel<string | undefined>()

const { t, locale } = useI18n()

interface FlatDept {
  id: string
  name: string
  depth: number
}

function localized(d: Department): string {
  return locale.value === "zh" ? d.nameZh : d.name
}

function flatten(list: Department[], depth = 0): FlatDept[] {
  const out: FlatDept[] = []
  for (const d of list) {
    out.push({ id: d.id, name: localized(d), depth })
    if (d.children?.length) out.push(...flatten(d.children, depth + 1))
  }
  return out
}

const flat = computed(() => flatten(DEPARTMENTS))

const label = computed(() =>
  value.value ? deptPath(value.value, locale.value as Locale).join(" / ") : "",
)

const open = ref(false)

function select(id: string | undefined) {
  value.value = id
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger
      class="flex w-full items-center justify-between gap-2.5 rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-[13px] outline-none transition-colors hover:border-(--color-accent)/40 focus:border-(--color-accent)"
    >
      <span class="inline-flex items-center gap-2 truncate">
        <Building2 aria-hidden="true" class="size-3.5 text-(--color-ink-muted)" />
        <span :class="value ? 'text-(--color-ink)' : 'text-(--color-ink-muted)'">
          {{ value ? label : t("publish.wizard.listing.deptUnset") }}
        </span>
      </span>
      <ChevronDown aria-hidden="true" class="size-3 text-(--color-ink-muted)" />
    </PopoverTrigger>
    <PopoverContent
      align="start"
      class="max-h-[260px] w-(--reka-popover-trigger-width) overflow-auto p-1"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[12.5px] transition-colors"
        :class="!value ? 'bg-(--color-sidebar) font-semibold text-(--color-ink)' : 'text-(--color-ink) hover:bg-(--color-sidebar)'"
        @click="select(undefined)"
      >
        {{ t("publish.wizard.listing.deptUnset") }}
        <Check v-if="!value" aria-hidden="true" class="size-3.5 text-(--color-ink)" />
      </button>
      <button
        v-for="d in flat"
        :key="d.id"
        type="button"
        class="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[12.5px] transition-colors"
        :class="value === d.id ? 'bg-(--color-sidebar) font-semibold text-(--color-ink)' : 'text-(--color-ink) hover:bg-(--color-sidebar)'"
        :style="{ paddingLeft: `${10 + d.depth * 16}px` }"
        @click="select(d.id)"
      >
        {{ d.name }}
        <Check v-if="value === d.id" aria-hidden="true" class="size-3.5 text-(--color-ink)" />
      </button>
    </PopoverContent>
  </Popover>
</template>
