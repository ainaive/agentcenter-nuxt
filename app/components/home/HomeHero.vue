<script setup lang="ts">
const { t } = useI18n()

const INSTALL_COMMAND = "npm i -g @agentcenter/cli"
</script>

<template>
  <section class="home-hero relative overflow-hidden">
    <div class="relative mx-auto max-w-4xl px-6 pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
      <p
        class="mx-auto inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-card)/80 px-3 py-1 font-mono text-[11px] tracking-widest text-(--color-ink-muted) uppercase backdrop-blur-sm"
      >
        {{ t("home.heroEyebrow") }}
      </p>

      <h1
        class="mt-6 font-serif text-3xl leading-tight tracking-tight text-(--color-ink) sm:text-4xl md:text-5xl"
      >
        <span>{{ t("home.heroTitleBefore") }}</span><span class="text-(--color-accent)">{{ t("home.heroTitleBrand") }}</span><span>{{ t("home.heroTitleAfter") }}</span>
      </h1>

      <p class="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-(--color-ink-muted) sm:text-base">
        {{ t("home.heroSubtitle") }}
      </p>

      <div class="mx-auto mt-8 max-w-xl">
        <InstallCommand :command="INSTALL_COMMAND" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  background:
    radial-gradient(60% 60% at 20% 30%, oklch(95% 0.05 80 / 0.7), transparent 70%),
    radial-gradient(50% 60% at 80% 20%, oklch(94% 0.05 220 / 0.55), transparent 70%),
    radial-gradient(60% 60% at 70% 90%, oklch(95% 0.045 340 / 0.45), transparent 70%),
    var(--color-bg);
}

:global(.dark) .home-hero,
:global(.mono) .home-hero {
  background: var(--color-card);
}
</style>
