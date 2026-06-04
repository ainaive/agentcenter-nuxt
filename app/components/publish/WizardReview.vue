<script setup lang="ts">
import { CheckCircle, Clock } from "lucide-vue-next"
import type { PublishWizard, WizardStep } from "~/composables/usePublishWizard"
import type { Locale } from "~~/shared/types"
import { deptPath } from "~~/shared/data/departments"

const props = defineProps<{ wizard: PublishWizard }>()
const emit = defineEmits<{ (e: "jump", step: WizardStep): void }>()

const { t, locale } = useI18n()
const form = props.wizard.form

interface Row {
  label: string
  value: string
  step: WizardStep
}

function row(label: string, value: string | undefined | null, step: WizardStep): Row {
  return { label, value: value && value.length ? value : "—", step }
}

const deptLabel = computed(() =>
  form.deptId ? deptPath(form.deptId, locale.value as Locale).join(" / ") : "",
)

const sections = computed<Array<{ title: string; rows: Row[] }>>(() => [
  {
    title: t("publish.wizard.review.sectionBasics"),
    rows: [
      row(t("publish.fields.name"), form.name, 0),
      row(t("publish.fields.slug"), form.slug, 0),
      row(t("publish.fields.version"), form.version, 0),
      row(t("publish.fields.summary"), form.summary, 0),
      row(t("publish.fields.category"), t(`publish.options.category.${form.category}`), 0),
      row(t("publish.fields.scope"), t(`publish.options.scope.${form.scope}`), 0),
    ],
  },
  {
    title: t("publish.wizard.review.sectionBundle"),
    rows: [row(t("publish.fields.bundle"), props.wizard.bundleUploaded.value ? "✓" : "—", 1)],
  },
  {
    title: t("publish.wizard.review.sectionListing"),
    rows: [
      row(t("publish.wizard.listing.tagsLabel"), form.tagIds.length ? form.tagIds.join(", ") : "—", 2),
      row(t("publish.wizard.listing.deptLabel"), deptLabel.value, 2),
    ],
  },
])

const isPersonal = computed(() => form.scope === "personal")
</script>

<template>
  <div class="space-y-6">
    <header>
      <h2 class="font-serif text-xl text-(--color-ink)">
        {{ t("publish.wizard.review.title") }}
      </h2>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("publish.wizard.review.subtitle") }}
      </p>
    </header>

    <div
      v-for="section in sections"
      :key="section.title"
      class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card)"
    >
      <div class="px-4 pb-2 pt-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-(--color-ink)">
        {{ section.title }}
      </div>
      <div
        v-for="r in section.rows"
        :key="r.label"
        class="grid grid-cols-[140px_1fr_auto] items-start gap-3 border-t border-(--color-border) px-4 py-2.5"
      >
        <span class="text-[12px] font-medium text-(--color-ink-muted)">{{ r.label }}</span>
        <span class="text-[13px] text-(--color-ink) truncate">{{ r.value }}</span>
        <button
          type="button"
          class="text-[11.5px] font-semibold text-(--color-accent) underline-offset-4 hover:underline"
          @click="emit('jump', r.step)"
        >
          {{ t("publish.wizard.review.edit") }}
        </button>
      </div>
    </div>

    <div
      class="flex items-center gap-3 rounded-lg border px-4 py-3.5"
      :class="isPersonal
        ? 'border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-200'
        : 'border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-200'"
    >
      <CheckCircle v-if="isPersonal" :size="20" class="shrink-0" aria-hidden="true" />
      <Clock v-else :size="20" class="shrink-0" aria-hidden="true" />
      <div class="flex flex-col gap-0.5">
        <span class="text-[12.5px] font-semibold">
          {{ t("publish.wizard.review.publishTo") }}: {{ t(`publish.options.scope.${form.scope}`) }}
        </span>
        <span class="text-[12px]">
          {{ isPersonal ? t("publish.wizard.review.statusAuto") : t("publish.wizard.review.statusReview") }}
        </span>
      </div>
    </div>

    <p class="text-[11.5px] text-(--color-ink-muted)">{{ t("publish.wizard.review.termsHint") }}</p>
  </div>
</template>
