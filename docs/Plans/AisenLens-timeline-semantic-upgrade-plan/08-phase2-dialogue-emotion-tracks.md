# 08 — 第二期：Dialogue + Emotion 首批分析轨验证

> 研究状态：已完成（2026-09-15）
> 产品状态：阻塞，不注册生产轨
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 本阶段属于第二期/后续增强，不进入第一期 Phase 01–06 验收，除非用户明确继续。


## 0. 研究与准入状态

本文件的数据源研究已完成。当前没有正式字幕/转写 canonical source，也没有被核实的 Emotion segment/curve source；ResearchRange 使用 microseconds，不能直接充当 Timeline segment。因此本阶段不注册 Dialogue/Emotion production track，保留人工音轨与研究范围，等待获批数据源后另行实施。

新模块遵循根 AGENTS.md：研究成熟公开方案/API/维护库，形成 AisenLens 取舍，再按需定向核对 OpenReel、OpenCut；将确认结论写入 `reference-projects/REFERENCE_PROJECT_INDEX.md`，不猜测或复制完整实现。

生产实现前补齐：真实数据源、schema/身份/媒体版本/时间转换、算法或手工流程、取消重跑与用户编辑冲突、history/save/recovery/backup、Track adapter/layers/callback、固定样本准确性/性能门槛与稳定测试入口。

研究完成与产品完成分别记录；前提不足可结束研究并列缺口，不能记为产品交付。

## 1. 目标

用两个数据形态差异明显的分析维度验证 Track Architecture：

- **Dialogue**：segment + text。
- **Emotion**：segment / curve / scope。

它们是 Analysis Dimension：

```text
不是 Scene child
不是 Marker category
不是 Track-specific persistence
```

本阶段只有存在真实数据源时才实施 production Track。

## 2. 当前已核实事实

当前项目：

- Shot 有 `analysisFields`，但字段由项目模板决定，不是固定 canonical Dialogue/Emotion schema。
- `analysis/types.ts` 的 `ResearchRange` 使用：
  - `startUs`
  - `endUs`
  - observation / interpretation / summary
- ResearchRange 服务 Research Workbench，不是 Timeline Analysis Track 的统一数据模型。
- 当前未核实到正式字幕/转录 store。
- 当前未核实到 Emotion curve/segment store。

因此不能：

- 从 UI 先画 Dialogue/Emotion 空轨。
- 猜一个 analysis field id 就当 Emotion。
- 直接拿 microseconds ResearchRange 冒充 frame-based Timeline model。

## 3. Data Source Gate

每条轨在注册前必须先通过数据源 gate。

### 3.1 Dialogue 合法来源候选

执行时核实实际项目，只允许从已存在/获批来源中选：

1. 字幕/转录数据。
2. 用户手工创建带时间范围的台词片段。
3. 已批准的本地语音转录 pipeline。

如果以上均不存在：
- 先设计数据契约或研究转录。
- 不注册 production Dialogue Track。

### 3.2 Emotion 合法来源候选

1. 用户手工 segment。
2. 标准化 Shot/Scene analysis data 经明确 adapter。
3. 已批准模型输出。

禁止：

```text
shot.analysisFields["emotion"] // 未核实 id 时直接猜
marker.content contains "情绪" // 自动解析
mock/demo emotion curve // production
```

## 4. Temporal Analysis 正式契约

只有真实数据需求成立后才新增持久化。

建议 frame-based 基础语义：

```ts
interface TemporalAnalysisSegment<TValue> {
  id: string
  projectId: string
  dimension: string
  startFrame: number
  endFrame: number
  value: TValue
  scope: AnalysisScope
  source: AnalysisSource
  createdAt: string
  updatedAt: string
}
```

Curve：

```ts
interface TemporalAnalysisPoint {
  frame: number
  value: number
}
```

### 是否做“通用分析表”

不能因为架构图有很多未来轨就一次造万能 schema。

只有 Dialogue 与 Emotion 的真实需求证明：
- 生命周期一致
- 保存策略一致
- scope/source 语义一致
- query 需求一致

才考虑共享 store/type。

否则先保持合理 domain data，再用 Timeline adapter。

## 5. 时间和单位

Timeline 权威：

```text
integer frame
[startFrame,endFrame)
```

如果数据来自 microseconds/transcript timestamp：

- 在 ingestion boundary 显式转换。
- 保存原始 source timing only if needed for provenance。
- Timeline 不把 float seconds 当 canonical。

ResearchRange：

- 可以作为 evidence/context。
- 不能直接被 Track 组件当正式 analysis segment，除非通过明确 adapter 且语义匹配。

## 6. Scope

建议 AnalysisScope：

```text
film
section
sequence
scene
shot
frame
free
```

Emotion 可以同时存在：

```text
Scene-level emotion arc
Shot-level emotion
```

二者不互相覆盖。

Dialogue scope 通常是：
- shot
- scene
- free（范围由 startFrame/endFrame 表达，不另造枚举）

但不要人为限制，按真实数据源决定。

## 7. Track Registry 接入

只有真实数据 pipeline 完成后才注册：

```text
dialogue
emotion
```

### Dialogue

- category: analysis
- layers: segment
- data adapter: canonical Dialogue data → timeline segment
- semantic zoom：
  - film：density/summary，只有真实计算时。
  - scene/shot：文本 segment。

### Emotion

- category: analysis
- layers: segment 或 curve
- semantic zoom：
  - film/sequence：趋势。
  - scene：arc。
  - shot：局部状态。

Track Settings 只出现真正可用的轨。

## 8. Track 是 View，不是 Data Model

禁止因 Timeline 需要而设计：

```ts
EmotionTrackRecord
DialogueTrackRecord
```

优先：

```text
Dialogue domain data
→ Timeline adapter
→ Dialogue renderer

Emotion domain data
→ Timeline adapter
→ Curve/segment renderer
```

同一数据未来供：

- Timeline
- Inspector
- Overview
- Export
- AI context
- Learn

## 9. Marker 与 Analysis 的关系

可提供显式命令：

```text
从 Marker 创建分析项
```

但必须：

1. 用户选择 dimension。
2. 用户确认 range。
3. 用户确认 value。
4. 创建正式 Analysis data。
5. Marker 默认保留。
6. EvidenceRef 可引用 markerId。

禁止自动：

```text
Marker
→ 猜 Emotion
→ 删除 Marker
```

## 10. 状态

### Dialogue

- no data：已实现能力保留注册和真实空态/创建入口；尚未实现才不注册。
- loading：只有异步数据源存在时。
- transcription failure：不伪装“无台词”。
- segment edit：按其领域生命周期保存。

### Emotion

- no data：真实空态。
- multiple scopes：可 filter/display，不互相覆盖。
- AI result stale：如果来自结构/媒体版本，必须标 stale。

## 11. Persistence / Recovery / Backup

如果新增正式 store：

- 明确 DB version。
- repository/service API。
- ProjectEditorState 是否包含它要根据生命周期决定，不默认塞进巨大 editor transaction。
- Recovery snapshot 是否需要包含：必须按“正式用户数据是否会丢失”判断。
- Backup 必须包含正式用户数据。
- migration 必须专项测试。

不能为了省事放 localStorage。

## 12. 测试

Dialogue：

- half-open range。
- text edit。
- overlapping lines 如果业务允许。
- time conversion。
- semantic zoom。
- search/select/seek。

Emotion：

- segment。
- curve。
- multi-scope coexist。
- semantic zoom。
- source/stale。

跨轨：

- show/hide/order/height。
- Marker coexist。
- Structure boundary move 不破坏 absolute frame data。
- backup/recovery 如适用。
- browser real data。

## 13. 完成门槛

Dialogue 与 Emotion 分别只有在以下满足时可标完成：

- real canonical data source。
- no fake data。
- Track Registry 没有 special-case hack。
- Data/View 分离。
- frame time contract。
- persistence/recovery/backup 按真实生命周期完成。
- tests/browser。
- 功能验收状态与 Git 状态分别记录；仅在任务授权时 commit/push 并核远端。
