<script setup lang="ts">
// A pill chip for the chip-group pickers (OfficialTier, SubCat). Neutral
// ink active state per decision #11 — no accent fill. `@click` falls
// through to the button.
defineProps<{ active?: boolean }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
    :class="
      active
        ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
        : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
    "
  >
    <slot />
  </button>
</template>
