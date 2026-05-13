<script setup lang="ts">
import { AlertCircle } from "lucide-vue-next"
import type { NuxtError } from "#app"

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()

onMounted(() => {
  if (import.meta.dev) {
    console.error("[app/error]", props.error)
  } else {
    console.error("[app/error]", {
      statusCode: props.error.statusCode,
      message: props.error.message,
    })
  }
})

async function handleRetry() {
  await clearError({ redirect: localePath("/") })
}
</script>

<template>
  <NuxtLayout>
    <div class="px-7 py-20">
      <div class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center">
        <AlertCircle :size="32" class="text-red-500" aria-hidden="true" />
        <h1 class="text-base font-semibold text-(--color-ink)">{{ t("errors.generic.title") }}</h1>
        <p class="max-w-sm text-[13.5px] leading-relaxed text-(--color-ink-muted)">
          {{ t("errors.generic.body") }}
        </p>
        <button
          type="button"
          class="mt-1 rounded-md bg-(--color-accent) px-4 py-2 text-[13px] font-semibold text-(--color-accent-fg) transition-opacity hover:opacity-90"
          @click="handleRetry"
        >
          {{ t("errors.generic.home") }}
        </button>
        <code v-if="error.statusCode" class="mt-1 font-mono text-[10.5px] text-(--color-ink-muted)">
          {{ error.statusCode }}
        </code>
      </div>
    </div>
  </NuxtLayout>
</template>
