# 07 — 第二期：AI Structural Boundary Suggestions

> 研究状态：已完成（2026-09-15）
> 产品状态：阻塞，不注册生产 UI
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 本阶段属于第二期/后续增强，不进入第一期 Phase 01–06 验收，除非用户明确继续。


## 0. 研究与准入状态

本文件的 07A 研究已基于真实 AutoShot candidate 字段、本地校准 fixture 与隔离浏览器 PTS 验证完成。当前 score 为未校准的检测启发式量，地点/人物/对白 canonical source 不足，因此只落地研究级 Scene adapter 与测试，不把本阶段写成产品交付；Sequence/Section 及 Accept/Ignore/Adjust UI 等待真实信号。

新模块遵循根 AGENTS.md：研究成熟公开方案/API/维护库，形成 AisenLens 取舍，再按需定向核对 OpenReel、OpenCut；将确认结论写入 `reference-projects/REFERENCE_PROJECT_INDEX.md`，不猜测或复制完整实现。

生产实现前补齐：真实数据源、schema/身份/媒体版本/时间转换、算法或手工流程、取消重跑与用户编辑冲突、history/save/recovery/backup、Track adapter/layers/callback、固定样本准确性/性能门槛与稳定测试入口。

研究完成与产品完成分别记录；前提不足可结束研究并列缺口，不能记为产品交付。

## 1. 目标

在人工 Boundary First 已稳定后，为 Scene / Sequence / Section 提供**结构边界建议**：

```text
正式 boundary：实线
suggested boundary：弱化虚线/候选态

用户：
接受
忽略
调整后接受
```

AI/算法不能直接写正式 `ShotGroupRecord`。接受建议时必须复用 Phase 03 的 `structureCommands`。

## 2. 当前已核实事实与缺口

已存在：

- Auto Shot Worker + WASM Scene Engine 是当前 Shot Detection 生产路径。
- ShotDetectionMeta 保存真实 provenance：
  - taskId
  - candidateId
  - hard-cut/fade/tail
  - media identity
  - preset/version
  - engineVersion
  - configHash
- Shot 是用户确认候选后才进入正式数据。

未核实：

- 高层 Scene/Sequence/Section suggestion service。
- 稳定的高层语义视觉特征。
- canonical dialogue transcript。
- canonical location/character segmentation。
- ShotDetectionMeta 中的数值 confidence。

因此 Phase 07 不能从“画 UI 按钮”开始，必须先做技术前提验证。

## 3. Phase 07A：技术验证阶段

### 3.1 要验证的问题

1. 当前 `AutoShotCandidate` 或 Scene Engine 输出是否存在真实、稳定、有明确定义的 score/evidence。
2. 当前项目实际可取得哪些高层结构信号：
   - Shot boundaries
   - thumbnail / visual changes
   - duration / shot rhythm
   - audio waveform / silence / energy
   - subtitles/transcript（若无则记录无）
   - existing analysis fields
   - character/location metadata（若无则记录无）
3. 本地优先边界下，高层结构建议能否全部在本地完成。
4. 任务能否：
   - cancel
   - rerun
   - preserve provenance
   - detect stale project state
5. Scene / Sequence / Section 是否需要不同 suggestion engines / thresholds。
6. 如何解释 suggestion，避免只给“神秘 AI 结果”。

### 3.2 验证方法

至少选择若干真实测试影片，手工已有结构作为 review reference。

产出候选：

```ts
interface SuggestedStructureBoundary {
  id: string
  runId: string
  kind: "scene" | "sequence" | "section"
  afterShotId: string
  evidence: SuggestedBoundaryEvidence[]
  score?: number
}
```

`score` 只有在其含义真实且稳定时存在。

记录：

- 产生候选所用输入。
- 计算耗时条件。
- false positive / false negative 人工 review。
- suggestion 能否映射到合法 boundary snap。
- evidence 是否能向用户解释。

### 3.3 成功标准

至少证明：

- suggestion 能稳定产出合法 `afterShotId`。
- 用户可以理解主要 evidence。
- 重跑不会随机改变大量结果（如算法本身确定性）。
- 不需要直接改正式 Groups。
- stale data 可识别。
- 性能在真实样本上可接受；记录条件，不编造通用 SLA。

### 3.4 不成立时

如果缺少足够信号：

- 不实现 production UI。
- 不放假“AI 分场”按钮。
- 把所缺能力写到 verification/TODO。
- 第一阶段人工 Boundary First 完全不受影响。

## 4. Suggested Boundary 数据边界

建议默认作为**派生运行结果**，不是正式 Structure。

不要：

```text
AI service
→ projectRepository.replaceProjectShotGroups
```

必须：

```text
Suggestion service
→ SuggestedBoundary[]
→ review UI
→ user Accept
→ structureCommands
→ EditorHistory
→ existing autosave
```

### 是否持久化 suggestion

第一版优先内存/task record。

只有真实 UX 证明“刷新后必须恢复 suggestion/ignore state”时才设计持久化。

不得为了猜测未来需求立即：
- 增 DB store。
- 改 backup。
- 墭 schema。

如果最终确实需要持久化：
- 走正式 DB version。
- 明确 media identity / run version / config/provenance。
- 旧建议在 structure/shot 版本变化后必须 stale。

## 5. Accept / Ignore / Adjust

### Accept

- suggestion 必须先过合法 snap。
- 通过 Phase 03 command。
- 一个 history entry。
- autosave。
- suggestion 状态改 accepted 仅为 UI/task state。

### Ignore

- 本次 run 内隐藏。
- 是否永久记住 ignore 暂不扩 schema。
- 新 run 是否再次出现由 run version 决定。

### Adjust

- 用户拖到另一个合法 boundary。
- 接受的是调整后 boundary。
- provenance 可记录“suggested then adjusted”，但正式 Structure 仍只是用户确认结果。

## 6. Confidence 显示规则

只有 Phase 07A 找到真实 score 才继续。

必须先回答：

- score 是概率吗？
- 范围是什么？
- 是否可跨 preset 比较？
- 是否校准？
- 是否随 engine version 改变？

如果只是 heuristic score：

- UI 不得写“86% 置信度”。
- 可写“强/中/弱证据”或原始分数，但必须语义准确。

如果没有 score：
- 用 evidence 类型展示。
- 不造百分比。

如果需要让 ShotDetectionMeta 保存 immutable score snapshot：
- 明确 schema 变更。
- 改 DB/version/backup/recovery。
- 不把 mutable task 引用当正式 Shot provenance。

## 7. Structure 层级差异

### Scene suggestion

可更多依赖：

- 强视觉切换
- 地点/时间上下文变化（只有真实模型/数据时）
- 人物组合变化
- audio context
- shot rhythm discontinuity

### Sequence suggestion

需要更长范围 narrative objective/event evidence；如果没有语义模型，不用 Scene gap 简单乘阈值冒充 Sequence。

### Section suggestion

更宏观、更主观。

第一版可以只做 Scene suggestions；Sequence/Section 若证据不足必须明确不实现，不为了“架构完整”造结果。

## 8. UI 状态

- no suggestions：明确“未发现建议”，不是 error。
- running：只有真实 task 运行时显示进度；没有 progress source 不做假百分比。
- cancelled：可重新运行。
- stale：提示重新分析，禁止直接 Accept。
- suggestion invalid after structure changes：重新 snap/标 stale。
- accepted：正式 boundary 出现，suggestion candidate 退出。
- ignored：本 run 隐藏。
- failure：保留人工结构能力，不影响正式数据。

## 9. 测试

纯测试：

- suggestion → legal snap。
- invalid cut reject。
- stale structure revision。
- accept uses structureCommands。
- accept undo。
- ignore no official data mutation。
- adjust provenance。

Browser：

- run real suggestion process。
- accept。
- ignore。
- adjust。
- structure mutation makes suggestion stale。
- save/reload official structure。
- suggestion failure does not damage groups。

## 10. 完成门槛

Phase 07 产品功能只有以下均完成才可“已交付”：

- 07A 技术验证通过。
- 真实 signal/source。
- SuggestedBoundary contract。
- Accept → Phase 03 command。
- 不直接写 Groups。
- no fake score/progress。
- tests/browser。
- 功能验收状态与 Git 状态分别记录；仅在任务授权时 commit/push 并核远端。
- verification record。

如果研究结论是“当前条件不足”：
- 可以完成技术研究记录。
- 但产品阶段状态应写“已阻塞/不实施”，不能写“已交付”。
