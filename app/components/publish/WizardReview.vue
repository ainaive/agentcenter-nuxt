<script setup lang="ts">
import { CheckCircle, Clock } from "lucide-vue-next"
import type { PublishWizard, WizardStep } from "~/composables/usePublishWizard"

const props = defineProps<{ wizard: PublishWizard }>()
const emit = defineEmits<{ (e: "jump", step: WizardStep): void }>()

const { t } = useI18n()
const form = props.wizard.form

function row(label: string, value: string | undefined | null, step: WizardStep) {
  return { label, value: value && value.length ? value : "—", step }
}

const rows = computed(() => [
  row(t("publish.fields.name"), form.name, 0),
  row(t("publish.fields.slug"), form.slug, 0),
  row(t("publish.fields.version"), form.version, 0),
  row(t("publish.fields.summary"), form.summary, 0),
  row(
    t("publish.fields.category"),
    t(`publish.options.category.${form.category}`),
    0,
  ),
  row(
    t("publish.fields.scope"),
    t(`publish.options.scope.${form.scope}`),
    0,
  ),
  row(t("publish.fields.bundle"), props.wizard.bundleUploaded.value ? "✓" : "—", 1),
  row(
    t("publish.wizard.listing.tagsLabel"),
    form.tagIds.length ? form.tagIds.join(", ") : "—",
    2,
  ),
  row(t("publish.wizard.listing.deptLabel"), form.deptId, 2),
])
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

    <dl class="divide-y divide-(--color-border) rounded-(--radius-card) border border-(--color-border) bg-(--color-card)">
      <div
        v-for="r in rows"
        :key="r.label"
        class="flex items-baseline justify-between gap-3 px-4 py-2.5"
      >
        <dt class="text-[12px] font-semibold uppercase tracking-wide text-(--color-ink-muted)">
          {{ r.label }}
        </dt>
        <dd class="flex items-center gap-2 text-sm text-(--color-ink)">
          <span class="truncate">{{ r.value }}</span>
          <button
            type="button"
            class="text-[11px] text-(--color-accent) underline-offset-4 hover:underline"
            @click="emit('jump', r.step)"
          >
            {{ t("publish.wizard.review.edit") }}
          </button>
        </dd>
      </div>
    </dl>

    <div
      v-if="form.scope === 'personal'"
      class="flex items-start gap-2 rounded-md border border-emerald-300/40 bg-emerald-50/40 p-3 text-sm text-(--color-ink) dark:bg-emerald-900/10"
    >
      <CheckCircle :size="16" class="mt-0.5 text-emerald-600" aria-hidden="true" />
      <p>{{ t("publish.wizard.review.personalNote") }}</p>
    </div>
    <div
      v-else
      class="flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50/40 p-3 text-sm text-(--color-ink) dark:bg-amber-900/10"
    >
      <Clock :size="16" class="mt-0.5 text-amber-600" aria-hidden="true" />
      <p>{{ t("publish.wizard.review.orgNote") }}</p>
    </div>

    <p class="text-[11.5px] text-(--color-ink-muted)">{{ t("publish.wizard.review.termsHint") }}</p>
  </div>
</template>
