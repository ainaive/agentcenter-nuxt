<script setup lang="ts">
import MarkdownIt from "markdown-it"
import DOMPurify from "isomorphic-dompurify"

const props = defineProps<{ source: string }>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
})

const rendered = computed(() => {
  const raw = md.render(props.source ?? "")
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "h1","h2","h3","h4","h5","h6","p","a","ul","ol","li","strong","em","code","pre",
      "blockquote","hr","br","img","table","thead","tbody","tr","th","td","span","div",
    ],
    ALLOWED_ATTR: ["href","title","alt","src","class"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/|\.\.?\/)/i,
  })
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitized via DOMPurify above -->
  <div class="prose prose-sm max-w-none text-(--color-ink)" v-html="rendered" />
</template>
