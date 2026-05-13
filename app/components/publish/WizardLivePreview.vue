<script setup lang="ts">
import type { ManifestFormValues } from "~~/shared/validators/manifest"
import { ICON_COLORS } from "~~/shared/data/icon-colors"

const props = defineProps<{
  form: ManifestFormValues
}>()

const { t } = useI18n()

const iconStyles = computed(() => {
  const palette = ICON_COLORS[props.form.iconColor]
  return { backgroundColor: palette.bg, color: palette.fg }
})

const initial = computed(() => (props.form.name || "?").charAt(0).toUpperCase())

const visibleTags = computed(() => props.form.tagIds.slice(0, 4))
const moreTags = computed(() => Math.max(0, props.form.tagIds.length - 4))

const manifestJson = computed(() => {
  const enabledPerms = Object.entries(props.form.permissions ?? {})
    .filter(([, on]) => on)
    .map(([k]) => k)
  const out: Record<string, unknown> = {
    name: props.form.slug || "your-extension",
    displayName: props.form.name || "Your Extension",
    type: props.form.category,
    version: props.form.version || "0.0.0",
    scope: props.form.scope,
    description: props.form.summary || "",
    tags: props.form.tagIds,
  }
  if (props.form.deptId) out.department = props.form.deptId
  if (enabledPerms.length) out.permissions = enabledPerms
  return JSON.stringify(out, null, 2)
})
</script>

<template>
  <aside class="space-y-4">
    <div>
      <h3 class="text-[11px] font-mono uppercase tracking-widest text-(--color-ink-muted) mb-2">
        {{ t("publish.preview.card") }}
      </h3>
      <div class="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-4">
        <div class="flex items-start gap-3">
          <div
            class="grid size-10 shrink-0 place-items-center rounded-md font-serif text-base font-semibold"
            :style="iconStyles"
          >
            {{ initial }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h4 class="truncate font-semibold text-(--color-ink)">
                {{ form.name || t("publish.preview.namePlaceholder") }}
              </h4>
              <span
                class="font-mono text-[10px] uppercase tracking-wide text-(--color-ink-muted)"
              >
                {{ form.category }}
              </span>
            </div>
            <p class="mt-1 text-sm text-(--color-ink-muted) line-clamp-2">
              {{ form.summary || t("publish.preview.summaryPlaceholder") }}
            </p>
            <div v-if="visibleTags.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="tag in visibleTags"
                :key="tag"
                class="rounded-full bg-(--color-sidebar) px-2 py-0.5 text-[10px] font-mono text-(--color-ink-muted)"
              >
                {{ tag }}
              </span>
              <span
                v-if="moreTags"
                class="rounded-full bg-(--color-sidebar) px-2 py-0.5 text-[10px] font-mono text-(--color-ink-muted)"
              >
                +{{ moreTags }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 class="text-[11px] font-mono uppercase tracking-widest text-(--color-ink-muted) mb-2">
        {{ t("publish.preview.manifest") }}
      </h3>
      <pre
        class="overflow-x-auto rounded-md border border-(--color-border) bg-(--color-sidebar) p-3 font-mono text-[11px] text-(--color-ink)"
      >{{ manifestJson }}</pre>
    </div>
  </aside>
</template>
