<script setup lang="ts">
import { Menu, Search } from "lucide-vue-next"

defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ "toggle-sidebar": [] }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const q = ref<string>(typeof route.query.q === "string" ? route.query.q : "")

watch(
  () => route.query.q,
  (next) => {
    q.value = typeof next === "string" ? next : ""
  },
)

function onSubmit() {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (typeof v === "string" && k !== "q" && k !== "page") query[k] = v
  }
  const trimmed = q.value.trim()
  if (trimmed) query.q = trimmed
  router.push({ path: localePath("/extensions"), query })
}
</script>

<template>
  <div class="contents">
    <button
      type="button"
      class="p-2 rounded hover:bg-(--color-sidebar) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      :aria-label="t('nav.toggleSidebar')"
      :aria-expanded="!collapsed"
      @click="emit('toggle-sidebar')"
    >
      <Menu :size="20" aria-hidden="true" />
    </button>

    <NuxtLink
      :to="localePath('/')"
      class="font-serif text-lg tracking-tight hover:opacity-80"
    >
      AgentCenter
    </NuxtLink>

    <form
      role="search"
      class="flex-1 max-w-xl mx-auto relative"
      @submit.prevent="onSubmit"
    >
      <label class="sr-only" for="topbar-search">{{ t("nav.searchLabel") }}</label>
      <Search
        :size="16"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted) pointer-events-none"
        aria-hidden="true"
      />
      <input
        id="topbar-search"
        v-model="q"
        type="search"
        :placeholder="t('search.placeholder')"
        class="w-full h-9 pl-9 pr-3 rounded-md border border-transparent bg-(--color-sidebar)/60 text-sm transition-colors focus:outline-none focus:border-(--color-border) focus:bg-(--color-bg) focus:ring-2 focus:ring-(--color-accent)"
      >
    </form>

    <ThemeSwitch />
    <LocaleSwitch />
    <UserButton />
  </div>
</template>
