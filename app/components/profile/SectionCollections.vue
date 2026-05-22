<script setup lang="ts">
import { FolderOpen, Plus } from "lucide-vue-next"

import CollectionCard from "~/components/collection/CollectionCard.vue"
import CollectionForm from "~/components/collection/CollectionForm.vue"
import Dialog from "~/components/ui/Dialog.vue"
import DialogContent from "~/components/ui/DialogContent.vue"
import DialogTitle from "~/components/ui/DialogTitle.vue"
import type { ProfileCollectionRow } from "~~/shared/types"

defineProps<{ rows: ProfileCollectionRow[] }>()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const dialogOpen = ref(false)
const busy = ref(false)

async function onSubmit(payload: {
  name: string
  nameZh?: string
  description?: string
  descriptionZh?: string
  visibility: "private" | "public"
}) {
  busy.value = true
  try {
    const created = await $fetch<{ slug: string }>("/api/internal/collections", {
      method: "POST",
      body: payload,
    })
    dialogOpen.value = false
    await router.push(localePath(`/collections/${created.slug}`))
  } catch (err) {
    console.error("[collections] create failed", err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-(--color-accent) bg-(--color-accent) px-3 py-1.5 text-sm text-(--color-accent-fg) hover:opacity-90"
        @click="dialogOpen = true"
      >
        <Plus :size="14" />
        {{ t("collections.actions.create") }}
      </button>
    </div>

    <div
      v-if="rows.length === 0"
      class="rounded-(--radius-card) border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
    >
      <FolderOpen class="mx-auto size-8 text-(--color-ink-muted)" aria-hidden="true" />
      <h3 class="mt-3 font-serif text-lg text-(--color-ink)">
        {{ t("profile.emptyCollections.title") }}
      </h3>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("profile.emptyCollections.body") }}
      </p>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <CollectionCard
        v-for="r in rows"
        :key="r.id"
        :slug="r.slug"
        :name="r.name"
        :name-zh="r.nameZh"
        :description="r.description"
        :description-zh="r.descriptionZh"
        :item-count="r.itemCount"
        :visibility="r.visibility"
        :system-kind="r.systemKind"
      />
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-lg">
        <DialogTitle>{{ t("collections.actions.create") }}</DialogTitle>
        <div class="mt-4">
          <CollectionForm
            :busy="busy"
            :submit-label="t('collections.actions.create')"
            @submit="onSubmit"
            @cancel="dialogOpen = false"
          />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
