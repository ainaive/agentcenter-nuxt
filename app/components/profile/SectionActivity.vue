<script setup lang="ts">
import { Clock, Download, Star, Upload } from "lucide-vue-next"
import type { ProfileActivityEvent } from "~~/shared/types"

defineProps<{ rows: ProfileActivityEvent[] }>()

const { t } = useI18n()
const localePath = useLocalePath()

function iconFor(kind: ProfileActivityEvent["kind"]) {
  if (kind === "installed") return Download
  if (kind === "published") return Upload
  return Star
}

function verbFor(kind: ProfileActivityEvent["kind"]): string {
  return t(`profile.activity.${kind}`)
}
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <Clock class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("profile.emptyActivity.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("profile.emptyActivity.body") }}
      </p>
    </div>

    <ul v-else class="space-y-1">
      <li
        v-for="r in rows"
        :key="`${r.kind}:${r.extensionId}:${r.at}`"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-(--color-sidebar)/60"
      >
        <component :is="iconFor(r.kind)" :size="14" class="text-(--color-ink-muted) shrink-0" aria-hidden="true" />
        <span class="text-(--color-ink-muted)">{{ verbFor(r.kind) }}</span>
        <NuxtLink
          :to="localePath(`/extensions/${r.slug}`)"
          class="font-medium text-(--color-ink) truncate hover:underline"
        >
          {{ r.name }}
        </NuxtLink>
        <span v-if="r.kind === 'rated'" class="font-mono text-xs text-(--color-ink-muted)">
          {{ r.stars }} ★
        </span>
        <span v-else class="font-mono text-xs text-(--color-ink-muted)">
          v{{ r.version }}
        </span>
      </li>
    </ul>
  </div>
</template>
