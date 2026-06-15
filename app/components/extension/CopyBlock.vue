<script setup lang="ts">
import { Check, Copy } from "lucide-vue-next"

// Multi-line variant of InstallCommand's dark copy block — used for the
// conversational install prompt, which spans several lines and must keep its
// exact whitespace (so it can't reuse InstallCommand's single-line truncate).
const props = defineProps<{ text: string }>()

const { t } = useI18n()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  if (!navigator.clipboard) return
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, 1400)
  } catch {
    // ignore — clipboard permissions vary
  }
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div class="relative rounded-md bg-(--color-ink) text-(--color-bg)">
    <pre class="overflow-x-auto whitespace-pre-wrap break-words p-3 pr-20 font-mono text-[13px] leading-relaxed">{{ text }}</pre>
    <button
      type="button"
      class="absolute right-2 top-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-(--color-bg)/80 hover:text-(--color-bg)"
      :aria-label="copied ? t('extensions.copied') : t('extensions.copy')"
      @click="copy"
    >
      <component :is="copied ? Check : Copy" :size="12" aria-hidden="true" />
      {{ copied ? t("extensions.copied") : t("extensions.copy") }}
    </button>
  </div>
</template>
