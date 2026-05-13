<script setup lang="ts">
import { Check } from "lucide-vue-next"

const props = defineProps<{
  value: string
  current?: string | null
  title: string
  desc?: string
  badge?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: "select", value: string): void }>()

const active = computed(() => props.value === props.current)
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="active"
    :disabled="disabled"
    :class="[
      'flex flex-col gap-1 rounded-lg border-2 px-3.5 py-3 text-left transition-all',
      active
        ? 'border-(--color-accent) bg-(--color-accent)/10'
        : 'border-(--color-border) bg-(--color-card) hover:border-(--color-accent)/40',
      disabled && 'cursor-not-allowed opacity-60',
    ]"
    @click="emit('select', value)"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-[13.5px] font-semibold text-(--color-ink)">{{ title }}</span>
      <span class="flex items-center gap-2">
        <span
          v-if="badge"
          class="rounded-full bg-(--color-sidebar) text-(--color-ink-muted) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        >
          {{ badge }}
        </span>
        <span
          v-if="active"
          class="inline-flex size-4 items-center justify-center rounded-full bg-(--color-accent) text-(--color-accent-fg)"
        >
          <Check aria-hidden="true" :size="10" />
        </span>
      </span>
    </div>
    <span v-if="desc" class="text-[12px] leading-relaxed text-(--color-ink-muted)">
      {{ desc }}
    </span>
  </button>
</template>
