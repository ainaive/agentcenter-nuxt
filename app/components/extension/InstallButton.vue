<script setup lang="ts">
import { Download, Check } from "lucide-vue-next"

const props = defineProps<{ extensionId: string; size?: "sm" | "md" | "lg" }>()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

// Shared with the "Direct download" method so the two can't double-count.
const { installed, pending, isAuthed, record } = useInstallState(props.extensionId)

async function handleClick() {
  if (pending.value || installed.value) return
  if (!isAuthed.value) {
    await router.push(localePath("/sign-in"))
    return
  }
  await record()
}

const sizeClass = computed(() => {
  if (props.size === "sm") return "px-2 py-1 text-[11px] gap-1"
  if (props.size === "lg") return "px-4 py-2 text-[14px] gap-1.5"
  return "px-3 py-1.5 text-[12px] gap-1"
})
const iconSize = computed(() => (props.size === "lg" ? 14 : 12))
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center rounded font-semibold transition"
    :class="[
      sizeClass,
      installed
        ? 'bg-(--color-accent)/10 text-(--color-accent)'
        : 'bg-(--color-accent) text-(--color-accent-fg) hover:opacity-90',
      pending && 'opacity-60',
    ]"
    :disabled="pending"
    @click.stop.prevent="handleClick"
  >
    <Check v-if="installed" :size="iconSize" aria-hidden="true" />
    <Download v-else :size="iconSize" aria-hidden="true" />
    <span>{{ installed ? t("common.installed") : (pending ? t("common.installing") : t("common.install")) }}</span>
  </button>
</template>
