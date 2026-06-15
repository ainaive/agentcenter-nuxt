<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { t } = useI18n()
const command = computed(() => `agentcenter install ${props.slug}`)
</script>

<template>
  <div class="space-y-3">
    <p class="text-[13px] text-(--color-ink-muted)">
      {{ t("extensions.install.cli.hint") }}
    </p>
    <InstallCommand :command="command" />
  </div>
</template>
