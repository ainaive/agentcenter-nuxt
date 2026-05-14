// TODO(translate): Chinese labels and blurbs were drafted by an LLM and
// should be reviewed by a translator before GA.
//
// Static landscape of internal tool services for the MCP Panorama page.
// Two layers:
//   industry → 12 sectors → tools
//   public   → 5 domains × multiple PDTs → tools
//
// Status semantics: a tool's status is *derived* on read.
//   extensionId set ⇒ "released" (tile is clickable, links to marketplace)
//   else inDev      ⇒ "dev"      (amber, static)
//   else            ⇒ "none"     (grey, static, "no MCP needed")
//
// Sectors / domains / PDTs are seeded from this file and live in the DB so
// downstream queries can join. Tools are seeded too — see scripts/seed.ts.

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

export interface McpToolSeed {
  /** Stable, URL-safe identifier; also the tool's `slug`. */
  slug: string
  name: string
  nameZh?: string
  /** Owner path. Industry: "<sectorKey>". Public: "<domainKey>.<pdtKey>". */
  owner: string
  /** Has the marketplace MCP listing shipped? */
  released: boolean
  /** Currently being built but not yet shipped. */
  inDev: boolean
  depsCount: number
  blurb: string
  blurbZh: string
  tags: string[]
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
    key: "airnd",
    label: "AI R&D",
    labelZh: "AI 研发",
    short: "AI",
    pdts: [
      { key: "sysdesign", label: "System Design", labelZh: "系统设计" },
      { key: "devsvcs", label: "Development Services", labelZh: "开发服务" },
      { key: "testsvcs", label: "Testing Services", labelZh: "测试服务" },
      { key: "rndmaint", label: "R&D Maintenance", labelZh: "研发维护" },
      { key: "aiprod", label: "AI Production Line", labelZh: "AI 生产线" },
      { key: "knowsvcs", label: "Knowledge Services", labelZh: "知识服务" },
    ],
  },
  {
    key: "prodsw",
    label: "Product & Software",
    labelZh: "产品与软件",
    short: "P&S",
    pdts: [
      { key: "research", label: "Research & Innovation", labelZh: "研究与创新" },
      { key: "prodmgmt", label: "Product Management", labelZh: "产品管理" },
      { key: "buildsvcs", label: "Build Services", labelZh: "构建服务" },
      { key: "release", label: "Release & Delivery", labelZh: "发布与交付" },
      { key: "uxdesign", label: "UX & Design Systems", labelZh: "体验与设计系统" },
      { key: "i18n", label: "Localization", labelZh: "本地化" },
      { key: "support", label: "Customer Support", labelZh: "客户支持" },
      { key: "analytics", label: "Product Analytics", labelZh: "产品分析" },
    ],
  },
  {
    key: "hardware",
    label: "Hardware",
    labelZh: "硬件",
    short: "HW",
    pdts: [
      { key: "schematic", label: "Schematic Design", labelZh: "原理图设计" },
      { key: "pcb", label: "PCB Layout", labelZh: "PCB 布局" },
      { key: "mech", label: "Mechanical CAD", labelZh: "机械 CAD" },
      { key: "thermals", label: "Thermals & EMC", labelZh: "热与 EMC" },
      { key: "hwverif", label: "HW Verification", labelZh: "硬件验证" },
    ],
  },
  {
    key: "proddigi",
    label: "Product Digitization",
    labelZh: "产品数字化",
    short: "PD",
    pdts: [
      { key: "plm", label: "Product Lifecycle Mgmt", labelZh: "产品生命周期管理" },
      { key: "twin", label: "Digital Twin", labelZh: "数字孪生" },
      { key: "datacat", label: "Data Catalog", labelZh: "数据目录" },
      { key: "process", label: "Process Automation", labelZh: "流程自动化" },
    ],
  },
  {
    key: "infra",
    label: "Infrastructure",
    labelZh: "基础设施",
    short: "INF",
    pdts: [
      { key: "compute", label: "Compute Platform", labelZh: "算力平台" },
      { key: "network", label: "Internal Network", labelZh: "内部网络" },
      { key: "storage", label: "Storage & Backup", labelZh: "存储与备份" },
      { key: "iam", label: "Identity & Access", labelZh: "身份与访问" },
      { key: "observ", label: "Observability", labelZh: "可观测性" },
      { key: "secops", label: "Security Ops", labelZh: "安全运营" },
    ],
  },
]

// ─── Tools ───────────────────────────────────────────────────────────────────
// Compact constructor keeps the source close to the original design data.
function tool(
  name: string,
  owner: string,
  status: McpStatus,
  depsCount: number,
  blurb: string,
  blurbZh: string,
  tags: string[],
  nameZh?: string,
): McpToolSeed {
  return {
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    name,
    nameZh,
    owner,
    released: status === "released",
    inDev: status === "dev",
    depsCount,
    blurb,
    blurbZh,
    tags,
  }
}

export const MCP_TOOLS: McpToolSeed[] = [
  // ── Industry · Wireless ─────────────────────────────────────────
  tool("5G-Sim", "wireless", "released", 12, "End-to-end 5G NR link simulator", "端到端 5G NR 链路仿真器", ["sim", "rf"]),
  tool("RadioPlan", "wireless", "released", 7, "Cell planning + propagation maps", "小区规划与传播图", ["planning", "gis"]),
  tool("SpectrumMgr", "wireless", "dev", 4, "Spectrum allocation & interference", "频谱分配与干扰分析", ["spectrum"]),
  tool("BeamOpt", "wireless", "dev", 3, "Massive-MIMO beam optimizer", "大规模 MIMO 波束优化器", ["mimo", "optim"]),
  tool("AntennaCAD", "wireless", "none", 2, "Antenna 3D modeling suite", "天线三维建模套件", ["cad"]),
  tool("RANConfig", "wireless", "released", 9, "RAN parameter rollout & rollback", "RAN 参数发布与回滚", ["config", "ran"]),
  tool("FieldTest", "wireless", "none", 1, "On-site drive-test recorder", "现场路测记录工具", ["field"]),

  // ── Industry · Datacom ─────────────────────────────────────────
  tool("RouteForge", "datacom", "released", 14, "BGP/OSPF policy author + simulator", "BGP/OSPF 策略编辑与仿真", ["routing"]),
  tool("PacketLens", "datacom", "released", 8, "Distributed packet capture & search", "分布式抓包与检索", ["pcap"]),
  tool("ConfigPilot", "datacom", "dev", 11, "Multi-vendor device config diff & deploy", "多厂家设备配置对比与下发", ["config"]),
  tool("TopoMap", "datacom", "dev", 5, "Live L2/L3 topology graph", "实时 L2/L3 拓扑图", ["graph"]),
  tool("NetSim", "datacom", "none", 3, "Discrete-event network simulator", "离散事件网络仿真器", ["sim"]),

  // ── Industry · Cloud ───────────────────────────────────────────
  tool("K8sOps", "cloud", "released", 22, "Cluster lifecycle + GitOps", "集群生命周期与 GitOps", ["k8s", "gitops"]),
  tool("ServiceMesh", "cloud", "released", 16, "Mesh policy + mTLS console", "服务网格策略与 mTLS 控制台", ["mesh"]),
  tool("CostExplorer", "cloud", "released", 4, "Multi-cloud spend attribution", "多云成本分摊", ["finops"]),
  tool("CloudAudit", "cloud", "dev", 9, "Continuous compliance evidence", "持续合规证据采集", ["security"]),
  tool("MultiCloud", "cloud", "dev", 6, "Cross-provider workload mover", "跨云负载迁移", ["multi"]),
  tool("EdgeProvision", "cloud", "none", 2, "Edge node bring-up automation", "边缘节点开通自动化", ["edge"]),

  // ── Industry · Terminals ───────────────────────────────────────
  tool("DeviceSim", "terminals", "released", 6, "Phone/tablet behavioral simulator", "手机/平板行为仿真器", ["sim"]),
  tool("FirmwareForge", "terminals", "dev", 10, "Cross-arch firmware build matrix", "跨架构固件构建矩阵", ["build", "fw"]),
  tool("BatteryLab", "terminals", "released", 3, "Battery wear + thermal logs", "电池老化与热日志", ["battery"]),
  tool("ScreenTest", "terminals", "none", 2, "Pixel-level display QA suite", "像素级显示 QA 套件", ["qa"]),
  tool("BSP-Pack", "terminals", "none", 5, "Board support package authoring", "BSP 制作工具", ["bsp"]),

  // ── Industry · Optical ────────────────────────────────────────
  tool("OFiberPlan", "optical", "released", 5, "Fiber route + budget calculator", "光纤路由与预算计算", ["fiber"]),
  tool("WDM-Tune", "optical", "dev", 3, "WDM channel tuner & monitor", "WDM 通道调谐与监控", ["wdm"]),
  tool("OTDR-Sweep", "optical", "none", 1, "OTDR scan ingestion & alerts", "OTDR 扫描接入与告警", ["otdr"]),

  // ── Industry · Carrier ────────────────────────────────────────
  tool("CarrierOps", "carrier", "released", 8, "Operator NMS workflows", "运营商 NMS 工作流", ["nms"]),
  tool("ChurnPredict", "carrier", "dev", 2, "Subscriber churn signals", "用户流失信号分析", ["ml"]),

  // ── Industry · Enterprise ─────────────────────────────────────
  tool("EntDeploy", "enterprise", "released", 4, "Enterprise rollout playbooks", "企业部署剧本", ["deploy"]),
  tool("LicensePool", "enterprise", "none", 6, "License inventory & reclaim", "许可证清点与回收", ["license"]),

  // ── Industry · Consumer ──────────────────────────────────────
  tool("ConsumerCRM", "consumer", "released", 3, "Consumer device support CRM", "消费者设备支持 CRM", ["crm"]),
  tool("RetailKit", "consumer", "dev", 2, "Retail demo + provisioning", "零售演示与开通", ["retail"]),

  // ── Industry · Digital Energy ─────────────────────────────────
  tool("GridSCADA", "energy", "dev", 7, "Grid SCADA bridge + analytics", "电网 SCADA 桥接与分析", ["scada"]),
  tool("InverterTune", "energy", "released", 2, "PV inverter parameter tuning", "光伏逆变器参数调优", ["pv"]),

  // ── Industry · Intelligent Auto ───────────────────────────────
  tool("ADAS-Replay", "auto", "released", 5, "ADAS sensor log replay farm", "ADAS 传感器日志回放集群", ["adas"]),
  tool("OTA-Vehicle", "auto", "dev", 4, "Vehicle OTA campaign manager", "整车 OTA 活动管理", ["ota"]),
  tool("HD-Map", "auto", "none", 3, "HD map authoring + diff", "高精地图编辑与对比", ["map"]),

  // ── Industry · Smart City ─────────────────────────────────────
  tool("CityOpsHub", "smartcity", "dev", 6, "Municipal ops command", "城市运营指挥", ["city"]),
  tool("TrafficSig", "smartcity", "released", 3, "Adaptive traffic signal control", "自适应交通信号控制", ["traffic"]),

  // ── Industry · Industrial ─────────────────────────────────────
  tool("MES-Bridge", "industrial", "released", 9, "MES ↔ shop-floor data bridge", "MES 与产线数据桥接", ["mes"]),
  tool("RobotOrchestrate", "industrial", "dev", 4, "Cell-level robot orchestration", "工位级机器人编排", ["robotics"]),
  tool("PredMaint", "industrial", "none", 2, "Predictive maintenance baseline", "预测性维护基线", ["pdm"]),

  // ── Public · AI R&D · System Design ────────────────────────────
  tool("ArchDesigner", "airnd.sysdesign", "released", 9, "Block-diagram architecture authoring", "架构框图编辑", ["arch", "spec"]),
  tool("ReqAnalyzer", "airnd.sysdesign", "dev", 6, "Requirement extraction from docs", "从文档抽取需求", ["req", "nlp"]),
  tool("SpecGen", "airnd.sysdesign", "released", 4, "Boilerplate spec generator", "规范文档生成器", ["spec"]),
  tool("TradeStudy", "airnd.sysdesign", "none", 2, "Trade-study comparison matrix", "权衡分析矩阵", ["matrix"]),

  // ── Public · AI R&D · Development Services ─────────────────────
  tool("IDE", "airnd.devsvcs", "released", 38, "Internal IDE with AI assist", "内部 AI 增强 IDE", ["ide", "editor"]),
  tool("CodeCheck", "airnd.devsvcs", "released", 26, "Static analysis + style enforcement", "静态分析与代码风格检查", ["lint", "static"]),
  tool("DT", "airnd.devsvcs", "dev", 18, "Distributed Tracing for builds", "构建分布式追踪", ["trace"]),
  tool("CodeNav", "airnd.devsvcs", "released", 15, "Repo-scale code search & xref", "仓库级代码检索与交叉引用", ["search"]),
  tool("SnippetHub", "airnd.devsvcs", "dev", 8, "Reusable snippet registry", "可复用代码片段注册表", ["snippet"]),
  tool("RefactorBot", "airnd.devsvcs", "none", 5, "Bulk refactor proposer", "批量重构建议器", ["refactor"]),

  // ── Public · AI R&D · Testing Services ─────────────────────────
  tool("TestForge", "airnd.testsvcs", "released", 12, "Test plan + suite generator", "测试计划与用例生成器", ["tests"]),
  tool("AutoTest", "airnd.testsvcs", "released", 9, "Browser/device test farm", "浏览器/终端测试集群", ["e2e"]),
  tool("PerfBench", "airnd.testsvcs", "dev", 7, "Reproducible perf benchmarks", "可复现性能基准", ["perf"]),
  tool("ChaosKit", "airnd.testsvcs", "none", 3, "Chaos engineering scenarios", "混沌工程场景", ["chaos"]),
  tool("CoverageVue", "airnd.testsvcs", "dev", 4, "Coverage drift visualizer", "覆盖率漂移可视化", ["coverage"]),

  // ── Public · AI R&D · R&D Maintenance ──────────────────────────
  tool("BugTracker", "airnd.rndmaint", "released", 30, "Issue tracker + SLA workflows", "缺陷跟踪与 SLA 工作流", ["bugs"]),
  tool("IncidentMgr", "airnd.rndmaint", "released", 18, "Incident response coordination", "事故响应协同", ["sre"]),
  tool("RootCause", "airnd.rndmaint", "dev", 11, "Causality across telemetry", "全链路根因分析", ["rca", "ml"]),
  tool("HotfixPilot", "airnd.rndmaint", "none", 4, "Hotfix branching automation", "热修复分支自动化", ["hotfix"]),

  // ── Public · AI R&D · AI Production Line ───────────────────────
  tool("ModelHub", "airnd.aiprod", "released", 22, "Model registry + lineage", "模型注册与血缘", ["mlops"]),
  tool("DataPipe", "airnd.aiprod", "released", 16, "Pipeline orchestrator", "流水线编排器", ["etl"]),
  tool("TrainOps", "airnd.aiprod", "dev", 14, "Distributed training scheduler", "分布式训练调度", ["train"]),
  tool("EvalSuite", "airnd.aiprod", "dev", 8, "Model eval & A/B harness", "模型评估与 A/B 框架", ["eval"]),
  tool("ServeMesh", "airnd.aiprod", "released", 11, "Model serving with autoscale", "弹性扩缩的模型服务", ["serve"]),

  // ── Public · AI R&D · Knowledge Services ───────────────────────
  tool("WikiSync", "airnd.knowsvcs", "released", 19, "Wiki ingestion + sync", "Wiki 接入与同步", ["wiki"]),
  tool("DocsGen", "airnd.knowsvcs", "released", 14, "Auto-generated reference docs", "自动生成参考文档", ["docs"]),
  tool("KnowledgeGraph", "airnd.knowsvcs", "dev", 9, "Org-wide entity graph", "组织级实体图谱", ["graph"]),
  tool("AskOrg", "airnd.knowsvcs", "dev", 6, "Org RAG-style Q&A", "组织 RAG 问答", ["rag"]),
  tool("Onboarding", "airnd.knowsvcs", "none", 3, "New-hire knowledge path", "新人知识路径", ["onboard"]),

  // ── Public · Product & Software · Research ─────────────────────
  tool("IdeaPad", "prodsw.research", "dev", 5, "Idea capture + scoring", "创意收集与评分", ["ideation"]),
  tool("PatentSearch", "prodsw.research", "released", 3, "Patent prior-art search", "专利现有技术检索", ["patent"]),

  // ── Public · Product & Software · Product Mgmt ─────────────────
  tool("RoadmapHub", "prodsw.prodmgmt", "released", 12, "Org-wide roadmap & dependencies", "组织级路线图与依赖", ["roadmap"]),
  tool("FeatureFlags", "prodsw.prodmgmt", "released", 8, "Targeted feature rollout", "定向特性灰度", ["flags"]),
  tool("CustomerVoice", "prodsw.prodmgmt", "dev", 4, "Voice-of-customer aggregator", "客户之声聚合", ["voc"]),

  // ── Public · Product & Software · Build ────────────────────────
  tool("BuildBot", "prodsw.buildsvcs", "released", 33, "Distributed build farm", "分布式构建集群", ["build"]),
  tool("ArtifactReg", "prodsw.buildsvcs", "released", 24, "Binary artifact store", "二进制制品库", ["artifact"]),
  tool("PipelineHub", "prodsw.buildsvcs", "dev", 15, "Pipeline-as-code platform", "流水线即代码平台", ["ci"]),
  tool("CacheGrid", "prodsw.buildsvcs", "none", 6, "Cross-job build cache", "跨任务构建缓存", ["cache"]),

  // ── Public · Product & Software · Release ──────────────────────
  tool("ReleaseTrain", "prodsw.release", "released", 11, "Release train coordinator", "发布列车协同", ["release"]),
  tool("CanaryGuard", "prodsw.release", "dev", 7, "Progressive delivery guard", "渐进式发布守门员", ["canary"]),

  // ── Public · Product & Software · UX ───────────────────────────
  tool("DesignTokens", "prodsw.uxdesign", "released", 9, "Cross-platform token sync", "跨平台设计令牌同步", ["tokens"]),
  tool("ComponentLab", "prodsw.uxdesign", "dev", 6, "Component playground + a11y", "组件实验室与无障碍检查", ["ui"]),

  // ── Public · Product & Software · i18n ─────────────────────────
  tool("LocoSync", "prodsw.i18n", "released", 4, "Translation memory sync", "翻译记忆同步", ["i18n"]),
  tool("PseudoLocale", "prodsw.i18n", "none", 1, "Pseudo-locale generator", "伪本地化生成器", ["i18n"]),

  // ── Public · Product & Software · Support ──────────────────────
  tool("TicketPilot", "prodsw.support", "released", 7, "Support ticket triage", "工单分诊", ["support"]),
  tool("KBPilot", "prodsw.support", "dev", 3, "Self-serve KB authoring", "自助知识库编辑", ["kb"]),

  // ── Public · Product & Software · Analytics ────────────────────
  tool("EventBus", "prodsw.analytics", "released", 18, "Product event ingestion", "产品事件接入", ["analytics"]),
  tool("FunnelLab", "prodsw.analytics", "dev", 5, "Funnel/cohort analytics", "漏斗与群组分析", ["funnel"]),

  // ── Public · Hardware ──────────────────────────────────────────
  tool("SchemaPilot", "hardware.schematic", "released", 6, "Schematic linting + reuse", "原理图检查与复用", ["schematic"]),
  tool("PCBFlow", "hardware.pcb", "released", 8, "PCB layout review tools", "PCB 布局评审工具", ["pcb"]),
  tool("MechCAD-Sync", "hardware.mech", "dev", 4, "Mechanical CAD versioning", "机械 CAD 版本管理", ["cad"]),
  tool("ThermSim", "hardware.thermals", "dev", 3, "Thermal simulation runner", "热仿真运行器", ["thermal"]),
  tool("EMC-Lab", "hardware.thermals", "none", 2, "EMC test orchestration", "EMC 测试编排", ["emc"]),
  tool("HWVerif", "hardware.hwverif", "released", 5, "HW verification dashboard", "硬件验证仪表盘", ["verif"]),

  // ── Public · Product Digitization ─────────────────────────────
  tool("PLM-Bridge", "proddigi.plm", "released", 14, "PLM data bridge to R&D", "PLM 数据桥接研发", ["plm"]),
  tool("TwinForge", "proddigi.twin", "dev", 6, "Digital twin authoring", "数字孪生编辑器", ["twin"]),
  tool("DataCatalog", "proddigi.datacat", "released", 21, "Org data catalog", "组织数据目录", ["data"]),
  tool("ProcessFlow", "proddigi.process", "dev", 8, "Process automation studio", "流程自动化编辑器", ["bpm"]),
  tool("FormBuilder", "proddigi.process", "released", 5, "Internal form builder", "内部表单构建器", ["forms"]),

  // ── Public · Infrastructure ───────────────────────────────────
  tool("ComputePilot", "infra.compute", "released", 28, "Compute fleet manager", "算力集群管理", ["compute"]),
  tool("NetCore", "infra.network", "released", 19, "Internal network control", "内部网络管控", ["network"]),
  tool("StoreOps", "infra.storage", "released", 17, "Storage tiering + backup", "存储分层与备份", ["storage"]),
  tool("VaultID", "infra.iam", "released", 31, "Identity + secrets", "身份与机密管理", ["iam"]),
  tool("ObservHub", "infra.observ", "released", 26, "Metrics/logs/traces hub", "指标/日志/追踪中枢", ["o11y"]),
  tool("AlertPilot", "infra.observ", "dev", 12, "Alert routing & dedupe", "告警路由与去重", ["alert"]),
  tool("SecOpsCenter", "infra.secops", "released", 14, "Security operations console", "安全运营控制台", ["secops"]),
  tool("ThreatHunt", "infra.secops", "dev", 7, "Threat hunting playbooks", "威胁狩猎剧本", ["threat"]),
  tool("BackupVerify", "infra.storage", "none", 3, "Backup restore drill runner", "备份恢复演练", ["backup"]),
]

// ─── Helpers (used by both server and client) ────────────────────────────────

/** Derive the runtime status of a tool row. */
export function deriveStatus(row: {
  extensionId: string | null
  inDev: boolean
}): McpStatus {
  if (row.extensionId) return "released"
  if (row.inDev) return "dev"
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
