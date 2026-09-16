# 架构建议覆盖矩阵

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`


本矩阵用于证明《AisenLens 时间轴优化架构方案》的每一类建议都有对应实施阶段和验收方式。这里写的是**计划覆盖**，不是“已经实现”。

| 架构建议/约束 | 阶段 | 计划实施点 | 验收证据 |
|---|---|---|---|
| Timeline 服务于理解影片，不做迷你 NLE | 00 / 全阶段 | 控制范围；不引入 ripple/magnetic/transition/multivideo edit | Phase 06 范围自检 |
| 空间顺序宏观→微观 | 02 / 05 | Section→Sequence→Scene→Visual | Browser 实际布局 |
| 视觉权重越接近 Shot 越强 | 02 / 05 | registry heights + Visual 主轴 | UI 检查 |
| Shot = 视听表达单位 | 00 / 02 | Shot domain 不合并 | ShotRecord 保留 |
| Scene = 戏剧行动单位 | 03 | Scene Boundary/Inspector | Boundary browser |
| Sequence = 叙事事件单位 | 03 | Sequence Boundary + contain Scene | validation tests |
| Section = 宏观结构单位 | 01 / 03 | 通用 validation + Section row | Section overlap tests |
| Structure 与 Analysis Dimension 分离 | 00 / 08 / 09 | registry categories + domain/view 分离 | type/review |
| Scope/Granularity | 01 / 04 / 08 | Marker scope；future analysis scope | tests/browser |
| Frame/Shot 两轨视觉重叠 | 02 | 合并为 Visual Track | old track IDs 删除 |
| Shot / Frame 数据模型不合并 | 02 | UI composition only | Shot persistence 不改为 Frame owner |
| Shot Boundary 一等对象 | 02 | line/handle/hover/selection | Browser |
| Shot Boundary 可校准 | 02 | 复用现有 shot boundary service/callback | Browser + history |
| Shot detection provenance | 02 | tooltip 只显示真实 source/kind | UI evidence |
| Shot confidence | 07 | 先验证真实 score；没有则不显示 | 07A 研究 |
| Scene/Sequence/Section Boundary First | 03 | structureCommands + UI | Browser |
| Scene boundary 吸附 Shot | 03 | snap resolver | unit tests |
| Sequence 优先吸附 Scene | 03 | optional fallback Shot | unit tests |
| Section 优先吸附 Sequence | 03 | fallback Scene→Shot | unit tests |
| 编辑结构主要移动边界 | 03 | shared boundary drag | Browser |
| 选连续 Shot 创建结构作为辅助 | 03 | 委托 same command | unit/browser |
| Split | 03 | stable ID rules | unit tests |
| Merge | 03 | no silent metadata loss | unit/browser |
| Promote | 03 | 添加高一级 boundary，低级保留 | unit/browser |
| Demote | 03 | 合并高一级，低级保留 | unit/browser |
| AI 结构建议而非裁决 | 07 | suggestion→review→command | Browser |
| AI 不能直接写 Groups | 07 | service boundary | tests/review |
| Group 保留为底层能力 | 01 / 03 | ShotGroupRecord persistence | schema/code |
| UI 弱化 Group | 03 / 06 | 语义化 Scene/Sequence/Section | `rg` + Browser |
| 暂不建立递归 parent tree | 01–09 | range-derived containment | `rg parentId`/schema review |
| Marker 四分类取消 | 01 | Marker v2 migration | type + DB test |
| Marker 单一自由文本 | 01 | content | CRUD/browser |
| Marker 单独轨道 | 02 | MarkerTrack | Ruler 不再渲染 Marker |
| Marker scope | 04 | free/film/section/sequence/scene/shot | tests/browser |
| Marker frame 为真实锚点 | 01 / 04 | 删除 shotId，context derived | migration/context tests |
| Marker 可跨层级宏观/微观 | 04 / 05 | scope rows + semantic zoom | Browser |
| Marker Track 可展开 | 04 | expanded scope rows | Browser |
| Scene/Sequence/Section Inspector 聚合 Marker | 04 | frame-range derived aggregation | Browser |
| Marker 与 Analysis Track 区分 | 04 / 08 | 不自动转 Emotion | code review/browser |
| 不提前实现所有未来轨 | 02 / 06 | core registry only | `rg`/Track Settings |
| Track Registry | 02 | 单一定义源 | tests/code |
| Track preference 显示/隐藏 | 02 | v2 | reload test |
| Track preference 高度 | 02 | v2 | reload test |
| Track preference 顺序 | 02 | v2 + structure order invariant | tests/browser |
| Track 是 View 不是 Data | 02 / 08 / 09 | domain adapters | architecture/code review |
| Point 数据形态 | 01 / 02 | Marker | MarkerTrack |
| Range/Segment 数据形态 | 08 | Dialogue/Emotion real data | future gate |
| Curve 数据形态 | 08 | Emotion | future gate |
| Structural Range | 01 / 03 | ShotGroupRecord | structure tests |
| Core Track | 02 | Section/Sequence/Scene/Visual/Marker/Audio | registry test |
| Dialogue 第一批扩展 | 08 | real source gate | Phase 08 acceptance |
| Emotion 第一批扩展 | 08 | real source gate | Phase 08 acceptance |
| Music/Character/Camera/Composition/Color/Rhythm/Narrative | 09 | per-track gate | future acceptance |
| Semantic Zoom 全片 | 05 | `<20 pps` | pure/browser |
| Semantic Zoom Sequence | 05 | `20–<48` | pure/browser |
| Semantic Zoom Scene | 05 | `48–<100` | pure/browser |
| Semantic Zoom Shot | 05 | `100–<240` | pure/browser |
| Semantic Zoom Frame-detail | 05 | `>=240` | pure/browser |
| Shot label 随尺度降级 | 05 | label/detail renderer | Browser |
| Marker 随尺度降级/聚合 | 05 | cluster/count，不 silent hide | Browser |
| Macro Structure collapse | 05 | Section+Sequence UI group | reload/browser |
| 结构单击选择 | 02 / 03 | existing selectedGroup | Browser |
| 双击 Zoom to Range | 05 | viewport fitRange | Browser |
| Enter Drill Down | 05 | structure focus only | keyboard Browser |
| 保留 Enter Split Shot | 05 | no-focus global | keyboard Browser |
| Esc Go Up | 05 | local cancel priority | keyboard Browser |
| Breadcrumb | 05 | derived structure context | Browser |
| Section optional | 02 / 03 / 05 | no forced data | empty/partial tests |
| Sequence optional | 02 / 03 / 05 | no forced data | partial tests |
| Scene optional | 02 / 03 / 05 | no forced data | partial tests |
| Shot 基础层 | existing / 02 | Visual Backbone | regression |
| Track 不展示假 future capability | 06 / 08 / 09 | no fake button/data/progress | final UI review |
| AI 多尺度上下文基础 | 04 / 07 | structureContext | tests |
| Marker DB schema 变化 | 01 | v17→v18 | migration tests |
| Recovery Marker 迁移 | 01 | snapshot markers | migration test |
| Backup Marker schema | 01 | v4 | round-trip |
| Existing autosave/single-flight/stale guard | 01 / 03 / 04 / 06 | 复用，不另建 write path | fault/stale tests |
| Undo/Redo | 01 / 03 / 04 / 06 | one command = one history entry | editor-history/browser |
| Boundary drag 不刷 history/save | 03 / 06 | preview→pointerup commit | tests/browser |
| 数据以 frame/[start,end) 为权威 | 00 / 全阶段 | frozen contract | unit/schema review |
| ResearchRange microseconds 不直接复用 | 08 | explicit adapter/gate | future review |
| UI 可折叠但数据不删 | 05 | local preference only | reload |
| 当前项目不同影片可跳层 | 03 / 05 | fallback snap/drill | tests |
| 不为假设需求新增依赖/抽象 | 全阶段 | reuse first | diff review |
| 第一阶段必须真实闭环 | 01 | migration→CRUD→save→reload | Phase 01 gate |
| 性能不编造指标 | 05 / 06 | record conditions | verification record |
| Browser 验证真实操作 | 01–06 | CDP/当前 harness | verification record |
| Theme/响应式按真实支持范围验证 | 06 | 先核实实际 UI | Browser record |
| 每阶段 commit + push | 01–09 | handoff rule | GitHub record |
| Push 失败不能“已交付” | 01–09 | status definition | verification record |

## 使用规则

执行 agent 每完成一个 Phase，应回到本矩阵检查该阶段对应行是否都有：

1. 实际代码。
2. 实际验证。
3. verification record 证据。
4. GitHub 交付记录。

如果某建议因真实前提不存在而无法实现：

- 不删掉该行。
- 在对应 Phase 记录“已验证前提不成立”。
- 标出后续 blocker/推荐路径。
- 不用假实现补齐矩阵。
