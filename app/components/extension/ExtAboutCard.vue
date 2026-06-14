<script setup lang="ts">
import { ExternalLink, Github } from "lucide-vue-next"

const props = defineProps<{
  licenseSpdx: string | null
  scope: string
  publishedAt: string | null
  homepageUrl: string | null
  repoUrl: string | null
}>()

const { t } = useI18n()

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url
    return null
  } catch {
    return null
  }
}

const safeHomepage = computed(() => safeUrl(props.homepageUrl))
const safeRepo = computed(() => safeUrl(props.repoUrl))

const publishedLabel = computed(() => {
  if (!props.publishedAt) return null
  const d = new Date(props.publishedAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
})
</script>

<template>
  <Card padding="lg">
    <h2 class="font-serif text-base font-semibold tracking-tight mb-4 text-(--color-ink)">
      {{ t("extensions.about") }}
    </h2>
    <dl class="space-y-2.5 text-[13px]">
      <div v-if="licenseSpdx" class="flex justify-between">
        <dt class="text-(--color-ink-muted)">{{ t("extensions.license") }}</dt>
        <dd class="font-mono text-(--color-ink)">{{ licenseSpdx }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-(--color-ink-muted)">{{ t("extensions.scope") }}</dt>
        <dd class="text-(--color-ink) capitalize">{{ scope }}</dd>
      </div>
      <div v-if="publishedLabel" class="flex justify-between">
        <dt class="text-(--color-ink-muted)">{{ t("extensions.published") }}</dt>
        <dd class="font-mono text-(--color-ink)">{{ publishedLabel }}</dd>
      </div>
    </dl>
    <div
      v-if="safeHomepage || safeRepo"
      class="mt-5 pt-5 border-t border-(--color-border) space-y-2.5"
    >
      <a
        v-if="safeHomepage"
        :href="safeHomepage"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 text-[13px] text-(--color-ink) hover:text-(--color-accent)"
      >
        <ExternalLink :size="14" aria-hidden="true" />
        {{ t("extensions.homepage") }}
      </a>
      <a
        v-if="safeRepo"
        :href="safeRepo"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 text-[13px] text-(--color-ink) hover:text-(--color-accent)"
      >
        <Github :size="14" aria-hidden="true" />
        {{ t("extensions.repository") }}
      </a>
    </div>
  </Card>
</template>
