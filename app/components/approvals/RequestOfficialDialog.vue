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

const { t, te, locale } = useI18n()

const open = ref(false)
const tier = ref<Tier>("productLine")
const subCat = ref<string>(props.currentSubCat ?? "")
const productLineId = ref<string>("")
const reason = ref("")
const busy = ref(false)
const error = ref<string | null>(null)

// Product line list is small (4 rows) and seldom changes — fetch once
// when the dialog opens and reuse the same ref. The endpoint requires a
// signed-in user, so anonymous trigger taps still work (the dialog gates
// on its own enclosing auth).
interface ProductLine {
  id: string
  labelEn: string
  labelZh: string
  sortOrder: number
}
const productLines = ref<ProductLine[]>([])
const productLinesLoaded = ref(false)
const productLinesError = ref<string | null>(null)

async function ensureProductLines() {
  if (productLinesLoaded.value) return
  try {
    const res = await $fetch("/api/internal/product-lines")
    productLines.value = res.productLines
    productLinesLoaded.value = true
  } catch (err) {
    console.error("[approvals] failed to load product lines", err)
    productLinesError.value = t("approvals.dialog.productLinesError")
  }
}

watch(open, (next) => {
  if (next) {
    tier.value = "productLine"
    subCat.value = props.currentSubCat ?? ""
    productLineId.value = ""
    reason.value = ""
    error.value = null
    productLinesError.value = null
    void ensureProductLines()
  }
})

// Clear productLineId on tier change so a stale value can't ride
// along on a company-tier submit and trip `unexpected_product_line`.
watch(tier, (next) => {
  if (next === "company") productLineId.value = ""
})

const canSubmit = computed(() => {
  if (busy.value) return false
  if (subCat.value.length === 0) return false
  if (tier.value === "productLine" && productLineId.value.length === 0) {
    return false
  }
  return true
})

const orderedLines = computed(() =>
  [...productLines.value].sort((a, b) => a.sortOrder - b.sortOrder),
)

function lineLabel(line: ProductLine): string {
  return locale.value === "zh" ? line.labelZh : line.labelEn
}

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
        productLineId:
          tier.value === "productLine" ? productLineId.value : undefined,
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
    // `t(key, fallback)` doesn't fall back — vue-i18n's second arg is
    // interpolation values, not a default. Probe with `te()` before
    // looking up the per-code message, otherwise surface the generic
    // copy.
    const key = status ? `approvals.errors.${status}` : null
    error.value =
      key && te(key) ? t(key) : t("approvals.errors.generic")
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

        <div v-if="tier === 'productLine'">
          <Label for="approvals-productLine" class="text-xs font-medium">
            {{ t("approvals.dialog.productLineLabel") }}
          </Label>
          <select
            id="approvals-productLine"
            v-model="productLineId"
            class="mt-1 block w-full rounded-md border border-(--color-border) bg-(--color-card) p-2 text-sm text-(--color-ink) focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40"
          >
            <option value="" disabled>
              {{ t("approvals.dialog.productLinePlaceholder") }}
            </option>
            <option
              v-for="line in orderedLines"
              :key="line.id"
              :value="line.id"
            >
              {{ lineLabel(line) }}
            </option>
          </select>
          <p
            v-if="productLinesError"
            class="mt-1 text-xs text-red-600"
          >
            {{ productLinesError }}
          </p>
        </div>

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
