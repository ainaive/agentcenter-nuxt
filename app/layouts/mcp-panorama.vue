<script setup lang="ts">
const { t } = useI18n()
// The MCP Panorama page renders its own LayerSidebar (which depends on
// page state). This layout is identical to default.vue minus the global
// AgentCenter Sidebar, leaving the page free to compose its own chrome.
const sidebarCollapsed = ref(true)
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="h-screen flex flex-col bg-(--color-bg) text-(--color-ink)">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-(--color-card) focus:text-(--color-ink) focus:rounded-md focus:shadow"
    >
      {{ t("nav.skipToContent") }}
    </a>

    <header
      class="sticky top-0 z-10 h-[52px] border-b border-(--color-border) bg-(--color-card) flex items-center px-4 gap-3"
      role="banner"
    >
      <TopBar :collapsed="sidebarCollapsed" :hide-search="true" @toggle-sidebar="toggleSidebar" />
    </header>

    <main id="main-content" tabindex="-1" class="flex flex-1 min-h-0 focus:outline-none">
      <slot />
    </main>
  </div>
</template>
