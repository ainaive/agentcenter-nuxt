<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cva, type VariantProps } from "class-variance-authority"
import { Primitive, type PrimitiveProps } from "reka-ui"
import { cn } from "~/lib/utils"

// The shared editorial surface: a bordered card on `--color-card`. Owns the
// border + radius + (optional) padding scale and the ExtCard hover-lift so
// callers stop hand-rolling `rounded-(--radius-card) border … bg-(--color-card)`
// (it was duplicated across ~50 components). Layout/colour beyond the surface is
// passed through `class`; `padding="none"` opts out for self-padded content.
const cardVariants = cva(
  "rounded-(--radius-card) border border-(--color-border) bg-(--color-card)",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
      },
      interactive: {
        true: "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-(--color-accent)/30 hover:shadow-[0_2px_10px_-4px_oklch(0_0_0_/_0.08)]",
        false: "",
      },
    },
    defaultVariants: { padding: "md", interactive: false },
  },
)

export type CardVariants = VariantProps<typeof cardVariants>

const props = withDefaults(
  defineProps<PrimitiveProps & {
    padding?: CardVariants["padding"]
    interactive?: CardVariants["interactive"]
    class?: HTMLAttributes["class"]
  }>(),
  { as: "div" },
)
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(cardVariants({ padding, interactive }), props.class)"
  >
    <slot />
  </Primitive>
</template>
