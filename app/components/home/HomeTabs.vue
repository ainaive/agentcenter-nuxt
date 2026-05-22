<script setup lang="ts">
export type HomeTabKey = "popular" | "topRated" | "recent"

defineProps<{ modelValue: HomeTabKey }>()
const emit = defineEmits<{ "update:modelValue": [value: HomeTabKey] }>()

const { t } = useI18n()

const TABS: HomeTabKey[] = ["popular", "topRated", "recent"]
</script>

<template>
  <Tabs
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v as HomeTabKey)"
  >
    <TabsList>
      <TabsTrigger v-for="key in TABS" :key="key" :value="key">
        {{ t(`home.tabs.${key}`) }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
