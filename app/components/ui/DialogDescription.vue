<script setup lang="ts">
import { DialogDescription, type DialogDescriptionProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<DialogDescriptionProps & { class?: string }>()

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
