<script setup lang="ts">
import { DEPARTMENTS } from "~~/shared/data/departments"
import type { Department } from "~~/shared/types"
import {
  PROFILE_BIO_MAX,
  PROFILE_NAME_MAX,
  ProfileFormSchema,
} from "~~/shared/validators/profile"

const props = defineProps<{
  initialName: string
  email: string
  initialDeptId: string
  initialBio: string
  createdAt: string
}>()

const emit = defineEmits<{ (e: "saved"): void }>()

const { t, locale } = useI18n()

const form = reactive({
  name: props.initialName,
  defaultDeptId: props.initialDeptId,
  bio: props.initialBio,
})

const status = ref<"idle" | "saving" | "saved" | "error">("idle")
const errorKey = ref<string | null>(null)

const joinedLabel = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  return fmt.format(new Date(props.createdAt))
})

// Flatten department tree for the select.
type Flat = { id: string; depth: number; label: string }
function flatten(list: Department[], depth: number, out: Flat[]) {
  for (const d of list) {
    const label = locale.value === "zh" ? d.nameZh : d.name
    out.push({ id: d.id, depth, label })
    if (d.children) flatten(d.children, depth + 1, out)
  }
}
const deptOptions = computed<Flat[]>(() => {
  const out: Flat[] = []
  flatten(DEPARTMENTS, 0, out)
  return out
})

async function onSubmit(event: Event) {
  event.preventDefault()
  errorKey.value = null
  const parsed = ProfileFormSchema.safeParse(form)
  if (!parsed.success) {
    status.value = "error"
    errorKey.value = "invalid_input"
    return
  }
  status.value = "saving"
  try {
    await $fetch("/api/internal/profile/update", {
      method: "POST",
      body: parsed.data,
    })
    status.value = "saved"
    emit("saved")
  } catch (err) {
    const data = (err as { data?: { statusMessage?: string }; statusCode?: number })
    status.value = "error"
    errorKey.value =
      data?.statusCode === 401
        ? "unauthenticated"
        : data?.data?.statusMessage ?? "generic"
  }
}
</script>

<template>
  <form
    class="space-y-5 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6"
    @submit="onSubmit"
  >
    <div class="grid gap-4 md:grid-cols-2">
      <PubField :label="t('profile.settings.fields.name')" required>
        <Input v-model="form.name" :maxlength="PROFILE_NAME_MAX" />
      </PubField>

      <PubField :label="t('profile.settings.fields.email')">
        <Input :model-value="email" disabled />
      </PubField>

      <PubField :label="t('profile.settings.fields.dept')">
        <select
          v-model="form.defaultDeptId"
          class="h-9 w-full rounded-md border border-(--color-border) bg-(--color-card) px-3 text-sm text-(--color-ink)"
        >
          <option value="">{{ t("profile.settings.deptPlaceholder") }}</option>
          <option
            v-for="opt in deptOptions"
            :key="opt.id"
            :value="opt.id"
          >
            {{ "└ ".repeat(opt.depth) }}{{ opt.label }}
          </option>
        </select>
      </PubField>

      <PubField :label="t('profile.settings.fields.joined')">
        <Input :model-value="joinedLabel" disabled />
      </PubField>
    </div>

    <PubField :label="t('profile.settings.fields.bio')">
      <Textarea v-model="form.bio" :maxlength="PROFILE_BIO_MAX" rows="3" />
    </PubField>

    <div class="flex items-center justify-between gap-3 border-t border-(--color-border) pt-4">
      <p
        v-if="status === 'saved'"
        class="text-sm text-emerald-600"
      >
        {{ t("profile.settings.saved") }}
      </p>
      <p
        v-else-if="errorKey"
        class="text-sm text-red-600"
      >
        {{ t(`profile.errors.${errorKey}`) }}
      </p>
      <span v-else />

      <Button :disabled="status === 'saving'" type="submit">
        {{ status === "saving" ? t("profile.settings.saving") : t("profile.settings.save") }}
      </Button>
    </div>
  </form>
</template>
