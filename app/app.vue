<script setup lang="ts">
const { locale } = useI18n()

useTheme()

useHead({
  htmlAttrs: { lang: locale },
  bodyAttrs: { class: "bg-(--color-bg) text-(--color-ink) font-sans antialiased" },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
