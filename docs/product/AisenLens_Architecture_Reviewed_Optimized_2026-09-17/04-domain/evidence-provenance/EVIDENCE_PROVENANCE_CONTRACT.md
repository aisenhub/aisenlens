---
title: "AisenLens Evidence & Provenance Contract"
doc_type: domain-contract
status: target-design
version: 1.0
last_reviewed: 2026-09-17
workspace:
  - analysis
  - results
scope:
  - webapp
  - domain
depends_on:
  - ANALYSIS_DATA_MODEL
source_of_truth_for:
  - provenance-model
  - evidence-ref
  - evidence-policy
implementation_areas:
  - apps/webapp/src/features/analysis/types.ts
  - apps/webapp/src/features/analysis/services
---

# AisenLens Evidence / Provenance 契约

本文定义分析结论“来自哪里、由什么证据支持”的共享契约。UI 呈现方式由 Analysis Inspector 文档拥有；本文件只拥有数据语义。原章节编号保留用于追溯。

# 37. Provenance

推荐概念：

```text
User
```

用户直接输入。

```text
Algorithm
```

算法事实。

```text
Derived
```

统计派生。

```text
Imported
```

外部数据。

```text
AI Candidate
```

未确认。

```text
AI → User Confirmed
```

AI 建议经用户采用。

```text
Remapped / Migrated
```

数据重映射后需要重新确认。

---

# 39. Evidence 是一等数据

不要只让用户在备注里写：

```text
参考 00:23:11 的画面
```

应该建立：

```text
EvidenceRef
```

它必须能够重新定位回原始媒体 / 数据。

---

# 40. Evidence 类型

建议：

```text
Frame
Time Range
Shot
Neighbor Shot
Dialogue
Marker
Statistic
Audio Range
```

后续可以扩展：

```text
Event
External Reference
```

---

# 41. EvidenceRef

概念：

```ts
interface EvidenceRef {
  id: string

  type:
    | "frame"
    | "range"
    | "shot"
    | "dialogue"
    | "marker"
    | "statistic"
    | "audio-range"

  targetId?: string

  frame?: number
  startFrame?: number
  endFrame?: number

  label?: string
}
```

---

# 42. Evidence 核心原则

Evidence 核心是：

> **可以重新定位回原始影片 / 原始数据。**

截图、缩略图只是缓存 / 视觉表示。

不要把截图 Blob 作为唯一 Evidence。

---

# 47. Evidence Policy

Field Definition 可声明：

```text
none
optional
recommended
required
```

---

# 48. Evidence Policy 示例

```text
景别
optional
```

```text
摄影机运动
recommended
```

因为运镜通常需要时间范围或多帧证据。

```text
导演意图
required
```

如果用户把它设为正式研究结论，可以要求 Evidence。

---

# 49. Evidence Required 不应阻止早期记录

即使：

```text
required
```

用户仍可以先输入。

UI 显示：

```text
⚠ 尚未添加证据
```

真正需要强校验时机可以是：

- 标记为正式研究结论
- 发布
- 导出严谨报告
- 完成分析检查

---

# 50. 冻结原则

- Provenance 描述正式值的来源与演进，不等同于一个模糊 Confidence 数字。
- Evidence 是一等引用数据，不把截图/时间点/范围/对象证据压成展示字符串。
- Evidence Policy 决定字段需要何种证据，但不阻止用户先记录早期草稿。
- Inspector 可以隐藏技术元数据，但不得丢失可追溯性。
