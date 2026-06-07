<script setup lang="ts">
import { Award, Building2, Loader2 } from "lucide-vue-next"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"
import { APPROVAL_REASON_MAX } from "~~/shared/validators/approvals"

type Tier = "productLine" | "company"

const props = defineProps<{
  extensionId: string
  extensionName: string
  currentSubCat: string | null
}>()

const emit = defineEmits<{
  (e: "submitted"): void
}>()

const { t } = useI18n()

const open = ref(false)
const tier = ref<Tier>("productLine")
const subCat = ref<string>(props.currentSubCat ?? "")
const reason = ref("")
const busy = ref(false)
const error = ref<string | null>(null)

watch(open, (next) => {
  if (next) {
    tier.value = "productLine"
    subCat.value = props.currentSubCat ?? ""
    reason.value = ""
    error.value = null
  }
})

const canSubmit = computed(
  () => subCat.value.length > 0 && !busy.value,
)

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (!canSubmit.value) return
  busy.value = true
  error.value = null
  try {
    await $fetch("/api/internal/approvals/submit", {
      method: "POST",
      body: {
        extensionId: props.extensionId,
        requestedTier: tier.value,
        subCat: subCat.value,
        reason: reason.value.trim() || undefined,
      },
    })
    open.value = false
    emit("submitted")
  } catch (err) {
    const status =
      err && typeof err === "object" && "statusMessage" in err
        ? String((err as { statusMessage: unknown }).statusMessage)
        : null
    error.value =
      status && status.length > 0
        ? t(`approvals.errors.${status}`, t("approvals.errors.generic"))
        : t("approvals.errors.generic")
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <button
        type="button"
        class="rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-xs font-semibold text-(--color-ink) hover:bg-(--color-sidebar)/60"
      >
        {{ t("approvals.applyForOfficial") }}
      </button>
    </DialogTrigger>

    <DialogContent class="max-w-md">
      <DialogTitle class="font-serif text-lg text-(--color-ink)">
        {{ t("approvals.dialog.title") }}
      </DialogTitle>
      <DialogDescription class="text-sm text-(--color-ink-muted)">
        {{ t("approvals.dialog.subtitle", { name: extensionName }) }}
      </DialogDescription>

      <form class="space-y-4" @submit="handleSubmit">
        <fieldset>
          <legend class="mb-2 text-xs font-medium text-(--color-ink)">
            {{ t("approvals.dialog.tierLabel") }}
          </legend>
          <div class="grid grid-cols-2 gap-2">
            <label
              class="cursor-pointer rounded-md border p-3 text-sm transition-colors"
              :class="
                tier === 'productLine'
                  ? 'border-(--color-ink) bg-(--color-sidebar)/40 font-semibold'
                  : 'border-(--color-border) hover:bg-(--color-sidebar)/30'
              "
            >
              <input
                v-model="tier"
                type="radio"
                value="productLine"
                class="sr-only"
              >
              <Award class="mb-1 size-4 text-(--color-ink-muted)" aria-hidden="true" />
              <span class="block">{{ t("approvals.tier.productLine") }}</span>
              <span class="text-xs text-(--color-ink-muted)">
                {{ t("approvals.dialog.tierProductLineDesc") }}
              </span>
            </label>
            <label
              class="cursor-pointer rounded-md border p-3 text-sm transition-colors"
              :class="
                tier === 'company'
                  ? 'border-(--color-ink) bg-(--color-sidebar)/40 font-semibold'
                  : 'border-(--color-border) hover:bg-(--color-sidebar)/30'
              "
            >
              <input
                v-model="tier"
                type="radio"
                value="company"
                class="sr-only"
              >
              <Building2 class="mb-1 size-4 text-(--color-ink-muted)" aria-hidden="true" />
              <span class="block">{{ t("approvals.tier.company") }}</span>
              <span class="text-xs text-(--color-ink-muted)">
                {{ t("approvals.dialog.tierCompanyDesc") }}
              </span>
            </label>
          </div>
        </fieldset>

        <div>
          <Label for="approvals-subCat" class="text-xs font-medium">
            {{ t("approvals.dialog.subCatLabel") }}
          </Label>
          <select
            id="approvals-subCat"
            v-model="subCat"
            class="mt-1 block w-full rounded-md border border-(--color-border) bg-(--color-card) p-2 text-sm text-(--color-ink) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40"
          >
            <option value="" disabled>
              {{ t("approvals.dialog.subCatPlaceholder") }}
            </option>
            <optgroup
              v-for="cat in FUNC_TAXONOMY"
              :key="cat.key"
              :label="t(`taxonomy.funcCat.${cat.key}`)"
            >
              <option
                v-for="leaf in cat.l1"
                :key="leaf.key"
                :value="leaf.key"
              >
                {{ t(`taxonomy.l1.${leaf.key}`) }}
              </option>
            </optgroup>
          </select>
          <p
            v-if="!currentSubCat"
            class="mt-1 text-xs text-(--color-ink-muted)"
          >
            {{ t("approvals.dialog.subCatHint") }}
          </p>
        </div>

        <div>
          <Label for="approvals-reason" class="text-xs font-medium">
            {{ t("approvals.dialog.reasonLabel") }}
          </Label>
          <Textarea
            id="approvals-reason"
            v-model="reason"
            :maxlength="APPROVAL_REASON_MAX"
            :placeholder="t('approvals.dialog.reasonPlaceholder')"
            rows="3"
            class="mt-1 w-full"
          />
          <p class="mt-1 text-right text-xs text-(--color-ink-muted)">
            {{ reason.length }} / {{ APPROVAL_REASON_MAX }}
          </p>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <div class="flex items-center justify-end gap-2">
          <DialogClose as-child>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              {{ t("approvals.dialog.cancel") }}
            </button>
          </DialogClose>
          <button
            type="submit"
            :disabled="!canSubmit"
            class="inline-flex items-center gap-2 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-semibold text-(--color-accent-fg) hover:opacity-90 disabled:opacity-50"
          >
            <Loader2 v-if="busy" class="size-3.5 animate-spin" aria-hidden="true" />
            {{ t("approvals.dialog.submit") }}
          </button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
