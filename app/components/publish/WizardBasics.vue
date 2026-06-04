<script setup lang="ts">
import { Blocks, Bolt, Globe, Plug } from "lucide-vue-next"
import type { PublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ wizard: PublishWizard }>()

const { t } = useI18n()
const form = props.wizard.form
const isLocked = props.wizard.isLocked

const showChinese = ref(Boolean(form.nameZh || form.taglineZh))

type Category = typeof form.category
const CATEGORIES: Array<{ key: Category; icon: typeof Bolt }> = [
  { key: "skills", icon: Bolt },
  { key: "mcp", icon: Globe },
  { key: "slash", icon: Blocks },
  { key: "plugins", icon: Plug },
]
</script>

<template>
  <div class="space-y-6">
    <header>
      <h2 class="font-serif text-xl text-(--color-ink)">{{ t("publish.wizard.basics.title") }}</h2>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("publish.wizard.basics.subtitle") }}
      </p>
    </header>

    <PubField :label="t('publish.fields.name')" required>
      <Input
        v-model="form.name"
        :placeholder="t('publish.wizard.basics.namePlaceholder')"
      />
    </PubField>

    <div class="grid gap-4 md:grid-cols-2">
      <PubField
        :label="t('publish.fields.slug')"
        :hint="isLocked ? undefined : t('publish.wizard.basics.slugHint')"
        required
      >
        <Input
          v-model="form.slug"
          :readonly="isLocked"
          :class="['font-mono', isLocked && 'bg-(--color-sidebar) cursor-not-allowed']"
        />
      </PubField>

      <PubField
        :label="t('publish.fields.version')"
        :hint="isLocked ? undefined : t('publish.wizard.basics.versionHint')"
        required
      >
        <Input
          v-model="form.version"
          :readonly="isLocked"
          :class="['font-mono', isLocked && 'bg-(--color-sidebar) cursor-not-allowed']"
        />
      </PubField>
    </div>

    <PubField
      :label="t('publish.fields.summary')"
      :hint="t('publish.wizard.basics.summaryHint')"
      required
    >
      <Input v-model="form.summary" :placeholder="t('publish.wizard.basics.summaryHint')" />
    </PubField>

    <div>
      <button
        type="button"
        class="text-[12px] text-(--color-ink-muted) underline-offset-4 hover:underline"
        @click="showChinese = !showChinese"
      >
        {{ showChinese ? "−" : "+" }} {{ t("publish.wizard.basics.chinese") }}
      </button>
      <div v-if="showChinese" class="mt-3 grid gap-4 md:grid-cols-2">
        <PubField :label="t('publish.fields.name') + ' (中)'" :hint="t('publish.wizard.basics.chineseHint')">
          <Input v-model="form.nameZh" />
        </PubField>
        <PubField :label="t('publish.fields.summary') + ' (中)'" :hint="t('publish.wizard.basics.chineseHint')">
          <Input v-model="form.taglineZh" />
        </PubField>
      </div>
    </div>

    <PubField :label="t('publish.fields.category')" required>
      <div role="radiogroup" :aria-label="t('publish.fields.category')" class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.key"
          type="button"
          role="radio"
          :aria-checked="form.category === cat.key"
          class="flex flex-col items-center gap-1.5 rounded-lg border-[1.5px] px-2 py-3.5 text-[12px] font-semibold transition-all"
          :class="form.category === cat.key
            ? 'border-(--color-ink) bg-(--color-sidebar) text-(--color-ink) font-bold'
            : 'border-(--color-border) bg-(--color-card) text-(--color-ink) hover:border-(--color-ink)/40'"
          @click="form.category = cat.key"
        >
          <component
            :is="cat.icon"
            aria-hidden="true"
            class="size-[18px]"
            :class="form.category === cat.key ? 'text-(--color-ink)' : 'text-(--color-ink-muted)'"
          />
          <span>{{ t(`publish.options.category.${cat.key}`) }}</span>
        </button>
      </div>
    </PubField>

    <PubField :label="t('publish.fields.scope')" required>
      <div class="grid gap-2 md:grid-cols-3">
        <PubChoice
          value="personal"
          :current="form.scope"
          :title="t('publish.options.scope.personal')"
          :desc="t('publish.wizard.basics.scope.personalDesc')"
          @select="(v) => (form.scope = v as typeof form.scope)"
        />
        <PubChoice
          value="org"
          :current="form.scope"
          :title="t('publish.options.scope.org')"
          :desc="t('publish.wizard.basics.scope.orgDesc')"
          @select="(v) => (form.scope = v as typeof form.scope)"
        />
        <PubChoice
          value="enterprise"
          :current="form.scope"
          :title="t('publish.options.scope.enterprise')"
          :desc="t('publish.wizard.basics.scope.enterpriseDesc')"
          @select="(v) => (form.scope = v as typeof form.scope)"
        />
      </div>
    </PubField>
  </div>
</template>
