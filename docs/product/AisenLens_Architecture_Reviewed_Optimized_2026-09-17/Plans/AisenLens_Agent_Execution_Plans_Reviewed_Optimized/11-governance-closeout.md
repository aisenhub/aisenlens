> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 11 — 文档治理、Agent 规则与最终收口

## 目标

让代码、Source of Truth、implementation status、迁移状态和执行记录一致；消除“文档说完成但代码/验证没有证据”的漂移。

## 必读

`ARCHITECTURE_INDEX.md`、所有 audit authority/source/state/dependency 文档、`AI_DEVELOPMENT_GUIDE.md`、`IMPLEMENTATION_MAP.md`、`MIGRATION_PLAN.md`、CHANGELOG/MANIFEST 规则、`architecture-traceability.md`。

## 实施步骤

1. 逐项核对 traceability：本期每个正式架构章节都有 implemented / explicit non-goal / approved deferred + reason。
2. Source of Truth 检查：duplicate authority=0；Archive 不成为 normative dependency；Concept 单一 Owner。
3. 更新 implementation status，只把有代码 + 验证证据的 target/implementing 标成 implemented。
4. 更新 IMPLEMENTATION_MAP / MIGRATION_PLAN / CHANGELOG / MANIFEST（若仓库治理要求）。
5. 运行/补齐已有 docs lint/dead link/source mapping；如果仓库没有且增加工具不值得，不为此新增重依赖，至少做可复核静态检查。
6. 核对代码依赖方向：Domain 不依赖 React/Workspace/Zustand UI；Infrastructure 实现 ports，不拥有业务语义。
7. 核对旧路径已退出：旧 direct Shot write、Shot.analysisFields 新写、重复 Results aggregation、provider formal write、Timeline canonical direct write 均不存在。
8. 汇总 remaining deferred：Keyframe draft、telemetry/cloud/collaboration/microservice 等保持非目标。
9. 整理 `verification-record.md` 交接；任何未验证项明确保留，不伪装完成。

## 最终用户级验收

按 Master Plan 13 个场景至少覆盖本期适用项：新项目 Official Shot、Analysis/Evidence、AI Candidate、correction return、Timeline、Template switch、Results/export、Creative、reload、large project、quota failure、multi-tab/late worker、corrupt import/provider response。

## GitHub 收口

本阶段自身文档变更也需 commit/push；确认远程分支包含全部前阶段必要 SHA。不得自行合并 main、创建 Release 或部署。

## 完成门槛

- 文档链接有效、无循环依赖、契约前后一致。
- `verification-record.md` 的“已交付”每行都能对应代码 commit + 验证 + push。
- 需要用户决定的事项单列；没有则明确“无”。

## 最终治理完整性清单

### Source of Truth / CURRENT-TARGET 同步
- 根据真实实现结果更新（如项目治理要求）`FINAL_CONCEPT_REGISTRY`、Source of Truth/Authority、State Ownership、Command/Event、Dependency、Implementation Map、Migration Plan；只更新发生事实变化的文档，不把 target 误写成 current。
- CURRENT baseline 与代码不一致时修正文档并保留证据；Archive 继续只追溯，不产生 normative link。
- 核对所有 feature flag：已达到移除条件的删除；仍需保留的记录 owner/default/removal criteria，不能把临时 rollout 变长期架构分叉。

### Architecture Traceability 硬收口
- `architecture-traceability.md` 映射到 01–11 的每一行必须有最终状态和证据；“阅读过/由其他 Phase 覆盖”不是证据。
- `verification-record.md` 的 Architecture Coverage Evidence 必须能反向定位代码文件、测试命令/exit code、浏览器步骤或 approved deferred/non-goal 决议。
- Master Plan 附录中的正式 Source of Truth 章节全部完成映射；Archive 重复章节只需证明已由正式文档接管或保留追溯。

### Accepted Risks 收口
- **R-01**：确认每个实施 Phase 已重新核实 affected files，剩余未审阅区域明确列出且不伪装为完成。
- **R-02**：Scene/Sequence/Section 最终 schema 已形成单一 Authority 并有持久化/Timeline/Analysis 测试；若延期必须记录阻塞和影响。
- **R-03**：Prompt/Context/ExportMapping 已按 Template Contract 分离到真实模块/配置；未实现部分必须是明确 deferred，不得回退到万能 Template JSON。

### AI Coding Agent 治理
- 将 `AI_DEVELOPMENT_GUIDE.md` 的读取规则落实到仓库实际 agent 指南/贡献规则（若仓库已有对应机制），至少保证：Shot/Boundary 修改前读 Shot Contract + Command/Event + 当前 shot code；Timeline 读 Shot Contract + Timeline + State Ownership；Analysis 读 Analysis Data + Evidence；Inspector 读 Analysis Data + Evidence + Inspector + AI Analysis Contract；Template 读 Analysis Data + Template Contract + 当前 template code；Results/Export 读 Analysis eligibility + Results + ExportMapping；AI 必须先读 `04-domain/ai/AI_ANALYSIS_CONTRACT.md`，再读 Candidate/Evidence/Prompt/Context/provider runtime boundaries。
- 核对没有 feature 内重新定义共享 field/shot/timeline/task/error/revision 语义；没有 Domain→React/Workspace/Zustand 反向依赖。

### 文档质量与交付
- dead link、duplicate authority、manifest/source mapping、CURRENT/TARGET、CHANGELOG 状态按真实工具或静态检查核对。
- 最终 13 个用户级场景外，再确认 Phase 10 的 runtime/security/capacity/diagnostics/feature-rollout gates 均有证据。
- 未验证/失败/延期保留历史；不得为了“全绿”删除失败记录或改写为从未发生。
- 最终静态治理扫描必须确认旧六阶段 `prepare/calibrate/overview/analyze/learn/create` 不再作为产品一级 IA；允许历史文档/迁移测试提及，但 canonical navigation writer 与现行 UI 只能产生 Preparation/Analysis/Results + 二级 view/mode。
- 最终 migration 文档不得重新声称需要 pre-v19 legacy project compatibility 或 `project editRevision`；v19 是 frozen baseline，后续 schema 只按 versioned migration/recovery 纪律演进。
- 最终 UI 治理扫描必须确认旧 Calm/Cinematic/Primary Violet/legacy blue、旧 `--app-*`、`--ai` 私色、`Arial Narrow` display、feature 私有 palette/radius/shadow/z-index/motion、`transition-all` 不再作为现行设计语言；允许中央短期 alias 仅在有 owner + deletion criterion 时存在。
- `WORKSPACE_DESIGN_SYSTEM.md` V2 Native Studio 是唯一 UI/UX Source of Truth；Phase 05–09 不得各自形成新的视觉主题、Panel 体系或 interaction grammar。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
