> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 00 — Master Execution Plan

## 1. 用户问题与目标行为

把 AisenLens 已确定的产品、领域、运行时和交付架构转成可分阶段实施、可验证、可交接、可逐阶段推送 GitHub 的真实改造路线。最终目标不是“文档看起来一致”，而是：

**原始视频 → 可恢复的素材准备 → 唯一 Official Shot → 独立 Analysis Fact/Candidate/Evidence → Analysis Workspace/Inspector/Timeline → Derived Results/Export/Creative → 可靠持久化与发布门**。

## 2. 已冻结的架构决定

1. **Official Shot Authority 唯一**：Preparation/Shot Authority 是正式 Shot/Boundary 唯一写入者；Analysis/Timeline/Results 不直接改正式结构。
2. **Analysis Authority 独立**：v19 起 `ShotRecord` 不再持久化 Analysis 字段；AnalysisRecord/Candidate/Evidence/ContextManifest 生命周期独立。v1–v18 只属于冻结前开发数据，不建立长期 legacy compatibility。
3. **AI 非 Source of Truth**：Provider 输出只能先成为 Candidate/建议；Accept 前不能进入正式结果。
4. **Evidence/Provenance 一等数据**：与所属 Record/Candidate revision 可追溯。
5. **Template 不是万能 JSON**：稳定字段语义属于 Analysis Data；Layout/Renderer/Prompt/Context/ExportMapping 各自有边界。
6. **Timeline = Domain + Application + View**：时间/Range/结构语义不是 UI state；viewport/hover/zoom 不进 canonical persistence。
7. **Results 只消费**：Table/Export/Creative 读统一 derived query，不形成第二事实源。
8. **Local-first modular monolith**：维持现有技术栈和模块化单体，不引入微服务/分布式总线解决当前问题。
9. **Canonical write 以 repository transaction 成功为准**：UI 不得提前显示“已保存”。
10. **异步结果必须校验依赖 revision**：Worker/AI/export 的旧结果不能覆盖新事实。
11. **外部输入不可信**：import/provider response 在进入 Domain/Application 前做 schema/size/type/version validation。
12. **默认隐私诊断**：日志不记录媒体内容、分析正文或完整 prompt/context；远程 telemetry 另行设计同意/保留/脱敏。

## 3. 明确非目标

- 不借本次重构整个仓库、替换技术栈或设计系统。
- 不新增假按钮、假进度、假数据或只做静态页面的“完成态”。
- 不实现远程 telemetry、多用户协作、云同步、微服务、任意动态插件平台。
- `KEYFRAME_DESIGN_DRAFT.md` 仍是 draft；只复用当前已核实需求，不自行升级为 approved 架构。
- 本计划本身不执行产品代码修改、依赖安装、部署、Git commit/push。

## 3.1 UI 先行但能力诚实策略

为尽早验证信息架构和工作流，允许 UI 外壳先于完整功能实现，但必须区分“可观察状态”和“可执行能力”：

- 可以提前实现 Workspace 外壳、路由、导航、面板布局、空态、loading、error、saved/unsaved、disabled 和 Coming Soon 状态。
- 只有当对应的 domain/application/service、持久化边界和失败路径真实存在时，才提供可执行的操作按钮和表单提交；不得放置无操作、假提交或假进度的控件。
- 后续阶段功能尚未接入时，入口可以作为明确的禁用状态保留，但必须说明“未接入/即将支持”和当前原因，不得使用假数据证明完成。
- 领域契约尚未冻结的功能只实现稳定的外壳和状态，不提前实现会反过来锁死数据模型的详细编辑器。
- 空态和占位 UI 只有在真实数据接入、保存、错误和可访问路径验证后，才能作为该阶段的功能交付证据；否则只能记录为 shell/placeholder。

## 4. 当前代码证据与缺口

Phase 01/02 已完成真实仓库核实与 runtime/persistence 基线。Phase 03 的最新架构决定进一步覆盖旧 baseline：当前项目尚无正式用户项目数据，因此不继续维护 `ShotRecord.analysisFields` 旧 persistence，也不为 v1–v18 建 legacy compatibility；v19 定义为 Phase 04–09 的首个冻结 canonical data baseline。

截至 2026-09-18，Phase 03 的实现与定向验证按用户决定标记为阶段完成，后续执行转入 Phase 04。`verify:phase-03` 的完整组合压力复跑暂缓：pressure 用例单独通过，但接在完整浏览器序列后达到 120 秒超时；不得将该组合门禁误记为已通过，后续在 Phase 10/发布门统一复核。

当前仍需后续阶段完成的功能缺口：

- Phase 05 把现有结构写入口进一步收敛成唯一 Official Shot command authority；
- Phase 06 完成 Analysis Workspace/Inspector 的正式 UX 与 Evidence 操作；
- Phase 07 在已冻结 read contract 上完成 Timeline Domain/Application/View；
- Phase 08 在已冻结 Results dataset contract 上完成 Results/Export/Creative；
- Phase 09 在 Candidate + ContextManifest contract 上完成 provider/Context Builder；
- Phase 10 继续补 quota/corruption/private-mode/multi-tab/task lifecycle/security/performance/release hardening。
## 5. 阶段与推荐顺序

| 阶段 | 目标 | 主要依赖 | 第一可验证闭环 |
|---|---|---|---|
| 01 | 真实仓库核实与差异冻结 | 无 | 代码/命令/调用链事实可复核 |
| 02 | 跨阶段契约 + persistence/runtime baseline | 01 | revision/transaction/task/error/trust 规则有代码落点与测试设计 |
| 03 | Canonical Data Freeze：Analysis + Evidence + Template + downstream data boundaries | 01,02 | v19 成为唯一数据基线；Shot/Analysis 解耦；Timeline/Results/AI/Backup 边界冻结；v1–v18 开发数据明确 reset |
| 04 | Global Shell + Design System | 01,02,03 | 三 Workspace 可真实导航，状态/主题/键盘基础稳定 |
| 05 | Preparation + Official Shot Authority | 02,03,04 | 导入→Candidate→Boundary Review→Official Shot |
| 06 | Analysis Workspace + Inspector | 03,04,05 | 选择→播放→分析→证据→纠错返回闭环 |
| 07 | Timeline Domain/Application/View | 03,05,06 | 时间轴浏览/结构命令/双向联动且无第二数据源 |
| 08 | Results + Export + Creative | 03,07 | 同一 derived query 进入表格与可复现导出 |
| 09 | AI Candidate + Context Builder | 03,07,08 | provider→validated Candidate→review→accept/reject |
| 10 | Reliability/Security/Migration/Performance/A11y/Release Gate | 03–09 | failure/race/corrupt/backup/perf 真实验证闭环 |
| 11 | 文档治理与最终交付收口 | 01–10 | 文档状态与代码证据一致，所有阶段已推送 |

## 6. 并行与串行规则

**必须串行**：01→02→03；Phase 03 不只是 Analysis migration，而是 Phase 04–09 的 canonical data freeze，未完成 v19/authority/downstream boundary 冻结不得进入后续功能阶段。04 的 Shell/Design System 在 05 Preparation UI 与 06 Analysis Workspace 之前；05 的 Official Shot Authority 在 06/07 之前；07 的完整结构应用层在 08/09 完整集成之前；10 必须在功能阶段后做最终门禁。

**可有限并行**（仅当集成负责人冻结文件所有权且共享契约已完成）：

- Phase 04 的 Shell/Design System 与 Phase 05 的纯 domain command 测试准备可并行，但 Preparation UI 集成等 Phase 04 稳定。
- Phase 06 Inspector renderer/UI 与 Phase 07 Timeline View Adapter 可并行；共享 selection/revision contracts 由集成负责人独占。
- Phase 08 Results UI 与 Phase 09 provider adapter 可并行；两者都只读/消费 Phase 03 的 Analysis contract，不得各自定义字段语义。
- Phase 10 中性能/a11y/安全 fixture 可按文件所有权并行，最终 release gate 统一串行收口。

## 7. 跨阶段唯一权威契约

### 7.1 数据与身份
- Media identity：沿用现有 project/media authority；不得由 UI 重新生成。
- Shot identity + `[startFrame,endFrame)`：Shot Contract/Shot Authority；整数 FrameIndex 是正式结构基础。
- Analysis Field：稳定 `fieldId`；字段语义属于 Analysis Data。
- Project 维护独立 `structureRevision` / `analysisRevision`；Shot 维护自身 revision/structureRevision/lineage。
- AnalysisRecord 与 AnalysisCandidate 分离；Candidate 状态不能复用 Record 的 status。
- AnalysisContextManifest 绑定 subject、structure/analysis dependency revision、Prompt/Context definition version、evidence refs 和 media ranges。
- EvidenceRef/Provenance 随 record/candidate revision 追踪。
- Template/Profile 通过 stable fieldId 引用，不拥有字段语义。
- Timeline 只拥有派生 read model；Results 只拥有 derived dataset；AI provider 只产生 Candidate；三者都不得形成第二 canonical persistence。

### 7.2 状态归属
- Domain persistent：Official Shot/ShotGroup、AnalysisRecord、AnalysisCandidate、Evidence/Provenance、AnalysisContextManifest、Template/Profile、版本化结构数据。
- Application/session：Selection/ResearchScope/task 状态按契约管理。
- View-only：viewport/hover/drag/zoom 等不能进入 domain canonical persistence。

### 7.3 保存/失败/恢复
- UI 仅在 repository transaction 成功后显示 saved。
- expected revision mismatch 必须返回可恢复 typed conflict，不能 last-write-wins 静默覆盖。
- quota/abort/corruption 不等同于“用户删除数据”；进入只读/导出诊断/恢复路径。
- Backup v4 / Recovery 必须覆盖 canonical Shot、AnalysisRecord、Candidate、Evidence、ContextManifest 及其交叉引用；restore 必须做版本、schema、完整性与 ID remap 校验，损坏包不得污染 canonical repository。
- v18→v19 只允许一次明确的开发期 reset；v19 之后的正式 schema migration 不得沿用 reset 逃避兼容/恢复责任。

### 7.4 异步任务
统一 task envelope 至少有：`taskId`、task kind、input/dependency revision、start/cancel/fail/complete 状态、结果校验点。具体字段名在 Phase 02 根据现有代码冻结，后续阶段不得自行另建第二套 task lifecycle。

### 7.5 外部信任边界
- import/provider output 在 adapter 边界解析和校验。
- server/provider-owned secret 不进入前端 bundle；BYOK 与项目数据分离。
- Markdown/rich text 使用安全渲染，不执行导入脚本/函数。

## 7.6 Phase 03 Canonical Data Freeze

Phase 03 是后续 04–09 的数据架构门，不再只是“把旧 Analysis 搬到新表”：

- **v19 是首个冻结 schema**：Project / Shot / ShotGroup / AnalysisRecord / Candidate / Evidence / ContextManifest / Template/Profile 的 ownership、identity 与 revision 在此冻结。
- **v1–v18 是开发期数据**：由于尚无正式用户项目数据，不提供 legacy project compatibility；升级到 v19 时允许显式 development-reset。
- **Shot 与 Analysis 物理解耦**：canonical Shot 不持久化 analysisFields / description / notes；这些只允许作为从 AnalysisRecord 派生的 UI/overlay DTO。
- **结构影响先冻结**：Shot/Group mutation 推进 structureRevision，并使依赖 Analysis/Candidate/Evidence deterministic remap 或 stale。
- **下游只消费**：Timeline read model、Results dataset、AI Candidate/ContextManifest、Backup/Recovery contract 在 Phase 03 先冻结，后续 Phase 07–09 只实现功能，不再重定义底层事实。
- **未来迁移规则改变**：development-reset 只适用于 v19 冻结前；v19 之后任何正式 schema evolution 必须 versioned、可验证、可恢复、不得静默丢失数据。

## 8. 旧计划冲突与替代关系

- 原 Master Plan 的 Phase 0–10 **仍是目标覆盖来源**；本执行计划把其批次重排为更适合 agent 的依赖顺序，并新增“真实代码核实”和“契约冻结”硬门。
- 旧文档中任何“已完成”字样都不是验证证据；只有执行时实际代码 + 实际命令/浏览器验证 + Git push 记录有效。
- Archive 只追溯，不是 normative dependency。
- 若冻结前旧实现与 v19 目标架构冲突：本项目当前无正式用户项目数据，允许在 v18→v19 development-reset 中直接退出旧 persistence，不再保留兼容读/双读/长期 adapter。v19 之后若出现正式用户数据，所有后续迁移必须 versioned、可恢复、不得静默丢失。
- 无论任何阶段都禁止长期双写、双 schema 或两套事实模型并存。

## 9. 全局风险与处理

1. **未知真实代码**：Phase 01 先建立 affected code map；未经核实的文件路径标记待验证。
2. **数据迁移**：Phase 03 将 v1–v18 定义为冻结前开发数据，采用 v18→v19 development-reset，并以 Backup/Recovery v4、schema contract 和 transaction abort 证明边界；从 v19 起恢复正式 versioned migration、rollback/restore 与 no-data-loss 纪律。
3. **Scene/Sequence/Section 行为仍需实现**：Scene/Sequence/Section 的结构 kind 与持久化基线已在 Phase 02/03 冻结；Phase 05/07 负责 command、membership/association 与 Timeline 行为，不再重新设计第二套 schema。
4. **异步竞争**：所有 late result 检查 dependency revision；失败结果不得做 canonical write。
5. **高密度 UI**：不靠 Card/Modal 堆层级；统一 Design System、键盘、focus、LOD。
6. **性能阈值未知**：Phase 01/02 建真实基线，Phase 10 以固定测试条件验收，不编造跨设备指标。

## 10. 全局完成标准

必须同时满足：

- `architecture-traceability.md` 所有本期行都有“已实现 / 明确 non-goal / 明确延期且获批准”之一；
- 无新增第二 Authority/SoT、无禁止依赖、无长期双写；
- v19 schema/reset、未来 migration 纪律、保存失败/race/cancel/corrupt backup/provider malformed input 有真实验证记录；
- 用户主流程导入→切分→复核→分析→纠错→返回→导出可真实运行；
- 每阶段必要测试实际执行并记录退出码；
- 每阶段必要 commit 全部 push 到同一任务分支；
- 文档 implementation status 与代码证据一致。

## 10.1 本次复审核心补强：完整覆盖协议

为避免“架构要求只存在于 `architecture-traceability.md`，执行 agent 只读阶段摘要而漏做”，从本版开始执行以下硬规则：

1. **阶段计划正文 = 执行摘要，Traceability = 完整范围索引，正式架构原文 = 规范细节**。三者必须同时使用，不能只读其中之一。
2. 每个 Phase 开始时，先在 `architecture-traceability.md` 找到映射到该 Phase 的所有正式章节；这些章节下的规范性 bullet、表格行、状态、边界、反模式和验收条件均属于本阶段 scope。
3. 每个 Phase 结束前，必须在 `verification-record.md` 的“Architecture Coverage Evidence”中按来源文档记录：`implemented / explicit non-goal / approved deferred / not-applicable`，并给出代码、测试或浏览器验证证据。
4. **不得用“已阅读原文”替代覆盖证据**。如果原文要求了具体状态、错误恢复、键盘路径、迁移行为、性能预算或安全边界，必须有对应实现/测试/明确延期证据。
5. Archive 只用于追溯；若 Archive 与正式文档冲突，以正式 Source of Truth 为准。若正式文档之间冲突，按 `FINAL_SOURCE_OF_TRUTH_MATRIX` / `AUTHORITY_MAP` / `DECISION_LOG` 解决，不在 feature 内自行选择。
6. Master Plan Phase 0–10 与本执行计划 Phase 01–11 的映射固定为：`0→01/02`、`1→03`、`2→04`、`3→05`、`4+5→06`、`6→07`、`7→08`、`8→09`、`9→10`、`10→11`。任何 Master Plan 条目都必须能落到至少一个执行 Phase。
7. 横切要求（a11y、save/error、revision、task lifecycle、trust boundary、privacy diagnostics、performance、migration、rollback）不能因为有 Phase 10 最终门禁就推迟到最后；各功能 Phase 必须先按统一 contract 实现，Phase 10 只做系统性 hardening 与发布前复验。

## 10.2 本次复审新增的横切硬门

除原有全局完成标准外，所有阶段还要满足：

- **Persistence**：覆盖 quota、transaction abort、storage persistence unavailable/private mode/eviction、corruption、multi-tab 与 old-async-result；canonical data 失败时不得清库或伪装成功。
- **Task**：Detection/thumbnail/waveform/export/AI 等统一 `queued/running/succeeded/failed/cancelled` 语义，具备 dependency revision、bounded concurrency/memory、幂等 retry 约束与 stale-result discard。
- **Import/Render/Export trust**：导入项目/模板/文本/provider response 都是不可信输入；文件类型不能只信扩展名；Markdown/rich text 安全渲染；导出文件名/文本规范化；导出失败不改 canonical facts。
- **Diagnostics**：只记录 machine-readable error、subsystem、operation、duration、taskId、schema/revision 等；support bundle 脱敏且由用户显式触发。
- **Feature rollout**：高风险 migration/renderer/provider/batch conversion 可用 typed feature flag，但必须有 owner/default/removal criteria，且不得形成双 schema/双语义/双事实模型。
- **Capacity**：除了 Timeline FPS/交互，还要覆盖 project open/reopen、thumbnail/waveform cache upper bound、worker queue、peak decode/export memory、Results large-table、migration/backup duration。
- **Release**：CI/发布门至少包括 typecheck/lint/build、domain invariant、migration round-trip、malformed/corrupt import、revision race、worker cancel/crash、backup/restore、critical workspace smoke、performance budget 与现有工具链可执行的 dependency/security audit。

## 11. 阶段文档

- [01 — Repository Verification](01-repository-verification.md)
- [02 — Contract & Runtime Baseline](02-contract-runtime-baseline.md)
- [03 — Canonical Data Freeze](03-analysis-data-evidence-template.md)
- [04 — Global Shell & Design System](04-global-shell-design-system.md)
- [05 — Preparation & Shot Authority](05-preparation-shot-authority.md)
- [06 — Analysis Workspace & Inspector](06-analysis-workspace-inspector.md)
- [07 — Timeline](07-timeline-domain-application-view.md)
- [08 — Results/Export/Creative](08-results-export-creative.md)
- [09 — AI Workflow](09-ai-candidate-context.md)
- [10 — Hardening & Release Gate](10-hardening-release-gate.md)
- [11 — Governance & Closeout](11-governance-closeout.md)
- [Architecture traceability](architecture-traceability.md)
- [Agent handoff](agent-handoff.md)
- [Verification record](verification-record.md)
