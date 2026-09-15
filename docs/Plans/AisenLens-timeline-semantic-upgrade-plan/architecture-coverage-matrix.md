# 架构建议覆盖矩阵

> 计划状态：第一期 Phase 01–06 覆盖验收完成；Phase 07–09 研究准入已记录
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`


本矩阵用于追踪《AisenLens 时间轴优化架构方案》的各类建议的阶段、决策与验收方式。这里写的是**计划覆盖**；执行状态以 `verification-record.md`、活动架构文档和源代码为准，未通过真实 Browser/IndexedDB/性能门禁的项目仍保持未验收。

| 架构建议/约束 | 原文章节 | 阶段 | 计划实施点 | 对应测试/验收 | 覆盖状态与待决项 |
|---|---|---|---|---|---|
| Timeline 服务于理解影片，不做迷你 NLE | 相关原则 / 工程补充 | 00 / 全阶段 | 控制范围；不引入 ripple/magnetic/transition/multivideo edit | Phase 06 范围自检 | 计划覆盖，未实施；见阶段验收 |
| 空间顺序宏观→微观 | 相关原则 / 工程补充 | 02 / 05 | Section→Sequence→Scene→Visual | Browser 实际布局 | 计划覆盖，未实施；见阶段验收 |
| 视觉权重越接近 Shot 越强 | 3–15 | 02 / 05 | registry heights + Visual 主轴 | UI 检查 | 计划覆盖，未实施；见阶段验收 |
| Shot = 视听表达单位 | 3–15 | 00 / 02 | Shot domain 不合并 | ShotRecord 保留 | 计划覆盖，未实施；见阶段验收 |
| Scene = 戏剧行动单位 | 3–15 | 03 | Scene Boundary/Inspector | Boundary browser | 计划覆盖，未实施；见阶段验收 |
| Sequence = 叙事事件单位 | 3–15 | 03 | Sequence Boundary + contain Scene | validation tests | 计划覆盖，未实施；见阶段验收 |
| Section = 宏观结构单位 | 3–15 | 01 / 03 | 通用 validation + Section row | Section overlap tests | 计划覆盖，未实施；见阶段验收 |
| Structure 与 Analysis Dimension 分离 | 5–6 | 00 / 08 / 09 | registry categories + domain/view 分离 | type/review | 研究/条件覆盖，规格待验证 |
| Scope/Granularity | 5–6 | 01 / 04 / 08 | Marker scope；future analysis scope | tests/browser | 研究/条件覆盖，规格待验证 |
| Frame/Shot 两轨视觉重叠 | 22–28 | 02 | 合并为 Visual Track | old track IDs 删除 | 计划覆盖，未实施；见阶段验收 |
| Shot / Frame 数据模型不合并 | 3–15 | 02 | UI composition only | Shot persistence 不改为 Frame owner | 计划覆盖，未实施；见阶段验收 |
| Shot Boundary 一等对象 | 8–12 | 02 | line/handle/hover/selection | Browser | 计划覆盖，未实施；见阶段验收 |
| Shot Boundary 可校准 | 8–12 | 02 | 复用现有 shot boundary service/callback | Browser + history | 计划覆盖，未实施；见阶段验收 |
| Shot detection provenance | 3–15 | 02 | tooltip 只显示真实 source/kind | UI evidence | 计划覆盖，未实施；见阶段验收 |
| Shot confidence | 13、37 | 07 | 先验证真实 score；没有则不显示 | 07A 研究 | 研究/条件覆盖，规格待验证 |
| Scene/Sequence/Section Boundary First | 8–12 | 03 | structureCommands + UI | Browser | 计划覆盖，未实施；见阶段验收 |
| Scene boundary 吸附 Shot | 8–12 | 03 | snap resolver | unit tests | 计划覆盖，未实施；见阶段验收 |
| Sequence 优先吸附 Scene | 8–12 | 03 | 目标未被低层覆盖时 fallback Shot | unit tests | 计划覆盖，未实施；见阶段验收 |
| Section 优先吸附 Sequence | 8–12 | 03 | fallback Scene→Shot | unit tests | 计划覆盖，未实施；见阶段验收 |
| 编辑结构主要移动边界 | 8–12 | 03 | shared boundary drag | Browser | 计划覆盖，未实施；见阶段验收 |
| 选连续 Shot 创建结构作为辅助 | 3–15 | 03 | 委托 same command | unit/browser | 计划覆盖，未实施；见阶段验收 |
| Split | 8–12 | 03 | stable ID rules | unit tests | 计划覆盖，未实施；见阶段验收 |
| Merge | 8–12 | 03 | no silent metadata loss | unit/browser | 计划覆盖，未实施；见阶段验收 |
| Promote | 8–12 | 03 | 添加高一级 boundary，低级保留 | unit/browser | 计划覆盖，未实施；见阶段验收 |
| Demote | 8–12 | 03 | 合并高一级，低级保留 | unit/browser | 计划覆盖，未实施；见阶段验收 |
| AI 结构建议而非裁决 | 13、37 | 07 | suggestion→review→command | Browser | 研究/条件覆盖，规格待验证 |
| AI 不能直接写 Groups | 13、37 | 07 | service boundary | tests/review | 研究/条件覆盖，规格待验证 |
| Group 保留为底层能力 | 3–15 | 01 / 03 | ShotGroupRecord persistence | schema/code | 计划覆盖，未实施；见阶段验收 |
| UI 弱化 Group | 3–15 | 03 / 06 | 语义化 Scene/Sequence/Section | `rg` + Browser | 计划覆盖，未实施；见阶段验收 |
| 暂不建立递归 parent tree | 3–15 | 01–09 | range-derived containment | `rg parentId`/schema review | 研究/条件覆盖，规格待验证 |
| Marker 四分类取消 | 16–21 | 01 | Marker v2 migration | type + DB test | 计划覆盖，未实施；见阶段验收 |
| Marker 单一自由文本 | 16–21 | 01 | content | CRUD/browser | 计划覆盖，未实施；见阶段验收 |
| Marker 单独轨道 | 16–21 | 02 | MarkerTrack | Ruler 不再渲染 Marker | 计划覆盖，未实施；见阶段验收 |
| Marker scope | 16–21 | 04 | free/film/section/sequence/scene/shot | tests/browser | 计划覆盖，未实施；见阶段验收 |
| Marker frame 为真实锚点 | 16–21 | 01 / 04 | 删除 shotId，context derived | migration/context tests | 计划覆盖，未实施；见阶段验收 |
| Marker 可跨层级宏观/微观 | 16–21 | 04 / 05 | scope rows + semantic zoom | Browser | 计划覆盖，未实施；见阶段验收 |
| Marker Track 可展开 | 16–21 | 04 | expanded scope rows | Browser | 计划覆盖，未实施；见阶段验收 |
| Scene/Sequence/Section Inspector 聚合 Marker | 16–21 | 04 | frame-range derived aggregation | Browser | 计划覆盖，未实施；见阶段验收 |
| Marker 与 Analysis Track 区分 | 16–21 | 04 / 08 | 不自动转 Emotion | code review/browser | 研究/条件覆盖，规格待验证 |
| 不提前实现所有未来轨 | 22–28 | 02 / 06 | core registry only | `rg`/Track Settings | 计划覆盖，未实施；见阶段验收 |
| Track Registry | 22–28 | 02 | 单一定义源 | tests/code | 计划覆盖，未实施；见阶段验收 |
| Track preference 显示/隐藏 | 22–28 | 02 | v2 | reload test | 计划覆盖，未实施；见阶段验收 |
| Track preference 高度 | 22–28 | 02 | v2 | reload test | 计划覆盖，未实施；见阶段验收 |
| Track preference 顺序 | 22–28 | 02 | v2 + structure order invariant | tests/browser | 计划覆盖，未实施；见阶段验收 |
| Track 是 View 不是 Data | 22–28 | 02 / 08 / 09 | domain adapters | architecture/code review | 研究/条件覆盖，规格待验证 |
| Point 数据形态 | 22–28 | 01 / 02 | Marker | MarkerTrack | 计划覆盖，未实施；见阶段验收 |
| Range/Segment 数据形态 | 22–28 | 08 | Dialogue/Emotion real data | future gate | 研究/条件覆盖，规格待验证 |
| Curve 数据形态 | 22–28 | 08 | Emotion | future gate | 研究/条件覆盖，规格待验证 |
| Structural Range | 相关原则 / 工程补充 | 01 / 03 | ShotGroupRecord | structure tests | 计划覆盖，未实施；见阶段验收 |
| Core Track | 22–28 | 02 | Section/Sequence/Scene/Visual/Marker/Audio | registry test | 计划覆盖，未实施；见阶段验收 |
| Dialogue 第一批扩展 | 相关原则 / 工程补充 | 08 | real source gate | Phase 08 acceptance | 研究/条件覆盖，规格待验证 |
| Emotion 第一批扩展 | 相关原则 / 工程补充 | 08 | real source gate | Phase 08 acceptance | 研究/条件覆盖，规格待验证 |
| Music/Character/Camera/Composition/Color/Rhythm/Narrative | 相关原则 / 工程补充 | 09 | per-track gate | future acceptance | 研究/条件覆盖，规格待验证 |
| Overview 细节 | 29–34 | 05 | `<20 pps` | pure/browser | 计划覆盖，未实施；见阶段验收 |
| Coarse 细节 | 29–34 | 05 | `20–<48` | pure/browser | 计划覆盖，未实施；见阶段验收 |
| Medium 细节 | 29–34 | 05 | `48–<100` | pure/browser | 计划覆盖，未实施；见阶段验收 |
| Fine 细节 | 29–34 | 05 | `100–<240` | pure/browser | 计划覆盖，未实施；见阶段验收 |
| Semantic Zoom Frame-detail | 29–34 | 05 | `>=240` | pure/browser | 计划覆盖，未实施；见阶段验收 |
| Shot label 随尺度降级 | 3–15 | 05 | label/detail renderer | Browser | 计划覆盖，未实施；见阶段验收 |
| Marker 随尺度降级/聚合 | 16–21 | 05 | cluster/count，不 silent hide | Browser | 计划覆盖，未实施；见阶段验收 |
| Macro Structure collapse | 29–34 | 05 | Section+Sequence UI group | reload/browser | 计划覆盖，未实施；见阶段验收 |
| 结构单击选择 | 相关原则 / 工程补充 | 02 / 03 | existing selectedGroup | Browser | 计划覆盖，未实施；见阶段验收 |
| 双击 Zoom to Range | 29–34 | 05 | viewport fitRange | Browser | 计划覆盖，未实施；见阶段验收 |
| Enter Drill Down | 29–34 | 05 | structure focus only | keyboard Browser | 计划覆盖，未实施；见阶段验收 |
| 保留 Enter Split Shot | 29–34 | 05 | no-focus global | keyboard Browser | 计划覆盖，未实施；见阶段验收 |
| Esc Go Up | 29–34 | 05 | local cancel priority | keyboard Browser | 计划覆盖，未实施；见阶段验收 |
| Breadcrumb | 29–34 | 05 | derived structure context | Browser | 计划覆盖，未实施；见阶段验收 |
| Section optional | 3–15 | 02 / 03 / 05 | no forced data | empty/partial tests | 计划覆盖，未实施；见阶段验收 |
| Sequence optional | 3–15 | 02 / 03 / 05 | no forced data | partial tests | 计划覆盖，未实施；见阶段验收 |
| Scene optional | 3–15 | 02 / 03 / 05 | no forced data | partial tests | 计划覆盖，未实施；见阶段验收 |
| Shot 基础层 | 3–15 | existing / 02 | Visual Backbone | regression | 计划覆盖，未实施；见阶段验收 |
| Track 不展示假 future capability | 22–28 | 06 / 08 / 09 | no fake button/data/progress | final UI review | 研究/条件覆盖，规格待验证 |
| AI 多尺度上下文基础 | 13、37 | 04 / 07 | structureContext | tests | 研究/条件覆盖，规格待验证 |
| Marker DB schema 变化 | 16–21 | 01 | v17→v18 | migration tests | 计划覆盖，未实施；见阶段验收 |
| Recovery Marker 迁移 | 16–21 | 01 | snapshot markers | migration test | 计划覆盖，未实施；见阶段验收 |
| Backup Marker schema | 16–21 | 01 | v4 | round-trip | 计划覆盖，未实施；见阶段验收 |
| Existing autosave/single-flight/stale guard | 相关原则 / 工程补充 | 01 / 03 / 04 / 06 | 复用，不另建 write path | fault/stale tests | 计划覆盖，未实施；见阶段验收 |
| Undo/Redo | 相关原则 / 工程补充 | 01 / 03 / 04 / 06 | one command = one history entry | editor-history/browser | 计划覆盖，未实施；见阶段验收 |
| Boundary drag 不刷 history/save | 8–12 | 03 / 06 | preview→pointerup commit | tests/browser | 计划覆盖，未实施；见阶段验收 |
| 数据以 frame/[start,end) 为权威 | 相关原则 / 工程补充 | 00 / 全阶段 | frozen contract | unit/schema review | 计划覆盖，未实施；见阶段验收 |
| ResearchRange microseconds 不直接复用 | 相关原则 / 工程补充 | 08 | explicit adapter/gate | future review | 研究/条件覆盖，规格待验证 |
| UI 可折叠但数据不删 | 相关原则 / 工程补充 | 05 | local preference only | reload | 计划覆盖，未实施；见阶段验收 |
| 当前项目不同影片可跳层 | 3–15 | 03 / 05 | fallback snap/drill | tests | 计划覆盖，未实施；见阶段验收 |
| 不为假设需求新增依赖/抽象 | 相关原则 / 工程补充 | 全阶段 | reuse first | diff review | 计划覆盖，未实施；见阶段验收 |
| 第一阶段必须真实闭环 | 相关原则 / 工程补充 | 01 | migration→CRUD→save→reload | Phase 01 gate | 计划覆盖，未实施；见阶段验收 |
| 性能不编造指标 | 相关原则 / 工程补充 | 05 / 06 | record conditions | verification record | 计划覆盖，未实施；见阶段验收 |
| Browser 验证真实操作 | 相关原则 / 工程补充 | 01–06 | CDP/当前 harness | verification record | 计划覆盖，未实施；见阶段验收 |
| Theme/响应式按真实支持范围验证 | 相关原则 / 工程补充 | 06 | 先核实实际 UI | Browser record | 计划覆盖，未实施；见阶段验收 |
| 功能与 Git 状态分离 | 工程执行约束 | 01–09 | 总计划 §9；仅按任务授权提交/推送 | verification record | 规则已明确，按任务授权执行 |
| 授权远程交付失败单独记录 | 工程执行约束 | 01–09 | 功能验收不与 push 混淆 | verification record | 规则已明确，按任务授权执行 |
| 长片全片 fit 与帧级可达性 | 29–30 / 审查修订 | 05 | 改 min/max pps、共享 clamp、高倍率滚动精度 | 3.3 时长×fps×视口测试 | 参数待实测 |
| 导航与渲染细节分离 | 29 / 审查修订 | 04/05 | 唯一 focus；播放上下文分离 | focus/playhead/selection 不同、Esc、undo | 规则已补齐，未实施 |
| 共享多层边界 | 11 / 审查修订 | 01/03 | 单层操作不隐式联动，破坏包含禁用 | 03 §7.4 操作矩阵 | 规则已补齐，未实施 |
| 稀疏/孤立范围与 selection | 11–12 / 审查修订 | 03 | edge resize、局部 fallback、no-op/reject | 03 §7.5 五类状态 | 规则已补齐，未实施 |
| Group 变化的 Research 引用 | 11 / 审查修订 | 01/03 | 保留待复核上下文、实际查看入口、原子历史 | 03 §7.3 + recovery/backup | 服务适配待实现 |
| Shot 变化成员协调 | 7–8、38 / 审查修订 | 01/03/06 | 拆分继承、跨结构合并拒绝、无映射保留 | 01 §6.2 生命周期测试 | 规则已补齐，未实施 |
| 合并左空右非空内容 | 10–11 / 审查修订 | 03 | 非空内容不得按默认标题猜测来源 | 03 §7.2 四组合 | 规则已补齐，未实施 |
| 当前数据转换适用性 | 14 / 审查修订 | 01 | 先核实当前数据，一次性转换或新库 | 01 §5.0；不适用有依据 | 执行时核实 |
| 升级打开/失败状态 | 审查补充 | 01/06 | blocked/versionchange/abort/retry | 新库及中断恢复测试 | 待实际数据验证 |
| Track adapter/renderer 接入 | 23–24 / 审查修订 | 02 | 类型化接入表、复合 layers、空数据入口 | 六轨接入/命中/空态测试 | 规则已补齐，未实施 |
| 键盘与重叠命中 | 33 / 审查补充 | 02/04/05 | handle/label/strip 优先级；Marker 列表 | 纯键盘、同帧、事件冒泡 | 规则已补齐，未实施 |
| 性能基线与预算 | 29–30 / 审查补充 | 02/05/06 | 固定 fixture、3 次测量、p95/长任务/堆 | 06 §7 | 预算待基线验证 |
| 稳定测试入口 | 审查补充 | 02/06 | targeted runner 与 browser gate 纳入验证 | 脚本执行及失败传播 | 未实施 |
| 第二期真实依赖与研究 | 13、28、37 / 审查修订 | 07–09 | 研究与准入，AI 可依赖 Dialogue | 研究索引+实施规格准入 | 研究待开展 |

## 使用规则

执行 agent 每完成一个 Phase，应回到本矩阵检查该阶段对应行是否都有：

1. 核心阶段的实际代码；研究阶段则记录准入结论，不能替代产品实现。
2. 实际验证。
3. verification record 证据。
4. 功能状态与 Git 状态；GitHub 交付仅在任务授权时要求。

如果某建议因真实前提不存在而无法实现：

- 不删掉该行。
- 在对应 Phase 记录“已验证前提不成立”。
- 标出后续 blocker/推荐路径。
- 不用假实现补齐矩阵。
