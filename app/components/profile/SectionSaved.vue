<script setup lang="ts">
import { Bookmark } from "lucide-vue-next"
import type { ProfileSavedRow } from "~~/shared/types"

defineProps<{ rows: ProfileSavedRow[] }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div>
    <EmptyState
      v-if="rows.length === 0"
      :icon="Bookmark"
      :title="t('profile.emptySaved.title')"
      :description="t('profile.emptySaved.body')"
    >
      <template #cta>
        <Button as-child size="sm" variant="outline">
          <NuxtLink :to="localePath('/extensions')">{{ t("profile.browse") }}</NuxtLink>
        </Button>
      </template>
    </EmptyState>

    <ul v-else class="space-y-2">
      <Card
        v-for="r in rows"
        :key="r.extensionId"
        as="li"
        padding="sm"
        class="flex items-center gap-4"
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
      </Card>
    </ul>
  </div>
</template>
