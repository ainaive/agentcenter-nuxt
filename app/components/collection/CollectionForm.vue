<script setup lang="ts">
import Input from "~/components/ui/Input.vue"

import {
  COLLECTION_DESC_MAX,
  COLLECTION_NAME_MAX,
} from "~~/shared/validators/collection"

const props = defineProps<{
  initialName?: string
  initialNameZh?: string | null
  initialDescription?: string | null
  initialDescriptionZh?: string | null
  initialVisibility?: "private" | "public"
  busy?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{
  submit: [
    payload: {
      name: string
      nameZh?: string
      description?: string
      descriptionZh?: string
      visibility: "private" | "public"
    },
  ]
  cancel: []
}>()

const { t } = useI18n()

const name = ref(props.initialName ?? "")
const nameZh = ref(props.initialNameZh ?? "")
const description = ref(props.initialDescription ?? "")
const descriptionZh = ref(props.initialDescriptionZh ?? "")
const visibility = ref<"private" | "public">(props.initialVisibility ?? "private")

const canSubmit = computed(() => name.value.trim().length > 0 && !props.busy)

function onSubmit(event: Event) {
  event.preventDefault()
  if (!canSubmit.value) return
  emit("submit", {
    name: name.value.trim(),
    nameZh: nameZh.value.trim() || undefined,
    description: description.value.trim() || undefined,
    descriptionZh: descriptionZh.value.trim() || undefined,
    visibility: visibility.value,
  })
}
</script>

<template>
  <form class="grid gap-4" @submit="onSubmit">
    <div class="grid gap-1.5">
      <label class="text-sm font-medium text-(--color-ink)" for="col-name">
        {{ t("collections.form.nameLabel") }}
      </label>
      <Input
        id="col-name"
        v-model="name"
        :placeholder="t('collections.form.namePlaceholder')"
        :maxlength="COLLECTION_NAME_MAX"
      />
    </div>

    <div class="grid gap-1.5">
      <label class="text-sm font-medium text-(--color-ink)" for="col-name-zh">
        {{ t("collections.form.nameZhLabel") }}
      </label>
      <Input
        id="col-name-zh"
        v-model="nameZh"
        :placeholder="t('collections.form.nameZhPlaceholder')"
        :maxlength="COLLECTION_NAME_MAX"
      />
    </div>

    <div class="grid gap-1.5">
      <label class="text-sm font-medium text-(--color-ink)" for="col-desc">
        {{ t("collections.form.descriptionLabel") }}
      </label>
      <textarea
        id="col-desc"
        v-model="description"
        rows="3"
        :placeholder="t('collections.form.descriptionPlaceholder')"
        :maxlength="COLLECTION_DESC_MAX"
        class="rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40"
      />
    </div>

    <div class="grid gap-1.5">
      <label class="text-sm font-medium text-(--color-ink)" for="col-desc-zh">
        {{ t("collections.form.descriptionZhLabel") }}
      </label>
      <textarea
        id="col-desc-zh"
        v-model="descriptionZh"
        rows="3"
        :placeholder="t('collections.form.descriptionZhPlaceholder')"
        :maxlength="COLLECTION_DESC_MAX"
        class="rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40"
      />
    </div>

    <fieldset class="grid gap-2">
      <legend class="text-sm font-medium text-(--color-ink)">
        {{ t("collections.form.visibilityLabel") }}
      </legend>
      <p class="text-xs text-(--color-ink-muted)">
        {{ t("collections.form.visibilityHelp") }}
      </p>
      <label class="flex items-center gap-2 text-sm text-(--color-ink)">
        <input v-model="visibility" type="radio" value="private">
        {{ t("collections.detail.visibilityPrivate") }}
      </label>
      <label class="flex items-center gap-2 text-sm text-(--color-ink)">
        <input v-model="visibility" type="radio" value="public">
        {{ t("collections.detail.visibilityPublic") }}
      </label>
    </fieldset>

    <div class="flex items-center justify-end gap-2">
      <button
        type="button"
        class="rounded-md border border-(--color-border) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
        @click="emit('cancel')"
      >
        {{ t("collections.actions.cancel") }}
      </button>
      <button
        type="submit"
        :disabled="!canSubmit"
        class="rounded-md border border-(--color-accent) bg-(--color-accent) px-3 py-1.5 text-sm text-(--color-accent-fg) disabled:opacity-50"
      >
        {{ submitLabel ?? t("collections.actions.save") }}
      </button>
    </div>
  </form>
</template>
