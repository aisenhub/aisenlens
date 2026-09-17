# FINAL ARCHITECTURE AUDIT

## Executive Summary

本轮在不随意删减原内容的前提下，对已拆分的 AisenLens 优化设计包补齐 Authority、Source of Truth、Concept、State、Command/Event、Dependency 与 Implementation 治理层。原设计文本主体全部保留；新增 Template 独立契约，并在原有 Template 章节前增加非权威语境注记，从定义层消除“Template 多处皆为权威”的问题。

## Current Architecture

仓库 CURRENT 以 2026-09-17 核对为准：local-first IndexedDB、整数帧半开区间、auto-shot candidate -> user confirm -> formal Shot 已在当前架构文档中明确。当前 `ShotRecord` 仍直接包含 `analysisFields`，因此 Analysis 与 Shot 的物理持久化尚未完全解耦。详见 `CURRENT_REPOSITORY_BASELINE.md`。

## Target Architecture

```text
Media
 -> DetectionCandidate
 -> Boundary Review
 -> Shot Authority / Official Shot
 -> Analysis Authority / AnalysisRecord
 -> Results Dataset
 -> Export / Creative Artifact

AI -> AnalysisCandidate -> User Review -> AnalysisRecord
```

## Concept Registry Summary

核心 Concept 均在 `FINAL_CONCEPT_REGISTRY.md` 指定唯一 Proposed Owner；同义名通过 Alias 决策治理，不把不同生命周期实体强行合并。

## Authority Map

- Official Shot：Preparation / Shot Authority。
- Scene/Sequence/Section：Analysis Structure Authority，规则由 Timeline/Structure contract 约束。
- AnalysisRecord：Analysis Authority。
- Result Dataset：Derived consumption，不是第二事实源。
- AI：Candidate producer，不是正式 Source of Truth。

## Source of Truth Summary

见 `FINAL_SOURCE_OF_TRUTH_MATRIX.md`。新增 `04-domain/template/TEMPLATE_CONTRACT.md` 后，Template/Profile 具有明确唯一权威；旧章节只保留为 Usage/Boundary 说明。

## Major Duplicates

主要语义重复集中在 Template、stale、Shot mutation、Results eligibility。通过 Authority 注记与 Owner 规则治理，未用删除正文的方式处理。

## Major Conflicts

### P0
1. Shot 多写入源：设计层已解决为单 Shot Authority。
2. AI 静默成为正式事实：设计层已禁止。
3. CURRENT `ShotRecord.analysisFields` 与 TARGET Analysis Authority 解耦：设计已给出迁移路径，代码尚待实施，属于 implementation gap 而非未决设计冲突。

### P1
Template 万能职责、stale/candidate 状态混用、Timeline state ownership、Results 反向编辑等均已有明确 Owner/Resolution。

## Workspace Boundaries

Preparation 形成可靠 Official Shot；Analysis 消费 Shot 并形成正式 Analysis；Results 消费 eligible Analysis 并产生派生结果。跨工作区纠错使用显式 correction/navigation flow。

## Timeline Decision

Timeline = Domain + Application + View + Workspace Integration。Frame/Range/Track/Marker/structure rules 属于共享契约；viewport/zoom/hover/dragging 属于 UI/Workspace state。

## Analysis / Inspector Decision

Inspector 是 Analysis Data 的编辑/呈现界面，不拥有 Record/Candidate/stale 生命周期。

## Evidence Decision

EvidenceRef 为一等可重定位数据；Provenance 与 Record/Candidate revision 关联，不在 UI、Result 和 Candidate 多层重复复制同一事实。

## Template Decision

Template/Profile 与 Analysis Schema、UI Layout、Renderer、Prompt、Context、ExportMapping 分离。稳定字段语义仍归 Analysis Data Model。

## AI Boundary

AI 只能产生 Candidate/派生建议；任何写入正式 Analysis 的动作必须走显式确认命令，并记录 model/prompt/context/dependency provenance。

## State Ownership

Domain/Persistent/Application/Workspace/UI/Derived/Cache/Temporary state 已在 `STATE_OWNERSHIP.md` 分层。

## Dependency Rules

Domain 不依赖 React/Workspace/Zustand UI；Workspace/UI 只能向下消费 contract/application；Infrastructure 实现 port，不反向拥有语义。

## Final Documentation Architecture

`00-global` 定 IA/UI system；`01/02/03` 定 Workspace；`04-domain` 定共享领域契约；`05-runtime` 定 persistence/Worker/AI Provider/import-export/security/observability/release 的运行时契约；`audit` 定治理与最终校验；`implementation` 定代码映射/迁移；`99-archive` 完整保存原始输入。

## Implementation Boundary

当前 feature 路径已核对并映射；不存在的目标 repository/module 均按 PROPOSED 描述。

## Migration Priorities

P0 先做 Shot mutation 收敛、Analysis storage 解耦与 AI Candidate 隔离；再做 Template/Timeline/stale P1；最后 Results query 与文档 lint。

## Runtime / Engineering Architecture Review

复审发现原包的 Domain/UI 架构完整度高，但运行时工程契约不足，尤其缺少 IndexedDB quota/corruption、多标签页并发、Worker cancellation、AI 外部信任边界、可观测性与 CI/release gates 的统一 Source of Truth。本轮已新增 `05-runtime/OPERATIONAL_ARCHITECTURE.md` 并写回 Master Plan / Migration / Implementation Boundary。

另外修复 `STATE_OWNERSHIP.md` 中 canonical domain entities `Persistent? = No` 与“must survive reload/backup”的直接矛盾，修正为 `Yes`。

## Remaining Risks

- **ACCEPTED_ARCHITECTURE_RISK R-01:** 当前仓库尚未逐文件全量审阅，本轮 current-state verification 以架构文档、关键目录、Shot/Template 类型为代表；实施时每个 phase 仍需重新检查 affected files。
- **ACCEPTED_ARCHITECTURE_RISK R-02:** Scene/Sequence/Section 的最终持久化实体形态在现有目标文档中仍偏行为/时间轴设计，实施前需以不新增第二 Authority 为前提细化 schema。
- **ACCEPTED_ARCHITECTURE_RISK R-03:** Prompt/Context/ExportMapping 在当前代码中的具体模块尚未完整存在；Template Contract 规定的是 TARGET 边界。

## Final validation result

复审后设计层 P0：0 个未解决。产品/领域/UI 与 Runtime Architecture 均已有明确 Owner；剩余均为 migration/implementation work、需要以真实仓库验证的工程项或 accepted risks。总计划覆盖情况见 `MASTER_PLAN_COVERAGE_MATRIX.md`。
