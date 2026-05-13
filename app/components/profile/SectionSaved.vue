<script setup lang="ts">
import { Bookmark } from "lucide-vue-next"
import type { ProfileSavedRow } from "~~/shared/types"

defineProps<{ rows: ProfileSavedRow[] }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <Bookmark class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("profile.emptySaved.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("profile.emptySaved.body") }}
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
        <Bookmark :size="14" class="text-(--color-accent) shrink-0" aria-hidden="true" />
        <NuxtLink :to="localePath(`/extensions/${r.slug}`)" class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-(--color-ink) truncate">{{ r.name }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wide text-(--color-ink-muted)">
              {{ r.category }}
            </span>
          </div>
          <div class="mt-0.5 text-xs text-(--color-ink-muted) font-mono">{{ r.slug }}</div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
