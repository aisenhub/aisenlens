---
title: "AisenLens Shot Structure Contract"
doc_type: domain-contract
status: target-design
version: 1.1
last_reviewed: 2026-09-18
workspace:
  - preparation
  - analysis
scope:
  - webapp
  - domain
depends_on:
  - GLOBAL_WORKSPACE_ARCHITECTURE
source_of_truth_for:
  - shot-authority
  - official-shot
  - boundary-authority
  - shot-revision
  - split-merge-authority
implementation_areas:
  - apps/webapp/src/features/auto-shot
  - apps/webapp/src/features/shot-calibration
  - apps/webapp/src/features/scene-calibration
  - apps/webapp/src/features/shot
  - apps/webapp/src/features/project
---

# AisenLens Shot Structure Contract

## 1. 目的

本契约把散落在“素材准备 / 逐镜分析 / Timeline”中的 Shot 权责收敛为一个共享规则，避免多个 Workspace 同时成为 Shot 的写入源。

## Phase 03 Frozen Shot Baseline — 2026-09-18

Phase 03 已提前冻结 Phase 05 将继续实现的正式 Shot 数据形态，后续结构功能不得再把 Analysis 数据塞回 Shot。

```ts
interface ShotRecord {
  id: string
  projectId: string
  order: number
  startFrame: number
  endFrame: number
  status: ShotStatus
  detection: ShotDetectionMeta | null
  primaryScreenshotId: string | null
  screenshotIds: string[]
  firstFrameScreenshotId: string | null
  lastFrameScreenshotId: string | null
  revision: number
  structureRevision: number
  lineage: {
    origin: "manual" | "detected" | "split" | "merge" | "remapped"
    parentShotIds: string[]
  }
  createdAt: string
  updatedAt: string
}
```

明确禁止以下字段重新进入 canonical Shot：`analysisFields`、`description`、`notes`、AI candidate/value、Timeline track state、Results/export state。

### Revision rules

- `ShotRecord.revision`：该 Shot 自身内容/边界的单对象版本。
- `ProjectRecord.structureRevision`：项目级正式 Shot/Group 结构版本。
- 每次正式 Shot/Group 结构变更都必须在 repository transaction 中推进 `structureRevision`。
- 结构写事务必须同步执行 Analysis stale propagation；不能先改 Shot 再由另一个异步保存“尽量”更新 Analysis。
- split/merge/remap 通过 `lineage.parentShotIds` 记录来源关系，但 lineage 不是自动复用旧语义结论的授权。

Timeline、Results 与 AI Context 只能读取这套 Shot Authority；不得持久化自己的 Shot 副本。

## 2. Authority

```text
Media
  ↓
Detection Candidate
  ↓
Boundary Review
  ↓
Official Shot / Boundary    ← Shot Authority（素材准备）
  ↓
Analysis Workspace          ← 只消费
  ↓
Analysis Record
```

**素材准备是 Official Shot / Boundary 的唯一产品 Authority。** 自动检测器先生成候选；只有用户显式确认的领域操作才能更新正式 Shot。

逐镜分析发现 Shot 错误时，应携带 Return Context 跳转到素材准备完成修正，再回到原分析上下文；逐镜分析本身不能直接改正式 Shot。

## 3. 时间契约

- 项目领域跨模块传递和持久化优先使用整数帧。
- Shot 时间范围使用半开区间 `[startFrame, endFrame)`。
- UI 可显示秒或 timecode，但不可把浮点秒作为新的领域真相。
- VFR/PTS 映射由媒体/时间服务处理，不能让各组件各自做近似转换。

## 4. Candidate 与 Official 分离

检测结果在确认前必须保持候选身份：

```text
candidate → reviewed/edited → confirm → official
```

Worker、检测器、React 组件和结果适配器不得绕过确认流程直接写正式 Shot。

## 5. Split / Merge / Boundary Move

所有改变正式镜头结构的命令必须：

1. 由 Shot Authority 执行；
2. 形成新的结构 revision；
3. 可被撤销/恢复；
4. 明确传播到下游结构与 Analysis 数据；
5. 不静默删除用户分析数据。

## 6. 下游影响

Shot 发生 split / merge / boundary move 后：

- 可机械重算的数据允许重算；
- 可无歧义重映射的结构引用允许重映射；
- 语义分析不能因为“能映射”就自动重新 Confirm；
- 无法证明仍成立的 Analysis Data 进入 stale / needs-review；
- Timeline 和 Results 必须读取同一 revision，而不是保留旧结构副本。

## 7. Identity 与 Revision

Official Shot 应有稳定身份策略与 revision 概念。结构改变时要区分：

- “同一对象边界微调”；
- “一个对象拆成多个”；
- “多个对象合并”；
- “对象被删除/替换”。

具体结构编辑算法与层级规则由 `../timeline/TIMELINE_ARCHITECTURE.md` 拥有；本文件只冻结 Authority 与数据传播边界。

## 8. 工作区边界

| 工作区 | 对 Shot 的权限 |
| --- | --- |
| 素材准备 | 创建、确认、微调、split、merge、删除 Boundary/Shot |
| 逐镜分析 | 读取、选择、导航、标记“需要修正”、跳转修正 |
| 成果应用 | 只消费与展示，不修改 Shot |

## 9. 冻结原则

> Shot 结构只有一个正式来源；所有分析与成果都依赖该正式结构，而不能各自维护一份“看起来一样”的镜头表。
