<script setup lang="ts">
const { t } = useI18n()

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
