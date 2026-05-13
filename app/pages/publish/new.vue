<script setup lang="ts">
definePageMeta({ middleware: ["require-auth", "require-onboard"] })

const { t } = useI18n()
</script>

<template>
  <div class="px-6 py-8 max-w-6xl mx-auto">
    <header class="mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
        {{ t("publish.wizard.headerNew") }}
      </h1>
    </header>
    <UploadWizard />
  </div>
</template>
