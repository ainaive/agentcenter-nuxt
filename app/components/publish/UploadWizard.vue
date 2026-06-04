<script setup lang="ts">
import { Check, ChevronLeft } from "lucide-vue-next"
import type { WizardInit, WizardStep } from "~/composables/usePublishWizard"
import { usePublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ init?: WizardInit }>()

const { t } = useI18n()
const localePath = useLocalePath()

const wizard = usePublishWizard(props.init ?? {})

const isEdit = Boolean(props.init?.extensionId)

const STEPS: Array<{ index: WizardStep; key: string }> = [
  { index: 0, key: "basics" },
  { index: 1, key: "bundle" },
  { index: 2, key: "listing" },
  { index: 3, key: "review" },
]

const nextDisabled = computed(() => {
  if (wizard.busy.value) return true
  if (wizard.step.value === 0) return !wizard.basicsValid.value
  if (wizard.step.value === 1) return !wizard.bundleValid.value
  if (wizard.step.value === 2) return !wizard.listingValid.value
  if (wizard.step.value === 3) return !wizard.canSubmit.value
  return true
})

async function advance() {
  if (wizard.step.value === 0) await wizard.advanceFromBasics()
  else if (wizard.step.value === 1) wizard.advanceFromBundle()
  else if (wizard.step.value === 2) wizard.advanceFromListing()
  else if (wizard.step.value === 3) await wizard.submit()
}

function back() {
  if (wizard.step.value > 0 && wizard.step.value <= 3) {
    wizard.jumpTo((wizard.step.value - 1) as WizardStep)
  }
}

function jumpTo(step: WizardStep) {
  // Used by the rail and Review's per-row "Edit" links to jump back to an
  // earlier step. No validity check on purpose — those steps are only reachable
  // once every earlier step is valid, and submit re-validates before persisting.
  wizard.jumpTo(step)
}

function railClick(index: WizardStep) {
  if (index <= wizard.step.value) jumpTo(index)
}
</script>

<template>
  <!-- Success takes over the whole surface (no rail, header, or preview). -->
  <WizardSuccess v-if="wizard.step.value >= 4" :wizard="wizard" />

  <div v-else>
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between gap-5">
      <div>
        <NuxtLink
          :to="localePath('/publish')"
          class="mb-2 inline-flex items-center gap-1 text-[12.5px] text-(--color-ink-muted) hover:text-(--color-ink)"
        >
          <ChevronLeft aria-hidden="true" class="size-3" />
          {{ t("publish.wizard.backToDashboard") }}
        </NuxtLink>
        <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
          {{ isEdit ? t("publish.wizard.headerEdit") : t("publish.wizard.headerNew") }}
        </h1>
        <p class="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-(--color-ink-muted)">
          {{ t("publish.wizard.subtitle") }}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        :disabled="!wizard.canSaveDraft.value || wizard.busy.value"
        @click="wizard.saveDraft()"
      >
        {{ wizard.justSaved.value ? t("publish.wizard.saved") : t("publish.wizard.saveDraft") }}
      </Button>
    </div>

    <!-- Resume banner -->
    <div
      v-if="isEdit"
      class="mb-5 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) px-4 py-3"
    >
      <div class="text-[10.5px] font-bold uppercase tracking-wider text-(--color-ink-muted)">
        {{ t("publish.wizard.headerEdit") }}
      </div>
      <div class="mt-0.5 truncate text-[14px] font-semibold text-(--color-ink)">
        {{ wizard.form.name }}
      </div>
      <div class="mt-0.5 font-mono text-[11.5px] text-(--color-ink-muted)">
        {{ wizard.form.slug }} · v{{ wizard.form.version }}
      </div>
    </div>

    <div class="grid gap-7 lg:grid-cols-[200px_1fr_320px]">
      <!-- Step rail -->
      <ol class="hidden flex-col gap-1 lg:flex">
        <li v-for="(s, i) in STEPS" :key="s.key">
          <button
            type="button"
            :disabled="i > wizard.step.value"
            class="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors"
            :class="[
              wizard.step.value === s.index ? 'bg-(--color-sidebar)' : '',
              i > wizard.step.value ? 'cursor-not-allowed' : 'hover:bg-(--color-sidebar)/60',
            ]"
            @click="railClick(s.index)"
          >
            <span
              class="mt-0.5 inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold font-mono"
              :class="i <= wizard.step.value
                ? 'bg-(--color-accent) text-(--color-accent-fg)'
                : 'border-[1.5px] border-(--color-border) text-(--color-ink-muted)'"
            >
              <Check v-if="i < wizard.step.value" aria-hidden="true" class="size-3" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="flex flex-col">
              <span
                class="text-[13px]"
                :class="wizard.step.value === s.index
                  ? 'font-bold text-(--color-ink)'
                  : 'font-medium text-(--color-ink-muted)'"
              >
                {{ t(`publish.wizard.steps.${s.key}`) }}
              </span>
              <span class="text-[11px] leading-snug text-(--color-ink-muted)">
                {{ t(`publish.wizard.stepDescs.${s.key}`) }}
              </span>
            </span>
          </button>
        </li>
      </ol>

      <!-- Center form card -->
      <div
        class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) px-6 py-7 sm:px-8"
      >
        <WizardBasics v-if="wizard.step.value === 0" :wizard="wizard" />
        <WizardBundle v-else-if="wizard.step.value === 1" :wizard="wizard" />
        <WizardListing v-else-if="wizard.step.value === 2" :wizard="wizard" />
        <WizardReview
          v-else-if="wizard.step.value === 3"
          :wizard="wizard"
          @jump="jumpTo"
        />

        <!-- Error -->
        <div
          v-if="wizard.error.value"
          class="mt-4 rounded-md border border-red-300/40 bg-red-50/40 p-3 text-sm text-red-700 dark:bg-red-900/10"
        >
          <p class="font-medium">{{ t(`publish.errors.${wizard.error.value.msg}`, wizard.error.value.msg) }}</p>
          <p v-if="wizard.error.value.detail" class="mt-1 text-[12px]">{{ wizard.error.value.detail }}</p>
        </div>

        <!-- Navigation -->
        <div
          class="mt-7 flex items-center justify-between border-t border-(--color-border) pt-5"
        >
          <span class="text-[12px] text-(--color-ink-muted)">
            {{ t("publish.wizard.stepIndicator", { current: wizard.step.value + 1, total: STEPS.length }) }}
          </span>
          <div class="flex items-center gap-2">
            <Button
              v-if="wizard.step.value > 0"
              variant="ghost"
              :disabled="wizard.busy.value"
              @click="back"
            >
              {{ t("publish.wizard.back") }}
            </Button>
            <Button :disabled="nextDisabled" @click="advance">
              {{
                wizard.step.value === 3
                  ? t("publish.wizard.review.submit")
                  : t("publish.wizard.next")
              }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Live preview -->
      <aside class="sticky top-4 hidden self-start lg:block">
        <WizardLivePreview :form="wizard.form" />
      </aside>
    </div>
  </div>
</template>
