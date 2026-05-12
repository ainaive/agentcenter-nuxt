<script setup lang="ts">
import { Check } from "lucide-vue-next"

definePageMeta({ middleware: ["require-auth"] })

const { t } = useI18n()

const code = ref("")
const loading = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

async function handleSubmit() {
  const trimmed = code.value.trim()
  if (!trimmed) return
  error.value = null
  loading.value = true
  try {
    const result = await $fetch("/api/internal/device-authorize", {
      method: "POST",
      body: { userCode: trimmed },
    })
    if (result.ok) {
      success.value = true
    } else if (result.error === "invalid_code") {
      error.value = t("cliAuth.errorInvalid")
    } else if (result.error === "expired") {
      error.value = t("cliAuth.errorExpired")
    } else {
      error.value = t("cliAuth.errorGeneric")
    }
  } catch {
    error.value = t("cliAuth.errorGeneric")
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center px-4 py-20">
    <div class="w-full max-w-[420px] rounded-xl border border-(--color-border) bg-(--color-card) p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div class="mb-7 text-center">
        <h1 class="font-serif text-2xl tracking-tight text-(--color-ink)">{{ t("cliAuth.title") }}</h1>
        <p class="mt-1.5 text-[13px] text-(--color-ink-muted)">{{ t("cliAuth.subtitle") }}</p>
      </div>

      <div v-if="success" class="flex flex-col items-center gap-3 py-4 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-(--color-accent)/10">
          <Check :size="24" class="text-(--color-accent)" />
        </div>
        <p class="text-[14px] font-semibold text-(--color-ink)">{{ t("cliAuth.success") }}</p>
      </div>

      <form v-else class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <input
          v-model="code"
          type="text"
          :placeholder="t('cliAuth.codePlaceholder')"
          maxlength="9"
          autocomplete="one-time-code"
          class="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-center font-mono text-[18px] font-bold tracking-[0.2em] outline-none transition focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
          @input="code = ($event.target as HTMLInputElement).value.toUpperCase()"
        >

        <p v-if="error" class="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading || code.length < 9"
          class="w-full rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-fg) transition hover:opacity-90 disabled:opacity-50"
        >
          {{ loading ? "…" : t("cliAuth.submit") }}
        </button>
      </form>
    </div>
  </div>
</template>
