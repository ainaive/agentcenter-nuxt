<script setup lang="ts">
const { locale } = useI18n()

useTheme()

useHead({
  htmlAttrs: { lang: locale },
  bodyAttrs: { class: "bg-(--color-bg) text-(--color-ink) font-sans antialiased" },
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--color-accent)" :height="2" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
