<script setup lang="ts">
export type HomeTabKey = "official" | "popular" | "recent"

defineProps<{ modelValue: HomeTabKey }>()
const emit = defineEmits<{ "update:modelValue": [value: HomeTabKey] }>()

const { t } = useI18n()

const TABS: HomeTabKey[] = ["official", "popular", "recent"]
</script>

<template>
  <Tabs
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v as HomeTabKey)"
  >
    <TabsList class="flex w-full justify-center gap-8 border-b-0">
      <TabsTrigger
        v-for="key in TABS"
        :key="key"
        :value="key"
        class="px-4 py-2.5 text-[15px] font-medium tracking-tight text-(--color-ink-muted) data-[state=active]:text-(--color-ink) data-[state=active]:font-semibold data-[state=active]:border-b-2"
      >
        {{ t(`home.tabs.${key}`) }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
