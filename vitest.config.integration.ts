import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const root = dirname(fileURLToPath(import.meta.url))

// Integration suite. Runs `tests/integration/**/*.test.ts` against PGlite —
// same Postgres dialect as production, in-process, no Docker. Kept separate
// from the main Vitest config so `bun run test` stays fast (PGlite boot +
// migrations is ~250ms per setup); CI runs both.
//
// We use plain `vitest/config` here (not `defineVitestConfig` from
// `@nuxt/test-utils/config`) on purpose: the Nuxt helper auto-discovers
// `*.nuxt.test.ts` files alongside the configured include list, which would
// pull every component/composable test into this suite. Plain Vitest with
// manual `~~/` and `~/` aliases gives us a clean perimeter — only the
// integration directory runs here.
export default defineConfig({
  resolve: {
    alias: {
      "~~": root,
      "~": resolve(root, "app"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules", ".nuxt", ".output"],
    // PGlite is a singleton-style WASM instance per test file; running files
    // in parallel risks cross-test interference if a future helper drifts
    // toward global state. Serial keeps the picture simple at small cost.
    fileParallelism: false,
  },
})
