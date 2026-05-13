<script setup lang="ts">
import { Download } from "lucide-vue-next"
import type { ProfileInstalledRow } from "~~/shared/types"

defineProps<{ rows: ProfileInstalledRow[] }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <Download class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("profile.emptyInstalled.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("profile.emptyInstalled.body") }}
      </p>
      <NuxtLink
        :to="localePath('/extensions')"
        class="mt-4 inline-flex items-center rounded-md border border-(--color-border) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
      >
        {{ t("profile.browse") }}
      </NuxtLink>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="r in rows"
        :key="r.extensionId"
        class="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-card) p-4"
      >
        <NuxtLink
          :to="localePath(`/extensions/${r.slug}`)"
          class="flex-1 min-w-0"
        >
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ r.name }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wide text-(--color-ink-muted)">
              {{ r.category }}
            </span>
          </div>
          <div class="mt-0.5 text-xs text-(--color-ink-muted) font-mono">
            v{{ r.installedVersion }}
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
