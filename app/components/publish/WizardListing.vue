<script setup lang="ts">
import type { PublishWizard } from "~/composables/usePublishWizard"
import { ICON_COLOR_KEYS, ICON_COLORS, type IconColor } from "~~/shared/data/icon-colors"

const props = defineProps<{ wizard: PublishWizard }>()

const { t } = useI18n()
const form = props.wizard.form

const SUGGESTED_TAGS = ["stable", "beta", "official", "ai", "search", "data", "productivity"]
const TAG_LIMIT = 8

const tagInput = ref("")

function addTag(raw: string) {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "-")
  if (!trimmed) return
  if (form.tagIds.length >= TAG_LIMIT) return
  if (form.tagIds.includes(trimmed)) return
  form.tagIds.push(trimmed)
  tagInput.value = ""
}

function removeTag(tag: string) {
  form.tagIds = form.tagIds.filter((t) => t !== tag)
}

function onTagKey(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault()
    addTag(tagInput.value)
    return
  }
  if (event.key === "Backspace" && tagInput.value === "" && form.tagIds.length > 0) {
    form.tagIds.pop()
  }
}

const remainingSuggestions = computed(() =>
  SUGGESTED_TAGS.filter((s) => !form.tagIds.includes(s)),
)

const PERMISSION_KEYS = ["network", "files", "runtime", "data"] as const
type PermKey = (typeof PERMISSION_KEYS)[number]

function togglePerm(key: PermKey) {
  form.permissions = { ...form.permissions, [key]: !form.permissions[key] }
}

function setIconColor(color: IconColor) {
  form.iconColor = color
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h2 class="font-serif text-xl text-(--color-ink)">
        {{ t("publish.wizard.listing.title") }}
      </h2>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("publish.wizard.listing.subtitle") }}
      </p>
    </header>

    <PubField :label="t('publish.wizard.listing.iconLabel')">
      <div class="flex flex-wrap items-center gap-3">
        <div
          class="grid size-10 place-items-center rounded-md font-serif text-base font-semibold"
          :style="{
            backgroundColor: ICON_COLORS[form.iconColor].bg,
            color: ICON_COLORS[form.iconColor].fg,
          }"
        >
          {{ (form.name || "?").charAt(0).toUpperCase() }}
        </div>
        <div class="flex gap-2">
          <button
            v-for="key in ICON_COLOR_KEYS"
            :key="key"
            type="button"
            class="size-7 rounded-full border-2 transition-all"
            :class="form.iconColor === key
              ? 'border-(--color-ink) scale-110'
              : 'border-transparent'"
            :style="{ backgroundColor: ICON_COLORS[key].bg }"
            :aria-label="key"
            @click="setIconColor(key)"
          />
        </div>
      </div>
    </PubField>

    <PubField
      :label="t('publish.wizard.listing.tagsLabel')"
      :hint="t('publish.wizard.listing.tagsHint')"
      required
    >
      <div
        class="flex flex-wrap items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) p-2"
      >
        <span
          v-for="tag in form.tagIds"
          :key="tag"
          class="inline-flex items-center gap-1 rounded-full bg-(--color-accent)/10 px-2 py-0.5 text-[11px] text-(--color-accent)"
        >
          {{ tag }}
          <button
            type="button"
            class="text-[10px] hover:text-(--color-ink)"
            :aria-label="`remove ${tag}`"
            @click="removeTag(tag)"
          >
            ✕
          </button>
        </span>
        <input
          v-model="tagInput"
          type="text"
          :placeholder="form.tagIds.length >= TAG_LIMIT
            ? t('publish.wizard.listing.tagsLimit')
            : t('publish.wizard.listing.tagsPlaceholder')"
          :disabled="form.tagIds.length >= TAG_LIMIT"
          class="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-(--color-ink-muted)"
          @keydown="onTagKey"
        >
      </div>
      <div v-if="remainingSuggestions.length" class="mt-2 flex flex-wrap gap-1">
        <button
          v-for="s in remainingSuggestions"
          :key="s"
          type="button"
          class="rounded-full border border-(--color-border) px-2 py-0.5 text-[11px] text-(--color-ink-muted) hover:text-(--color-ink)"
          @click="addTag(s)"
        >
          + {{ s }}
        </button>
      </div>
    </PubField>

    <PubField
      :label="t('publish.wizard.listing.readmeLabel')"
      :hint="t('publish.wizard.listing.readmeHint')"
      required
    >
      <Textarea
        v-model="form.readmeMd"
        :class="'min-h-[200px] font-mono'"
        rows="10"
      />
    </PubField>

    <PubField :label="t('publish.wizard.listing.permissionsLabel')">
      <div class="grid gap-2 sm:grid-cols-2">
        <button
          v-for="key in PERMISSION_KEYS"
          :key="key"
          type="button"
          class="flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors"
          :class="form.permissions[key]
            ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
            : 'border-(--color-border) bg-(--color-card) text-(--color-ink) hover:border-(--color-accent)/40'"
          @click="togglePerm(key)"
        >
          <span>{{ t(`publish.wizard.listing.permissions.${key}`) }}</span>
          <span class="font-mono text-[11px]">
            {{ form.permissions[key] ? "✓" : "" }}
          </span>
        </button>
      </div>
    </PubField>
  </div>
</template>
