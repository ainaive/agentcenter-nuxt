<script setup lang="ts">
const { t } = useI18n()
const sidebarCollapsed = ref(false)
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
      <TopBar :collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />
    </header>

    <div class="flex flex-1 min-h-0">
      <aside
        class="border-r border-(--color-border) bg-(--color-sidebar) overflow-hidden flex flex-col transition-[width] duration-200"
        :class="sidebarCollapsed ? 'w-0' : 'w-[240px]'"
        role="navigation"
      >
        <Sidebar :collapsed="sidebarCollapsed" />
      </aside>

      <main id="main-content" tabindex="-1" class="flex-1 overflow-y-auto focus:outline-none">
        <slot />
      </main>
    </div>
  </div>
</template>
