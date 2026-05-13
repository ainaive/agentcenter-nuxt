<script setup lang="ts">
import { DialogTitle, type DialogTitleProps, useForwardProps } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<DialogTitleProps & { class?: string }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <DialogTitle
    v-bind="forwarded"
    :class="cn('text-lg font-semibold text-(--color-ink) font-serif', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
