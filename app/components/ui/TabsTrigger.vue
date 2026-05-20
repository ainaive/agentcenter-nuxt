<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { TabsTrigger, type TabsTriggerProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <TabsTrigger
    v-bind="forwarded"
    :class="cn(
      'relative inline-flex items-center justify-center whitespace-nowrap px-1 py-2.5 -mb-px text-[14px] font-medium border-b-2 border-transparent transition-colors',
      'hover:text-(--color-ink)',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:text-(--color-ink) data-[state=active]:font-semibold data-[state=active]:border-(--color-ink)',
      props.class,
    )"
  >
    <slot />
  </TabsTrigger>
</template>
