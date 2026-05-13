<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next"
import { SelectIcon, SelectTrigger, type SelectTriggerProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<SelectTriggerProps & { class?: string }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <SelectTrigger
    v-bind="forwarded"
    :class="cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-ink) shadow-sm transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40 disabled:cursor-not-allowed disabled:opacity-50',
      '[&[data-placeholder]]:text-(--color-ink-muted)',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4 opacity-60" />
    </SelectIcon>
  </SelectTrigger>
</template>
