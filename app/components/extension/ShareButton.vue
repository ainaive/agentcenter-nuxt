<script setup lang="ts">
import { Share2 } from "lucide-vue-next"

const props = defineProps<{ url: string }>()

const { t } = useI18n()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function share() {
  // Prefer the native share sheet (iOS / Android / some desktop browsers).
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url: props.url })
      return
    } catch (err) {
      // User dismissed → don't silently copy as a consolation prize, that's
      // surprising. Only fall through on genuine errors (e.g. share blocked
      // by permissions policy on some embedded contexts).
      if ((err as { name?: string })?.name === "AbortError") return
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(props.url)
      copied.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { copied.value = false }, 1400)
    } catch {
      // ignore — clipboard permissions vary
    }
  }
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
    @click="share"
  >
    <Share2 :size="14" aria-hidden="true" />
    {{ copied ? t("extensions.copied") : t("extensions.share") }}
  </button>
</template>
