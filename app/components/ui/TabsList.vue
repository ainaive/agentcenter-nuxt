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
      'inline-flex h-9 items-center justify-center gap-1 rounded-md border border-(--color-border) bg-(--color-sidebar) p-1 text-(--color-ink-muted)',
      props.class,
    )"
  >
    <slot />
  </TabsList>
</template>
