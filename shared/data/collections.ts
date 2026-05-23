// Editorial public collections rendered on /collections. References owners
// by email and items by extension slug so the same data file resolves
// against any environment (local dev with the demo seed, staging with
// partial data, prod with real users + real published extensions) without
// hardcoding generated IDs.
//
// A collection is materialized only when its owner email exists in the DB;
// individual items are skipped when their extensionSlug is absent. So in
// dev all five appear, and in prod the script logs the gaps and inserts
// what it can — see scripts/seed-editorial-collections.ts.
//
// Slugs on the row itself are intentionally readable (not the 10-char
// base36 the runtime shortcode helper produces) — these are seed URLs
// only, and the `slug` column just requires uniqueness.

export interface SeedCollection {
  slug: string
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  ownerEmail: string
  extensionSlugs: string[]
}

export const COLLECTIONS: SeedCollection[] = [
  {
    slug: "sre-daily-kit",
    name: "Daily SRE toolkit",
    nameZh: "SRE 日常工具集",
    description:
      "Everything you reach for on a typical on-call day — talk to your infra, your DB, and your team.",
    descriptionZh: "日常 on-call 必备：与基础设施、数据库和团队对话。",
    ownerEmail: "amy@agentcenter.dev",
    extensionSlugs: [
      "github-mcp",
      "k8s-mcp",
      "postgres-mcp",
      "slack-mcp",
      "explain",
    ],
  },
  {
    slug: "frontend-starter",
    name: "Frontend essentials",
    nameZh: "前端必备合集",
    description:
      "Curated picks for web developers — code, design notes, screenshots, and ticket flow.",
    descriptionZh: "前端开发者精选：代码、设计稿、截图与工单流。",
    ownerEmail: "ben@agentcenter.dev",
    extensionSlugs: [
      "code-interpreter",
      "notion-sync",
      "summarize",
      "image-vision",
      "github-mcp",
    ],
  },
  {
    slug: "research-kit",
    name: "Research kit",
    nameZh: "研究套件",
    description:
      "For analysts and writers: search, summarize, translate, and crunch numbers.",
    descriptionZh: "面向分析师与写作者：搜索、摘要、翻译、数据。",
    ownerEmail: "cory@agentcenter.dev",
    extensionSlugs: [
      "web-search-pro",
      "summarize",
      "translate",
      "data-analyst",
      "image-vision",
    ],
  },
  {
    slug: "ops-productivity",
    name: "Productivity boosters",
    nameZh: "效率工具合集",
    description:
      "Stop context-switching: calendar, docs, chat, and quick translation in one place.",
    descriptionZh: "减少切换：日历、文档、聊天与快捷翻译一站式。",
    ownerEmail: "dao@agentcenter.dev",
    extensionSlugs: [
      "calendar-agent",
      "notion-sync",
      "slack-mcp",
      "summarize",
      "translate",
    ],
  },
  {
    slug: "code-review-pack",
    name: "Code review toolkit",
    nameZh: "代码评审工具集",
    description:
      "For tech leads doing PR-heavy days — architecture, tests, and inline explanation.",
    descriptionZh: "面向 PR 评审为主的工程负责人：架构、测试与解释。",
    ownerEmail: "eli@agentcenter.dev",
    extensionSlugs: [
      "arch-reviewer",
      "test-generator",
      "github-mcp",
      "explain",
      "code-interpreter",
    ],
  },
]
