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
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-(--color-bg) transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-(--color-card) data-[state=active]:text-(--color-ink) data-[state=active]:shadow-sm',
      props.class,
    )"
  >
    <slot />
  </TabsTrigger>
</template>
