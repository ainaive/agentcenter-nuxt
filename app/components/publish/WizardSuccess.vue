<script setup lang="ts">
import { CheckCircle } from "lucide-vue-next"
import type { PublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ wizard: PublishWizard }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-8 text-center">
    <CheckCircle :size="48" class="mx-auto text-(--color-accent)" aria-hidden="true" />
    <h2 class="mt-4 font-serif text-2xl text-(--color-ink)">
      {{ t("publish.wizard.success.title") }}
    </h2>
    <p class="mt-2 text-sm text-(--color-ink-muted)">
      {{
        props.wizard.form.scope === "personal"
          ? t("publish.wizard.success.personal")
          : t("publish.wizard.success.shared")
      }}
    </p>
    <NuxtLink
      :to="localePath('/publish')"
      class="mt-6 inline-flex items-center rounded-md bg-(--color-accent) px-4 py-2 text-sm text-(--color-accent-fg) hover:bg-(--color-accent)/90"
    >
      {{ t("publish.wizard.success.back") }}
    </NuxtLink>
  </div>
</template>
