import { defineVitestConfig } from "@nuxt/test-utils/config"

export default defineVitestConfig({
  test: {
    environment: "happy-dom",
    globals: false,
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
      // Coverage targets the surfaces this suite *actually* exercises.
      // server/repositories/** is covered by the integration suite (see
      // vitest.config.integration.ts) — not measured here. Files like
      // server/api/**, server/utils/{auth,db,storage,inngest,publish}.ts,
      // server/utils/jobs/**, app/pages/**, app/components/{extension,
      // filters,publish,ui}/** are out of scope for this round and stay
      // outside the include list rather than being silently averaged in
      // at 0%.
      include: [
        "shared/validators/**",
        "shared/search/**",
        "shared/extensions/**",
        "shared/installs/**",
        "shared/tags.ts",
        "shared/taxonomy.ts",
        "shared/theme.ts",
        "app/composables/useFilters.ts",
        "app/composables/usePublishWizard.ts",
        "app/composables/useTheme.ts",
        "server/utils/extensions-state.ts",
        "server/utils/installs.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        ".nuxt/**",
        ".output/**",
      ],
      thresholds: {
        // Global floor — set at the lowest currently-covered subdir.
        // Tighten as additional surfaces gain real coverage; each future
        // bump should land in its own commit so the ratchet is visible.
        lines: 85,
        branches: 75,
        functions: 85,
        statements: 85,
        // Pure logic + state machine decisions — load-bearing, easy to
        // cover. The 87.8 branches on shared/search reflects unexercised
        // filter chips (free/official); raise to 90 after a follow-up
        // test pass.
        "shared/validators/**":   { lines: 95, branches: 90, functions: 95, statements: 95 },
        "shared/search/**":       { lines: 95, branches: 87, functions: 95, statements: 95 },
        "shared/extensions/**":   { lines: 95, branches: 90, functions: 95, statements: 95 },
        "shared/installs/**":     { lines: 95, branches: 90, functions: 95, statements: 95 },
        "shared/tags.ts":         { lines: 95, branches: 90, functions: 95, statements: 95 },
        "shared/taxonomy.ts":     { lines: 95, branches: 90, functions: 95, statements: 95 },
        "shared/theme.ts":        { lines: 95, branches: 90, functions: 95, statements: 95 },
        // Orchestrators with mocked-repo tests. The 87.5 branch on
        // installs.ts is the `params.version ? [] : load candidates`
        // short-circuit where one arm is exercised but the other path
        // through it isn't; pair with a follow-up case.
        "server/utils/extensions-state.ts": { lines: 95, branches: 90, functions: 95, statements: 95 },
        "server/utils/installs.ts":         { lines: 95, branches: 85, functions: 95, statements: 95 },
        // Tested composables. useFilters has unexercised null-element
        // branches; usePublishWizard's `markBundleUploaded` and a few
        // jumpTo paths skew the function/statement %. These are realistic
        // numbers, not aspirational — bump after dedicated coverage runs.
        "app/composables/useFilters.ts":      { lines: 90, branches: 75, functions: 90, statements: 90 },
        "app/composables/usePublishWizard.ts": { lines: 90, branches: 85, functions: 85, statements: 85 },
        "app/composables/useTheme.ts":         { lines: 90, branches: 85, functions: 90, statements: 90 },
      },
    },
  },
})
