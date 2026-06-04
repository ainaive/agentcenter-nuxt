<script setup lang="ts">
import { Check, Upload } from "lucide-vue-next"
import type { PublishWizard } from "~/composables/usePublishWizard"

const props = defineProps<{ wizard: PublishWizard }>()

const { t } = useI18n()

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB
const fileInput = useTemplateRef<HTMLInputElement>("fileInput")
const fileName = ref<string | null>(null)
const localError = ref<string | null>(null)
const uploading = ref(false)

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function onFile(file: File) {
  localError.value = null
  if (!file.name.toLowerCase().endsWith(".zip")) {
    localError.value = t("publish.wizard.bundle.wrongType")
    return
  }
  if (file.size > MAX_SIZE) {
    localError.value = t("publish.wizard.bundle.tooLarge")
    return
  }
  if (!props.wizard.versionId.value || !props.wizard.extensionId.value) {
    props.wizard.setError("no_draft")
    return
  }

  uploading.value = true
  try {
    const buf = await file.arrayBuffer()
    const checksum = await sha256Hex(buf)

    const signed = await $fetch<{ url: string; key: string }>(
      "/api/upload/sign",
      {
        method: "POST",
        body: {
          slug: props.wizard.form.slug,
          version: props.wizard.form.version,
          contentType: "application/zip",
        },
      },
    )

    const put = await fetch(signed.url, {
      method: "PUT",
      headers: { "Content-Type": "application/zip" },
      body: buf,
    })
    if (!put.ok) throw new Error(`upload failed: ${put.status}`)

    await $fetch("/api/internal/publish/attach-file", {
      method: "POST",
      body: {
        versionId: props.wizard.versionId.value,
        r2Key: signed.key,
        size: file.size,
        checksumSha256: checksum,
      },
    })

    fileName.value = file.name
    props.wizard.markBundleUploaded()
  } catch (err) {
    const data = (err as { data?: { error?: string }; statusMessage?: string })
    localError.value = data?.data?.error ?? data?.statusMessage ?? t("publish.errors.generic")
  } finally {
    uploading.value = false
  }
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) onFile(file)
  // Reset so picking the same file again still fires `change` — common when an
  // upload fails and the user retries with the same .zip.
  target.value = ""
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (file) onFile(file)
}

function pick() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h2 class="font-serif text-xl text-(--color-ink)">{{ t("publish.wizard.bundle.title") }}</h2>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("publish.wizard.bundle.subtitle") }}
      </p>
    </header>

    <div
      class="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-8 text-center transition-all"
      :class="wizard.bundleUploaded.value && fileName
        ? 'border-(--color-accent) bg-(--color-accent)/[0.04]'
        : 'border-(--color-border) bg-(--color-card) hover:border-(--color-accent)/40 cursor-pointer'"
      @dragover.prevent
      @drop="onDrop"
      @click="!uploading && !(wizard.bundleUploaded.value && fileName) && pick()"
    >
      <template v-if="wizard.bundleUploaded.value && fileName">
        <Check class="size-8 text-(--color-accent)" aria-hidden="true" />
        <p class="text-[14px] font-semibold text-(--color-ink)">{{ fileName }}</p>
        <button
          type="button"
          class="text-[12px] text-(--color-ink-muted) underline underline-offset-4 transition-colors hover:text-(--color-ink)"
          @click.stop="pick"
        >
          {{ t("publish.wizard.bundle.replace") }}
        </button>
      </template>
      <template v-else-if="uploading">
        <Upload class="size-7 animate-pulse text-(--color-accent)" aria-hidden="true" />
        <p class="text-[14px] font-semibold text-(--color-ink)">{{ t("publish.stages.uploading") }}</p>
      </template>
      <template v-else>
        <Upload class="size-7 text-(--color-ink-muted)" aria-hidden="true" />
        <p class="text-[14px] font-semibold text-(--color-ink)">{{ t("publish.wizard.bundle.dropHere") }}</p>
        <span class="rounded-md bg-(--color-accent) px-3.5 py-1.5 text-[12.5px] font-semibold text-(--color-accent-fg)">
          {{ t("publish.wizard.bundle.orBrowse") }}
        </span>
        <p class="mt-1 text-[11.5px] text-(--color-ink-muted)">{{ t("publish.wizard.bundle.max") }}</p>
      </template>

      <input
        ref="fileInput"
        type="file"
        accept=".zip,application/zip"
        class="hidden"
        @change="onFileChange"
      >
    </div>

    <p v-if="localError" class="text-sm text-red-600">{{ localError }}</p>
  </div>
</template>
