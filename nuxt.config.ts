import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },
  typescript: { strict: true },
  nitro: { preset: "node-server" },
  css: ["~/assets/css/tailwind.css"],
  vite: { plugins: [tailwindcss()] },
})
