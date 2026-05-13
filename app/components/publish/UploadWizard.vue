<script setup lang="ts">
import type { WizardInit, WizardStep } from "~/composables/usePublishWizard"
import { usePublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ init?: WizardInit }>()

const { t } = useI18n()

const wizard = usePublishWizard(props.init ?? {})

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
  // Used by Review's per-row "Edit" links to jump back to an earlier step.
  // No validity check here on purpose — Review is only reachable when every
  // earlier step is valid, so the target step is always something the user
  // has already filled in. Submit re-validates everything before persisting.
  wizard.jumpTo(step)
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_320px]">
    <div>
      <!-- Step rail -->
      <ol
        v-if="wizard.step.value < 4"
        class="mb-6 flex items-center gap-2 text-[12px] text-(--color-ink-muted)"
      >
        <li
          v-for="(s, i) in STEPS"
          :key="s.key"
          class="flex items-center gap-2"
        >
          <span
            class="grid size-6 place-items-center rounded-full border text-[11px] font-mono"
            :class="wizard.step.value === s.index
              ? 'border-(--color-accent) bg-(--color-accent) text-(--color-accent-fg)'
              : wizard.step.value > s.index
                ? 'border-(--color-accent) text-(--color-accent)'
                : 'border-(--color-border)'"
          >
            {{ i + 1 }}
          </span>
          <span :class="wizard.step.value === s.index ? 'text-(--color-ink) font-medium' : ''">
            {{ t(`publish.wizard.steps.${s.key}`) }}
          </span>
          <span v-if="i < STEPS.length - 1" class="text-(--color-border)">→</span>
        </li>
      </ol>

      <!-- Steps -->
      <WizardBasics v-if="wizard.step.value === 0" :wizard="wizard" />
      <WizardBundle v-else-if="wizard.step.value === 1" :wizard="wizard" />
      <WizardListing v-else-if="wizard.step.value === 2" :wizard="wizard" />
      <WizardReview
        v-else-if="wizard.step.value === 3"
        :wizard="wizard"
        @jump="jumpTo"
      />
      <WizardSuccess v-else :wizard="wizard" />

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
        v-if="wizard.step.value < 4"
        class="mt-8 flex items-center justify-between border-t border-(--color-border) pt-4"
      >
        <Button
          v-if="wizard.step.value > 0"
          variant="ghost"
          :disabled="wizard.busy.value"
          @click="back"
        >
          {{ t("publish.wizard.back") }}
        </Button>
        <span v-else />
        <Button :disabled="nextDisabled" @click="advance">
          {{
            wizard.step.value === 3
              ? t("publish.wizard.review.submit")
              : t("publish.wizard.next")
          }}
        </Button>
      </div>
    </div>

    <WizardLivePreview v-if="wizard.step.value < 4" :form="wizard.form" />
  </div>
</template>
