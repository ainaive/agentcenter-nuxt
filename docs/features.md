# AgentCenter Feature Inventory · 功能清单

Source-of-truth list of what's shipped today, organized by capability area. For what changed when, see [daily-log.md](./daily-log.md).

当前已交付的能力清单，按功能领域分组。每日变更记录见 [daily-log.md](./daily-log.md)。

---

## English

**Overview.** A bilingual marketplace for AI agent extensions (Skills, MCP servers, slash commands, plugins). Users can browse and search a catalog with rich filters, view detail pages with READMEs and stats, publish their own extensions through a 4-step wizard with automated bundle scanning, save favorites, and authorize a CLI for installs. Open sign-up, EN/ZH UI and content, themes, and a public registry API. Multi-tenant schema with a single-tenant UI in v1.

### Browse & discover

- **Extension catalog** — Browse all published extensions in a paginated grid at `/extensions`.
- **Search** — Search by any phrase, in English or Chinese, including short fragments.
- **Department picker** — Narrow to a department and all of its sub-departments.
- **Scope filter** — Filter by Personal, Organization, or Enterprise.
- **Quick filters** — Toggle Trending, New, Official, or Open Source.
- **Tag filters** — Multi-select tags with "any" or "all" matching.
- **Sort** — Sort by downloads, stars, or most recently updated.
- **Creator filter** — Filter by the user who published the extension.
- **Publisher filter** — Filter by the organization behind the extension.
- **Shareable filter state** — Every filter combination is reflected in the URL, so any search can be bookmarked or shared.
- **Home: featured banner** — An editorial-style banner highlights one featured extension.
- **Home: trending row** — A cross-category mix of trending extensions (Skills, MCP servers, slash commands, plugins).
- **Whole-card click** — Click anywhere on an extension card to open it; Save / Install stay independently clickable.

### Detail page

- **README** — The extension's README rendered with safe markdown.
- **Sidebar metadata** — Homepage, repo, license, scope, last updated.
- **Stats** — Average rating, downloads, version.
- **Install command** — A one-click copyable CLI snippet on the Setup tab.
- **Tabs** — Overview, Setup, Permissions. Permissions surfaces the network / files / runtime / data toggles the publisher declared.
- **Related extensions** — A row of suggestions related to the current extension.
- **Share** — A canonical link that's safe to share across hosts; uses the native share sheet on iOS / Android with a clipboard fallback elsewhere.

### Publish

- **4-step wizard** — Basics → Bundle → Listing → Review.
- **Live preview** — A sticky panel mirrors the listing card and the derived manifest as the form is filled.
- **Bundle upload** — Upload the extension package directly from the browser to cloud storage.
- **Automated scan** — Submitted bundles are checked for integrity, valid manifest, and schema before going live.
- **Auto-publish (personal)** — Personal-scope extensions are published immediately after the scan passes.
- **Admin review (org / enterprise)** — Org and enterprise extensions wait for an admin to approve.
- **Dashboard** — Track drafts, in-flight scans, rejected items (with reason shown inline), and published.
- **Resume drafts** — Continue an unfinished publish later; slug and version lock once saved.
- **Discard drafts** — Owners can delete their own drafts cleanly.

### Accounts & sign-in

- **Sign up** — Open registration with email and password.
- **Sign in / out** — Cookie-based sessions.
- **Onboarding** — Pick a default department on first sign-in.
- **Preferences** — Language and theme are saved per account.
- **CLI device-flow auth** — Authorize the CLI from the web with a short code.

### Save & collections

- **Save** — Bookmark any extension to a personal "Saved" list.
- **Collections** — "Saved" plus user-created groups appear in the sidebar.

### Profile & workspace

- **My Workspace** — A personal landing page for every signed-in user. Shows name, department, joined month, and four headline stats: installed count, published count, total installs across your published work, and weighted average rating.
- **Editable profile** — Change your display name, department, and a short bio. Email and joined date are read-only.
- **Installed list** — Every extension you've installed, with the running version.
- **My published extensions** — Your published work with version, install count, and rating per row.
- **Drafts list** — In-progress publish drafts with a Continue button; surfaces "Awaiting scan" or "Rejected" only when relevant.
- **Saved list** — Your bookmarked extensions, most recently saved first.
- **Activity feed** — Installs, releases, and ratings you've made, merged into one timeline (most recent twenty).

### Languages & themes

- **Bilingual UI** — English (default) and Chinese, with always-prefixed locale URLs (`/en`, `/zh`).
- **Bilingual content** — Extension titles, descriptions, tags, organization names, and department names all support per-language values.
- **Themes** — Editorial Ivory (default) and Dark; preference saved per account.

### Multi-tenancy (schema-only in v1)

- **Organizations and departments** — Modeled and seeded; UI is single-tenant in v1.
- **Department hierarchy** — Dotted-path identifiers; descendant filtering supported.
- **Memberships** — Users can belong to multiple organizations.

### Public API

- **Registry API (`/api/v1/...`)** — Same listing semantics as the web UI; used by the CLI.

### CLI

- **Agent-agnostic** — Designed to work with multiple agents; Claude is the default target.
- **Distribution** — Ships as a Node JS bundle; cross-platform npm install ready.
- **Reads** — Pulls from the public registry API; no auth required for installs.
- **Installs Skills today** — MCP / slash command / plugin installers are on the roadmap.

---

## 中文

**概览。** 面向 AI Agent 扩展（Skill、MCP 服务器、斜杠命令、插件）的双语应用市场。用户可在带筛选的目录中浏览搜索、在详情页查看 README 与统计、通过 4 步向导发布自己的扩展（含自动扫描）、收藏喜欢的扩展，并授权 CLI 完成安装。开放注册、中英双语 UI 与内容、主题切换，以及对外的公共注册表 API。多租户 Schema，v1 UI 为单租户。

### 浏览与发现

- **扩展目录** ——在 `/extensions` 浏览所有已发布扩展，支持分页。
- **搜索** ——任意短语搜索，支持中英文，含短片段查询。
- **部门选择器** ——收窄到某个部门及其所有子部门。
- **范围筛选** ——按"个人 / 组织 / 企业"筛选。
- **快速筛选** ——切换"热门 / 最新 / 官方 / 开源"。
- **标签筛选** ——多选标签，支持"任意 / 全部"匹配。
- **排序** ——按下载量、评分或最近更新排序。
- **作者筛选** ——按发布扩展的用户筛选。
- **发布商筛选** ——按背后的组织筛选。
- **可分享的筛选状态** ——所有筛选条件都反映在 URL 中，可收藏或分享任意搜索。
- **首页：精选 banner** ——编辑风格的精选 banner，突出一个推荐扩展。
- **首页：热门栏** ——跨类别混合展示热门扩展（Skill、MCP、斜杠命令、插件）。
- **整卡可点击** ——点击扩展卡片任意位置都能打开；Save / Install 仍可独立点击。

### 详情页

- **README** ——以安全 Markdown 渲染扩展的 README。
- **侧边栏元数据** ——主页、代码仓、许可证、范围、最近更新时间。
- **统计** ——平均评分、下载量、版本。
- **安装命令** —— Setup 页签里提供一键可复制的 CLI 命令片段。
- **Tabs** ——概览 / 安装 / 权限。权限页签展示发布者声明的网络 / 文件 / 运行时 / 数据访问开关。
- **相关扩展** ——与当前扩展相关的推荐行。
- **分享** ——跨域名安全分享的规范链接；iOS / Android 调用系统分享面板，其他平台回退到剪贴板复制。

### 发布

- **4 步向导** ——基础信息 → 扩展包 → 上架信息 → 确认提交。
- **实时预览** ——固定面板镜像列表卡片与派生的 manifest，随表单填写而更新。
- **扩展包上传** ——从浏览器直接将扩展包上传到云存储。
- **自动扫描** ——提交后自动校验完整性、manifest 有效性与 schema。
- **自动发布（个人）** ——个人范围扩展通过扫描后立即上线。
- **管理员审核（组织/企业）** ——组织/企业范围扩展需等待管理员审核。
- **控制台** ——查看草稿、扫描中、被拒（内嵌原因）、已发布。
- **继续草稿** ——稍后继续未完成的发布；slug 和版本号在保存后锁定。
- **丢弃草稿** ——作者本人可干净删除自己的草稿。

### 账号与登录

- **注册** ——邮箱+密码开放注册。
- **登录 / 退出** —— Cookie 会话。
- **引导** ——首次登录时选择默认部门。
- **偏好** ——语言与主题按账号保存。
- **CLI 设备流授权** ——通过网页用短码授权 CLI。

### 收藏与收藏夹

- **收藏** ——将任意扩展加入个人"已收藏"列表。
- **收藏夹** ——侧边栏展示"已收藏"和用户自定义分组。

### 个人主页与工作台

- **我的工作台** ——每位登录用户的个人主页。展示昵称、部门、加入月份，以及四项核心数据：已安装数、已发布数、你发布的扩展总安装量、加权平均评分。
- **可编辑的资料** ——修改昵称、部门和一段简介；邮箱和加入时间为只读。
- **已安装列表** ——你安装过的所有扩展，附当前运行版本。
- **我发布的扩展** ——你发布过的扩展，每行带版本、安装量、评分。
- **草稿列表** ——发布流程中的草稿，带"继续"按钮；仅在"等待扫描"或"已被拒"时显示状态。
- **收藏列表** ——你收藏的扩展，按最近收藏排序。
- **动态时间线** ——你的安装、发布、评分合并为一条时间线（最近 20 条）。

### 语言与主题

- **双语界面** ——英文（默认）+ 中文，URL 始终带语言前缀（`/en`、`/zh`）。
- **双语内容** ——扩展标题、描述、标签、组织名、部门名均支持双语字段。
- **主题** —— Editorial Ivory（默认）+ Dark；按账号保存偏好。

### 多租户（v1 仅 Schema）

- **组织与部门** ——数据库已建模并播种；v1 UI 为单租户。
- **部门层级** ——点路径标识；支持后代筛选。
- **Memberships** ——用户可属于多个组织。

### 公共 API

- **注册表 API（`/api/v1/...`）** ——与 Web UI 列表语义一致；供 CLI 调用。

### CLI

- **与 Agent 无关** ——面向多 Agent 设计，默认面向 Claude。
- **分发** ——以 Node JS bundle 形式分发，可跨平台 npm 安装。
- **数据来源** ——调用公共注册表 API；安装无需登录。
- **当前支持 Skill 安装** —— MCP / 斜杠命令 / 插件的安装器在路线图上。
