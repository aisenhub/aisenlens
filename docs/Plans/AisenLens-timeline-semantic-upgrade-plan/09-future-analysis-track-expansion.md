# 09 — 后续 Analysis Track 扩展规则

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 本阶段属于第二期/后续增强，不进入第一期 Phase 01–06 验收，除非用户明确继续。


## 1. 目标

在 Dialogue / Emotion 已验证 Track Architecture 后，按真实需求逐项接入：

- Music
- Sound
- Character
- Camera
- Composition
- Color
- Rhythm
- Narrative
- 未来新增维度

本阶段不是“把架构图里所有轨都一次性做出来”。

## 2. 每新增一条 Track 的强制准入清单

注册 production Track 前必须回答：

1. **它分析什么？**
   - 与现有维度是否重复？
2. **canonical data source 是什么？**
   - 用户输入？
   - algorithm？
   - AI？
   - import？
3. **时间形态是什么？**
   - point
   - segment
   - curve
   - structural range
4. **权威时间是不是 integer frame？**
5. **支持哪些 scope？**
6. **稳定 identity 是什么？**
7. **谁拥有生命周期？**
   - Editor state
   - 独立 service/store
8. **如何保存/失败/恢复？**
9. **Backup/Recovery 是否必须包含？**
10. **Inspector / Overview / Export / AI context 是否复用同一 domain data？**
11. **Semantic Zoom 五级分别显示什么？**
12. **无数据 / loading / error / stale 如何表示？**
13. **隐藏 Track 时数据是否保持？**
14. **是否需要新依赖？现有栈是否真的不够？**
15. **是否有真实 browser acceptance scenario？**

任何关键项没有答案：

- 先做研究。
- 不注册 production Track。
- 不做 fake checkbox / disabled future item 冒充实现。

## 3. 推荐优先次序（可被真实需求调整）

在 Dialogue/Emotion 后，可优先考虑：

1. Music / Sound  
   原因：项目已经有 Audio/波形，可能更容易建立真实数据来源；但仍需核实，不可把 waveform 当“音乐语义”。

2. Camera / Composition  
   原因：Shot analysis fields 可能已有相关字段；只有模板语义可以稳定映射时才标准化。

3. Character Presence  
   需要真实人物标注/检测数据。

4. Color  
   可以有视觉分析数据，但不要因为“容易算平均色”就默认它满足拉片语义。

5. Rhythm  
   可以基于 Shot duration 等真实数据形成派生曲线，属于较适合后续的 computed track。

6. Narrative  
   高度解释性，优先做用户/AI 辅助的结构化分析，不应冒充客观自动结果。

该顺序不是固定 roadmap；产品真实需求优先。

## 4. Point / Segment / Curve Renderer 抽象时机

不要在第一条分析轨出现前先造“万能 renderer”。

合理抽象时机：

- 已经至少 2–3 条真实 Track 使用相同 presentation。
- prop/data shape 确实重复。
- interaction 一致。
- accessibility 一致。

这时再抽：

- Point renderer。
- Segment renderer。
- Curve renderer。

否则每条轨先通过 domain adapter 输出简单 view model。

## 5. Data/View 分离

禁止：

```ts
MusicTrackRecord
CameraTrackRecord
ColorTrackRecord
```

仅因为 Timeline 要展示而创建。

优先：

```text
domain analysis data
→ adapter
→ Timeline presentation
```

同一份数据可以用于：

- Timeline
- Inspector
- Overview
- Report Export
- Learning/Review
- AI context

## 6. Scope 与多尺度

每条 Analysis Dimension 必须决定：

- film-level。
- section-level。
- sequence-level。
- scene-level。
- shot-level。
- frame/free 是否有意义。

不要求每条轨支持全部 scope。

例如：

- Camera movement：Shot 为主。
- Narrative function：Scene/Sequence 为主。
- Rhythm：Scene/Sequence/Film 派生。
- Color：Shot/Scene。
- Character presence：range/Scene。

## 7. Structure 与 Analysis 保持正交

任何后续 Track 都不能被建成：

```text
Scene
└─ Emotion
```

数据库 ownership 不依赖结构 parent。

关系通过：

- frame range。
- scope。
- derived context。
- evidence refs。

结构边界变化后：

- absolute temporal data 默认不移动。
- context 重算。
- 只有明确“绑定结构语义”的 domain entity 才由它自身 service 处理结构变更。

## 8. AI 生成的分析轨

若某维度来自 AI：

- 保存 source/provenance。
- 明确 stale 条件。
- 用户编辑与 AI 重跑冲突策略。
- 不自动覆盖用户确认的数据。
- 不用“AI confidence”标签除非 score 语义真实。
- 接受/确认后的生命周期要明确。

## 9. 验证与 Git

每新增一条 Track 独立完成：

- domain/data tests。
- adapter tests。
- renderer/interaction。
- semantic zoom。
- browser。
- persistence/recovery/backup（如适用）。
- no fake UI。
- typecheck/lint/build。
- focused commit。
- push。
- remote verify。
- verification record。

不要把“Registry 已有 ID，但没有数据/renderer”标成完成。

## 10. 后续架构完成判断

当至少 Dialogue + Emotion + 2 个后续维度真实落地后，再评估：

- 是否需要通用 Temporal Analysis repository。
- 是否需要通用 Segment/Curve renderer。
- 是否需要 track plugin API。
- 是否需要独立 package。

在此之前，不为了未来猜测拆包或建立插件框架。
