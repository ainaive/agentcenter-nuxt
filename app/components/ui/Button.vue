<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cva, type VariantProps } from "class-variance-authority"
import { Primitive, type PrimitiveProps } from "reka-ui"
import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-(--color-accent) text-(--color-accent-fg) hover:bg-(--color-accent)/90",
        outline: "border border-(--color-border) bg-(--color-card) text-(--color-ink) hover:bg-(--color-sidebar)",
        ghost: "text-(--color-ink) hover:bg-(--color-sidebar)",
        secondary: "bg-(--color-sidebar) text-(--color-ink) hover:bg-(--color-sidebar)/80 border border-(--color-border)",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        link: "text-(--color-accent) underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

const props = withDefaults(
  defineProps<PrimitiveProps & {
    variant?: ButtonVariants["variant"]
    size?: ButtonVariants["size"]
    class?: HTMLAttributes["class"]
  }>(),
  { as: "button" },
)
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
