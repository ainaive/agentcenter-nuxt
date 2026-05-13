<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-vue-next"
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "~/lib/utils"

const sheetVariants = cva(
  "fixed z-50 gap-4 border-(--color-border) bg-(--color-card) shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: { side: "right" },
  },
)

type SheetSide = NonNullable<VariantProps<typeof sheetVariants>["side"]>

const props = withDefaults(
  defineProps<DialogContentProps & { class?: string; side?: SheetSide }>(),
  { side: "right" },
)
const emits = defineEmits<DialogContentEmits>()

const forwarded = useForwardPropsEmits(
  computed(() => {
    const { class: _, side: __, ...rest } = props
    return rest
  }),
  emits,
)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogContent
      v-bind="forwarded"
      :class="cn(sheetVariants({ side: props.side }), 'p-6', props.class)"
    >
      <slot />
      <DialogClose
        class="absolute right-4 top-4 rounded-sm text-(--color-ink-muted) opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40"
      >
        <X class="size-4" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
