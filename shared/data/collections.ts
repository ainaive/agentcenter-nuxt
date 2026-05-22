// Editorial public collections used by the seed script to make the
// /collections browse page feel real in dev/staging. Each one is owned by
// one of the seeded creator users (see scripts/seed.ts) and curates a mix
// of existing EXTENSIONS by their numeric id.
//
// Slugs are intentionally readable (not the 10-char base36 the runtime
// shortcode helper produces) — these are seed URLs only, demo-friendly, and
// the `slug` column just requires uniqueness.

export interface SeedCollection {
  slug: string
  name: string
  nameZh: string
  description: string
  descriptionZh: string
  ownerUserId: string
  extensionIds: number[]
}

export const COLLECTIONS: SeedCollection[] = [
  {
    slug: "sre-daily-kit",
    name: "Daily SRE toolkit",
    nameZh: "SRE 日常工具集",
    description:
      "Everything you reach for on a typical on-call day — talk to your infra, your DB, and your team.",
    descriptionZh: "日常 on-call 必备：与基础设施、数据库和团队对话。",
    ownerUserId: "user-amy",
    extensionIds: [3, 14, 11, 7, 12], // GitHub MCP, K8s MCP, Postgres MCP, Slack MCP, /explain
  },
  {
    slug: "frontend-starter",
    name: "Frontend essentials",
    nameZh: "前端必备合集",
    description:
      "Curated picks for web developers — code, design notes, screenshots, and ticket flow.",
    descriptionZh: "前端开发者精选：代码、设计稿、截图与工单流。",
    ownerUserId: "user-ben",
    extensionIds: [2, 4, 5, 6, 3], // Code Interpreter, Notion Sync, /summarize, Image Vision, GitHub MCP
  },
  {
    slug: "research-kit",
    name: "Research kit",
    nameZh: "研究套件",
    description:
      "For analysts and writers: search, summarize, translate, and crunch numbers.",
    descriptionZh: "面向分析师与写作者：搜索、摘要、翻译、数据。",
    ownerUserId: "user-cory",
    extensionIds: [1, 5, 8, 10, 6], // Web Search Pro, /summarize, /translate, Data Analyst, Image Vision
  },
  {
    slug: "ops-productivity",
    name: "Productivity boosters",
    nameZh: "效率工具合集",
    description:
      "Stop context-switching: calendar, docs, chat, and quick translation in one place.",
    descriptionZh: "减少切换：日历、文档、聊天与快捷翻译一站式。",
    ownerUserId: "user-dao",
    extensionIds: [9, 4, 7, 5, 8], // Calendar Agent, Notion Sync, Slack MCP, /summarize, /translate
  },
  {
    slug: "code-review-pack",
    name: "Code review toolkit",
    nameZh: "代码评审工具集",
    description:
      "For tech leads doing PR-heavy days — architecture, tests, and inline explanation.",
    descriptionZh: "面向 PR 评审为主的工程负责人：架构、测试与解释。",
    ownerUserId: "user-eli",
    extensionIds: [13, 15, 3, 12, 2], // Arch Reviewer, Test Generator, GitHub MCP, /explain, Code Interpreter
  },
]
