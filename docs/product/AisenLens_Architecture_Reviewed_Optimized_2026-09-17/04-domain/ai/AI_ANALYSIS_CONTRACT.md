---
title: "AisenLens AI Analysis Contract"
doc_type: domain-contract
status: target-design
version: 1.0
last_reviewed: 2026-09-18
workspace:
  - analysis
scope:
  - webapp
  - domain
  - ai-integration
depends_on:
  - ANALYSIS_DATA_MODEL
  - EVIDENCE_PROVENANCE_CONTRACT
  - TEMPLATE_CONTRACT
  - OPERATIONAL_ARCHITECTURE
source_of_truth_for:
  - ai-candidate-lifecycle
  - context-manifest
  - provider-result-boundary
  - candidate-accept-transaction
implementation_areas:
  - apps/webapp/src/features/analysis
  - apps/webapp/src/features/template
  - apps/webapp/src/features/project
---

# AisenLens AI Analysis Contract

## Purpose

本文件是 AI 分析数据边界的正式 Source of Truth。Provider、Prompt、Context Builder、Worker 与 UI 都只能生成或审阅 Candidate；**任何 AI 输出都不能直接成为正式 AnalysisRecord 或修改 Official Shot**。

## 1. End-to-end flow

```text
Selected subject
  + PromptDefinition(version)
  + ContextDefinition(version)
  + explicit minimum context
  + Evidence refs
  + dependency { structureRevision, analysisRevision }
        ↓
AnalysisContextManifest
        ↓
Provider request
        ↓
validated provider response
        ↓
AnalysisCandidate(pending)
        ↓
user review / evidence
        ↓ explicit accept transaction
AnalysisRecord(confirmed)
```

## 2. AnalysisContextManifest

ContextManifest 是一次 AI 执行的**可追溯输入快照**，不是可随当前 UI 重新计算后覆盖的缓存。

```ts
interface AnalysisContextManifest {
  id: string
  projectId: string
  taskKind: string
  subject: AnalysisSubjectRef
  dependencyRevision: {
    structureRevision: number
    analysisRevision: number
  }
  promptDefinitionId: string | null
  promptDefinitionVersion: number | null
  contextDefinitionId: string
  contextDefinitionVersion: number
  evidenceRefs: string[]
  includedFieldIds: string[]
  mediaRanges: Array<{ startFrame: number; endFrame: number }>
  createdAt: string
}
```

ContextManifest 必须进入 v19 canonical persistence 与 Backup v4；后续重新运行 AI 应创建新的 Manifest，而不是修改旧 Manifest 伪造历史。

## 3. Candidate lifecycle

正式状态至少包含：`pending / accepted / rejected / stale / superseded / expired`。

- pending：等待用户审核。
- accepted：已通过显式 accept transaction 生成/更新 AnalysisRecord。
- rejected：用户明确拒绝。
- stale：依赖的 Shot/Analysis revision 已变化。
- superseded：同一任务已有更新 Candidate 替代。
- expired：超出明确有效期/运行策略，不再作为当前建议。

Candidate 本身不是 Results/Export 的正式输入。

## 4. Dependency revision

AI 依赖版本必须同时包含 `structureRevision` 与 `analysisRevision`。只保存一个模糊 number 或只保存 updatedAt 不足以证明结果仍适用于当前项目。Provider 返回后、Candidate accept 前都必须重新验证 dependency revision。旧任务晚到时只能丢弃/标 stale，不能覆盖新状态。

## 5. Accept transaction

Candidate accept 是正式领域命令，最小事务语义：

1. 校验 Candidate 存在且仍为 pending。
2. 校验 expected candidate revision。
3. 校验当前 dependency revision。
4. 校验 proposed entry 与 field contract。
5. 验证/关联 Evidence。
6. 写入或更新正式 AnalysisRecord。
7. Candidate → accepted，并保存 acceptedRecordId。
8. 推进 analysisRevision。
9. 事务成功后 UI 才显示“已采用”。

任何 React state update、provider callback 或 Timeline adapter 都不得跳过该命令。

## 6. Provider trust boundary

- server-owned secret 不进入浏览器 bundle。
- BYOK 若未来支持，凭据与项目数据分离。
- Provider 只收到 ContextDefinition/Manifest 明确选择的最小必要数据。
- Provider response 按不可信外部输入进行 schema/size/value validation。
- 网络失败、限流、超时、取消只影响 Candidate/task，不改变正式 Shot/Analysis。
- 默认诊断不记录完整媒体、用户分析正文或 prompt/context 全文。

## 7. Evidence and provenance

Candidate 可引用 Evidence；accept 后正式 Record 保留必要 Evidence refs。Provenance 至少可追溯 provider/model/prompt/context version 与 confirmedAt。AI confidence 不是 Evidence，也不能替代用户确认。

## 8. Persistence / Backup

v19 使用独立 `analysis-context-manifests` store。Backup v4 必须包含 ContextManifest、Candidate、Evidence、AnalysisRecord，并在导入时完整重映射交叉引用。Timeline/Results 不建立 AI 私有事实 store。

## 9. Non-goals

本契约不要求当前阶段实现 Agent orchestration、AI 直接 Shot editing、云端项目数据库、自动接受 Candidate，或把 Provider 特定 schema 变成领域模型。

## 10. Frozen invariants

1. Provider output ≠ formal fact。
2. Candidate ≠ AnalysisRecord。
3. ContextDefinition ≠ ContextManifest。
4. accept 必须经过显式 repository transaction。
5. stale dependency 永远不能静默 accept。
6. AI 不拥有第二份 Shot/Analysis Source of Truth。