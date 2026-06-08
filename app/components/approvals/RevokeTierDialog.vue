<script setup lang="ts">
import { Loader2 } from "lucide-vue-next"

import { REVOKE_NOTE_MAX } from "~~/shared/validators/approvals"

// Super-admin Revoke action confirm dialog. Mirrors the shape of
// RequestOfficialDialog (note + submit + localized error mapping) but
// inverts the polarity: the super-admin is demoting, not requesting.
// The detail page hosts the dialog so it can refresh its useFetch on
// `revoked` and watch the badge disappear in one re-render.

const props = defineProps<{
  open: boolean
  extensionId: string
  extensionName: string
}>()

const emit = defineEmits<{
  (e: "update:open", value: boolean): void
  (e: "revoked"): void
}>()

const { t, te } = useI18n()

const note = ref("")
const busy = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.open,
  (next) => {
    if (next) {
      note.value = ""
      busy.value = false
      error.value = null
    }
  },
)

const canSubmit = computed(() => note.value.trim().length > 0 && !busy.value)

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (!canSubmit.value) return
  busy.value = true
  error.value = null
  try {
    await $fetch("/api/internal/approvals/revoke", {
      method: "POST",
      body: {
        extensionId: props.extensionId,
        note: note.value.trim(),
      },
    })
    emit("revoked")
    emit("update:open", false)
  } catch (err) {
    const status =
      err && typeof err === "object" && "statusMessage" in err
        ? String((err as { statusMessage: unknown }).statusMessage)
        : null
    const key = status ? `approvals.errors.${status}` : null
    error.value = key && te(key) ? t(key) : t("approvals.errors.generic")
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <DialogTitle class="font-serif text-lg text-(--color-ink)">
        {{ t("approvals.revoke.title") }}
      </DialogTitle>
      <DialogDescription class="text-sm text-(--color-ink-muted)">
        {{ t("approvals.revoke.subtitle", { name: extensionName }) }}
      </DialogDescription>

      <form class="space-y-4" @submit="handleSubmit">
        <div>
          <Label for="revoke-note" class="text-xs font-medium">
            {{ t("approvals.revoke.noteLabel") }}
          </Label>
          <Textarea
            id="revoke-note"
            v-model="note"
            :maxlength="REVOKE_NOTE_MAX"
            :placeholder="t('approvals.revoke.notePlaceholder')"
            rows="3"
            class="mt-1 w-full"
          />
          <p class="mt-1 text-right text-xs text-(--color-ink-muted)">
            {{ note.length }} / {{ REVOKE_NOTE_MAX }}
          </p>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <div class="flex items-center justify-end gap-2">
          <DialogClose as-child>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm text-(--color-ink-muted) hover:text-(--color-ink)"
            >
              {{ t("approvals.revoke.cancel") }}
            </button>
          </DialogClose>
          <button
            type="submit"
            :disabled="!canSubmit"
            class="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Loader2 v-if="busy" class="size-3.5 animate-spin" aria-hidden="true" />
            {{ t("approvals.revoke.confirm") }}
          </button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
