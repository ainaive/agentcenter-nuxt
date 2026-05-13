<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import {
  SelectContent,
  type SelectContentEmits,
  type SelectContentProps,
  SelectPortal,
  SelectViewport,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "~/lib/utils"

const props = withDefaults(
  defineProps<SelectContentProps & { class?: HTMLAttributes["class"] }>(),
  { position: "popper" },
)
const emits = defineEmits<SelectContentEmits>()

const forwarded = useForwardPropsEmits(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
  emits,
)
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="forwarded"
      :class="cn(
        'relative z-50 max-h-96 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-md border border-(--color-border) bg-(--color-card) text-(--color-ink) shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        props.class,
      )"
    >
      <SelectViewport class="p-1">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
