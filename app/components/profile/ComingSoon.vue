<script setup lang="ts">
import { Construction } from "lucide-vue-next"

defineProps<{ title?: string; body?: string }>()

const { t } = useI18n()
</script>

<template>
  <EmptyState
    :icon="Construction"
    :title="title ?? t('profile.comingSoon.title')"
    :description="body ?? t('profile.comingSoon.body')"
  />
</template>
