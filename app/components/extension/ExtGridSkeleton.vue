<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 8 })
</script>

<template>
  <div
    aria-hidden="true"
    class="grid animate-pulse grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
  >
    <div
      v-for="i in count"
      :key="i"
      class="flex flex-col gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-[18px]"
    >
      <div class="flex items-center gap-3">
        <div class="size-11 shrink-0 rounded-[8px] bg-(--color-border)/40" />
        <div class="h-[14px] w-2/3 rounded bg-(--color-border)/40" />
      </div>
      <div class="space-y-1.5">
        <div class="h-[10px] w-full rounded bg-(--color-border)/35" />
        <div class="h-[10px] w-4/5 rounded bg-(--color-border)/35" />
      </div>
      <div class="h-[10px] w-1/3 rounded bg-(--color-border)/40" />
      <div class="flex gap-1">
        <div class="h-[18px] w-12 rounded border border-(--color-border)/60" />
        <div class="h-[18px] w-14 rounded border border-(--color-border)/60" />
        <div class="h-[18px] w-10 rounded border border-(--color-border)/60" />
      </div>
      <div class="mt-auto flex items-center gap-3 pt-1">
        <div class="h-[12px] w-8 rounded bg-(--color-border)/40" />
        <div class="h-[12px] w-10 rounded bg-(--color-border)/40" />
        <div class="ml-auto h-[26px] w-20 rounded bg-(--color-border)/50" />
      </div>
    </div>
  </div>
</template>
