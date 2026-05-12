<script setup lang="ts">
import { Download, Check } from "lucide-vue-next"

const props = defineProps<{ extensionId: string; size?: "sm" | "md" }>()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const auth = useAuth()

const session = auth.useSession()
const loading = ref(false)
const installed = ref(false)

async function handleClick() {
  if (loading.value || installed.value) return
  if (!session.value.data?.user) {
    await router.push(localePath("/sign-in"))
    return
  }
  loading.value = true
  try {
    await $fetch("/api/internal/installs", {
      method: "POST",
      body: { extensionId: props.extensionId },
    })
    installed.value = true
  } catch (err) {
    console.error("install failed", err)
  } finally {
    loading.value = false
  }
}

const sizeClass = computed(() =>
  props.size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]",
)
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded font-semibold transition"
    :class="[
      sizeClass,
      installed
        ? 'bg-(--color-accent)/10 text-(--color-accent)'
        : 'bg-(--color-accent) text-(--color-accent-fg) hover:opacity-90',
      loading && 'opacity-60',
    ]"
    :disabled="loading"
    @click.stop.prevent="handleClick"
  >
    <Check v-if="installed" :size="12" aria-hidden="true" />
    <Download v-else :size="12" aria-hidden="true" />
    <span>{{ installed ? t("common.installed") : (loading ? t("common.installing") : t("common.install")) }}</span>
  </button>
</template>
