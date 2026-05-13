<script setup lang="ts">
import { Check } from "lucide-vue-next"
import {
  CheckboxIndicator,
  CheckboxRoot,
  type CheckboxRootEmits,
  type CheckboxRootProps,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "~/lib/utils"

const props = defineProps<CheckboxRootProps & { class?: string }>()
const emits = defineEmits<CheckboxRootEmits>()

const forwarded = useForwardPropsEmits(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
  emits,
)
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="cn(
      'peer size-4 shrink-0 rounded-sm border border-(--color-border) shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-(--color-accent) data-[state=checked]:text-(--color-accent-fg) data-[state=checked]:border-(--color-accent)',
      props.class,
    )"
  >
    <CheckboxIndicator class="flex items-center justify-center text-current">
      <Check class="size-3" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
