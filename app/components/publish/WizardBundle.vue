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
      class="rounded-(--radius-card) border-2 border-dashed border-(--color-border) bg-(--color-card) p-8 text-center transition-colors hover:border-(--color-accent)/40"
      @dragover.prevent
      @drop="onDrop"
    >
      <div v-if="wizard.bundleUploaded.value && fileName" class="flex flex-col items-center gap-2">
        <Check class="size-8 text-(--color-accent)" aria-hidden="true" />
        <p class="text-sm text-(--color-ink)">
          {{ t("publish.wizard.bundle.uploaded", { name: fileName }) }}
        </p>
        <Button variant="outline" size="sm" @click="pick">
          {{ t("publish.wizard.bundle.replace") }}
        </Button>
      </div>
      <div v-else class="flex flex-col items-center gap-3">
        <Upload class="size-8 text-(--color-ink-muted)" aria-hidden="true" />
        <p class="text-sm text-(--color-ink-muted)">{{ t("publish.wizard.bundle.drop") }}</p>
        <p class="text-[11px] text-(--color-ink-muted)">{{ t("publish.wizard.bundle.max") }}</p>
        <Button :disabled="uploading" @click="pick">
          {{ uploading ? t("publish.stages.uploading") : t("publish.fields.bundle") }}
        </Button>
      </div>

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
