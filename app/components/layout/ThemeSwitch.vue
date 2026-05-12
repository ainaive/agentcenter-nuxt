<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next"

const { t } = useI18n()
const { theme, toggle } = useTheme()

const label = computed(() =>
  theme.value === "dark" ? t("nav.switchToIvory") : t("nav.switchToDark"),
)
</script>

<template>
  <button
    type="button"
    class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
    :aria-label="label"
    :title="label"
    @click="toggle"
  >
    <Moon v-if="theme === 'ivory'" :size="18" aria-hidden="true" />
    <Sun v-else :size="18" aria-hidden="true" />
  </button>
</template>
