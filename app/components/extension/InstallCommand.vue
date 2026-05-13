<script setup lang="ts">
import { Check, Copy } from "lucide-vue-next"

const props = defineProps<{ command: string }>()

const { t } = useI18n()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  if (!navigator.clipboard) return
  try {
    await navigator.clipboard.writeText(props.command)
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
  <div class="flex items-center gap-2 rounded-md bg-(--color-ink) text-(--color-bg) p-3 font-mono text-sm">
    <span class="flex-1 truncate">$ {{ command }}</span>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-(--color-bg)/80 hover:text-(--color-bg)"
      :aria-label="copied ? t('extensions.copied') : t('extensions.copy')"
      @click="copy"
    >
      <component :is="copied ? Check : Copy" :size="12" aria-hidden="true" />
      {{ copied ? t("extensions.copied") : t("extensions.copy") }}
    </button>
  </div>
</template>
