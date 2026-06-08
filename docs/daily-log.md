# AgentCenter Daily Log · 每日简报

What changed each day. For the current capability list, see [features.md](./features.md).

每日变更记录。当前已交付能力清单见 [features.md](./features.md)。

> Note: this log starts fresh for the Nuxt rewrite. The original Next.js daily entries live in the archived repo; the product surface they describe is reproduced verbatim in [features.md](./features.md).

> 说明：本日志针对 Nuxt 重写从头开始记录。原 Next.js 仓库的历史每日记录保留在归档仓库；其描述的产品面已在 [features.md](./features.md) 中完整复刻。

---

## English

### 2026-06-08

**Briefing.** The official-tier approval workflow gains a product-line dimension. Product-Line Official is now per-line — Wireless / Datacom / Terminals / Cloud each get their own reviewer pool inside every functional category — and Company-tier admins of a given subCat can pick the Product-Line reviewers for that same subCat without a super-admin in the loop.

<details>
<summary>Details</summary>

- **Per-product-line endorsements** — Applying for Product-Line Official now requires picking a product line. The reviewer matrix at `/admin/reviewers` splits into two tabs: Company stays a single column per subCat, Product-Line becomes a 9 × 4 grid (subCats × product lines). Detail-page badges read "Wireless Official" / "无线官方" instead of the generic Product-Line label. (#43)
- **Delegated matrix edits** — Company-tier admins of subCat X can now manage the Product-Line reviewers for subCat X across every line, without escalating to a super-admin. Cells outside their subCat render greyed and read-only. Company-tier cells stay super-admin-only. (#43)
- **Product-line filter on the browse rail** — Both the tier filter and the product-line narrow live behind a single "Official" picker on the rail. The popover shows the four tiers; when Product-Line is selected it reveals a product-line row inside the same popover. `?tier=productLine&productLineId=wireless` round-trips through SSR; the trigger reads "Official: Wireless". (#43)
- **`/api/v1` contract preserved** — Tier and product line are intentionally suppressed at the public-CLI boundary; `badge: "official"` still derives from `officialTier != null`. ADR-0001 picks up a dated addendum capturing the rationale for partial-unique indexes and the delegation rule. (#43)
- **Demo accounts can sign in** — `bun run db:seed` now plants Better-Auth credential rows alongside the six demo users on `*@agentcenter.dev`. Password comes from `SEED_PASSWORD`, default `"agentcenter-dev-password"`. Click around the approval flow as amy (super-admin) or dao (company admin for `cloud`) without signing up a fresh account. (#43)

</details>

---

### 2026-05-21

**Briefing.** Today's release brings an editorial pass to the extension list and detail pages — cards simplify into preview rectangles with a single meta line, the filter rail collapses to a quiet single row with dismissible state chips, the detail-page hero gains a stronger anchor and a confident primary CTA, and every tab body now sits inside its own framed card.

<details>
<summary>Details</summary>

- **A simpler extension card** — Cards on the browse page drop the tag pills and the inline Install button. Each one now reads as a preview rectangle: a slightly larger icon, name + badge, a three-line description, and a single meta line carrying department, star rating, and download count. Clicking anywhere on the card opens the detail page where install lives. (#27)

- **A quieter filter rail** — The browse filters collapse from three rows to a single line of compact pills. The hard divider beneath them is gone; active states are subtly tinted rather than ink-inverted; the "Scope:", "Department:", "Creator:", and "Publisher:" labels drop because the controls speak for themselves. The redundant Trending / New / Official / Open Source quick-filter row goes away — sort and the visible Official badge already cover the same ground. (#27)

- **You can see and dismiss what's filtered** — A new strip between the filters and the grid shows the result count plus a chip for each active filter (search term, scope, department, creator, publisher, each selected tag); click the × to remove just that filter, or "Clear all" to drop them in one tap. The sort control moves to this strip too, where it logically belongs next to the count. (#27)

- **Placeholder cards while results load** — First paint now shows eight subtle skeleton tiles in the grid rather than a blank space. (#27)

- **A breadcrumb back to the list** — A small "← Browse extensions" link sits above every detail page, so deep-linked detail views have a clear way back without relying on browser history. (#27)

- **A more confident detail hero** — Title shifts to a larger serif, description reads as a lede with more leading, the icon grows, and the stats line uses proper middle-dot separators. The Install button is now the page's clear primary action — larger, accent-filled — with Save and Share matching it in size but staying neutral. (#27)

- **README and tab bodies in framed cards** — Overview, Setup, and Permissions each render inside their own bordered card matching the sidebar, so the main content reads with the same composed weight as the rest of the page. (#27)

- **An editorial sidebar** — The About and Related panels gain serif headers, more breathing room, and refined typography. Related entries now show a badge, the owning department, and a star rating beside each name, so the recommendations feel like recommendations rather than an afterthought. (#27)

- **Underline-on-active tabs** — Overview / Setup / Permissions switch from a subtle background swap to a clean ink underline beneath the active tab, making the current section unambiguous. (#27)

- **Robust on narrow viewports and missing data** — The browse grid collapses to a single column below 640px wide instead of overflowing, the star rating displays nothing rather than "NaN" when an extension has no ratings yet, and Official / Popular / New badges now render in Chinese on `/zh` pages. (#27)

</details>

---

### 2026-05-19

**Briefing.** Today's release reshapes the MCP Panorama around realistic multi-MCP tools — a software tool can now expose several MCP servers — and strips editorial labels from every group's stats in favour of the raw numbers, all of which double as one-click drill and filter actions.

<details>
<summary>Details</summary>

- **A software tool can ship multiple MCPs** — A tool no longer collapses to one MCP listing. CodeCheck now exposes both codecheck-mcp and molint-mcp; K8sOps and ObservHub each ship three. The detail panel adds an "Other MCPs in this tool" switcher so you can jump between sibling MCPs without closing the panel. (#24)

- **A more realistic MCP inventory** — Every MCP carries a descriptive name (kubectl-mcp, helm-mcp, metrics-mcp, identity-mcp, …) instead of a generic "tool-name-mcp" placeholder. The pool of "no MCP needed" tools shrinks from 19 to 6 truly legacy or manual workflows, so the panorama reflects an organization that actually ships MCPs. (#24)

- **Tool-as-card layout** — Each software tool reads as a small quiet card with a serif name and a small status dot; its MCP servers render inside as vivid status-coloured pills. PDTs become subtly recessed regions, giving the page a clear hierarchy: domain → recessed PDT → raised tool card → vivid MCP pills. (#24)

- **Raw numbers replace ranking labels** — Group headers no longer carry a "Leading / On track / Lagging" verdict pill. Each shows the underlying numbers — total count, a "5/8 released" fraction, and a thin stacked status bar. The summary's right block lists the top three groups by release %, ranked numerically, instead of singling out one "Leading" name. (#25)

- **Every count is now clickable** — Numbers on the page double as actions. Click a group's title to drill in; click "Released 87" to flip the status filter to released (and again to flip back to all); click a top-three entry to jump straight there. (#25)

- **Developer ergonomics in the detail panel** — A copy-MCP-URI button sits next to the endpoint for released MCPs, with a check-icon confirmation. The MCP's tags surface as small chips above the metadata grid, so you can see at a glance what an MCP covers. (#25)

</details>

---

### 2026-05-18

**Briefing.** Today's release pivots browsing toward type-first navigation, gives the home page a real curated "Featured this week" spotlight, and adds a Mono Clean theme alongside Ivory and Dark.

<details>
<summary>Details</summary>

- **Mono Clean theme + 3-way switcher** — A third theme joins Editorial Ivory and Dark. The old toggle becomes a labelled dropdown listing all three options with short descriptors and preview tiles, so the choice and what each looks like sit side by side. (#22)

- **"Featured this week" on the home page** — The home banner replaces the generic placeholder with a real curated extension: name, tagline, install command, and a deep link to the detail page. When no extension is marked featured, the home falls back to a slim editorial card. (#23)

- **Type-first Explore dropdown** — Clicking Explore in the top bar now opens a dropdown listing the four extension types (Skills, MCP Servers, Slash Commands, Plugins) plus MCP Panorama. Browsing always starts with a type choice; the flat "all extensions" list is no longer the default destination but stays reachable as a fallback. (#23)

- **Sidebar leads with the function-types taxonomy** — Enterprise users who navigate by functional domain now see the full Work Task / Business / Tools tree as their primary sidebar navigation. Browse-by-type pills sit above; the placeholder Collections section is hidden until it carries real data. (#23)

- **Quieter editorial shell** — Sidebar and main content share one background with no dividing line, the top bar is taller, the search bar is borderless until focus, the sidebar's vertical scrollbar is hidden, and the accent color is reserved for the home spotlight and primary CTAs — secondary states use weight or a thin left rule instead. (#23)

</details>

---

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

### 2026-06-08

**简报。** 官方认证流程引入产品线维度。产品线官方现在按线划分（无线 / 数通 / 终端 / 云），每个产品线在每个功能分类下都有独立审核员；同一 subCat 下的公司级管理员可直接配置该 subCat 各产品线的审核员，无需找超级管理员。

<details>
<summary>详情</summary>

- **按产品线认证** —— 申请产品线官方时必须选择产品线。`/admin/reviewers` 审核员矩阵拆为两个标签页：公司级仍是 subCat 单列，产品线级变为 9×4 网格（subCat × 产品线）。详情页徽章显示具体产品线，如"无线官方" / "Wireless Official"，不再是泛指的"产品线官方"。 (#43)
- **代理矩阵编辑** —— subCat X 的公司级管理员现在可直接管理该 subCat 下所有产品线的审核员，无需超级管理员介入。其他 subCat 的单元呈灰色只读。公司级单元仍仅超级管理员可改。 (#43)
- **浏览页加入产品线筛选** —— 浏览页过滤条上只保留一个"官方"选择器，同时承载级别和产品线两个维度。弹层中先展示四个级别，选中"产品线"后再在同一弹层中显示产品线选项。`?tier=productLine&productLineId=wireless` 可在 SSR 中完整往返，触发器文本显示为"官方: 无线"。 (#43)
- **`/api/v1` 契约不变** —— 级别和产品线在公共 CLI 边界仍被刻意屏蔽，`badge: "official"` 仍由 `officialTier != null` 派生。ADR-0001 新增一则补遗，记录使用分区唯一索引（而非 `NULLS NOT DISTINCT`）以及代理授权规则的取舍。 (#43)
- **演示账号可登录** —— `bun run db:seed` 现在会为 6 个 `*@agentcenter.dev` 演示用户写入 Better-Auth 凭据行。密码来自 `SEED_PASSWORD`，默认为 `"agentcenter-dev-password"`。无需新注册账号即可以 amy（超级管理员）或 dao（`cloud` 公司级管理员）等身份体验完整审核流程。 (#43)

</details>

---

### 2026-05-21

**简报。** 今日发布为扩展列表页与详情页带来编辑视觉精修——卡片简化为单行 meta 的预览矩形，筛选条折叠为安静的单行，并新增可逐项移除的筛选状态标签；详情页主视觉锚定更稳，安装按钮升格为页面的主操作；每个标签页正文都装入独立卡框。

<details>
<summary>详情</summary>

- **更简洁的扩展卡** ——浏览页的卡片去掉了标签胶囊与内嵌的安装按钮。每张卡现在只读一组预览要素：稍大的图标、名称 + 徽章、三行描述，以及一行包含部门、星级与下载量的 meta。点击卡片任意位置即跳转到详情页，安装入口收归详情页。（#27）

- **更安静的筛选条** ——浏览筛选从三行折叠为一行紧凑胶囊。下方的硬分割线移除；激活态由墨色反相改为淡淡的色调；不再标注"Scope:" / "Department:" / "Creator:" / "Publisher:"，控件本身已自解释。冗余的"热门 / 最新 / 官方 / 开源"快速筛选行也一并下线——排序下拉与卡片上可见的 Official 徽章已覆盖同样的语义。（#27）

- **能看见且能逐项移除当前筛选** ——筛选条与网格之间新增一条状态带：左侧显示结果总数，紧跟一组代表每个生效筛选（搜索词、范围、部门、作者、发布商、每个选中标签）的可移除标签——点击 × 只移除该项，或点击"Clear all"一次全清。排序下拉也搬到这条状态带的右侧，与结果数同居一处。（#27）

- **加载时的占位卡** ——首次渲染时网格会显示八张柔和的骨架占位，而非一片空白。（#27）

- **一条回到列表的面包屑** ——每个详情页顶部都加上了一条"← 浏览扩展"链接，深度链接进入的详情页也能一键返回列表，不必依赖浏览器历史。（#27）

- **更有分量的详情页主视觉** ——标题改为更大号的衬线，描述以 lede 字号呈现并加大行距，图标尺寸放大，统计行采用标准"·"分隔符。安装按钮成为页面唯一明确的主操作——更大、强调色填充——保存与分享尺寸相匹配但保持中性。（#27）

- **README 与各标签内容装入卡框** —— Overview / Setup / Permissions 三个标签的正文各自置于带描边的卡内，与右侧边栏卡视觉对齐，主内容区读起来与页面其他元素一样从容。（#27）

- **更编辑感的侧栏** —— About 与 Related 两块面板换为衬线标题，留白更宽，排版更克制。Related 列表的每一项现在带徽章、所属部门与星级，让推荐看起来是有意挑选的，而非附赠。（#27）

- **激活下划线式标签页** —— Overview / Setup / Permissions 切换从轻微的背景换色改为干净的墨色下划线，当前所在标签一望即明。（#27）

- **窄屏与缺数据下的稳健性** ——浏览网格在 640px 以下视口收为单列，不再横向溢出；扩展若尚无评分则不再显示"NaN"，而是直接省略星级；Official / Popular / New 徽章在 `/zh` 页面下也以中文显示。（#27）

</details>

---

### 2026-05-19

**简报。** 今日发布围绕"一个软件工具可承载多个 MCP 服务"重构 MCP 全景图，并把每个分组上的"领先 / 落后"评级标签替换为可读的原始数字——而每一个数字本身又都成了可点击的下钻或筛选动作。

<details>
<summary>详情</summary>

- **一个软件工具可承载多个 MCP** ——工具不再被强行收敛为单一 MCP。CodeCheck 现在同时承载 codecheck-mcp 与 molint-mcp；K8sOps 与 ObservHub 各自承载三个。详情面板新增"本工具下的其他 MCP"切换器，可在同一工具的多个 MCP 之间快速跳转，无需关闭面板。（#24）

- **更真实的 MCP 清单** ——每个 MCP 都使用具描述性的名字（kubectl-mcp、helm-mcp、metrics-mcp、identity-mcp 等）取代通用的"工具名-mcp"占位。"无需 MCP"的工具数量从 19 个收缩到 6 个真正属于遗留或手工流程的工具——全景图终于更像一个真实在推进 MCP 化的组织。（#24）

- **工具卡 + MCP 胶囊的新排版** ——每个软件工具以一张安静的小卡片呈现，卡片标题用衬线字配以一个小小的汇总状态点；其下属的 MCP 服务器在卡内以醒目的状态色胶囊呈现。PDT 退化为微微凹陷的容器——版面层次自上而下一目了然：领域 → 凹陷的 PDT → 凸起的工具卡 → 醒目的 MCP 胶囊。（#24）

- **用原始数字取代评级标签** ——分组标题不再挂"领先 / 进展中 / 落后"评级胶囊。每个分组直接展示数字本身——总数、"5/8 已发布"分数，以及一条细分状态条。摘要区右栏不再单独点名一个"领先"分组，而是按发布率列出排名前三。（#25）

- **页面上的数字均可点击** ——页面上的每一个计数都成为可操作的入口。点击分组标题即下钻；点击"已发布 87"翻转状态筛选至"仅已发布"（再次点击则恢复"全部"）；点击排名前三的任意条目即可直跳该分组。（#25）

- **详情面板的开发者细节** ——已发布的 MCP 在 endpoint 旁新增一键复制按钮，复制成功后图标切到对勾示意。MCP 的标签以小标签形式呈现于元数据上方，无需离开面板即可了解 MCP 的覆盖范围。（#25）

</details>

---

### 2026-05-18

**简报。** 今日发布将浏览导向"先选类型"——Explore 改为下拉菜单，需先选定类型再进入；首页改用真实的"本周精选"扩展取代占位横幅；同时新增 Mono Clean 主题，与 Ivory、Dark 并列。

<details>
<summary>详情</summary>

- **Mono Clean 主题与三向切换器** ——新增第三套主题，与 Editorial Ivory、Dark 并列。原先的二态切换升级为带标签的下拉菜单，三套主题同时列出，每套配简短描述与预览块，可一眼对比选择。（#22）

- **首页"本周精选"** ——首页横幅由通用占位图换成一个真实的精选扩展：名称、宣传语、安装命令一应俱全，可直达详情页。如果当前没有标记为精选的扩展，首页会回退到一张简洁的编辑卡片。（#23）

- **Explore 改为"先选类型"下拉** ——顶部导航的 Explore 现在打开下拉菜单，列出四种扩展类型（Skill、MCP 服务器、斜杠命令、插件）与 MCP 全景图。浏览始终以选定类型开始；扁平的"全部扩展"列表不再是默认入口，但仍可作为回退访问。（#23）

- **侧边栏以功能分类为主导航** ——企业用户习惯按职能域导航——侧边栏首屏即展示完整的"工作任务 / 业务 / 工具"三层功能分类树作为主导航。按类型浏览的胶囊行位于其上方；占位的"收藏夹"分区在尚无真实数据前已隐藏。（#23）

- **更安静的编辑式外壳** ——侧边栏与主内容区共享统一背景、不再分隔；顶部导航更高，搜索框默认无边框、聚焦时才显现；侧边栏滚动条已隐去；主色仅保留给首页精选模块和主要 CTA——次级状态改用字重或细左线提示。（#23）

</details>

---

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
