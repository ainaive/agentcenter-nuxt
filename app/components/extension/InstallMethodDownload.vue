<script setup lang="ts">
import { Download } from "lucide-vue-next"
import type { ExtensionCategory } from "~~/shared/types"

const props = defineProps<{
  slug: string
  category: ExtensionCategory
  bundleUrl: string
  destPath: string
  extensionId: string
}>()

const { t } = useI18n()

// Shared with the hero InstallButton: record() no-ops when the user is signed
// out or the extension is already recorded this session, so clicking download
// never double-counts but the anchor still downloads regardless.
const { record } = useInstallState(props.extensionId)

const steps = computed(() =>
  t(`extensions.install.download.steps.${props.category}`, {
    destPath: props.destPath,
    slug: props.slug,
  }),
)
</script>

<template>
  <div class="space-y-4">
    <p class="text-[13px] text-(--color-ink-muted)">
      {{ t("extensions.install.download.hint") }}
    </p>
    <Button as-child variant="outline">
      <a :href="bundleUrl" download @click="record()">
        <Download :size="14" aria-hidden="true" />
        {{ t("extensions.install.download.button") }}
      </a>
    </Button>
    <div class="rounded-md border border-(--color-border) bg-(--color-card) p-4">
      <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-(--color-ink-muted)">
        {{ t("extensions.install.download.destLabel") }}
      </p>
      <code class="font-mono text-[13px] text-(--color-ink)">{{ destPath }}</code>
      <p class="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-(--color-ink-muted)">{{ steps }}</p>
    </div>
  </div>
</template>
