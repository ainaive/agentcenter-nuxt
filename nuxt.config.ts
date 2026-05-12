import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },
  typescript: { strict: true },
  nitro: { preset: "node-server" },
  css: ["~/assets/css/tailwind.css"],
  vite: { plugins: [tailwindcss()] },
  modules: ["@nuxtjs/i18n"],
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
