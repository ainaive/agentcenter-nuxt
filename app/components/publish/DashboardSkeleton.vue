<script setup lang="ts">
defineProps<{ rows?: number }>()
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="i in (rows ?? 3)"
      :key="i"
      class="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-card) p-4"
    >
      <div class="flex-1 space-y-2">
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-3 w-1/5" />
      </div>
      <Skeleton class="h-6 w-12" />
    </li>
  </ul>
</template>
