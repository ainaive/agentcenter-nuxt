<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  required?: boolean
  optional?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline gap-2">
      <label class="text-[13px] font-semibold text-(--color-ink)">
        {{ label }}
        <span v-if="required" class="ml-0.5 text-red-600">*</span>
      </label>
      <span v-if="optional" class="text-[11px] font-normal text-(--color-ink-muted)">
        {{ optional }}
      </span>
    </div>
    <slot />
    <div v-if="hint" class="text-[11.5px] leading-relaxed text-(--color-ink-muted)">
      {{ hint }}
    </div>
  </div>
</template>
