<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { TabsList, type TabsListProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<TabsListProps & { class?: HTMLAttributes["class"] }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <TabsList
    v-bind="forwarded"
    :class="cn(
      'inline-flex items-center gap-6 border-b border-(--color-border) text-(--color-ink-muted)',
      props.class,
    )"
  >
    <slot />
  </TabsList>
</template>
