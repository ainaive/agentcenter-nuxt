<script setup lang="ts">
import { Bookmark, FolderOpen, Globe, Lock } from "lucide-vue-next"

const props = defineProps<{
  slug: string
  name: string
  nameZh?: string | null
  description?: string | null
  descriptionZh?: string | null
  itemCount: number
  visibility?: "private" | "public"
  systemKind?: "installed" | "saved" | null
  ownerName?: string | null
  showOwner?: boolean
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const displayName = computed(() => {
  if (props.systemKind === "saved") return t("collections.savedSystemName")
  if (locale.value === "zh" && props.nameZh) return props.nameZh
  return props.name
})

const displayDescription = computed(() => {
  if (locale.value === "zh" && props.descriptionZh) return props.descriptionZh
  return props.description ?? ""
})
</script>

<template>
  <Card
    as-child
    padding="sm"
    class="flex flex-col gap-2 transition-colors hover:bg-(--color-sidebar)/40"
  >
    <NuxtLink :to="localePath(`/collections/${slug}`)">
    <div class="flex items-center gap-2.5">
      <component
        :is="systemKind === 'saved' ? Bookmark : FolderOpen"
        :size="16"
        class="shrink-0 text-(--color-ink-muted)"
        aria-hidden="true"
      />
      <h3 class="flex-1 truncate font-serif text-base text-(--color-ink)">
        {{ displayName }}
      </h3>
      <span
        v-if="visibility"
        class="inline-flex items-center gap-1 rounded-md border border-(--color-border) px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-(--color-ink-muted)"
      >
        <component
          :is="visibility === 'public' ? Globe : Lock"
          :size="10"
          aria-hidden="true"
        />
        {{
          visibility === "public"
            ? t("collections.detail.visibilityPublic")
            : t("collections.detail.visibilityPrivate")
        }}
      </span>
    </div>

    <p
      v-if="displayDescription"
      class="line-clamp-2 text-sm text-(--color-ink-muted)"
    >
      {{ displayDescription }}
    </p>

    <div class="mt-auto flex items-center justify-between text-xs text-(--color-ink-muted)">
      <span class="font-mono">
        {{ t("collections.itemCount", { count: itemCount }) }}
      </span>
      <span v-if="showOwner && ownerName" class="truncate">{{ ownerName }}</span>
    </div>
    </NuxtLink>
  </Card>
</template>
