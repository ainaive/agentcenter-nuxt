<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { DialogDescription, type DialogDescriptionProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes["class"] }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <DialogDescription
    v-bind="forwarded"
    :class="cn('text-sm text-(--color-ink-muted)', props.class)"
  >
    <slot />
  </DialogDescription>
</template>
