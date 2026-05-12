<script setup lang="ts">
definePageMeta({ middleware: ["require-auth", "require-onboard"] })

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

const form = reactive({
  slug: "",
  name: "",
  version: "1.0.0",
  category: "skills" as "skills" | "mcp" | "slash" | "plugins",
  scope: "personal" as "personal" | "org" | "enterprise",
  summary: "",
})

const fileInput = useTemplateRef<HTMLInputElement>("fileInput")
const selectedFile = ref<File | null>(null)
const error = ref<string | null>(null)
const submitting = ref(false)
const stage = ref<"idle" | "creating" | "signing" | "uploading" | "attaching" | "submitting">("idle")

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function handleSubmit() {
  if (!selectedFile.value) {
    error.value = t("publish.errors.bundleRequired")
    return
  }
  error.value = null
  submitting.value = true

  try {
    stage.value = "creating"
    const draft = await $fetch<{ ok: true; extensionId: string; versionId: string }>(
      "/api/internal/publish/create-draft",
      {
        method: "POST",
        body: {
          slug: form.slug,
          name: form.name,
          version: form.version,
          category: form.category,
          scope: form.scope,
          summary: form.summary,
          tagIds: [],
          permissions: {},
          iconColor: "indigo",
          sourceMethod: "zip",
        },
      },
    )

    stage.value = "signing"
    const file = selectedFile.value!
    const buf = await file.arrayBuffer()
    const checksum = await sha256Hex(buf)
    const signed = await $fetch<{ url: string; key: string }>(
      "/api/upload/sign",
      {
        method: "POST",
        body: { slug: form.slug, version: form.version, contentType: "application/zip" },
      },
    )

    stage.value = "uploading"
    const putRes = await fetch(signed.url, {
      method: "PUT",
      headers: { "Content-Type": "application/zip" },
      body: buf,
    })
    if (!putRes.ok) throw new Error(`upload failed: ${putRes.status}`)

    stage.value = "attaching"
    await $fetch("/api/internal/publish/attach-file", {
      method: "POST",
      body: {
        versionId: draft.versionId,
        r2Key: signed.key,
        size: file.size,
        checksumSha256: checksum,
      },
    })

    stage.value = "submitting"
    await $fetch("/api/internal/publish/submit", {
      method: "POST",
      body: { versionId: draft.versionId },
    })

    await router.push(localePath("/publish"))
  } catch (err) {
    console.error("publish failed", err)
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      ?? t("publish.errors.generic")
  } finally {
    submitting.value = false
    stage.value = "idle"
  }
}
</script>

<template>
  <div class="px-6 py-8 max-w-2xl mx-auto">
    <h1 class="font-serif text-3xl tracking-tight text-(--color-ink) mb-6">{{ t("publish.newTitle") }}</h1>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.name") }}</span>
        <input
          v-model="form.name"
          type="text"
          required
          maxlength="80"
          class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
        >
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.slug") }}</span>
          <input
            v-model="form.slug"
            type="text"
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm font-mono outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
          >
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.version") }}</span>
          <input
            v-model="form.version"
            type="text"
            required
            pattern="^\d+\.\d+\.\d+$"
            class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm font-mono outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
          >
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.category") }}</span>
          <select v-model="form.category" class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm">
            <option value="skills">{{ t("publish.options.category.skills") }}</option>
            <option value="mcp">{{ t("publish.options.category.mcp") }}</option>
            <option value="slash">{{ t("publish.options.category.slash") }}</option>
            <option value="plugins">{{ t("publish.options.category.plugins") }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.scope") }}</span>
          <select v-model="form.scope" class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm">
            <option value="personal">{{ t("publish.options.scope.personal") }}</option>
            <option value="org">{{ t("publish.options.scope.org") }}</option>
            <option value="enterprise">{{ t("publish.options.scope.enterprise") }}</option>
          </select>
        </label>
      </div>

      <label class="flex flex-col gap-1">
        <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.summary") }}</span>
        <input
          v-model="form.summary"
          type="text"
          required
          maxlength="80"
          class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20"
        >
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm font-semibold text-(--color-ink)">{{ t("publish.fields.bundle") }}</span>
        <input
          ref="fileInput"
          type="file"
          accept=".zip,application/zip"
          required
          class="text-sm"
          @change="selectedFile = (($event.target as HTMLInputElement).files?.[0]) ?? null"
        >
      </label>

      <p v-if="error" class="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting || !selectedFile"
        class="self-end px-4 py-2 rounded-lg bg-(--color-accent) text-(--color-accent-fg) text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      >
        <span v-if="submitting">{{ t(`publish.stages.${stage}`) }}…</span>
        <span v-else>{{ t("publish.submit") }}</span>
      </button>
    </form>
  </div>
</template>
