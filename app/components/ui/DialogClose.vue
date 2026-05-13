<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { DialogClose, type DialogCloseProps, useForwardProps } from "reka-ui"

const props = defineProps<DialogCloseProps & { class?: HTMLAttributes["class"] }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <DialogClose v-bind="forwarded" :class="props.class">
    <slot />
  </DialogClose>
</template>
