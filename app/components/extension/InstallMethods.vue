<script setup lang="ts">
import type { ExtensionCategory } from "~~/shared/types"
import { defaultInstallPath } from "~~/shared/installs/paths"

const props = defineProps<{
  slug: string
  name: string
  category: ExtensionCategory
  bundleUrl: string
  extensionId: string
}>()

const { t } = useI18n()

// Conversational first, matching skillhub.cn's emphasis on "对话安装".
const method = ref<"agent" | "cli" | "download">("agent")
const destPath = computed(() => defaultInstallPath(props.category, props.slug))
</script>

<template>
  <Tabs v-model="method" default-value="agent">
    <TabsList>
      <TabsTrigger value="agent">{{ t("extensions.install.methods.agent") }}</TabsTrigger>
      <TabsTrigger value="cli">{{ t("extensions.install.methods.cli") }}</TabsTrigger>
      <TabsTrigger value="download">{{ t("extensions.install.methods.download") }}</TabsTrigger>
    </TabsList>

    <TabsContent value="agent" class="mt-4">
      <InstallMethodAgent
        :name="name"
        :category="category"
        :slug="slug"
        :bundle-url="bundleUrl"
        :dest-path="destPath"
      />
    </TabsContent>

    <TabsContent value="cli" class="mt-4">
      <InstallMethodCli :slug="slug" />
    </TabsContent>

    <TabsContent value="download" class="mt-4">
      <InstallMethodDownload
        :slug="slug"
        :category="category"
        :bundle-url="bundleUrl"
        :dest-path="destPath"
        :extension-id="extensionId"
      />
    </TabsContent>
  </Tabs>
</template>
