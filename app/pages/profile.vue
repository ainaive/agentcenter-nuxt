<script setup lang="ts">
import type { ProfileSectionKey } from "~/components/profile/SectionRail.vue"

definePageMeta({ middleware: ["require-auth", "require-onboard"] })

const { t } = useI18n()
const route = useRoute()

const SECTIONS: ReadonlyArray<ProfileSectionKey> = [
  "installed",
  "published",
  "drafts",
  "saved",
  "activity",
  "settings",
]

const active = computed<ProfileSectionKey>(() => {
  const raw = String(route.query.section ?? "installed")
  return (SECTIONS as ReadonlyArray<string>).includes(raw)
    ? (raw as ProfileSectionKey)
    : "installed"
})

// Response types are inferred from server/api/internal/profile/{me,section}.get.ts
// via Nuxt's auto-generated InternalApi map (see .nuxt/types/nitro-routes.d.ts).
// No manual duplication needed.
const { data: me, error: meError, refresh: refreshMe } = await useFetch(
  "/api/internal/profile/me",
)

const sectionQuery = computed(() =>
  active.value === "settings" ? null : { section: active.value },
)

const { data: section, error: sectionError } = await useFetch(
  "/api/internal/profile/section",
  {
    query: sectionQuery,
    // Skip the fetch when on the Settings tab.
    immediate: active.value !== "settings",
  },
)
</script>

<template>
  <div class="px-6 py-8 max-w-6xl mx-auto">
    <div
      v-if="meError"
      class="rounded-(--radius-card) border border-red-300/40 bg-red-50/40 p-6 text-sm text-red-700 dark:bg-red-900/10"
    >
      <p class="font-medium">{{ t("profile.errors.generic") }}</p>
      <p class="mt-1 font-mono text-xs opacity-70">{{ meError.statusMessage ?? meError.message }}</p>
    </div>

    <template v-else>
      <ProfileHero
        v-if="me"
        :name="me.user.name"
        :email="me.user.email"
        :default-dept-id="me.user.defaultDeptId"
        :created-at="me.user.createdAt"
        :stats="me.stats"
      />

      <div class="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <SectionRail :active="active" />

        <main class="min-w-0">
          <h2 class="mb-4 font-serif text-xl text-(--color-ink)">
            {{ t(`profile.sections.${active}`) }}
          </h2>

          <p
            v-if="sectionError && active !== 'settings'"
            class="text-sm text-red-600"
          >
            {{ t("profile.errors.generic") }}
          </p>

          <SectionInstalled
            v-else-if="active === 'installed' && section?.section === 'installed'"
            :rows="section.rows"
          />
          <SectionPublished
            v-else-if="active === 'published' && section?.section === 'published'"
            :rows="section.rows"
          />
          <SectionDrafts
            v-else-if="active === 'drafts' && section?.section === 'drafts'"
            :rows="section.rows"
          />
          <SectionSaved
            v-else-if="active === 'saved' && section?.section === 'saved'"
            :rows="section.rows"
          />
          <SectionActivity
            v-else-if="active === 'activity' && section?.section === 'activity'"
            :rows="section.rows"
          />
          <ProfileSettingsForm
            v-else-if="active === 'settings' && me"
            :initial-name="me.user.name ?? ''"
            :email="me.user.email"
            :initial-dept-id="me.user.defaultDeptId ?? ''"
            :initial-bio="me.user.bio ?? ''"
            :created-at="me.user.createdAt"
            @saved="refreshMe"
          />
        </main>
      </div>
    </template>
  </div>
</template>
