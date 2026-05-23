<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--color-bg) text-(--color-ink)">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-(--color-card) focus:text-(--color-ink) focus:rounded-md focus:shadow"
    >
      {{ t("nav.skipToContent") }}
    </a>

    <header
      class="sticky top-0 z-10 h-16 border-b border-(--color-border) bg-(--color-card)"
      role="banner"
    >
      <TopBar :collapsed="true" no-sidebar />
    </header>

    <main id="main-content" tabindex="-1" class="flex-1 focus:outline-none">
      <slot />
    </main>
  </div>
</template>
