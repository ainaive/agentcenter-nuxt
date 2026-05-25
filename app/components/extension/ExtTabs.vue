<script setup lang="ts">
import type { Locale } from "~~/shared/types"
import { tagLabel } from "~~/shared/tags"

const props = defineProps<{
  readmeMd: string | null
  tagIds: string[]
  slug: string
  permissions: Record<string, unknown> | null
}>()

const { t, locale } = useI18n()

const tab = ref<"overview" | "setup" | "permissions">("overview")

const installCommand = computed(() => `agentcenter install ${props.slug}`)

const permissionEntries = computed(() => {
  if (!props.permissions) return []
  return Object.entries(props.permissions)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k)
})
</script>

<template>
  <Tabs v-model="tab" default-value="overview">
    <TabsList>
      <TabsTrigger value="overview">{{ t("extensions.tabs.overview") }}</TabsTrigger>
      <TabsTrigger value="setup">{{ t("extensions.tabs.setup") }}</TabsTrigger>
      <TabsTrigger value="permissions">{{ t("extensions.tabs.permissions") }}</TabsTrigger>
    </TabsList>

    <TabsContent value="overview">
      <div
        class="mt-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6"
      >
        <div class="mb-5">
          <p class="mb-2 text-[13px] text-(--color-ink-muted)">
            {{ t("extensions.setupHint") }}
          </p>
          <InstallCommand :command="installCommand" />
        </div>
        <Markdown v-if="readmeMd" :source="readmeMd" />
        <p v-else class="text-(--color-ink-muted) italic">{{ t("extensions.noReadme") }}</p>
        <div
          v-if="tagIds.length > 0"
          class="mt-6 flex flex-wrap gap-1.5 border-t border-(--color-border) pt-4"
        >
          <span
            v-for="tag in tagIds"
            :key="tag"
            class="border border-(--color-border) text-(--color-ink-muted) rounded px-2 py-0.5 font-mono text-[11px] font-semibold"
          >
            #{{ tagLabel(tag, locale as Locale) }}
          </span>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="setup">
      <div
        class="mt-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6"
      >
        <p class="mb-3 text-sm text-(--color-ink-muted)">
          {{ t("extensions.setupHint") }}
        </p>
        <InstallCommand :command="installCommand" />
      </div>
    </TabsContent>

    <TabsContent value="permissions">
      <div
        class="mt-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-6"
      >
        <ul
          v-if="permissionEntries.length > 0"
          class="space-y-1.5 text-sm"
        >
          <li
            v-for="key in permissionEntries"
            :key="key"
            class="flex items-center gap-2 text-(--color-ink)"
          >
            <span class="size-1.5 rounded-full bg-(--color-accent)" />
            {{ t(`publish.wizard.listing.permissions.${key}`, key) }}
          </li>
        </ul>
        <p v-else class="text-sm text-(--color-ink-muted)">
          {{ t("extensions.noPermissions") }}
        </p>
      </div>
    </TabsContent>
  </Tabs>
</template>
