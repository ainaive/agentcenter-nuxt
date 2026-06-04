<script setup lang="ts">
definePageMeta({ middleware: ["require-auth", "require-onboard"] })
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8">
    <UploadWizard />
  </div>
</template>
