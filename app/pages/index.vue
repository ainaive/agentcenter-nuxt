<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ layout: "home" })

defineOgImageComponent("Frame", {
  title: "AgentCenter",
  description: t("home.heroSubtitle"),
})
</script>

<template>
  <div>
    <HomeHero />
    <HomeDiscovery />
  </div>
</template>
