<script setup lang="ts">
import { Bookmark, Check, Copy, FolderOpen, Globe, Lock, Pencil, Trash2, X } from "lucide-vue-next"

import CollectionForm from "~/components/collection/CollectionForm.vue"
import ExtCard from "~/components/extension/ExtCard.vue"
import Dialog from "~/components/ui/Dialog.vue"
import DialogContent from "~/components/ui/DialogContent.vue"
import DialogTitle from "~/components/ui/DialogTitle.vue"
import type { ExtensionListItem } from "~~/shared/db/queries-types"

interface CollectionItemDTO extends ExtensionListItem {
  addedAt: string
}

interface CollectionDetailDTO {
  collection: {
    id: string
    slug: string
    name: string
    nameZh: string | null
    description: string | null
    descriptionZh: string | null
    visibility: "private" | "public"
    systemKind: "installed" | "saved" | null
    ownerName: string | null
    isOwner: boolean
    itemCount: number
    publishedAt: string | null
    createdAt: string
    updatedAt: string
  }
  items: CollectionItemDTO[]
}

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const slug = computed(() => String(route.params.slug))

const { data, error, refresh } = await useFetch<CollectionDetailDTO>(
  () => `/api/internal/collections/${encodeURIComponent(slug.value)}`,
)

const editing = ref(false)
const deleting = ref(false)
const busy = ref(false)
const copied = ref(false)

const displayName = computed(() => {
  if (!data.value) return ""
  if (data.value.collection.systemKind === "saved") return t("collections.savedSystemName")
  if (locale.value === "zh" && data.value.collection.nameZh) return data.value.collection.nameZh
  return data.value.collection.name
})

const displayDescription = computed(() => {
  if (!data.value) return ""
  if (locale.value === "zh" && data.value.collection.descriptionZh) {
    return data.value.collection.descriptionZh
  }
  return data.value.collection.description ?? ""
})

const shareUrl = computed(() => {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}${localePath(`/collections/${slug.value}`)}`
})

const isPublic = computed(() => data.value?.collection.visibility === "public")
const canEdit = computed(() => {
  if (!data.value?.collection.isOwner) return false
  return data.value.collection.systemKind === null
})

async function copyLink() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error("[collection] copy failed", err)
  }
}

async function onEditSubmit(payload: {
  name: string
  nameZh?: string
  description?: string
  descriptionZh?: string
  visibility: "private" | "public"
}) {
  busy.value = true
  try {
    await $fetch(`/api/internal/collections/${encodeURIComponent(slug.value)}/update`, {
      method: "POST",
      body: payload,
    })
    editing.value = false
    await refresh()
  } catch (err) {
    console.error("[collection] update failed", err)
  } finally {
    busy.value = false
  }
}

async function onToggleVisibility() {
  if (!data.value || busy.value) return
  busy.value = true
  const next = data.value.collection.visibility === "public" ? "private" : "public"
  try {
    await $fetch(`/api/internal/collections/${encodeURIComponent(slug.value)}/update`, {
      method: "POST",
      body: { visibility: next },
    })
    await refresh()
  } catch (err) {
    console.error("[collection] visibility toggle failed", err)
  } finally {
    busy.value = false
  }
}

async function onRemoveItem(extensionId: string) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch(
      `/api/internal/collections/${encodeURIComponent(slug.value)}/items/${encodeURIComponent(extensionId)}/remove`,
      { method: "POST" },
    )
    await refresh()
  } catch (err) {
    console.error("[collection] remove item failed", err)
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch(`/api/internal/collections/${encodeURIComponent(slug.value)}/delete`, {
      method: "POST",
    })
    deleting.value = false
    await router.push(`${localePath("/profile")}?section=collections`)
  } catch (err) {
    console.error("[collection] delete failed", err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="px-6 py-8 max-w-5xl mx-auto">
    <div
      v-if="error"
      class="rounded-(--radius-card) border border-red-300/40 bg-red-50/40 p-6 text-sm text-red-700"
    >
      <p class="font-medium">{{ t("collections.detail.notFoundTitle") }}</p>
      <p class="mt-1 text-xs opacity-70">{{ error.statusMessage ?? error.message }}</p>
    </div>

    <template v-else-if="data">
      <header class="mb-6">
        <div class="flex items-start gap-3">
          <component
            :is="data.collection.systemKind === 'saved' ? Bookmark : FolderOpen"
            :size="28"
            class="mt-1 shrink-0 text-(--color-ink-muted)"
            aria-hidden="true"
          />
          <div class="flex-1 min-w-0">
            <h1 class="font-serif text-3xl text-(--color-ink)">{{ displayName }}</h1>
            <p
              v-if="data.collection.ownerName"
              class="mt-1 text-sm text-(--color-ink-muted)"
            >
              {{ t("collections.detail.owner") }}: {{ data.collection.ownerName }}
            </p>
            <p
              v-if="displayDescription"
              class="mt-3 text-sm text-(--color-ink)"
            >
              {{ displayDescription }}
            </p>
          </div>
          <span
            class="mt-1 inline-flex items-center gap-1 rounded-md border border-(--color-border) px-2 py-1 text-xs text-(--color-ink-muted)"
          >
            <component
              :is="isPublic ? Globe : Lock"
              :size="12"
              aria-hidden="true"
            />
            {{
              isPublic
                ? t("collections.detail.visibilityPublic")
                : t("collections.detail.visibilityPrivate")
            }}
          </span>
        </div>

        <div
          v-if="data.collection.isOwner"
          class="mt-4 flex flex-wrap items-center gap-2"
        >
          <button
            v-if="isPublic"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
            @click="copyLink"
          >
            <component :is="copied ? Check : Copy" :size="14" />
            {{ copied ? t("collections.detail.linkCopied") : t("collections.detail.copyLink") }}
          </button>
          <button
            v-if="canEdit"
            type="button"
            :disabled="busy"
            class="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar) disabled:opacity-50"
            @click="onToggleVisibility"
          >
            {{
              isPublic
                ? t("collections.actions.makePrivate")
                : t("collections.actions.makePublic")
            }}
          </button>
          <button
            v-if="canEdit"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
            @click="editing = true"
          >
            <Pencil :size="14" />
            {{ t("collections.actions.rename") }}
          </button>
          <button
            v-if="canEdit"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-red-300/40 bg-red-50/40 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100/40"
            @click="deleting = true"
          >
            <Trash2 :size="14" />
            {{ t("collections.actions.delete") }}
          </button>
        </div>
      </header>

      <section>
        <h2 class="mb-3 font-serif text-lg text-(--color-ink)">
          {{ t("collections.detail.itemsHeading", { count: data.items.length }) }}
        </h2>

        <div
          v-if="data.items.length === 0"
          class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
        >
          <p class="text-sm text-(--color-ink-muted)">{{ t("collections.detail.empty") }}</p>
        </div>

        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
        >
          <div
            v-for="item in data.items"
            :key="item.id"
            class="relative"
          >
            <ExtCard :ext="item" />
            <button
              v-if="canEdit"
              type="button"
              :disabled="busy"
              :aria-label="t('collections.actions.remove')"
              :title="t('collections.actions.remove')"
              class="absolute right-2 top-2 z-10 inline-flex size-6 items-center justify-center rounded-md border border-(--color-border) bg-(--color-card)/90 text-(--color-ink-muted) shadow-sm transition-colors hover:bg-red-50 hover:border-red-300/60 hover:text-red-600 disabled:opacity-50"
              @click.stop.prevent="onRemoveItem(item.id)"
            >
              <X :size="12" />
            </button>
          </div>
        </div>
      </section>
    </template>

    <Dialog v-model:open="editing">
      <DialogContent class="max-w-lg">
        <DialogTitle>{{ t("collections.actions.rename") }}</DialogTitle>
        <div class="mt-4">
          <CollectionForm
            v-if="data"
            :initial-name="data.collection.name"
            :initial-name-zh="data.collection.nameZh"
            :initial-description="data.collection.description"
            :initial-description-zh="data.collection.descriptionZh"
            :initial-visibility="data.collection.visibility"
            :busy="busy"
            :submit-label="t('collections.actions.save')"
            @submit="onEditSubmit"
            @cancel="editing = false"
          />
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleting">
      <DialogContent class="max-w-md">
        <DialogTitle>{{ t("collections.actions.delete") }}</DialogTitle>
        <p class="mt-3 text-sm text-(--color-ink)">
          {{ t("collections.detail.confirmDelete") }}
        </p>
        <div class="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-(--color-border) px-3 py-1.5 text-sm text-(--color-ink) hover:bg-(--color-sidebar)"
            @click="deleting = false"
          >
            {{ t("collections.actions.cancel") }}
          </button>
          <button
            type="button"
            :disabled="busy"
            class="rounded-md border border-red-500 bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
            @click="onDelete"
          >
            {{ t("collections.actions.delete") }}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
