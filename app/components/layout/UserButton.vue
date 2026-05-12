<script setup lang="ts">
import { User } from "lucide-vue-next"

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/sign-in')"
    class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) inline-flex items-center gap-1 text-sm"
  >
    <User :size="16" aria-hidden="true" />
    <span>{{ t("auth.userMenu.signIn") }}</span>
  </NuxtLink>
</template>
