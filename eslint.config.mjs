import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "off",
      "vue/multi-word-component-names": "error",
      "vue/require-explicit-emits": "error",
    },
  },
  {
    files: ["app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["~~/server/*", "../server/*", "../../server/*"] },
      ],
    },
  },
  {
    files: ["server/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["~/*", "../app/*", "../../app/*"] },
      ],
    },
  },
  {
    files: ["shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["~/*", "~~/server/*", "../app/*", "../server/*", "../../app/*", "../../server/*"] },
      ],
    },
  },
)
