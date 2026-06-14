<script setup lang="ts">
import { Download } from "lucide-vue-next"
import type { ProfileInstalledRow } from "~~/shared/types"

defineProps<{ rows: ProfileInstalledRow[] }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div>
    <EmptyState
      v-if="rows.length === 0"
      :icon="Download"
      :title="t('profile.emptyInstalled.title')"
      :description="t('profile.emptyInstalled.body')"
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
      </Card>
    </ul>
  </div>
</template>
