import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },
  typescript: { strict: true },
  // `node-server` is the primary self-host target; `VERCEL` is set in
  // Vercel build env so deploys there pick the `vercel` preset and emit
  // the Build Output API v3 layout (.vercel/output/) automatically.
  // `NITRO_PRESET` overrides both for other hosts (fly, railway, etc).
  nitro: {
    preset:
      process.env.NITRO_PRESET || (process.env.VERCEL ? "vercel" : "node-server"),
  },
  css: ["~/assets/css/tailwind.css"],
  vite: { plugins: [tailwindcss()] },
  components: [{ path: "~/components", pathPrefix: false }],
  modules: ["@nuxtjs/i18n", "@nuxt/fonts", "@nuxt/eslint", "@pinia/nuxt", "nuxt-og-image"],
  ogImage: {
    defaults: {
      width: 1200,
      height: 600,
      cacheMaxAgeSeconds: 60 * 60 * 24,
    },
  },
  eslint: { config: { stylistic: false } },
  fonts: {
    families: [
      { name: "Inter", provider: "google" },
      { name: "Fraunces", provider: "google" },
      { name: "JetBrains Mono", provider: "google" },
    ],
  },
  i18n: {
    strategy: "prefix",
    defaultLocale: "en",
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "zh", language: "zh-CN", file: "zh.json" },
    ],
    detectBrowserLanguage: { useCookie: true, cookieKey: "i18n_redirected", redirectOn: "root" },
  },
})
