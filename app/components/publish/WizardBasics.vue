<script setup lang="ts">
import type { PublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ wizard: PublishWizard }>()

const { t } = useI18n()
const form = props.wizard.form
const isLocked = props.wizard.isLocked

const showChinese = ref(Boolean(form.nameZh || form.taglineZh))
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
      <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <PubChoice
          v-for="cat in (['skills','mcp','slash','plugins'] as const)"
          :key="cat"
          :value="cat"
          :current="form.category"
          :title="t(`publish.options.category.${cat}`)"
          @select="(v) => (form.category = v as typeof form.category)"
        />
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
