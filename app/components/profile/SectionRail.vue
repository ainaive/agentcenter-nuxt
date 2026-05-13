<script setup lang="ts">
import { Activity, Bookmark, Download, FileText, Settings, Upload } from "lucide-vue-next"

export type ProfileSectionKey =
  | "installed"
  | "published"
  | "drafts"
  | "saved"
  | "activity"
  | "settings"

defineProps<{
  active: ProfileSectionKey
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const items: Array<{ key: ProfileSectionKey; icon: typeof Download }> = [
  { key: "installed", icon: Download },
  { key: "published", icon: Upload },
  { key: "drafts", icon: FileText },
  { key: "saved", icon: Bookmark },
  { key: "activity", icon: Activity },
  { key: "settings", icon: Settings },
]

function href(key: ProfileSectionKey): string {
  return `${localePath("/profile")}?section=${key}`
}
</script>

<template>
  <nav class="flex flex-col gap-1">
    <NuxtLink
      v-for="item in items"
      :key="item.key"
      :to="href(item.key)"
      class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
      :class="active === item.key
        ? 'bg-(--color-sidebar) text-(--color-ink) font-medium'
        : 'text-(--color-ink-muted) hover:bg-(--color-sidebar)/60 hover:text-(--color-ink)'"
    >
      <component :is="item.icon" :size="16" aria-hidden="true" />
      {{ t(`profile.sections.${item.key}`) }}
    </NuxtLink>
  </nav>
</template>
