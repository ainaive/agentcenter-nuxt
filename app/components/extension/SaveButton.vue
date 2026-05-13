<script setup lang="ts">
import { Bookmark, BookmarkCheck } from "lucide-vue-next"

const props = defineProps<{
  extensionId: string
  variant?: "pill" | "icon"
}>()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const saved = ref(false)
const busy = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

async function onClick() {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch("/api/internal/installs", {
      method: "POST",
      body: { extensionId: props.extensionId },
    })
    saved.value = true
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => { saved.value = false }, 3000)
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 401) {
      await router.push(localePath("/sign-in"))
      return
    }
    console.error("[save] failed", err)
  } finally {
    busy.value = false
  }
}

onBeforeUnmount(() => { if (resetTimer) clearTimeout(resetTimer) })
</script>

<template>
  <button
    type="button"
    :disabled="busy"
    :aria-label="saved ? t('common.saved') : t('common.save')"
    class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-60"
    :class="saved
      ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
      : 'border-(--color-border) bg-(--color-card) text-(--color-ink) hover:bg-(--color-sidebar)'"
    @click="onClick"
  >
    <component :is="saved ? BookmarkCheck : Bookmark" :size="14" aria-hidden="true" />
    <span v-if="variant !== 'icon'">{{ saved ? t("common.saved") : t("common.save") }}</span>
  </button>
</template>
