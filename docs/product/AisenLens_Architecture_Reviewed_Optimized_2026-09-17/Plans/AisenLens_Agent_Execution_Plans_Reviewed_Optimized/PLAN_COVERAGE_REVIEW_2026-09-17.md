# AisenLens 阶段执行计划覆盖审核与修订说明 — 2026-09-17

## 审核范围

本次只审核/修订阶段计划，不修改 AisenLens 产品代码。对照三层来源：

1. 正式 Reviewed/Optimized 架构：`00-global`、`01-preparation`、`02-analysis`、`03-results`、`04-domain`、`05-runtime`、`audit`、`implementation`。
2. 总计划：`Plans/AisenLens_MASTER_DEVELOPMENT_PLAN_2026-09-17.md`。
3. 原阶段计划：`00-master-execution-plan.md`、01–11 与 `architecture-traceability.md`。

Archive 仅用于追溯，不作为新的需求权威。

## 总结结论

原阶段计划的主依赖顺序、Authority/Source of Truth、Shot→Analysis 无损迁移、AI Candidate 隔离、Timeline 分层、Results derived-consumer、最终 hardening/governance 主线是正确的；但**不能称为阶段文件本身已经完整显式覆盖所有优化内容**。主要原因是大量细节仅通过 `architecture-traceability.md` 的“章节映射”隐式兜底，如果执行 Agent 只读阶段文件，很容易漏掉具体交互、失败模式、输出能力和验收项。

本版修订采用两种方式同时闭环：

- 将高风险、易漏、会影响实现结果的架构要求直接写入对应 Phase；
- 把 traceability 从“阅读提示”提升为“必须有 evidence 的完成硬门”，并在 `verification-record.md` 新增 Architecture Coverage Evidence。

## 逐阶段主要缺口与已修订内容

| Phase | 审核发现 | 本次修订 |
|---|---|---|
| 00 | 缺少“阶段摘要/traceability/正式原文”的完整覆盖协议；横切 runtime 要求分散 | 新增 Master→Execution 映射、完整覆盖协议、Persistence/Task/Trust/Diagnostics/Feature rollout/Capacity/Release 横切硬门 |
| 01 | 代码路径核实较好，但 UI 基线、storage failure、trust/export、feature flag、diagnostics、capacity fixtures 不完整 | 新增 UI/UX、runtime/trust/delivery、fixture/capacity 基线与 R-01 收口 |
| 02 | revision/task/error 已有，但缺 eviction/private mode、backup integrity、task resource/retry、export safety、diagnostics marks、feature rollout | 新增完整 Runtime Contract、V4–V6 Spike、R-02/R-03 下游冻结 |
| 03 | 迁移主线正确，但 Field/Record/Candidate、来源、Results eligibility/传播、Evidence 类型、Template persistence 细节不够 | 补完整数据契约、Evidence/Provenance、Template invariants、传播/eligibility 与迁移 fixture |
| 04 | Shell/tokens 已有，但 Design System 的 motion/media-first/workspace modes/view preference/loading/AI UI/editing philosophy/anti-patterns 过于隐式 | 补齐 Design System 行为与浏览器验收清单 |
| 05 | Shot Authority 完整，但 Preparation 优化细节缺失较多 | 补 settings Drawer、专家设置、真实/不确定进度、AI/Template 移除、Boundary Queue/Frame Pair/Preview/Confirm/微调/补切/Auto Next/重新确认/完成态/重开等 |
| 06 | 主闭环存在，但 Workspace Toolbar/Breadcrumb/Template settings/Correction impact 与 Inspector 细粒度 renderer/review/timeline/AI Ask 大量内容未显式 | 补 Workspace + Inspector 全量执行清单与浏览器验收 |
| 07 | Timeline 核心已有，但 Marker/Beat/Event、workspace states、track preference scope、invalid recovery、module/storage evolution、验收矩阵不足 | 补齐 Domain/Application/View/Integration 各层与资源预算/AI/context/迁移 |
| 08 | derived query 基础正确，但 Results 具体表格能力、Export Studio、Live Preview/Preset、Creative Transformation 输入/输出结构不足 | 补 Data Table、三类 Export、Preset、安全、Creative method-transfer/Derived Artifact/Previs |
| 09 | AI 边界总体正确，但最小 Context/发送范围、unsafe rich text、多字段 review、Data vs AI review、二次 revision 校验需加强 | 新增完整 AI workflow、privacy、安全渲染、per-field review 与 Ask 正式化路径 |
| 10 | hardening 主线正确，但 storage eviction、export safety、diagnostics marks/support bundle、feature flags、capacity、dependency audit 缺口明显 | 新增 Runtime Architecture 全覆盖和最终 Release Gate |
| 11 | 文档治理已有，但 accepted risks、实际 Source of Truth 更新、feature-flag 清退、AI coding guide 落地不够 | 新增 R-01/R-02/R-03 收口、Traceability evidence、CURRENT/TARGET/Agent governance |

## 关键修订原则

- 不把 Source of Truth 复制进阶段计划形成第二权威；阶段计划写“执行与验收”，规范细节仍以正式架构为准。
- 不把 Phase 10 当“最后再补正确性”的垃圾桶；revision/task/trust/a11y/performance 等在各功能阶段先实现，Phase 10 统一 harden/复验。
- 不新增产品技术栈/微服务/任意插件系统；所有新增要求均来自现有 Reviewed/Optimized 架构、Master Plan 或其 runtime audit。
- 不把 draft Keyframe 自动升级为正式 scope；仍保持 deferred/按已批准能力集成。
- 不声称产品代码已实现、测试已通过或 Git 已推送；本包仍是执行计划。

## 使用建议

执行时按 `agent-handoff.md` 进入；每 Phase 同时阅读当前阶段文件、`architecture-traceability.md` 对应行和正式架构原文。阶段结束前在 `verification-record.md` 填 Architecture Coverage Evidence。这样后续 Agent 即使分批执行，也能判断“是否真的覆盖了所有优化要求”，而不是只凭阶段摘要自我判定完成。
