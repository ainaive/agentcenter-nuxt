<script setup lang="ts">
import { Construction } from "lucide-vue-next"

defineProps<{ title?: string; body?: string }>()

const { t } = useI18n()
</script>

<template>
  <div class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center">
    <Construction class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
    <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
      {{ title ?? t("profile.comingSoon.title") }}
    </h3>
    <p class="mt-1 text-sm text-(--color-ink-muted)">
      {{ body ?? t("profile.comingSoon.body") }}
    </p>
  </div>
</template>
