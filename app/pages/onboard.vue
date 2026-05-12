<script setup lang="ts">
import { DEPARTMENTS } from "~~/shared/data/departments"
import type { Department, Locale } from "~~/shared/types"

const { t, locale } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const selected = ref<string>("")
const error = ref<string | null>(null)
const loading = ref(false)

interface Option {
  id: string
  label: string
  depth: number
}

function flatten(list: Department[], depth: number, out: Option[], lc: Locale): Option[] {
  for (const d of list) {
    out.push({ id: d.id, label: lc === "zh" ? d.nameZh : d.name, depth })
    if (d.children) flatten(d.children, depth + 1, out, lc)
  }
  return out
}

const options = computed<Option[]>(() => flatten(DEPARTMENTS, 0, [], locale.value as Locale))

async function handleSubmit() {
  if (!selected.value) return
  error.value = null
  loading.value = true
  try {
    await $fetch("/api/internal/onboard", {
      method: "POST",
      body: { deptId: selected.value },
    })
    await router.push(localePath("/"))
  } catch {
    error.value = t("auth.signIn.errorGeneric")
  } finally {
    loading.value = false
  }
}

async function handleSkip() {
  await router.push(localePath("/"))
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center px-4 py-20">
    <div class="w-full max-w-[460px] rounded-xl border border-(--color-border) bg-(--color-card) p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div class="mb-7 text-center">
        <h1 class="font-serif text-2xl tracking-tight text-(--color-ink)">{{ t("auth.onboard.title") }}</h1>
        <p class="mt-1.5 text-[13px] text-(--color-ink-muted)">{{ t("auth.onboard.subtitle") }}</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <label class="flex flex-col gap-1.5">
          <select
            v-model="selected"
            required
            class="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-[13px] outline-none transition focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
          >
            <option value="">{{ t("auth.onboard.placeholder") }}</option>
            <option v-for="opt in options" :key="opt.id" :value="opt.id">
              {{ "—".repeat(opt.depth) }}{{ opt.depth > 0 ? " " : "" }}{{ opt.label }}
            </option>
          </select>
        </label>

        <p v-if="error" class="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600">{{ error }}</p>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="loading || !selected"
            class="flex-1 rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-fg) transition hover:opacity-90 disabled:opacity-60"
          >
            {{ loading ? "…" : t("auth.onboard.submit") }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-(--color-border) px-4 py-2 text-[13px] font-semibold text-(--color-ink-muted) transition hover:text-(--color-ink)"
            @click="handleSkip"
          >
            {{ t("auth.onboard.skip") }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
