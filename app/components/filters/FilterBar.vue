<script setup lang="ts">
// DeptPicker, TagDrawer, CreatorPicker, PublisherPicker are deferred to
// a follow-up commit. The sidebar already provides category/funcCat
// navigation, so this minimal FilterBar (scope + chips + sort) is
// enough to drive the demo.
</script>

<template>
  <div class="mb-5 flex flex-col gap-3 border-b border-(--color-border) pb-4">
    <div class="flex flex-wrap items-center gap-3">
      <ScopePills />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <FilterChips />
      <SortSelect />
    </div>
  </div>
</template>
