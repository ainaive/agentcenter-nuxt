<script setup lang="ts">
import { Label } from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<{
  for?: string
  class?: string
}>()
</script>

<template>
  <Label
    v-bind="props.for ? { for: props.for } : {}"
    :class="cn(
      'text-sm font-medium text-(--color-ink) leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      props.class,
    )"
  >
    <slot />
  </Label>
</template>
