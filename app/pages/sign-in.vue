<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const auth = useAuth()

const email = ref("")
const password = ref("")
const error = ref<string | null>(null)
const loading = ref(false)

async function handleSubmit() {
  error.value = null
  loading.value = true
  const result = await auth.signIn.email({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (result.error) {
    error.value = result.error.status === 401 ? t("auth.signIn.errorInvalid") : t("auth.signIn.errorGeneric")
    return
  }
  await router.push(localePath("/"))
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center px-4 py-20">
    <div class="w-full max-w-[380px] rounded-xl border border-(--color-border) bg-(--color-card) p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div class="mb-7 text-center">
        <h1 class="font-serif text-2xl tracking-tight text-(--color-ink)">{{ t("auth.signIn.title") }}</h1>
        <p class="mt-1.5 text-[13px] text-(--color-ink-muted)">{{ t("auth.signIn.subtitle") }}</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <label class="flex flex-col gap-1.5">
          <span class="text-[12.5px] font-semibold text-(--color-ink)">{{ t("auth.signIn.email") }}</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-[13px] outline-none transition focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
          >
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-[12.5px] font-semibold text-(--color-ink)">{{ t("auth.signIn.password") }}</span>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-[13px] outline-none transition focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
          >
        </label>

        <p v-if="error" class="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="mt-1 w-full rounded-lg bg-(--color-accent) py-2 text-[13px] font-semibold text-(--color-accent-fg) transition hover:opacity-90 disabled:opacity-60"
        >
          {{ loading ? "…" : t("auth.signIn.submit") }}
        </button>
      </form>

      <p class="mt-5 text-center text-[12.5px] text-(--color-ink-muted)">
        {{ t("auth.signIn.noAccount") }}
        <NuxtLink :to="localePath('/sign-up')" class="font-semibold text-(--color-accent) hover:underline">
          {{ t("auth.signIn.signUpLink") }}
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
