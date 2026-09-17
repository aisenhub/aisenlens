---
title: "AisenLens Operational / Runtime Architecture"
doc_type: runtime-architecture
status: target-design
version: 1.0
last_reviewed: 2026-09-17
scope:
  - webapp
  - local-first-runtime
  - persistence
  - ai-integration
  - delivery
source_of_truth_for:
  - runtime-reliability
  - persistence-safety
  - security-trust-boundaries
  - worker-lifecycle
  - observability
  - delivery-gates
implementation_areas:
  - apps/webapp/src/features/project
  - apps/webapp/src/features/media
  - apps/webapp/src/features/auto-shot
  - apps/webapp/src/features/analysis
  - apps/webapp/src/features/export
  - apps/webapp/src/workers
---

# AisenLens Operational / Runtime Architecture

本文补齐现有设计包中“领域/UI 很完整，但运行时失败模式缺少统一契约”的部分。它不改变 local-first 主架构，也不引入不必要的服务端；目标是让现有 IndexedDB、Worker、媒体处理、AI Provider、导入导出和发布流程具备可验证的安全性与恢复能力。

## 1. Runtime boundaries

```text
UI / Workspace
    ↓ commands / queries
Application / Domain
    ↓ ports
Infrastructure
    ├─ IndexedDB / project repository
    ├─ browser media APIs / decoder
    ├─ Web Worker / task queue
    ├─ AI provider adapter
    └─ import / export adapter
```

任何 Infrastructure 失败都必须以显式错误返回 Application；不得通过 UI store、临时缓存或“最后一次成功值”假装写入成功。

## 2. Persistence safety

### 2.1 Canonical durability

Official Shot、AnalysisRecord、Evidence、Template/Profile、正式结构 revision 等 canonical entities 必须：

- 在 repository transaction 成功后才显示“已保存”；
- 带 schema version / migration version；
- 迁移失败保持旧数据可恢复，不清库；
- backup/restore 经过版本、引用、range、identity 与必要 checksum/manifest 校验；
- 导出前能够记录输入 revision/profile/version，保证结果可追溯。

### 2.2 Quota / eviction / corruption

IndexedDB 属浏览器持久化，不等于无限可靠磁盘。实现必须覆盖：

- 存储配额不足；
- browser storage eviction / private mode / persistence unavailable；
- transaction abort；
- 部分缓存损坏；
- canonical 数据损坏或引用断裂；
- backup 文件不完整或版本不兼容。

策略：cache 可重建；canonical data 不得静默丢弃。发生 canonical corruption 时进入只读/修复路径，给出可导出的诊断信息与最近可恢复备份，而不是自动重置项目。

### 2.3 Multi-tab / concurrent editing

即使 V1 是单用户 local-first，也要防止同一项目被多个标签页或异步旧任务覆盖：

- canonical mutation 使用 `expectedRevision` / project editRevision；
- revision mismatch 取消提交并刷新；
- autosave 只调度当前 command chain，不允许旧 snapshot 晚到覆盖新 revision；
- 可选使用 BroadcastChannel / Web Locks 做同项目编辑协调，但它们只是协调机制，不替代 revision correctness。

## 3. Worker and task lifecycle

Detection、thumbnail、waveform、export、AI-related preprocessing 等长任务统一具备：

- stable taskId；
- cancellable lifecycle；
- explicit `queued/running/succeeded/failed/cancelled` 状态；
- dependency revision snapshot；
- stale result discard；
- bounded concurrency and memory budget；
- retry 只用于幂等或明确可重试步骤；
- Worker crash 不直接污染 canonical repository。

大型媒体默认限制活动解码/重计算任务数量；只有基准测试证明收益后再增加并发。

## 4. Security and trust boundaries

AisenLens 当前以 local-first 为主，但仍存在外部输入与网络边界：媒体文件、导入项目、模板、AI Provider、导出文件。

### 4.1 Input validation

- 所有导入 JSON/项目包做 schema + version + size 校验；
- 不信任外部 label/note/template 文本；若进入 HTML/Markdown 渲染必须经过安全渲染/转义；
- 不执行导入内容中的脚本、函数或任意 renderer 定义；
- 文件类型判断不能只依赖扩展名。

### 4.2 AI provider boundary

- AI Provider 只能收到 Context Builder 明确选择的最小必要数据；
- 在发送媒体片段、对白、用户分析文本前，UI 应能说明发送范围；
- provider-owned/server-owned secret 不得硬编码进前端 bundle；
- 若支持用户自带密钥（BYOK），凭据存储策略必须与项目数据分离，并明确风险；
- 网络失败、超时、限流只影响 Candidate 生成，不得破坏正式 Analysis；
- provider response 永远按不可信外部数据解析与校验。

### 4.3 Export safety

导出路径必须来自受控 preset/adapter；文件名、文本与富文本输出需要转义/规范化。导出失败不能修改 canonical analysis 状态。

## 5. Observability without leaking content

默认采用隐私友好的本地诊断：

- error code / subsystem / operation / duration / taskId / schemaVersion / revision；
- performance marks：timeline render、decoder queue、worker duration、DB transaction、export duration；
- 不把媒体内容、用户分析正文、AI prompt/context 全文作为默认日志；
- 可导出 support bundle 时先脱敏，并让用户显式触发。

若未来接入远程 telemetry，必须单独设计 consent、retention、redaction 与 sampling，不得由普通日志“顺便上传”。

## 6. Error model

跨层使用可分类错误，而不是任意字符串：

```text
ValidationError
RevisionConflict
PersistenceUnavailable
StorageQuotaExceeded
DataCorruption
WorkerFailed
TaskCancelled
MediaDecodeError
ProviderUnavailable
ProviderRateLimited
ExportFailed
MigrationFailed
```

UI 把技术错误映射为可执行恢复动作；Domain/Application 保留 machine-readable code 与可追踪 context。

## 7. Delivery / CI gates

每个合并与发布至少执行：

- typecheck + lint + build；
- domain invariant / command tests；
- repository migration round-trip tests；
- import malformed/corrupt fixture tests；
- multi-revision / stale-result race tests；
- Worker cancellation and crash tests；
- backup/restore integrity tests；
- critical workspace interaction smoke；
- timeline/results performance budget；
- dependency/security audit（按现有工具链可实现范围）。

发布使用可回滚构建；数据 schema migration 必须向前兼容旧数据读取，不能把“应用版本回滚”建立在回滚已破坏的数据 schema 上。

## 8. Feature rollout

高风险迁移、新 Timeline renderer、AI provider 变更、批量转换等可以使用 typed feature flag，但：

- flag 只控制路径选择，不创建第二份 domain semantics；
- flag 必须有 owner、默认值、移除条件；
- canonical schema 不能长期依赖互斥 flag 形成两套事实模型。

## 9. Capacity and performance budgets

V1 先定义可测预算而非过早微服务化：

- project open / reopen；
- large timeline pan/zoom；
- thumbnail/waveform cache upper bound；
- Worker queue length；
- peak memory during decode/export；
- Results large-table interaction；
- migration / backup duration。

具体阈值由真实目标媒体规模基准确定，并记录在 performance test configuration 中；没有基准证据时不增加并发或复制缓存层。

## 10. Non-goals

本契约**不**要求当前版本建设：

- 多用户实时协作后端；
- 分布式事件总线；
- 微服务；
- 云端数据库；
- 复杂 APM 平台。

只有在产品需求出现对应边界时才引入，以免破坏当前 local-first 的简单性。

## 11. Release invariants

1. Canonical write 成功与 UI “已保存”一致。  
2. Cache 丢失可重建，canonical data 丢失不可被当作正常恢复策略。  
3. 旧异步任务不能覆盖新 revision。  
4. 外部输入与 AI response 均不可信，先校验再进入 Candidate/Domain command。  
5. AI/Export/Worker failure 不改变正式事实。  
6. 发布前必须验证 migration + backup/restore + race/cancellation。  
7. 不为解决运行时问题引入第二 Authority、第二 Source of Truth 或第二事实副本。  
