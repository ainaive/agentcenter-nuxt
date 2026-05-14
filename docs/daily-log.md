# AgentCenter Daily Log · 每日简报

What changed each day. For the current capability list, see [features.md](./features.md).

每日变更记录。当前已交付能力清单见 [features.md](./features.md)。

> Note: this log starts fresh for the Nuxt rewrite. The original Next.js daily entries live in the archived repo; the product surface they describe is reproduced verbatim in [features.md](./features.md).

> 说明：本日志针对 Nuxt 重写从头开始记录。原 Next.js 仓库的历史每日记录保留在归档仓库；其描述的产品面已在 [features.md](./features.md) 中完整复刻。

---

## English

### 2026-05-14

**Briefing.** A new MCP Panorama lets stakeholders see at a glance which internal tools have shipped an MCP version, which are in development, and which don't need one — and production deploys now keep their database in sync automatically.

<details>
<summary>Details</summary>

- **MCP Panorama landscape page** — A new bilingual page at `/mcp-panorama` maps every internal tool service onto one screen, grouped by industry sector (Wireless, Datacom, Cloud, Terminals, and nine others) or by public-services domain → PDT (AI R&D, Product & Software, Hardware, Product Digitization, Infrastructure). Each tile is colour-coded by status — green for MCP released, amber for in development, grey for no MCP needed — and the top of each group shows a coverage bar plus a Leading / On track / Lagging / Early tag so leading and lagging units pop out. A right-side panel opens on click with status detail, dependent count, owner team, MCP address, and downstream consumers. Green tiles link straight to the marketplace listing for that MCP. A grouped-list layout is offered as an alternate view. (#17)

- **Contextual catalog entry** — Filtering the extensions catalog to MCP Servers now surfaces a "View Panorama →" banner above the grid; the top-bar nav also keeps a persistent "MCP Panorama" link. The earlier sidebar callout, which appeared on every page regardless of context, has been removed. (#18)

- **Self-syncing deploys** — Every production deploy now applies pending database changes before going live, so a feature that depends on a schema update works end-to-end on day one without a separate operator step. (#19)

</details>

---

### 2026-05-13

**Briefing.** The Nuxt rewrite reaches feature parity with the original Next.js implementation — the marketplace, publish wizard, profile workspace, CLI, and bilingual content all behave the same as before, just running on Nuxt 4.

<details>
<summary>Details</summary>

- **Browse filters complete the Mode B layout** — The Department picker, Tag drawer, Creator filter, and Publisher filter are all back; the placeholder "deferred" comment is gone. Filters live in three rows (scope + dept + creator + publisher; tag drawer; chips + sort) and every combination still survives in the URL. (#11)

- **4-step publish wizard with edit/resume** — Basics → Bundle → Listing → Review with a sticky live preview. Drafts can be resumed from the dashboard via a per-row Edit link, and Discard is now a dedicated component so the confirm + refresh flow stays consistent. (#11)

- **My Workspace personal page** — Hero with name, department, joined month, and four headline stats; section rail for Installed / Published / Drafts / Saved / Activity; editable Settings sub-tab for display name + department + bio. Email and joined date stay read-only. (#12)

- **Detail-page split** — Hero + Tabs (Overview / Setup / Permissions) + About card + Related list, plus Save and Share buttons next to Install. The Setup tab carries a copyable `agentcenter install <slug>` line; Share uses the native share sheet on iOS / Android and falls back to clipboard elsewhere. (#12)

- **CLI now lives in this repo and ships as a Node JS bundle** — Same login / install / list / uninstall / config commands as before, but the artifact is a cross-platform JS bundle so `npm install -g` works regardless of OS. The browser-open in `agentcenter login` no longer uses a shell command, and credential / config loading distinguishes "missing file" from real IO errors instead of silently returning defaults. (#10, #12)

- **shadcn-vue primitive library** — Button, Input, Label, Textarea, Checkbox, Skeleton, Dialog, Sheet, Popover, Select, Tabs all wrap reka-ui on top of the existing Editorial Ivory tokens. (#10)

- **OG image cards for crawlers** — Home and detail pages render a 1200 × 600 social preview at `/__og-image__/...` using the bundled Frame template. Custom brand-matched templates are on the roadmap. (#12)

- **End-to-end test coverage** — Three Playwright specs cover the browse, detail, and navigation golden paths in addition to the pre-existing theme-no-flash check. (#12)

</details>

---

## 中文

### 2026-05-14

**简报。** 新增 MCP 全景图，一屏看清内部工具的 MCP 化进展——哪些已发布、哪些在开发、哪些无需 MCP——同时生产部署会自动保持数据库同步。

<details>
<summary>详情</summary>

- **MCP 全景图页面** ——新增双语页面 `/mcp-panorama`，将公司内部所有工具服务收纳在一屏。可按行业切片浏览（无线、数通、云、终端等 12 个行业），也可按公共服务领域 → PDT 浏览（AI 研发、产品与软件、硬件、产品数字化、基础设施）。每个工具以色块呈现状态——绿色代表 MCP 已发布，琥珀色代表开发中，灰色代表无需 MCP——分组顶部带覆盖率进度条与"领先 / 进展中 / 落后 / 起步"标签，先进与落后单位一目了然。点击色块打开右侧详情面板，显示状态、依赖方数量、所属团队、MCP 地址与下游消费方。绿色色块可直接跳转到对应 MCP 的市场详情。同时提供"分组列表"作为备选视图。（#17）

- **目录就近入口** ——在扩展目录中筛选"MCP"分类时，列表上方会出现"查看全景图 →"横幅；顶部导航栏的"MCP 全景图"入口保持不变；原本悬挂在侧边栏顶部、与场景无关的浮窗式入口已移除。（#18）

- **部署自动同步数据库** ——每次生产部署都会先应用未生效的数据库变更再上线，新功能所依赖的结构调整在首日即可端到端运行，无需运维额外手动操作。（#19）

</details>

---

### 2026-05-13

**简报。** Nuxt 重写已实现与原 Next.js 实现的完整功能对齐——市场、发布向导、个人工作台、CLI、双语内容的行为与之前一致，只是运行在 Nuxt 4 上。

<details>
<summary>详情</summary>

- **浏览筛选补齐 Mode B 布局** ——部门选择器、标签抽屉、创建者筛选、发布商筛选都回来了；"已延期"的占位注释删除。筛选条件分为三行（范围 + 部门 + 创建者 + 发布商；标签抽屉；快速筛选 + 排序），所有组合仍保留在 URL 中。（#11）

- **4 步发布向导，支持继续编辑** ——基础信息 → 扩展包 → 上架信息 → 确认提交，配带实时预览侧栏。控制台每一行都新增了"继续"链接以恢复草稿；"丢弃"封装为独立组件，保持确认 + 刷新的流程一致。（#11）

- **我的工作台个人页** ——头部展示昵称、部门、加入月份和四项核心数据；侧边栏切换"已安装 / 已发布 / 草稿 / 收藏 / 动态"；设置子页可编辑昵称、部门和简介。邮箱和加入时间保持只读。（#12）

- **详情页拆分** ——头部 + Tabs（概览 / 安装 / 权限）+ 关于卡 + 相关列表，安装按钮旁新增 Save 和 Share。Setup 页签提供可一键复制的 `agentcenter install <slug>`；Share 在 iOS / Android 调用系统分享面板，其他平台回退到剪贴板。（#12）

- **CLI 进入本仓库，以 Node JS bundle 形式分发** —— login / install / list / uninstall / config 命令与之前一致，但产物改为跨平台 JS bundle，使 `npm install -g` 在任意操作系统都可用。`agentcenter login` 中的"打开浏览器"不再走 shell 命令；凭据 / 配置加载会区分"文件缺失"与真实 IO 错误，不再静默返回默认值。（#10、#12）

- **shadcn-vue 基础组件库** —— Button、Input、Label、Textarea、Checkbox、Skeleton、Dialog、Sheet、Popover、Select、Tabs 全部基于 reka-ui，沿用现有 Editorial Ivory 配色。（#10）

- **面向爬虫的 OG 图卡** ——首页和详情页通过自带 Frame 模板渲染 1200 × 600 社交分享图（`/__og-image__/...`）。品牌化定制模板在路线图上。（#12）

- **端到端测试覆盖** ——在原有 theme-no-flash 检查基础上，新增 browse、detail、navigation 三条 Playwright 主路径用例。（#12）

</details>
