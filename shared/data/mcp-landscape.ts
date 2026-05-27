// TODO(translate): Chinese labels and blurbs were drafted by an LLM and
// should be reviewed by a translator before GA.
//
// Static landscape of internal tool services for the MCP Panorama page.
// Two layers:
//   industry → 12 sectors → tools → MCPs
//   public   → 5 domains × multiple PDTs → tools → MCPs
//
// A tool is the *product* header; it owns 0–N MCP servers. Each MCP has its
// own status, deps, tags, blurb, and marketplace link:
//   extensionId set ⇒ "released" (tile is clickable, links to marketplace)
//   else inDev      ⇒ "dev"      (amber, static)
//   else            ⇒ "none"     (grey, static, "no MCP needed")
// Tools with `mcps: []` get a single greyed-out placeholder tile at runtime so
// the inventory stays visible.
//
// Sectors / domains / PDTs are seeded from this file and live in the DB so
// downstream queries can join. Tools and MCPs are seeded too — see
// scripts/seed-mcp-landscape.ts.

export type McpStatus = "none" | "dev" | "released"

export interface McpSectorSeed {
  key: string
  label: string
  labelZh: string
  short: string
}

export interface McpDomainSeed {
  key: string
  label: string
  labelZh: string
  short: string
  pdts: McpPdtSeed[]
}

export interface McpPdtSeed {
  key: string
  label: string
  labelZh: string
}

export interface McpSeed {
  /** Marketplace-wide MCP slug, e.g. "codecheck-mcp" or "molint-mcp". */
  slug: string
  /** Optional explicit display name; defaults to the slug at seed time. */
  name?: string
  nameZh?: string
  released: boolean
  inDev: boolean
  depsCount: number
  blurb: string
  blurbZh: string
  tags: string[]
}

export interface McpToolSeed {
  /** Stable, URL-safe identifier; also the tool's `slug`. */
  slug: string
  name: string
  nameZh?: string
  /** Owner path. Industry: "<sectorKey>". Public: "<domainKey>.<pdtKey>". */
  owner: string
  /** Tool-level blurb — describes the *product*, not any single MCP. */
  blurb: string
  blurbZh: string
  /** Zero or more MCP servers exposed by this tool. */
  mcps: McpSeed[]
}

// ─── Industry sectors (no PDTs) ──────────────────────────────────────────────
export const INDUSTRY_SECTORS: McpSectorSeed[] = [
  { key: "wireless", label: "Wireless", labelZh: "无线", short: "WRLS" },
  { key: "datacom", label: "Datacom", labelZh: "数通", short: "DTCM" },
  { key: "cloud", label: "Cloud", labelZh: "云", short: "CLD" },
  { key: "terminals", label: "Terminals", labelZh: "终端", short: "TERM" },
  { key: "optical", label: "Optical", labelZh: "光网络", short: "OPT" },
  { key: "carrier", label: "Carrier BG", labelZh: "运营商 BG", short: "CARR" },
  { key: "enterprise", label: "Enterprise BG", labelZh: "企业 BG", short: "ENT" },
  { key: "consumer", label: "Consumer BG", labelZh: "消费者 BG", short: "CONS" },
  { key: "energy", label: "Digital Energy", labelZh: "数字能源", short: "ENRG" },
  { key: "auto", label: "Intelligent Auto", labelZh: "智能汽车", short: "AUTO" },
  { key: "smartcity", label: "Smart City", labelZh: "智慧城市", short: "CITY" },
  { key: "industrial", label: "Industrial", labelZh: "工业", short: "IND" },
]

// ─── Public service domains and PDTs ─────────────────────────────────────────
export const PUBLIC_DOMAINS: McpDomainSeed[] = [
  {
    key: "ai-rd",
    label: "AI R&D",
    labelZh: "AI 研发",
    short: "AI",
    pdts: [
      { key: "system-design", label: "System Design", labelZh: "系统设计" },
      { key: "dev-services", label: "Development Services", labelZh: "开发服务" },
      { key: "test-services", label: "Testing Services", labelZh: "测试服务" },
      { key: "tool-pipeline", label: "R&D Tool Pipeline", labelZh: "研发工具生产线" },
      { key: "knowledge", label: "Knowledge Services", labelZh: "知识服务" },
    ],
  },
  {
    key: "prod-sw-eng",
    label: "Product & SW Engineering",
    labelZh: "产品与软件工程数字化",
    short: "P&S",
    pdts: [
      { key: "build", label: "Build Services", labelZh: "构建服务" },
      { key: "content-docs", label: "Experience Content & Docs", labelZh: "体验式内容与资料开发" },
      { key: "oss-vuln", label: "Open Source & Vulnerabilities", labelZh: "开源与漏洞" },
      { key: "release-maint", label: "Release & Maintenance", labelZh: "产品包发布与研发维护" },
      { key: "ipd-governance", label: "IPD Mgmt & Governance", labelZh: "IPD 管理与治理" },
      { key: "research", label: "Research & Innovation", labelZh: "研究与创新" },
    ],
  },
  {
    key: "hw-eng",
    label: "Hardware Engineering",
    labelZh: "硬件工程数字化",
    short: "HW",
    pdts: [
      { key: "design-sim", label: "HW Design & Simulation", labelZh: "硬件设计与仿真服务" },
      { key: "pcb", label: "PCB Tools", labelZh: "PCB 开发工具" },
      { key: "toolchain", label: "Hardware Toolchain", labelZh: "硬件工具链" },
    ],
  },
  {
    key: "prod-digi",
    label: "Product Digitization",
    labelZh: "产品数字化",
    short: "PD",
    pdts: [
      { key: "metapdm", label: "MetaPDM", labelZh: "MetaPDM" },
    ],
  },
  {
    key: "rnd-facilities",
    label: "R&D Facilities & Environment",
    labelZh: "研发设施与环境管理",
    short: "RDF",
    pdts: [
      { key: "lab-infra", label: "Lab Infrastructure", labelZh: "研发实验室基础设施服务" },
      { key: "rd-it-infra", label: "R&D IT Infrastructure", labelZh: "研发 IT 基础设施服务" },
    ],
  },
  {
    key: "prod-config",
    label: "Product Configuration",
    labelZh: "产品配置",
    short: "PC",
    pdts: [
      { key: "config", label: "Product Configuration", labelZh: "产品配置服务" },
      { key: "license", label: "License Configuration", labelZh: "License 配置服务" },
    ],
  },
]

// ─── Tools + MCPs ────────────────────────────────────────────────────────────
// Compact constructors keep the source close to the original design data.

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function tool(
  name: string,
  owner: string,
  blurb: string,
  blurbZh: string,
  mcps: McpSeed[],
  opts: { nameZh?: string } = {},
): McpToolSeed {
  return {
    slug: toSlug(name),
    name,
    nameZh: opts.nameZh,
    owner,
    blurb,
    blurbZh,
    mcps,
  }
}

function mcp(
  slug: string,
  status: McpStatus,
  depsCount: number,
  blurb: string,
  blurbZh: string,
  tags: string[],
  opts: { name?: string; nameZh?: string } = {},
): McpSeed {
  return {
    slug,
    name: opts.name,
    nameZh: opts.nameZh,
    released: status === "released",
    inDev: status === "dev",
    depsCount,
    blurb,
    blurbZh,
    tags,
  }
}

/** Convenience: a tool with a single MCP, slug explicit so it can describe
 * what the MCP exposes (`bgp-policy-mcp`, not `routeforge-mcp`). The MCP
 * inherits the tool's blurb by default. Multi-MCP tools call `tool(...)`
 * with an explicit mcps[] instead. */
function oneMcpTool(
  name: string,
  owner: string,
  blurb: string,
  blurbZh: string,
  mcpSlug: string,
  status: McpStatus,
  depsCount: number,
  tags: string[],
  opts: {
    nameZh?: string
    mcpBlurb?: string
    mcpBlurbZh?: string
    mcpName?: string
    mcpNameZh?: string
  } = {},
): McpToolSeed {
  return tool(name, owner, blurb, blurbZh, [
    mcp(
      mcpSlug,
      status,
      depsCount,
      opts.mcpBlurb ?? blurb,
      opts.mcpBlurbZh ?? blurbZh,
      tags,
      { name: opts.mcpName, nameZh: opts.mcpNameZh },
    ),
  ], { nameZh: opts.nameZh })
}

/** Convenience: a tool with a single in-development placeholder MCP. The
 * MCP slug derives from the tool slug; the display name is the standard
 * "In Development" / "开发中" placeholder. Used for tools that have been
 * scoped but where no concrete MCP has shipped yet. */
function oneDevTool(
  name: string,
  owner: string,
  opts: { nameZh?: string } = {},
): McpToolSeed {
  return tool(name, owner, "", "", [
    mcp(`${toSlug(name)}-mcp`, "dev", 0, "", "", [], {
      name: "In Development",
      nameZh: "开发中",
    }),
  ], { nameZh: opts.nameZh })
}

/** Convenience: a tool with **no** MCPs yet — renders a single placeholder
 * tile. Used for legacy / manual-workflow tools that truly don't need one. */
function noMcpTool(
  name: string,
  owner: string,
  blurb: string,
  blurbZh: string,
  opts: { nameZh?: string } = {},
): McpToolSeed {
  return tool(name, owner, blurb, blurbZh, [], opts)
}

export const MCP_TOOLS: McpToolSeed[] = [
  // ── Industry · Wireless ─────────────────────────────────────────
  oneMcpTool("5G-Sim", "wireless", "End-to-end 5G NR link simulator", "端到端 5G NR 链路仿真器", "linksim-mcp", "released", 12, ["sim", "rf"]),
  oneMcpTool("RadioPlan", "wireless", "Cell planning + propagation maps", "小区规划与传播图", "propmap-mcp", "released", 7, ["planning", "gis"]),
  oneMcpTool("SpectrumMgr", "wireless", "Spectrum allocation & interference", "频谱分配与干扰分析", "spectrum-mcp", "dev", 4, ["spectrum"]),
  oneMcpTool("BeamOpt", "wireless", "Massive-MIMO beam optimizer", "大规模 MIMO 波束优化器", "beamform-mcp", "dev", 3, ["mimo", "optim"]),
  noMcpTool("AntennaCAD", "wireless", "Antenna 3D modeling suite", "天线三维建模套件"),
  // RANConfig splits rollout and rollback into separate MCPs — common pattern
  // where dangerous operations get an isolated surface for safer agent use.
  tool("RANConfig", "wireless", "RAN parameter rollout & rollback", "RAN 参数发布与回滚", [
    mcp("ran-config-mcp", "released", 6, "Author and push RAN parameter sets", "编辑并下发 RAN 参数", ["config", "ran"]),
    mcp("ran-rollback-mcp", "released", 3, "Targeted RAN parameter rollback", "RAN 参数定向回滚", ["rollback", "ran"]),
  ]),
  oneMcpTool("FieldTest", "wireless", "On-site drive-test recorder", "现场路测记录工具", "drive-test-mcp", "dev", 1, ["field"]),

  // ── Industry · Datacom ─────────────────────────────────────────
  tool("RouteForge", "datacom", "BGP/OSPF policy author + simulator", "BGP/OSPF 策略编辑与仿真", [
    mcp("bgp-policy-mcp", "released", 9, "BGP policy editor + diff", "BGP 策略编辑与对比", ["routing", "bgp"]),
    mcp("ospf-mcp", "released", 5, "OSPF area + cost simulation", "OSPF 区域与代价仿真", ["routing", "ospf"]),
  ]),
  oneMcpTool("PacketLens", "datacom", "Distributed packet capture & search", "分布式抓包与检索", "pcap-search-mcp", "released", 8, ["pcap"]),
  oneMcpTool("ConfigPilot", "datacom", "Multi-vendor device config diff & deploy", "多厂家设备配置对比与下发", "device-config-mcp", "dev", 11, ["config"]),
  oneMcpTool("TopoMap", "datacom", "Live L2/L3 topology graph", "实时 L2/L3 拓扑图", "topo-graph-mcp", "dev", 5, ["graph"]),
  oneMcpTool("NetSim", "datacom", "Discrete-event network simulator", "离散事件网络仿真器", "netsim-mcp", "dev", 3, ["sim"]),

  // ── Industry · Cloud ───────────────────────────────────────────
  // K8sOps is a 3-MCP showcase: imperative kubectl, declarative helm, gitops.
  tool("K8sOps", "cloud", "Cluster lifecycle + GitOps", "集群生命周期与 GitOps", [
    mcp("kubectl-mcp", "released", 12, "Imperative cluster operations", "命令式集群操作", ["k8s"]),
    mcp("helm-mcp", "released", 7, "Helm chart install + diff", "Helm Chart 安装与对比", ["k8s", "helm"]),
    mcp("gitops-mcp", "dev", 3, "ArgoCD-style declarative sync", "ArgoCD 风格声明式同步", ["gitops"]),
  ]),
  tool("ServiceMesh", "cloud", "Mesh policy + mTLS console", "服务网格策略与 mTLS 控制台", [
    mcp("mesh-policy-mcp", "released", 10, "Traffic + auth policy editor", "流量与鉴权策略编辑", ["mesh"]),
    mcp("mtls-mcp", "released", 6, "mTLS cert rotation", "mTLS 证书轮换", ["mesh", "mtls"]),
  ]),
  oneMcpTool("CostExplorer", "cloud", "Multi-cloud spend attribution", "多云成本分摊", "finops-mcp", "released", 4, ["finops"]),
  oneMcpTool("CloudAudit", "cloud", "Continuous compliance evidence", "持续合规证据采集", "compliance-mcp", "dev", 9, ["security"]),
  oneMcpTool("MultiCloud", "cloud", "Cross-provider workload mover", "跨云负载迁移", "workload-mover-mcp", "dev", 6, ["multi"]),
  oneMcpTool("EdgeProvision", "cloud", "Edge node bring-up automation", "边缘节点开通自动化", "edge-bringup-mcp", "dev", 2, ["edge"]),

  // ── Industry · Terminals ───────────────────────────────────────
  oneMcpTool("DeviceSim", "terminals", "Phone/tablet behavioral simulator", "手机/平板行为仿真器", "device-sim-mcp", "released", 6, ["sim"]),
  tool("FirmwareForge", "terminals", "Cross-arch firmware build matrix", "跨架构固件构建矩阵", [
    mcp("firmware-build-mcp", "dev", 7, "Cross-arch firmware build", "跨架构固件构建", ["build", "fw"]),
    mcp("fw-sign-mcp", "dev", 3, "Signed firmware image assembly", "已签名固件镜像组装", ["fw", "sign"]),
  ]),
  oneMcpTool("BatteryLab", "terminals", "Battery wear + thermal logs", "电池老化与热日志", "battery-log-mcp", "released", 3, ["battery"]),
  noMcpTool("ScreenTest", "terminals", "Pixel-level display QA suite", "像素级显示 QA 套件"),
  oneMcpTool("BSP-Pack", "terminals", "Board support package authoring", "BSP 制作工具", "bsp-author-mcp", "dev", 4, ["bsp"]),

  // ── Industry · Optical ────────────────────────────────────────
  oneMcpTool("OFiberPlan", "optical", "Fiber route + budget calculator", "光纤路由与预算计算", "fiber-route-mcp", "released", 5, ["fiber"]),
  oneMcpTool("WDM-Tune", "optical", "WDM channel tuner & monitor", "WDM 通道调谐与监控", "wdm-channel-mcp", "dev", 3, ["wdm"]),
  noMcpTool("OTDR-Sweep", "optical", "OTDR scan ingestion & alerts", "OTDR 扫描接入与告警"),

  // ── Industry · Carrier ────────────────────────────────────────
  oneMcpTool("CarrierOps", "carrier", "Operator NMS workflows", "运营商 NMS 工作流", "nms-workflow-mcp", "released", 8, ["nms"]),
  oneMcpTool("ChurnPredict", "carrier", "Subscriber churn signals", "用户流失信号分析", "churn-signal-mcp", "dev", 2, ["ml"]),

  // ── Industry · Enterprise ─────────────────────────────────────
  oneMcpTool("EntDeploy", "enterprise", "Enterprise rollout playbooks", "企业部署剧本", "rollout-playbook-mcp", "released", 4, ["deploy"]),
  oneMcpTool("LicensePool", "enterprise", "License inventory & reclaim", "许可证清点与回收", "license-mcp", "dev", 5, ["license"]),

  // ── Industry · Consumer ──────────────────────────────────────
  oneMcpTool("ConsumerCRM", "consumer", "Consumer device support CRM", "消费者设备支持 CRM", "crm-ticket-mcp", "released", 3, ["crm"]),
  oneMcpTool("RetailKit", "consumer", "Retail demo + provisioning", "零售演示与开通", "retail-demo-mcp", "dev", 2, ["retail"]),

  // ── Industry · Digital Energy ─────────────────────────────────
  oneMcpTool("GridSCADA", "energy", "Grid SCADA bridge + analytics", "电网 SCADA 桥接与分析", "scada-bridge-mcp", "dev", 7, ["scada"]),
  oneMcpTool("InverterTune", "energy", "PV inverter parameter tuning", "光伏逆变器参数调优", "pv-tune-mcp", "released", 2, ["pv"]),

  // ── Industry · Intelligent Auto ───────────────────────────────
  oneMcpTool("ADAS-Replay", "auto", "ADAS sensor log replay farm", "ADAS 传感器日志回放集群", "sensor-replay-mcp", "released", 5, ["adas"]),
  oneMcpTool("OTA-Vehicle", "auto", "Vehicle OTA campaign manager", "整车 OTA 活动管理", "ota-campaign-mcp", "dev", 4, ["ota"]),
  oneMcpTool("HD-Map", "auto", "HD map authoring + diff", "高精地图编辑与对比", "hdmap-author-mcp", "dev", 3, ["map"]),

  // ── Industry · Smart City ─────────────────────────────────────
  oneMcpTool("CityOpsHub", "smartcity", "Municipal ops command", "城市运营指挥", "city-ops-mcp", "dev", 6, ["city"]),
  oneMcpTool("TrafficSig", "smartcity", "Adaptive traffic signal control", "自适应交通信号控制", "signal-control-mcp", "released", 3, ["traffic"]),

  // ── Industry · Industrial ─────────────────────────────────────
  oneMcpTool("MES-Bridge", "industrial", "MES ↔ shop-floor data bridge", "MES 与产线数据桥接", "mes-bridge-mcp", "released", 9, ["mes"]),
  oneMcpTool("RobotOrchestrate", "industrial", "Cell-level robot orchestration", "工位级机器人编排", "robot-cell-mcp", "dev", 4, ["robotics"]),
  oneMcpTool("PredMaint", "industrial", "Predictive maintenance baseline", "预测性维护基线", "predmaint-mcp", "dev", 2, ["pdm"]),

  // ── Public · AI R&D · System Design ────────────────────────────
  tool("Integrated Design Env", "ai-rd.system-design", "", "", [
    mcp("integrated-design-env-mcp", "dev", 0, "", "", [], { name: "In Development", nameZh: "开发中" }),
    mcp("dbdesigner-mcp", "released", 0, "", "", [], { name: "DB Designer", nameZh: "数据库设计" }),
    mcp("apidesigner-mcp", "released", 0, "", "", [], { name: "API Designer", nameZh: "API 设计" }),
  ], { nameZh: "集成设计环境" }),

  // ── Public · AI R&D · Development Services ─────────────────────
  oneMcpTool("Code Check", "ai-rd.dev-services", "", "", "codecheckreport-mcp", "released", 0, [], { nameZh: "代码检查服务", mcpName: "Code Check Report", mcpNameZh: "代码检查报告" }),
  oneMcpTool("Developer Test", "ai-rd.dev-services", "", "", "codecovservice-mcp", "released", 0, [], { nameZh: "开发者测试服务", mcpName: "Code Coverage", mcpNameZh: "代码覆盖率" }),
  noMcpTool("AI-Assisted R&D", "ai-rd.dev-services", "", "", { nameZh: "AI 辅助研发" }),
  noMcpTool("R&D IDE Tools", "ai-rd.dev-services", "", "", { nameZh: "研发 IDE 工具" }),

  // ── Public · AI R&D · Testing Services ─────────────────────────
  tool("CIDA", "ai-rd.test-services", "", "", [
    mcp("ticc-mcp", "released", 0, "", "", [], { name: "TICC", nameZh: "TICC" }),
    mcp("cloudtmss-mcp", "released", 0, "", "", [], { name: "Cloud TMSS", nameZh: "云端 TMSS" }),
    mcp("ai4tra-mcp", "released", 0, "", "", [], { name: "AI4TRA", nameZh: "AI4TRA" }),
    mcp("cida-mcp", "released", 0, "", "", [], { name: "CIDA", nameZh: "CIDA" }),
  ], { nameZh: "CIDA" }),
  oneMcpTool("Defect Tracking", "ai-rd.test-services", "", "", "dts-mcp", "released", 0, [], { nameZh: "缺陷跟踪服务", mcpName: "DTS", mcpNameZh: "DTS" }),
  noMcpTool("Cloud Testing", "ai-rd.test-services", "", "", { nameZh: "云端测试" }),

  // ── Public · AI R&D · R&D Tool Pipeline ────────────────────────
  oneMcpTool("Unified R&D Desktop", "ai-rd.tool-pipeline", "", "", "ipd-rag", "released", 0, [], { nameZh: "研发统一桌面框架", mcpName: "IPD RAG", mcpNameZh: "IPD RAG" }),
  oneDevTool("YunLong Foundation", "ai-rd.tool-pipeline", { nameZh: "云龙基础服务" }),
  oneMcpTool("Mgmt Process IT Integration", "ai-rd.tool-pipeline", "", "", "edevops-mcp", "released", 0, [], { nameZh: "管理业务流程 IT 一体化服务", mcpName: "eDevOps", mcpNameZh: "eDevOps" }),
  noMcpTool("R&D System Ops", "ai-rd.tool-pipeline", "", "", { nameZh: "研发系统运维" }),

  // ── Public · AI R&D · Knowledge Services ───────────────────────
  noMcpTool("Knowledge Search Portal", "ai-rd.knowledge", "", "", { nameZh: "知识检索门户" }),

  // ── Public · Product & SW · Build Services ─────────────────────
  oneMcpTool("Code Repository", "prod-sw-eng.build", "", "", "codehub-mcp", "released", 0, [], { nameZh: "代码仓服务", mcpName: "CodeHub", mcpNameZh: "代码仓 CodeHub" }),
  oneMcpTool("Build Service", "prod-sw-eng.build", "", "", "build-project-mcp", "released", 0, [], { nameZh: "构建服务", mcpName: "Build Project", mcpNameZh: "构建项目" }),
  tool("Pipeline Service", "prod-sw-eng.build", "", "", [
    mcp("cloudpipeline-mcp", "released", 0, "", "", [], { name: "CloudPipeline", nameZh: "云流水线" }),
    mcp("cloudpipeline2-mcp", "released", 0, "", "", [], { name: "CloudPipeline 2", nameZh: "云流水线 2" }),
  ], { nameZh: "流水线服务" }),
  oneMcpTool("Package Repository", "prod-sw-eng.build", "", "", "cloudartifact-mcp", "released", 0, [], { nameZh: "软件包仓库服务", mcpName: "CloudArtifact", mcpNameZh: "云制品" }),
  noMcpTool("Code Repo Metadata", "prod-sw-eng.build", "", "", { nameZh: "代码仓元数据" }),
  oneMcpTool("Software Info Tree", "prod-sw-eng.build", "", "", "swbom-mcp", "released", 0, [], { nameZh: "软件信息树服务", mcpName: "Software BOM", mcpNameZh: "软件 BOM" }),

  // ── Public · Product & SW · Content & Docs ─────────────────────
  oneMcpTool("R&D Knowledge Base", "prod-sw-eng.content-docs", "", "", "wiki-mcp", "released", 0, [], { nameZh: "研发知识库服务", mcpName: "Wiki", mcpNameZh: "Wiki" }),
  oneMcpTool("R&D Documentation", "prod-sw-eng.content-docs", "", "", "dbox-mcp", "released", 0, [], { nameZh: "研发文档开发", mcpName: "DocBox", mcpNameZh: "文档盒" }),
  noMcpTool("R&D Doc Collaboration", "prod-sw-eng.content-docs", "", "", { nameZh: "研发文档协同" }),
  noMcpTool("Experience Material Composer", "prod-sw-eng.content-docs", "", "", { nameZh: "体验式资料编排" }),

  // ── Public · Product & SW · Open Source & Vulnerabilities ──────
  oneMcpTool("OSS & Third-Party Mgmt", "prod-sw-eng.oss-vuln", "", "", "ostms-mcp", "released", 0, [], { nameZh: "开源与第三方软件管理服务", mcpName: "OSTMS", mcpNameZh: "OSTMS" }),
  noMcpTool("Vulnerability Tracking Platform", "prod-sw-eng.oss-vuln", "", "", { nameZh: "漏洞跟踪平台" }),
  noMcpTool("Software Dependency Audit", "prod-sw-eng.oss-vuln", "", "", { nameZh: "软件依赖审计" }),

  // ── Public · Product & SW · Release & Maintenance ──────────────
  oneDevTool("Release Mgmt", "prod-sw-eng.release-maint", { nameZh: "产品包发布管理服务" }),
  noMcpTool("R&D Operations Support", "prod-sw-eng.release-maint", "", "", { nameZh: "研发运维支持" }),

  // ── Public · Product & SW · IPD Mgmt & Governance ──────────────
  oneDevTool("IPD Operations Analytics", "prod-sw-eng.ipd-governance", { nameZh: "IPD 运营分析服务" }),
  oneDevTool("IPD R&D Project Mgmt", "prod-sw-eng.ipd-governance", { nameZh: "IPD 研发项目管理服务" }),
  noMcpTool("Cross-Domain Team Collaboration", "prod-sw-eng.ipd-governance", "", "", { nameZh: "跨域团队协同" }),
  noMcpTool("R&D Quality Management", "prod-sw-eng.ipd-governance", "", "", { nameZh: "R&D 质量管理" }),

  // ── Public · Product & SW · Research & Innovation ──────────────
  oneDevTool("Research & Innovation", "prod-sw-eng.research", { nameZh: "研究创新服务" }),

  // ── Public · Hardware · HW Design & Simulation ─────────────────
  oneDevTool("Schematic Design", "hw-eng.design-sim", { nameZh: "原理图设计服务" }),
  noMcpTool("Hardware Verification Simulation", "hw-eng.design-sim", "", "", { nameZh: "硬件验证仿真" }),

  // ── Public · Hardware · PCB Tools ──────────────────────────────
  noMcpTool("PCB Layout Tools", "hw-eng.pcb", "", "", { nameZh: "PCB 布局工具" }),
  noMcpTool("Manufacturing Process Planning", "hw-eng.pcb", "", "", { nameZh: "制造工艺规划" }),

  // ── Public · Hardware · Hardware Toolchain ─────────────────────
  noMcpTool("Mechanical Structure Modeling", "hw-eng.toolchain", "", "", { nameZh: "机械结构建模" }),
  noMcpTool("Prototype Build Flow", "hw-eng.toolchain", "", "", { nameZh: "样机试制流程" }),
  noMcpTool("Hardware Verification Test", "hw-eng.toolchain", "", "", { nameZh: "硬件验证测试" }),
  noMcpTool("Hardware R&D Workbench", "hw-eng.toolchain", "", "", { nameZh: "硬件研发工作台" }),
  noMcpTool("Hardware IP Assets", "hw-eng.toolchain", "", "", { nameZh: "硬件 IP 资产" }),
  noMcpTool("Digital Logic Design", "hw-eng.toolchain", "", "", { nameZh: "数字逻辑设计" }),

  // ── Public · Product Digitization · MetaPDM ────────────────────
  oneDevTool("BOM Service", "prod-digi.metapdm", { nameZh: "BOM 服务" }),

  // ── Public · R&D Facilities · Lab Infrastructure ───────────────
  oneDevTool("Lab Environment", "rnd-facilities.lab-infra", { nameZh: "研发实验室环境服务" }),

  // ── Public · R&D Facilities · R&D IT Infrastructure ────────────
  noMcpTool("R&D IT Platform", "rnd-facilities.rd-it-infra", "", "", { nameZh: "研发 IT 平台" }),

  // ── Public · Product Config · Product Configuration ────────────
  noMcpTool("Product Catalog", "prod-config.config", "", "", { nameZh: "产品目录" }),
  noMcpTool("Product Config Repository", "prod-config.config", "", "", { nameZh: "产品配置仓库" }),
  noMcpTool("Product Config Editor", "prod-config.config", "", "", { nameZh: "产品配置编辑器" }),
  noMcpTool("Product Release Portal", "prod-config.config", "", "", { nameZh: "产品发布门户" }),
  noMcpTool("Product Config Engine", "prod-config.config", "", "", { nameZh: "产品配置引擎" }),

  // ── Public · Product Config · License Configuration ────────────
  noMcpTool("License Algorithm Engine", "prod-config.license", "", "", { nameZh: "License 算法引擎" }),
  noMcpTool("Software Order Processing", "prod-config.license", "", "", { nameZh: "软件订单处理" }),
  noMcpTool("License Activation Platform", "prod-config.license", "", "", { nameZh: "License 激活平台" }),
]

// ─── Helpers (used by both server and client) ────────────────────────────────

/** Derive the runtime status of an MCP row. */
export function deriveStatus(row: {
  extensionId: string | null
  inDev: boolean
}): McpStatus {
  if (row.extensionId) return "released"
  if (row.inDev) return "dev"
  return "none"
}

/** Roll a tool's MCPs up to a single tool-level status — "released wins". */
export function rollupStatus(statuses: McpStatus[]): McpStatus {
  if (statuses.some((s) => s === "released")) return "released"
  if (statuses.some((s) => s === "dev")) return "dev"
  return "none"
}

/** Resolve the layer + group keys for a tool's `owner` path. */
export function ownerToParts(owner: string): {
  layer: "industry" | "public"
  primary: string
  secondary?: string
} {
  if (owner.includes(".")) {
    const [primary, secondary] = owner.split(".")
    return { layer: "public", primary: primary!, secondary }
  }
  return { layer: "industry", primary: owner }
}
