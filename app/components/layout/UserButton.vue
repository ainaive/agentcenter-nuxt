<script setup lang="ts">
import { User, LogOut } from "lucide-vue-next"

const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const auth = useAuth()

const session = auth.useSession()
const open = ref(false)
const root = useTemplateRef<HTMLDivElement>("root")

const user = computed(() => session.value.data?.user ?? null)

function close() {
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !root.value) return
  if (!root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener("click", onDocumentClick))
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick))

async function handleSignOut() {
  close()
  await auth.signOut()
  await router.push(localePath("/"))
}
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <span class="p-2 inline-flex items-center gap-1 text-sm opacity-0" aria-hidden="true">
        <User :size="16" />
      </span>
    </template>

    <NuxtLink
      v-if="!user"
      :to="localePath('/sign-in')"
      class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) inline-flex items-center gap-1 text-sm"
    >
      <User :size="16" aria-hidden="true" />
      <span>{{ t("auth.userMenu.signIn") }}</span>
    </NuxtLink>

    <div v-else ref="root" class="relative">
      <button
        type="button"
        class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) inline-flex items-center gap-2 text-sm"
        :aria-expanded="open"
        :aria-label="t('nav.userMenu')"
        @click="open = !open"
      >
        <div class="flex size-7 items-center justify-center rounded-full bg-(--color-accent)/20 text-(--color-accent) text-xs font-semibold">
          {{ (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase() }}
        </div>
      </button>

      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-48 rounded-lg border border-(--color-border) bg-(--color-card) p-1 shadow-lg z-20"
        role="menu"
      >
        <div class="px-3 py-2 border-b border-(--color-border)">
          <div class="text-sm font-semibold truncate text-(--color-ink)">{{ user.name ?? user.email }}</div>
          <div v-if="user.name" class="text-xs text-(--color-ink-muted) truncate">{{ user.email }}</div>
        </div>
        <NuxtLink
          :to="localePath('/profile')"
          class="block px-3 py-2 text-sm rounded text-(--color-ink) hover:bg-(--color-sidebar)"
          role="menuitem"
          @click="close"
        >
          {{ t("auth.userMenu.profile") }}
        </NuxtLink>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 text-sm rounded text-(--color-ink) hover:bg-(--color-sidebar) text-left"
          role="menuitem"
          @click="handleSignOut"
        >
          <LogOut :size="14" aria-hidden="true" />
          {{ t("auth.userMenu.signOut") }}
        </button>
      </div>
    </div>
  </ClientOnly>
</template>
