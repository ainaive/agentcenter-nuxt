<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_320px]">
    <div class="space-y-6">
      <div class="flex items-center gap-2">
        <Skeleton v-for="i in 4" :key="i" class="h-6 w-20" />
      </div>
      <Skeleton class="h-6 w-2/3" />
      <Skeleton class="h-10" />
      <div class="grid gap-4 md:grid-cols-2">
        <Skeleton class="h-10" />
        <Skeleton class="h-10" />
      </div>
      <Skeleton class="h-10" />
      <Skeleton class="h-24" />
    </div>
    <div class="space-y-3">
      <Skeleton class="h-3 w-1/3" />
      <Skeleton class="h-28" />
      <Skeleton class="h-3 w-1/3" />
      <Skeleton class="h-40" />
    </div>
  </div>
</template>
