<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { TabsContent, type TabsContentProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<TabsContentProps & { class?: HTMLAttributes["class"] }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <TabsContent
    v-bind="forwarded"
    :class="cn(
      'mt-2 ring-offset-(--color-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40',
      props.class,
    )"
  >
    <slot />
  </TabsContent>
</template>
