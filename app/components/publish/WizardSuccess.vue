<script setup lang="ts">
import { Check } from "lucide-vue-next"
import type { PublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ wizard: PublishWizard }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
    <div class="grid size-20 place-items-center rounded-full bg-(--color-accent)/10">
      <Check :size="40" class="text-(--color-accent)" aria-hidden="true" />
    </div>
    <h2 class="font-serif text-3xl tracking-tight text-(--color-ink)">
      {{ t("publish.wizard.success.title") }}
    </h2>
    <p class="max-w-sm text-[15px] leading-relaxed text-(--color-ink-muted)">
      {{
        props.wizard.form.scope === "personal"
          ? t("publish.wizard.success.personal")
          : t("publish.wizard.success.shared")
      }}
    </p>
    <NuxtLink
      :to="localePath('/publish')"
      class="mt-3 inline-flex items-center rounded-md bg-(--color-accent) px-5 py-2 text-[13px] font-semibold text-(--color-accent-fg) hover:opacity-90"
    >
      {{ t("publish.wizard.success.back") }}
    </NuxtLink>
  </div>
</template>
