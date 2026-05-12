import { defineVitestConfig } from "@nuxt/test-utils/config"

export default defineVitestConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    passWithNoTests: true,
    include: [
      "shared/**/*.test.ts",
      "server/**/*.test.ts",
      "app/**/*.test.ts",
      "tests/contract/**/*.test.ts",
    ],
    exclude: ["node_modules", ".nuxt", ".output", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "shared/**",
        "server/**",
        "app/composables/**",
        "app/components/**",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "server/plugins/db.ts",
        "app/pages/**",
        "app/layouts/**",
        "app/app.vue",
        "nuxt.config.ts",
        ".nuxt/**",
        ".output/**",
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
})
