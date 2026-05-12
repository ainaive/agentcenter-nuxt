<script setup lang="ts">
import { Globe } from "lucide-vue-next"
import type { Locale } from "~~/shared/types"

const { locale, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const nextLocale = computed<Locale>(() => (locale.value === "en" ? "zh" : "en"))
const label = computed(() =>
  nextLocale.value === "zh" ? t("nav.switchToZh") : t("nav.switchToEn"),
)
</script>

<template>
  <NuxtLink
    :to="switchLocalePath(nextLocale)"
    class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) inline-flex items-center gap-1 text-sm"
    :aria-label="label"
    :title="label"
  >
    <Globe :size="16" aria-hidden="true" />
    <span class="font-mono uppercase">{{ nextLocale }}</span>
  </NuxtLink>
</template>
