<script setup lang="ts">
const props = defineProps<{
  extensionId: string
  extensionName: string
}>()

const emit = defineEmits<{ (e: "discarded"): void }>()

const { t } = useI18n()
const busy = ref(false)

async function handleClick() {
  if (busy.value) return
  if (!confirm(t("publish.confirmDiscard"))) return
  busy.value = true
  try {
    await $fetch("/api/internal/publish/discard", {
      method: "POST",
      body: { extensionId: props.extensionId },
    })
    emit("discarded")
  } catch (err) {
    console.error("[publish] discard failed", err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    :disabled="busy"
    :aria-label="`${t('publish.discard')} ${extensionName}`"
    class="text-xs text-(--color-ink-muted) hover:text-red-600 disabled:opacity-50"
    @click="handleClick"
  >
    {{ t("publish.discard") }}
  </button>
</template>
