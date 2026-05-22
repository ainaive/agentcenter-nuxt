<script setup lang="ts">
import { Bookmark, BookmarkCheck, Loader2, Plus } from "lucide-vue-next"

import Checkbox from "~/components/ui/Checkbox.vue"
import Input from "~/components/ui/Input.vue"
import Popover from "~/components/ui/Popover.vue"
import PopoverContent from "~/components/ui/PopoverContent.vue"
import PopoverTrigger from "~/components/ui/PopoverTrigger.vue"
import { COLLECTION_NAME_MAX } from "~~/shared/validators/collection"

interface CollectionRow {
  id: string
  slug: string
  name: string
  nameZh: string | null
  systemKind: "installed" | "saved" | null
  visibility: "private" | "public"
  itemCount: number
}

const props = defineProps<{
  extensionId: string
  variant?: "pill" | "icon"
}>()

const { t, locale } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const open = ref(false)
const loaded = ref(false)
const loading = ref(false)
const collections = ref<CollectionRow[]>([])
// Set of collection ids the current extension belongs to. Mutated optimistically.
const memberIds = ref(new Set<string>())
// Per-collection inflight flag, keyed by slug.
const pendingSlugs = ref(new Set<string>())
const newName = ref("")
const creating = ref(false)

const isMember = computed(() => memberIds.value.size > 0)

function displayName(c: CollectionRow): string {
  if (c.systemKind === "saved") return t("collections.savedSystemName")
  if (locale.value === "zh" && c.nameZh) return c.nameZh
  return c.name
}

async function loadOnce() {
  if (loaded.value || loading.value) return
  loading.value = true
  try {
    const [list, membership] = await Promise.all([
      $fetch<{ rows: CollectionRow[] }>("/api/internal/collections"),
      $fetch<{ collectionIds: string[] }>(
        "/api/internal/collection-memberships",
        { query: { extensionId: props.extensionId } },
      ),
    ])
    collections.value = list.rows
    memberIds.value = new Set(membership.collectionIds)
    loaded.value = true
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 401) {
      open.value = false
      await router.push(localePath("/sign-in"))
      return
    }
    console.error("[collections-popover] load failed", err)
  } finally {
    loading.value = false
  }
}

watch(open, (v) => {
  if (v) void loadOnce()
})

async function toggle(c: CollectionRow) {
  if (pendingSlugs.value.has(c.slug)) return
  const wasMember = memberIds.value.has(c.id)
  // Optimistic update.
  const next = new Set(memberIds.value)
  if (wasMember) next.delete(c.id)
  else next.add(c.id)
  memberIds.value = next
  pendingSlugs.value.add(c.slug)

  try {
    if (wasMember) {
      await $fetch(
        `/api/internal/collections/${encodeURIComponent(c.slug)}/items/${encodeURIComponent(props.extensionId)}/remove`,
        { method: "POST" },
      )
      // Bump item count down.
      c.itemCount = Math.max(0, c.itemCount - 1)
    } else {
      await $fetch(
        `/api/internal/collections/${encodeURIComponent(c.slug)}/items`,
        { method: "POST", body: { extensionId: props.extensionId } },
      )
      c.itemCount += 1
    }
  } catch (err) {
    // Revert on failure.
    const reverted = new Set(memberIds.value)
    if (wasMember) reverted.add(c.id)
    else reverted.delete(c.id)
    memberIds.value = reverted
    console.error("[collections-popover] toggle failed", err)
  } finally {
    pendingSlugs.value.delete(c.slug)
  }
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const created = await $fetch<{ slug: string; id: string }>(
      "/api/internal/collections",
      { method: "POST", body: { name } },
    )
    // Immediately add the current extension to the new collection.
    await $fetch(
      `/api/internal/collections/${encodeURIComponent(created.slug)}/items`,
      { method: "POST", body: { extensionId: props.extensionId } },
    )
    const row: CollectionRow = {
      id: created.id,
      slug: created.slug,
      name,
      nameZh: null,
      systemKind: null,
      visibility: "private",
      itemCount: 1,
    }
    collections.value = [...collections.value, row]
    const next = new Set(memberIds.value)
    next.add(created.id)
    memberIds.value = next
    newName.value = ""
  } catch (err) {
    console.error("[collections-popover] create failed", err)
  } finally {
    creating.value = false
  }
}

function onSubmitCreate(event: Event) {
  event.preventDefault()
  void createAndAdd()
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        :aria-label="isMember ? t('common.saved') : t('common.save')"
        class="inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[14px] transition-colors disabled:opacity-60"
        :class="isMember
          ? 'border-(--color-border) bg-(--color-sidebar) text-(--color-ink) font-medium'
          : 'border-(--color-border) bg-(--color-card) text-(--color-ink) hover:bg-(--color-sidebar)'"
      >
        <component :is="isMember ? BookmarkCheck : Bookmark" :size="14" aria-hidden="true" />
        <span v-if="variant !== 'icon'">
          {{ isMember ? t("common.saved") : t("common.save") }}
        </span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-80 p-0">
      <div class="border-b border-(--color-border) px-4 py-2.5">
        <h3 class="text-sm font-semibold text-(--color-ink)">
          {{ t("collections.popover.title") }}
        </h3>
      </div>

      <div v-if="loading && !loaded" class="flex items-center justify-center px-4 py-6 text-(--color-ink-muted)">
        <Loader2 :size="16" class="animate-spin" />
      </div>

      <ul v-else-if="collections.length > 0" class="max-h-72 overflow-y-auto py-1">
        <li
          v-for="c in collections"
          :key="c.id"
          class="flex items-center gap-3 px-4 py-2 hover:bg-(--color-sidebar)"
        >
          <Checkbox
            :id="`col-${c.id}`"
            :model-value="memberIds.has(c.id)"
            :disabled="pendingSlugs.has(c.slug)"
            @update:model-value="() => toggle(c)"
          />
          <label :for="`col-${c.id}`" class="flex-1 min-w-0 cursor-pointer">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm text-(--color-ink)">{{ displayName(c) }}</span>
              <span class="font-mono text-[10px] text-(--color-ink-muted)">
                {{ c.itemCount }}
              </span>
            </div>
            <div v-if="c.systemKind === 'saved'" class="text-[11px] uppercase tracking-wide text-(--color-ink-muted)">
              {{ t("collections.popover.systemLabel") }}
            </div>
            <div v-else-if="c.visibility === 'public'" class="text-[11px] uppercase tracking-wide text-(--color-ink-muted)">
              {{ t("collections.detail.visibilityPublic") }}
            </div>
          </label>
        </li>
      </ul>

      <form
        class="flex items-center gap-2 border-t border-(--color-border) px-4 py-3"
        @submit="onSubmitCreate"
      >
        <Input
          v-model="newName"
          :placeholder="t('collections.form.namePlaceholder')"
          :disabled="creating"
          :maxlength="COLLECTION_NAME_MAX"
          class="h-8 text-sm"
        />
        <button
          type="submit"
          :disabled="creating || newName.trim().length === 0"
          class="inline-flex items-center gap-1 rounded-md border border-(--color-border) bg-(--color-card) px-2.5 py-1 text-xs text-(--color-ink) transition-colors hover:bg-(--color-sidebar) disabled:opacity-50"
        >
          <Plus :size="12" />
          {{ t("common.newCollection") }}
        </button>
      </form>
    </PopoverContent>
  </Popover>
</template>
