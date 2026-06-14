<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 8 })
</script>

<template>
  <div
    aria-hidden="true"
    class="grid animate-pulse grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
  >
    <Card v-for="i in count" :key="i" padding="md" class="flex flex-col gap-2">
      <div class="flex items-center gap-3">
        <Skeleton class="size-11 shrink-0 rounded-[8px]" />
        <Skeleton class="h-[14px] w-2/3" />
      </div>
      <div class="space-y-1.5">
        <Skeleton class="h-[10px] w-full" />
        <Skeleton class="h-[10px] w-4/5" />
      </div>
      <div class="mt-auto flex items-center gap-2 pt-1">
        <Skeleton class="h-[12px] w-20" />
        <Skeleton class="h-[12px] w-10" />
        <Skeleton class="h-[12px] w-12" />
      </div>
    </Card>
  </div>
</template>
