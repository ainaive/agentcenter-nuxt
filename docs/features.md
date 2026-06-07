# AgentCenter Feature Inventory · 功能清单

Source-of-truth list of what's shipped today, organized by capability area. For what changed when, see [daily-log.md](./daily-log.md).

当前已交付的能力清单，按功能领域分组。每日变更记录见 [daily-log.md](./daily-log.md)。

---

## English

**Overview.** A bilingual marketplace for AI agent extensions (Skills, MCP servers, slash commands, plugins). Users can browse and search a catalog with rich filters, view detail pages with READMEs and stats, publish their own extensions through a 4-step wizard with automated bundle scanning, save favorites, and authorize a CLI for installs. Open sign-up, EN/ZH UI and content, themes, and a public registry API. Multi-tenant schema with a single-tenant UI in v1.

### Browse & discover

- **Type-first browsing** — Browsing the marketplace starts by picking a type — Skills, MCP Servers, Slash Commands, or Plugins — from the Explore dropdown in the top bar. The unfiltered catalog stays reachable but isn't the default destination.
- **Function-types sidebar** — A persistent sidebar tree exposes the three-level functional taxonomy (Work Task / Business / Tools, plus sub-categories and leaves). Selecting any node filters the catalog and survives URL sharing.
- **Extension catalog** — Browse all published extensions in a paginated grid at `/extensions`.
- **Search** — Search by any phrase, in English or Chinese, including short fragments.
- **Department picker** — Narrow to a department and all of its sub-departments.
- **Scope filter** — Filter by Personal, Organization, or Enterprise.
- **Tag filters** — Multi-select tags with "any" or "all" matching.
- **Sort** — Sort by downloads, stars, or most recently updated.
- **Creator filter** — Filter by the user who published the extension.
- **Publisher filter** — Filter by the organization behind the extension.
- **Shareable filter state** — Every filter combination is reflected in the URL, so any search can be bookmarked or shared.
- **Active-filter chips** — Above the results grid, each applied filter (search term, scope, department, creator, publisher, every selected tag) renders as a removable chip — click × to drop one, or "Clear all" to clear them in a single tap.
- **Home: featured spotlight** — A curated "Featured this week" extension anchors the home page with its name, tagline, install command, and a deep link to the detail page; falls back to a slim editorial card when no extension is marked featured.
- **Home: trending row** — A cross-category mix of trending extensions (Skills, MCP servers, slash commands, plugins).
- **Whole-card click** — Click anywhere on an extension card to open it; Save / Install stay independently clickable.

### Detail page

- **README** — The extension's README rendered with safe markdown.
- **Sidebar metadata** — Homepage, repo, license, scope, last updated.
- **Stats** — Average rating, downloads, version.
- **Install command** — A one-click copyable CLI snippet on the Setup tab.
- **Tabs** — Overview, Setup, Permissions. Permissions surfaces the network / files / runtime / data toggles the publisher declared.
- **Related extensions** — A sidebar list of suggestions related to the current extension, each carrying its badge, owning department, and star rating beside the name.
- **Share** — A canonical link that's safe to share across hosts; uses the native share sheet on iOS / Android with a clipboard fallback elsewhere.

### MCP Panorama

- **Landscape page** — A single page at `/mcp-panorama` that maps every internal tool service onto one screen as a small card, grouped by industry sector or by public-services domain → PDT.
- **A software tool can ship multiple MCPs** — A tool may expose any number of MCP servers (CodeCheck ships two; K8sOps and ObservHub each ship three). Each MCP carries its own status, dependent count, and marketplace link.
- **Layer toggle** — Switch between Industry Services (12 sectors) and Public Services (5 domains with their product development teams).
- **Tool-as-card layout** — Each software tool reads as a small quiet card with a serif name; the MCP servers inside render as vivid status-coloured pills. PDTs sit as subtly recessed regions for clear visual hierarchy.
- **Coverage at a glance** — Each group's header shows the total count and a "released/total" fraction with a thin stacked status bar. The layer summary's right block ranks the top three groups by release %.
- **Status filter chips** — Show only released, only in-development, or only no-MCP-needed MCPs.
- **Clickable stats** — Every count on the page doubles as an action: click a card title to drill into the group, click a status total to flip the page filter (and again to flip back), click a top-three entry to jump straight there.
- **Drill into a sector or PDT** — Click any row in the layer sidebar, any card title, or any top-three ranking entry to scope the view to one group.
- **Two layouts** — A compact Panorama view and an alternate Grouped List that splits each group into three status columns.
- **MCP detail panel** — Click any pill to see the MCP's status, dependent count, owning team, endpoint, and tags. The panel also lists sibling MCPs of the same tool, so you can switch between them in one click. Released MCPs offer a "Copy MCP URI" button and a direct link to the marketplace listing; in-development MCPs offer "Track progress"; tools without an MCP offer "Request MCP build".
- **Bilingual** — Sectors, domains, PDTs, statuses, tool names, and MCP descriptions all render in EN or ZH.
- **Catalog cross-link** — Filtering the extensions catalog to MCP Servers surfaces a "View Panorama" banner above the grid; MCP Panorama also lives inside the Explore dropdown in the top nav, next to the type filters.

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

### Official-tier approval workflow

- **Two-tier officialness** — Published extensions default to Unofficial; publishers can apply for **Product-Line Official** (per product line) or **Company Official** elevation.
- **Apply-for-official dialog** — From the publisher dashboard, an extension that's published and unofficial gets an "Apply for official" action: pick a tier, pick a functional category (defaults to the extension's existing subCat), pick a product line when the tier is Product-Line, optionally explain why.
- **Product-Line dimension** — The Product-Line tier is keyed by `(subCat × productLine)` against a seeded `product_lines` table (Wireless, Datacom, Terminals, Cloud). Approved extensions wear a line-specific badge ("Wireless Official" / "无线官方") on the detail page.
- **Reviewer queue** — Each (tier × functional category × productLine?) cell is owned by an assigned set of reviewers. `/admin/approvals` shows the reviewer their queue. Approve in one click; reject opens an inline note field.
- **Configurable matrix with delegation** — `/admin/reviewers` is now tabbed by tier: Company-tier cells stay super-admin-only; the Product-Line grid lets each Company-tier admin of subCat X manage Product-Line reviewers for subCat X (any line), while greying out cells outside their scope. Super-admins still edit anywhere.
- **Tier badges & filter** — Approved extensions wear a Product-Line or Company chip on cards, hero, and related-lists. The browse filter rail adds an "Official tier" pill plus, when Product-Line is active, an inline product-line picker for narrowing the catalog to a specific line.
- **Requests tab** — `/profile?section=requests` tracks the publisher's submitted applications and shows the reviewer's note on rejections; pending requests can be withdrawn.
- **CLI contract preserved** — The `/api/v1` `badge` field is derived from the new tier so existing CLI installs see no change; `productLineId` stays internal. See [ADR-0001](./adr/0001-official-tier-approval-workflow.md) (with the 2026-06-08 product-line addendum) for the full rationale.

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
- **Themes** — Editorial Ivory (default), Dark, and Mono Clean (high-contrast, minimalist); preference saved per account.

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

- **先选类型的浏览方式** ——浏览市场始终从选定类型开始（Skill、MCP 服务器、斜杠命令、插件），通过顶部导航的 Explore 下拉菜单进入。未筛选的全量列表仍可访问，但不再是默认入口。
- **侧边栏功能分类树** ——侧边栏常驻一棵三层功能分类树（工作任务 / 业务 / 工具，以及其下的子类和叶子节点）。选中任意节点即对目录进行筛选，选择反映在 URL 中，便于分享。
- **扩展目录** ——在 `/extensions` 浏览所有已发布扩展，支持分页。
- **搜索** ——任意短语搜索，支持中英文，含短片段查询。
- **部门选择器** ——收窄到某个部门及其所有子部门。
- **范围筛选** ——按"个人 / 组织 / 企业"筛选。
- **标签筛选** ——多选标签，支持"任意 / 全部"匹配。
- **排序** ——按下载量、评分或最近更新排序。
- **作者筛选** ——按发布扩展的用户筛选。
- **发布商筛选** ——按背后的组织筛选。
- **可分享的筛选状态** ——所有筛选条件都反映在 URL 中，可收藏或分享任意搜索。
- **已生效筛选标签** ——结果网格上方为每个生效的筛选（搜索词、范围、部门、作者、发布商、每个选中标签）显示一个可移除的标签——点击 × 移除单项，或点击"Clear all"一次全清。
- **首页：精选模块** ——首页顶部由一个真实的"本周精选"扩展担纲，展示其名称、宣传语、安装命令以及直达详情页的链接；若当前未标记任何精选，则回退到一张简洁的编辑卡片。
- **首页：热门栏** ——跨类别混合展示热门扩展（Skill、MCP、斜杠命令、插件）。
- **整卡可点击** ——点击扩展卡片任意位置都能打开；Save / Install 仍可独立点击。

### 详情页

- **README** ——以安全 Markdown 渲染扩展的 README。
- **侧边栏元数据** ——主页、代码仓、许可证、范围、最近更新时间。
- **统计** ——平均评分、下载量、版本。
- **安装命令** —— Setup 页签里提供一键可复制的 CLI 命令片段。
- **Tabs** ——概览 / 安装 / 权限。权限页签展示发布者声明的网络 / 文件 / 运行时 / 数据访问开关。
- **相关扩展** ——详情页侧栏列出与当前扩展相关的推荐，每条名称旁带徽章、所属部门与星级。
- **分享** ——跨域名安全分享的规范链接；iOS / Android 调用系统分享面板，其他平台回退到剪贴板复制。

### MCP 全景图

- **全景页** ——单页 `/mcp-panorama` 将所有内部工具服务以小卡片形式整屏呈现，按行业切片或公共服务领域 → PDT 分组归类。
- **一个软件工具可承载多个 MCP** ——一个工具可以承载任意数量的 MCP 服务器（CodeCheck 承载两个；K8sOps 与 ObservHub 各自承载三个）。每个 MCP 都拥有独立的状态、依赖方数量与市场链接。
- **层级切换** ——可在"行业服务"（12 个行业切片）与"公共服务"（5 个公共领域及其下属 PDT）之间切换。
- **工具卡 + MCP 胶囊的排版** ——每个软件工具以一张安静的小卡片呈现，标题用衬线字；其下属的 MCP 服务器在卡内以醒目的状态色胶囊呈现。PDT 退化为微微凹陷的容器，版面层次清晰。
- **覆盖率一目了然** ——每个分组的标题区展示总数与"已发布/总数"分数，配一条细分状态条；摘要区右栏按发布率列出排名前三的分组。
- **状态筛选** ——可单独查看"已发布"、"开发中"或"无需 MCP"的 MCP。
- **数字均可点击** ——页面上的每一个计数都是一个操作入口：点击分组标题下钻；点击状态总数翻转页面筛选（再次点击则恢复）；点击排名前三的任意条目即可直跳该分组。
- **下钻到行业或 PDT** ——点击层级侧栏任意一行、任意分组标题或排名前三任意一条，均可将视图收窄到该分组。
- **两种排版** ——紧凑的"全景图"视图，以及按"已发布 / 开发中 / 无需"三列拆分的"分组列表"备用视图。
- **MCP 详情面板** ——点击任意胶囊即可查看该 MCP 的状态说明、依赖方数量、所属团队、endpoint 与标签。面板同时列出同一工具下的其他 MCP，可一键切换。已发布 MCP 提供"复制 MCP URI"按钮与直达市场详情的链接；开发中的 MCP 提供"跟踪进度"；尚无 MCP 的工具提供"申请 MCP 化"。
- **双语呈现** ——行业、领域、PDT、状态、工具名与 MCP 描述均支持中英双语。
- **目录交叉入口** ——在扩展目录筛选"MCP"分类时，列表上方会出现"查看全景图"横幅；MCP 全景图同时位于顶部导航的 Explore 下拉菜单中，与类型筛选并列。

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

### 官方认证审核流程

- **两级官方** ——已发布扩展默认为非官方；发布者可按产品线申请**产品线官方**或申请**公司官方**认证。
- **申请对话框** ——发布工作台中已发布且未认证的扩展会出现"申请官方认证"操作：选择级别、选择功能分类（默认沿用扩展的 subCat）、目标为产品线级时还要选择产品线，可填理由。
- **产品线维度** ——产品线官方按 `(subCat × productLine)` 路由，产品线来自种子表 `product_lines`（无线、数通、终端、云）。通过审核的扩展在详情页显示带产品线名称的徽章（"无线官方" / "Wireless Official"）。
- **审核队列** ——每个（级别 × 功能分类 × 产品线?）单元由指定的审核员负责。审核员在 `/admin/approvals` 看到属于自己的待审请求；一键通过；驳回时弹出内嵌备注框。
- **可配置矩阵与代理授权** —— `/admin/reviewers` 按级别分页：公司级单元仅超级管理员可管理；产品线网格中，公司级管理员可管理自己 subCat 下的所有产品线单元，其他单元只读。超级管理员仍可全局编辑。
- **级别徽章与筛选** ——通过审核的扩展在卡片、详情页、关联列表上展示产品线 / 公司徽章。浏览页过滤条增加"官方级别"筛选；选中产品线级后，还会出现内嵌的产品线选择条用于进一步缩窄。
- **申请记录** —— `/profile?section=requests` 展示发布者提交过的申请，驳回时显示审核员备注；待审请求可撤回。
- **CLI 契约不变** —— `/api/v1` 的 `badge` 字段从新的官方级别派生，`productLineId` 也保留为内部字段，CLI 行为不变。详细决策见 [ADR-0001](./adr/0001-official-tier-approval-workflow.md)（含 2026-06-08 产品线补遗）。

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
- **主题** —— Editorial Ivory（默认）、Dark 与 Mono Clean（高对比极简）；按账号保存偏好。

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
