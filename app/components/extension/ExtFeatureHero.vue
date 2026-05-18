<script setup lang="ts">
import { ArrowUpRight, Download, Star } from "lucide-vue-next"
import type { ExtensionListItem } from "~~/shared/db/queries-types"
import type { Locale } from "~~/shared/types"
import { deptPath } from "~~/shared/data/departments"

const props = defineProps<{ extension: ExtensionListItem }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const name = computed(() =>
  locale.value === "zh" && props.extension.nameZh
    ? props.extension.nameZh
    : props.extension.name,
)
const tagline = computed(() =>
  locale.value === "zh" && props.extension.taglineZh
    ? props.extension.taglineZh
    : props.extension.tagline,
)
const description = computed(() =>
  locale.value === "zh" && props.extension.descriptionZh
    ? props.extension.descriptionZh
    : props.extension.description,
)
const deptTrail = computed(() =>
  props.extension.deptId
    ? deptPath(props.extension.deptId, locale.value as Locale).join(" / ")
    : null,
)
const detailHref = computed(() =>
  localePath(`/extensions/${props.extension.slug}`),
)
const installCommand = computed(
  () => `agentcenter install ${props.extension.slug}`,
)

function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-(--radius-card) border border-(--color-border) border-l-2 border-l-(--color-accent) bg-(--color-card)"
    :aria-label="t('home.featuredLabel')"
  >
    <div class="grid gap-8 px-7 py-7 md:grid-cols-[1.4fr_1fr] md:gap-10 md:px-10 md:py-9">
      <div class="min-w-0">
        <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-(--color-ink-muted)">
          {{ t("home.featuredLabel") }}
        </p>
        <div class="mt-3 flex items-start gap-4">
          <div
            class="flex size-12 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] text-[22px]"
            :style="{
              background: `${extension.iconColor ?? '#888'}1c`,
              borderColor: `${extension.iconColor ?? '#888'}33`,
            }"
          >
            {{ extension.iconEmoji }}
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="font-serif text-[34px] leading-[1.1] tracking-tight text-(--color-ink) md:text-[40px]">
              <NuxtLink :to="detailHref" class="hover:text-(--color-accent)">
                {{ name }}
              </NuxtLink>
            </h1>
            <p
              v-if="tagline"
              class="mt-2 font-serif text-[18px] italic leading-snug text-(--color-ink-muted)"
            >
              {{ tagline }}
            </p>
          </div>
        </div>
        <p
          v-if="description"
          class="mt-4 max-w-prose text-[14px] leading-[1.65] text-(--color-ink-muted)"
        >
          {{ description }}
        </p>
        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-(--color-ink-muted)">
          <div class="inline-flex items-center gap-1.5">
            <Star :size="13" class="fill-amber-500 text-amber-500" aria-hidden="true" />
            <span class="font-semibold text-(--color-ink)">
              {{ Number(extension.starsAvg).toFixed(1) }}
            </span>
          </div>
          <div class="inline-flex items-center gap-1.5">
            <Download :size="13" aria-hidden="true" />
            <span>{{ formatCount(extension.downloadsCount) }}</span>
          </div>
          <span v-if="deptTrail" class="truncate">{{ deptTrail }}</span>
        </div>
      </div>

      <div class="flex flex-col justify-center gap-4">
        <InstallCommand :command="installCommand" />
        <NuxtLink
          :to="detailHref"
          class="group inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-(--color-accent)"
        >
          {{ t("home.viewExtension") }}
          <ArrowUpRight
            :size="14"
            class="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
