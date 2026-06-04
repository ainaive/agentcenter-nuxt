<script setup lang="ts">
import { Check, X } from "lucide-vue-next"
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
      <div class="flex items-center gap-3.5">
        <div
          class="grid size-16 place-items-center rounded-2xl font-serif text-3xl font-bold"
          :style="{
            backgroundColor: ICON_COLORS[form.iconColor].bg,
            color: ICON_COLORS[form.iconColor].fg,
          }"
        >
          {{ (form.name || "?").charAt(0).toUpperCase() }}
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="key in ICON_COLOR_KEYS"
            :key="key"
            type="button"
            class="size-[22px] rounded-md transition-all"
            :class="form.iconColor === key
              ? 'ring-2 ring-(--color-ink) ring-offset-2 ring-offset-(--color-card)'
              : 'ring-1 ring-(--color-border)'"
            :style="{ backgroundColor: ICON_COLORS[key].bg }"
            :aria-label="key"
            :aria-pressed="form.iconColor === key"
            @click="setIconColor(key)"
          />
        </div>
      </div>
    </PubField>

    <PubField
      :label="t('publish.wizard.listing.tagsLabel')"
      :hint="t('publish.wizard.listing.tagsCount', { count: form.tagIds.length, max: TAG_LIMIT })"
      required
    >
      <div
        class="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) p-2"
      >
        <span
          v-for="tag in form.tagIds"
          :key="tag"
          class="inline-flex items-center gap-1.5 rounded-md bg-(--color-sidebar) py-1 pl-2.5 pr-1 font-mono text-[12px] font-semibold text-(--color-ink)"
        >
          {{ tag }}
          <button
            type="button"
            class="inline-flex p-0.5 hover:opacity-70"
            :aria-label="`remove ${tag}`"
            @click="removeTag(tag)"
          >
            <X aria-hidden="true" class="size-3" />
          </button>
        </span>
        <input
          v-model="tagInput"
          type="text"
          :placeholder="form.tagIds.length >= TAG_LIMIT
            ? t('publish.wizard.listing.tagsLimit')
            : t('publish.wizard.listing.tagsPlaceholder')"
          :disabled="form.tagIds.length >= TAG_LIMIT"
          class="min-w-[120px] flex-1 bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-(--color-ink-muted)"
          @keydown="onTagKey"
        >
      </div>
      <div v-if="remainingSuggestions.length" class="mt-2 flex flex-wrap gap-1">
        <button
          v-for="s in remainingSuggestions"
          :key="s"
          type="button"
          class="rounded border border-dashed border-(--color-border) px-2 py-0.5 font-mono text-[11px] text-(--color-ink-muted) transition-colors hover:border-(--color-ink)/40 hover:text-(--color-ink)"
          @click="addTag(s)"
        >
          + {{ s }}
        </button>
      </div>
    </PubField>

    <PubField :label="t('publish.wizard.listing.deptLabel')">
      <DeptDropdown v-model="form.deptId" />
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
          :aria-pressed="Boolean(form.permissions[key])"
          class="flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-all"
          :class="form.permissions[key]
            ? 'border-(--color-ink) bg-(--color-sidebar) font-semibold'
            : 'border-(--color-border) bg-(--color-card) hover:border-(--color-ink)/40'"
          @click="togglePerm(key)"
        >
          <span
            class="inline-flex size-4 shrink-0 items-center justify-center rounded border-[1.5px]"
            :class="form.permissions[key]
              ? 'border-(--color-ink) bg-(--color-ink)'
              : 'border-(--color-border) bg-transparent'"
          >
            <Check v-if="form.permissions[key]" aria-hidden="true" class="size-2.5 text-(--color-card)" />
          </span>
          <span class="text-[12.5px] text-(--color-ink)">{{ t(`publish.wizard.listing.permissions.${key}`) }}</span>
        </button>
      </div>
    </PubField>
  </div>
</template>
