<script setup lang="ts">
import type { Component } from "vue"

// The shared "nothing here yet" panel: a dashed editorial surface with an
// optional icon, title, body, and CTA slot. Replaces the dashed-border block
// copy-pasted across the profile sections, collections pages, the publish
// dashboard and the reviewer queue. All three text slots are optional so it
// also covers the minimal text-only empties. Put a CTA in via the `cta` slot
// using <Button as-child variant="…"> so button styling stays in one place.
defineProps<{
  icon?: Component
  title?: string
  description?: string
}>()
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
  >
    <component
      :is="icon"
      v-if="icon"
      class="mx-auto size-8 text-(--color-ink-muted)"
      aria-hidden="true"
    />
    <h3
      v-if="title"
      class="font-serif text-lg text-(--color-ink)"
      :class="icon ? 'mt-3' : ''"
    >
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="text-sm text-(--color-ink-muted)"
      :class="title || icon ? 'mt-1' : ''"
    >
      {{ description }}
    </p>
    <div v-if="$slots.cta" class="mt-4 flex justify-center">
      <slot name="cta" />
    </div>
  </div>
</template>
