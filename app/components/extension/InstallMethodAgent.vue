<script setup lang="ts">
import type { ExtensionCategory } from "~~/shared/types"

const props = defineProps<{
  name: string
  category: ExtensionCategory
  slug: string
  bundleUrl: string
  destPath: string
}>()

const { t } = useI18n()

const prompt = computed(() =>
  t("extensions.install.agent.promptTemplate", {
    name: props.name,
    category: props.category,
    slug: props.slug,
    bundleUrl: props.bundleUrl,
    destPath: props.destPath,
  }),
)
</script>

<template>
  <div class="space-y-3">
    <p class="text-[13px] text-(--color-ink-muted)">
      {{ t("extensions.install.agent.hint") }}
    </p>
    <CopyBlock :text="prompt" />
  </div>
</template>
