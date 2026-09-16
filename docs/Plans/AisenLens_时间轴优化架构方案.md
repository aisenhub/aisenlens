# AisenLens 时间轴优化架构方案

> 版本：2.0 · 评审整合版  
> 更新日期：2026-09-16  
> 状态：目标设计与分阶段实施依据；本文修订不代表功能已实现或通过验收。  
> 适用范围：Web 编辑器、拉片工作区、Timeline 及其结构/标注/分析交互。

本版将原方案、[架构评审及对话补充](./AisenLens_时间轴优化架构评审_2026-09-16.md)整合为一套设计。存在冲突时，以本版正文为后续设计依据；当前已实现事实仍以源码和 [PROJECT_ARCHITECTURE.md](../architecture/PROJECT_ARCHITECTURE.md) 为准。本文的接口是目标契约，不表示现有代码已经采用对应名称。

## 1. 产品目标

AisenLens 时间轴围绕“理解影片”组织：

- 从全片结构下钻到场景、镜头与具体画面，始终保留上下文。
- 在统一时间坐标上结合媒体、结构、人工观察、可计算指标和解释性分析。
- 点击 Shot、Scene、宏观结构时，在同一播放器旁展示对应 Inspector。
- 算法提取证据，统计服务计算指标，大模型提出解释，用户确认自己的观点。
- 支持长片、多标注、多尺度浏览，编辑结果可撤销、可恢复、可追溯。

核心定义：

> 时间是统一坐标，结构是导航骨架，Marker 是自由观察，分析维度提供不同解释视角。

本次演进不引入素材编排、Ripple、磁性剪辑、转场编辑或多轨视频剪辑，不改变原始影片。

## 2. 首版范围与后续边界

本文 V1 指阶段 0–4：基础时间轴、结构命令、Marker、对象导航，以及首批真实分析轨。AI 为阶段 5；语义事件、更多维度和多结构方案按后续需求推进。

| V1 必须完成 | 后续能力，不作为 V1 验收前提 |
| --- | --- |
| Shot + Frame 合并呈现、Audio、独立 Marker | Emotion、Character、Music、Camera 等分析轨 |
| Scene/Sequence/Section 局部范围及边界编辑 | 完整 Beat/Event 编辑器、人物弧、跨片比较 |
| 单一结构方案、可跳过层级 | 多种结构解释方案共存 |
| 全片适配、范围聚焦、可见集合渲染 | 以测量结果决定的高级渲染器 |
| Editing Pace、真实导入字幕 Dialogue | 自动 ASR、人物识别、全片多模态处理 |
| 一次手势一次撤销、持久化与恢复闭环 | 分布式协作、多 Agent 编排 |

未形成正式 Shot 的项目仍可播放、浏览帧带和创建 Marker；只禁用依赖正式镜头的结构编辑与统计。Section、Sequence、Scene 均可缺省，不自动创建空结构。

## 3. 当前实现基线

以下为 2026-09-16 工作树复核结果，不等同于已发布版本。实施前应重新核对，尤其是已有未提交修改。

| 能力 | 当前事实 | 本版演进 |
| --- | --- | --- |
| 时间轴主体 | EditorTimeline 组合音频、帧带、groups、shots；AnalysisTimeline 只是容器 | 保留现有入口，逐步拆出 feature 内的视图适配与交互 |
| 结构 | ShotGroupRecord 保存 kind、shotIds、标题、摘要与 validity | 保留正式记录形态，边界和时间范围派生 |
| 结构校验 | 支持单镜结构、同 kind 排斥及 Scene/Sequence 包含 | 补齐 Section 组合与所有修改入口的统一校验 |
| 校准 | 已有共享 Shot 边界移动、校准草稿与 revision 检查 | 复用领域命令，不在新轨道内重写算法 |
| Marker | UI 使用 category/label/note；当前仓储适配含 v18 frame/content/scope | 完成 UI 与当前存储边界对齐，验证信息保留 |
| 缩放 | 最少 1px/秒，zoom 1–20 | 支持真正全片适配与逐帧尺度 |
| 渲染 | Shot 全量 map、Group 成员逐项 findIndex；帧带已有可见范围加缓冲 | 为 Shot/结构补可见索引，保留媒体队列 |
| 持久化 | IndexedDB 仓储已有跨 store 编辑状态事务 | 复用既有事务和历史入口，补齐新命令 |

不得依据旧索引中的历史结论，重新施加“至少两镜、跨类别互斥”等已不符合当前实现的限制。

## 4. 三种分析尺度与四级结构

产品分析尺度与区间结构分别定义：

| 分析尺度 | 对象 | 主要问题 |
| --- | --- | --- |
| Shot | Shot、Frame 证据 | 这一镜怎么拍，与前后镜头有什么关系？ |
| Scene | Scene | 这一场的目标、冲突、变化与镜头组织是什么？ |
| Story | Film、Section、Sequence、语义事件 | 跨场景的发展、人物弧与宏观结构是什么？ |

导航结构的尺度为：

```text
Film（整个媒体上下文）
  Section（宏观阶段，可选）
    Sequence（叙事事件/任务，可选）
      Scene（戏剧行动单元，可选）
        Shot（正式镜头）
```

上述是包含关系示意，不是要求持久化递归树。Frame 是定位与证据采样，不是必须创建的结构容器；Story 是分析视角，不增加一个强制 Story 区间层。

- Shot：基于切点或转场形成的视听单位；自动检测仍需保留来源与校准状态。
- Scene：连续镜头构成的戏剧行动范围，允许仅含一个 Shot。
- Sequence：多个镜头/场景共同完成的事件或目标，不要求地点相同。
- Section：章节、幕或自定义宏观阶段，不强制三幕式。

非连续人物线、交叉剪辑中的同一事件，通过分析关联或多个证据区间表达，不强行放进一个连续 Scene。

## 5. 时间轴信息架构

统一默认顺序：

```text
STRUCTURE
  Section       20–24px  ┐
  Sequence      22–26px  ┘ 可折叠为 Macro Structure
  Scene         26–32px

VISUAL
  Shot + Frame  64–80px

OBSERVATION
  Marker

ANALYSIS（实现且有数据后按需开启）
  Editing Pace
  Dialogue
  ...

MEDIA
  Audio（主音轨及已有附加音轨）
```

宏观在上，Shot + Frame 视觉权重最高。尺寸是初始设计范围，实际交互命中区须独立于细线宽度。Macro Structure 折叠后保留摘要与展开入口。

首版默认显示 Visual、Marker、Audio；存在有效结构时显示对应结构轨。分析轨不全开，无数据时提供真实空状态，不绘制假曲线。视觉合并后帧带和镜头边界共用一条轨，数据职责保持分离。

用户可覆盖轨道顺序与高度；所有默认示意均遵循本节。轨道分区不决定业务数据归属。

## 6. 时间坐标与精度契约

正式 Shot、结构端点及人工点标注使用整数帧索引；区间一律采用半开区间：

```ts
type FrameIndex = number; // 运行时校验为非负安全整数

interface FrameRange {
  startFrame: FrameIndex;
  endFrame: FrameIndex; // 排他终点，startFrame < endFrame
}
```

媒体包含 N 帧时，画面索引为 0…N-1，区间终点允许 N。Marker 位于边界 B 时属于右侧 [B,C)；N 是结束哨兵，不能作为可见画面的 Marker 锚点。

统一时间映射服务负责：

- frame → 媒体呈现时间；CFR 可按已验证帧率换算，VFR 使用真实呈现时间戳。
- 媒体秒/检测器微秒 → 对应帧；依据该帧的呈现区间定位，端点吸附由明确命令完成。
- 排他末尾 N → 最后一帧呈现结束时间，不读取不存在的第 N 帧时间戳。
- 源时间戳原点、单位、转换及边界舍入只能在适配层处理，业务层不得自行混算。
- 真实时长为 end 对应媒体时间减 start 对应媒体时间，不能普遍以帧数/fps 替代 VFR 时长。

复用 mediaFrameTimeService/useMediaFrameTimeline，并将 PTS 接入帧带、seek、边界对照和优先队列。精确映射未就绪时可浏览与播放，但需要精确帧定位的编辑须等待或展示明确失败，不能静默提交近似值。

Dialogue 保留源字幕精度，分析算法可保存其领域需要的音频时间；进入统一绘制适配层时显式映射。字幕端点不因结构吸附而改变，不能为统一显示而损失源数据。

## 7. 正式结构的唯一数据来源

V1 继续以 ShotGroupRecord 表达正式结构：

```ts
type StructureKind = "scene" | "sequence" | "section";

interface ShotGroupRecord {
  id: string;
  projectId: string;
  kind: StructureKind;
  title: string;
  summary: string;
  shotIds: string[]; // 正式镜头序列中的连续、有序且不重复成员
  createdAt: string;
  updatedAt: string;
  validity?: {
    status: "valid" | "needs-review";
    reason: string | null;
  };
}
```

结构成员与标题/摘要为权威记录。start/end、startShotId/endShotId、父子关系和结构边界由正式 Shot 与成员派生，不建立独立可修改的第二份范围或 Boundary 表。

边界作为一等交互对象，并不要求成为数据库实体。UI 使用 Scene/Sequence/Section；Group 作为内部存储概念保留，不为名称变化迁移数据库。

派生索引可按 revision 缓存，但不能成为独立写入源。任何新业务字段、冲突信息或历史记录都必须在实施时明确仓储和备份契约。

## 8. 覆盖方式与层级不变量

V1 采用一个结构方案内的**局部范围模型**，允许未划分区域。不会把整片默认写成一个人工确认 Scene。

对所有有效正式结构统一校验：

1. 每个结构至少包含一个正式 Shot，成员连续、有序、唯一。
2. 同 kind 不重叠；允许相邻，也允许空白。
3. 异 kind 相交时，高层完整包含低层，不允许半跨；不同层同起止范围合法。
4. 结构端点必须是正式 Shot 的合法端点，不能切穿已经存在的低层结构。
5. 可以跳层，例如 Section 直接包含 Shot/Scene；不自动补 Sequence。
6. 创建、移动、拆分、合并、Shot 变更、恢复与导入使用相同校验器；低层修改同样检查高层。

相邻 [0,100)、[100,200) 不重叠；Scene=[50,150)、Sequence=[0,100) 为非法半跨。

这些约束只适用于当前结构方案的导航骨架，不用于人物、对白、主题和情绪等分析数据。V1 的方案作用域隐含为当前项目；未来支持多方案时，先引入明确 scheme ID，再在方案内校验，不新增全项目互斥限制。

needs-review 记录保留在复核列表，不伪装成有效导航骨架。未划分区域的所属 Scene 可以为空，面包屑不能虚构父层级。

## 9. Boundary First 的交互模型

在已有结构内部的合法 Shot 分界插入边界，拆成两个结构；在空白区域先框选连续 Shot 创建结构，再进行划分。

```text
原 Scene A：1 2 3 4 5 6 7 8
拆分于 4 / 5：
Scene A：1 2 3 4  |  Scene B：5 6 7 8
```

派生边界目标包含层级、左右结构 ID（外侧可为空）、当前帧位置及发起时的 revision。两侧都有相邻结构时为共享边界；仅一侧有结构时为外缘，移动后可留下未划分区域。

“开始划分全片”若提供，必须是用户显式选择的范围创建操作；不因首次插点而自动标注其余影片。

吸附是输入辅助，领域校验是正确性边界。预览非法位置时显示原因，不靠静默跳远掩盖冲突。

## 10. 结构编辑命令

结构操作均由 feature 领域命令执行，不在轨道组件中直接修改数组或写仓储。

| 命令 | 行为 | 必须验证 |
| --- | --- | --- |
| CreateRange | 连续 Shot 选区创建指定 kind | 非空、连续、同层不重叠、跨层包含 |
| SplitRange | 在结构内部合法分界拆分 | 两侧非空，不切穿低层结构 |
| MoveSharedBoundary | 同时重分配相邻同层结构成员 | 两侧非空，完整结果满足全部约束 |
| ResizeOuterEdge | 修改一个结构外缘 | 不越过邻居，不破坏上下层关系 |
| MergeAdjacentRanges | 合并同层相邻结构 | 无空洞、合并后包含关系合法、元数据合并规则明确 |
| DeleteRange | 删除指定结构记录 | 下层与 Shot 保留；处理对象引用并可撤销 |

共享边界移动示例：

```text
A=[1,2,3,4] B=[5,6,7,8]
→ A=[1,2,3,4,5] B=[6,7,8]
```

这是一次命令，不能分别保存 extend 和 shrink。每次命令返回完整变更、引用影响及结构化拒绝原因，例如 revision-conflict、cross-level-overlap、empty-range。

单个外缘的缩短可以留下空白；共享边界移动不会在两个相邻结构间产生空白。这两种手势必须由命中目标明确区分。

## 11. Promote / Demote 与跨层边界

Promote 表示在该位置增加更高层分界，保留下层切分；Demote 表示移除指定上层分界，不合并下层 Scene。禁止把 Scene 的 kind 直接改成 Sequence 充当升级。

菜单优先使用具体名称：

- 在此拆分 Sequence / Section。
- 移除 Sequence / Section 分界。
- 以所选连续范围建立 Sequence / Section。

已有目标层结构且切点位于其内部时执行 SplitRange；未建立该层范围时，先选择范围创建，不能凭一个点猜出前后区间。重复建立已有分界为无变更，不新增重复实体。

移除上层共享分界等价于合并其左右相邻结构，遵循第 12 节内容和引用保留规则。删除一个孤立范围使用 DeleteRange，不冒充降级。

移动/移除低层分界如会使已有高层切穿低层，V1 拒绝并指出受影响结构。用户可先显式调整相关层；不自动级联移动多个层。共线边界由所在轨道决定操作目标。

## 12. 结构身份、内容与引用保留

结构 ID 稳定，显示编号由排序派生，不用“Scene 12”的编号作为引用键。

| 变化 | ID 与内容处理 |
| --- | --- |
| 移动边界 | 左右 ID 均保留；范围相关分析标记待复核，纯内容不自动改写 |
| 拆分 | 左侧保留原 ID，右侧新建 ID；右侧不自动复制原结论 |
| 合并 | 左侧 ID 存活；右侧原 ID 及内容保存在该命令的恢复/来源记录中 |
| 删除 | 引用目标标为缺失或待复核，原始内容保留，不级联删除分析证据 |

拆分时原摘要保留在左侧，但必须显示其原作用范围及待复核状态，不能宣称它已针对左侧重新分析。绑定原对象的分析同样待复核；时间锚定的 Marker 不随之移动。

合并前展示左右标题/摘要和受影响引用。未显式编辑时，保留左标题，将非空摘要按原结构标题分段保留；不得自动让 LLM 合成新结论。引用原右侧对象的记录保留原 ID/原范围和新目标映射，确认后再建立正式新关系。

恢复记录至少保留本次 before/after、ID 映射与内容来源，复用项目已有历史和恢复机制；不可恢复的信息不能仅留在一个临时弹窗里。落盘与备份表示在阶段 0 冻结，禁止以清空字段作为修复方案。

## 13. Shot 校准与结构成员重整

必须区分：

- MoveShotBoundary：调整相邻 Shot 帧范围，复用 shotBoundaryService / 校准命令。
- MoveStructureBoundary：在既有合法 Shot 分界间重新分配结构成员，不移动影片切点。

Shot 修改应用到正式数据时统一输出 old ID → new ID 列表及受影响帧范围：

| Shot 变化 | 结构处理 |
| --- | --- |
| 切点微调 | Shot ID/结构成员不变，派生结构端点跟随；受影响分析失效或待复核 |
| Shot 拆分 | 结构中原成员替换为有序新成员，原对象级分析不自动复制为两个事实 |
| 同一结构成员集合内的相邻 Shot 合并 | 两 ID 映射到存活 ID，成员去重，保留内容来源 |
| 跨任意结构起止边界合并 | V1 阻止；先通过显式结构修改解除冲突 |
| 自动检测重跑 | 生成候选及变更映射，不直接替换正式数据；应用前预览影响 |

同一结构成员集合指在全部结构层里归属均一致，含“属于结构/属于未划分区域”的差异。

对无法可靠重映射的结构，不以当前 reconcileShotGroups 的缩短/空数组结果覆盖原始意图。保留原成员与范围快照，转 needs-review，暂不参与有效包含索引。应用变更须同时保全引用和恢复信息。

检测候选、校准草稿与正式 Shot 分离；候选统计和正式分析有明确状态标识。

## 14. 草稿、事务、历史与 revision

编辑链路统一为：

```text
Pointer/Keyboard
  → gesture draft（仅预览）
  → command + expectedRevision
  → 纯校验与变更计划
  → repository 原子提交
  → 发布正式状态 + 一条 history
  → 刷新派生索引/失效分析
```

- pointerdown 保存初始快照；拖动只更新草稿，不逐帧写库。
- pointerup 提交一次；Esc、pointercancel、组件卸载取消草稿。
- 无实际变化不新增 history。
- 涉及 Shot、Group、研究上下文、标注/引用等记录时使用一个相关 store 事务；不串行调用多个独立保存函数冒充原子性。
- 事务失败不发布成功状态与历史条目；保留重试草稿并说明失败。
- undo/redo 也经过验证与原子持久化，不只修改内存数组。

目标采用持久化 project editRevision 作为编辑状态并发版本；命令在事务内比较并递增，撤销也递增，不回退 revision。这个字段是待实施设计，不是假定现有 updatedAt 已提供相同保证。新增字段的读取默认、已有记录升级及导入重置策略须在阶段 0 明确。

自动保存只作为命令提交链的调度，不允许旧快照的延迟保存覆盖新命令。持久化成功前不能显示“已保存”。刷新后的恢复依赖已有恢复快照，不要求 V1 将整个无限 undo 栈永久保存。

## 15. 非法数据与错误恢复

命令入口拒绝非法新状态；已有异常数据不能在读取时静默丢弃。

- 无效结构保留标题、摘要、成员来源和问题原因，进入复核列表。
- revision 冲突取消本次正式提交，刷新当前数据；用户的文本草稿仍可恢复。
- 项目切换取消手势、挂起任务与旧结果回写。
- 缺失媒体时保留结构/笔记，可读数据仍可查看，媒体相关操作显示不可用。
- 备份恢复验证数据关系与版本；需要修复时给出明确报告，不清空数据库解决。
- 异步失败、配额不足、刷新中断应能区分已保存状态与尚未提交草稿。

检索、导出和统计须说明是否包含 needs-review 记录；默认正式统计排除无效结构，并显示排除数量。

## 16. Marker：单一自由观察

创建流程为 M → 当前画面帧 → 输入文本 → 保存。默认 scope=free，不要求选择分类。

目标正式模型与当前 v18 存储方向对齐：

```ts
type MarkerScope = "free" | "film" | "section" | "sequence" | "scene" | "shot";

interface MarkerRecord {
  id: string;
  projectId: string;
  frame: FrameIndex;
  content: string;
  scope: MarkerScope;
  createdAt: string;
  updatedAt: string;
}
```

Scope 表示观察尺度，不是对象所有权。相同帧允许多个 Marker；列表按 frame、createdAt、id 稳定排序。保存时文本必须非空，Enter 保存、Shift+Enter 换行；输入法组合输入期间不触发保存或全局 M。

当前旧 UI 的分类为 important/composition/emotion/turning-point，不是“重点/问题/灵感/其他”。UI 简化不得丢失旧 label/note/category 信息，具体映射和可恢复保留策略见第 36 节。

## 17. Marker 展示、Scope 与对象分析

Marker 保留独立轨道。默认压缩，按像素碰撞聚合并显示数量；展开可按 scope 分行。缩到全片时 free Marker 仍以密度或计数呈现，不因缺少尺度标签消失。

依据 frame 与当前有效结构派生“此刻所在 Scene/Sequence/Section”，不持久化重复关联；未划分区域显示无结构。边界修改后位置归属重新计算，但 content 不改写。

必须区分三种关系：

| 关系 | 表达方式 |
| --- | --- |
| 时间定位 | Marker.frame，画面证据所在位置 |
| 观察尺度 | Marker.scope，作者在何种尺度评论 |
| 讨论对象 | 对象级分析使用显式 subject/entity 引用 |

Scene 的目标、冲突、总结等属于对象级分析，不能全部塞进按时间聚合的 Marker。Inspector 的“本范围观察”与“本对象分析”分别显示。

用户在 Scene 上下文创建 Marker 时仍默认 free；可提供明确可见的尺度选项，不在背景随缩放自动改 scope。

## 18. Beat / Event 的语义边界

结构区间回答“这一段覆盖哪里”；语义事件回答“这里发生什么变化”。Beat 可表示宏观转折，Event 可表示局部行动变化，均可能发生在 Shot 内部。

后续语义事件最小契约包含：稳定 ID、projectId、整数 frame、标题、可选事件类型、说明、证据引用、来源及用户确认状态。它复用点形绘制能力，保持独立领域语义：

- 不强制吸附到 Shot Boundary。
- 不因为添加转折就自动拆 Scene 或 Section。
- Marker 转成事件是显式命令，保留 sourceMarkerId；V1 默认保留原 Marker。
- 后续需要持续事件时增加明确 range 类型，不用零长区间冒充 point。
- 无完整事件记录与 Inspector 时，只称为自由观察，不能声称已经实现故事节点分析。

该实体在独立功能阶段接入仓储、引用更新和备份，不提前做一套隐藏的空功能。

## 19. 分析维度与数据形态

Structure、Analysis Dimension、Scope 三者分离。Dimension 表示研究什么，Scope 表示结论尺度，subject 表示讨论对象。

| 数据形态 | 例子 | 约束 |
| --- | --- | --- |
| Point | Marker、Beat | 稳定时间锚点，按领域决定编辑权限 |
| Range | Dialogue、Music、Character presence | 可有空白或重叠，规则由相应领域决定 |
| Samples/Curve | Editing Pace、音频能量、Emotion 强度 | 包含采样单位、算法/量表、窗口与来源 |
| Structural range | Scene、Sequence、Section | 第 7–8 节成员与包含约束 |
| Object analysis | Scene 目标、Shot 解读 | 显式对象引用，可带多个时间证据 |

不要把所有数据强制序列化成无约束的 start/end/value，也不要把正式分析内容存进 React Track 实例。

Emotion 需要明确是角色情绪、观众感受还是叙事情绪；强度量表、标注来源和插值含义未定义前，不提供伪精确曲线。人物“出现、说话、叙事焦点”也必须是不同维度，不能混为同一事实。

## 20. 四类工作区状态

工作区分开维护：

```text
PlaybackPosition   当前播放/预览时间
SelectedEntity     用户明确选中的对象
ResearchScope      当前研究的对象或自由范围
Viewport           可见时间范围、缩放、滚动与轨道布局
```

播放头跨镜头可更新轻量“正在播放”高亮，不改变 SelectedEntity。缩放改变密度，不自动重写 ResearchScope。点选对象可按明确动作 seek，但不能把播放位置当作唯一选择来源。

SelectedEntity 用带类型的联合表达 Shot、Scene、Sequence、Section、Film、Marker；后续扩展 Dialogue/Beat。不能只依赖多个 nullable ID 的优先级猜测当前对象。

研究范围不必成为正式 Scene。会话导航状态不作为业务事实写入项目备份。

## 21. 上下文 Inspector

这是核心产品验收，不是附加功能：

| 显式选择 | Inspector 主要内容 |
| --- | --- |
| Shot | 镜头范围、画面语言、相邻镜关系、对象笔记与证据 |
| Scene | 场景信息、目标/冲突/变化/结果、真实统计与对象笔记 |
| Sequence/Section | 宏观事件/阶段、关联场景、关键观察与故事分析 |
| Film | 全片结构与汇总 |
| Marker | 自由文本、帧定位、scope 与时间归属 |

没有数据的字段显示未分析，不凭模板生成虚构值。景别分布等统计显示样本覆盖率，缺失值不能当作零；宏观中位数不能平均各 Scene 中位数。

选择变化后，异步结果按对象 ID、项目和 revision 归位；上一个 Scene 的结果不得显示成新 Shot 的分析。用户笔记、AI 候选、正式结论有可辨认状态。切换对象前处理文本草稿，不能无提示丢失。

## 22. 导航、快捷键与交互优先级

- 单击对象：更新 SelectedEntity 与 Inspector。
- 双击范围：fitRange，不隐式改变研究范围。
- Enter：进入该对象/范围的研究上下文，保存返回栈。
- 面包屑：选择并导航到实际存在的上层对象；跳过缺失层级。
- Esc：先取消当前手势，其次关闭浮层，再返回研究上下文。
- 返回导航：恢复先前视口、选择与研究范围；不强制倒退正在播放的影片。
- 时间尺/背景拖动用于 seek 或 pan，与边界拖动通过命中层分开。

双击会包含单击选择，但只执行一次 fitRange。输入框、可编辑内容、中文输入法合成及模态对话框优先处理键盘事件。

边界采用 pointer capture，并提供键盘/菜单替代方式。密集切点无法可靠命中时提供放大或候选选择；不以重叠巨大透明按钮覆盖其他切点。按轨道和目标身份稳定决定命中优先级。

## 23. Track Definition、Instance 与 Preference

采用静态最小注册表，不建设动态插件平台：

```ts
type TrackLayer = "point" | "range" | "text" | "curve" | "waveform" | "frames";

interface TimelineTrackDefinition {
  typeId: string;
  category: "structure" | "visual" | "observation" | "analysis" | "media";
  label: string;
  defaultVisible: boolean;
  minHeight: number;
  defaultHeight: number;
  layers: readonly TrackLayer[]; // 支持复合图层
}

interface TimelineTrackInstance {
  id: string;
  typeId: string;
  sourceKey: string; // 经领域 adapter 解析，不是任意数据查询代码
}

interface TrackPreference {
  instanceId: string;
  visible: boolean;
  order: number;
  height: number;
}
```

Visual 使用 frames+range，Dialogue 使用 range+text；将来 Emotion 可以使用 range+curve。definition 描述类型，instance 表达当前数据源，例如不同说话人；preference 仅表达用户如何观看。

renderer、查询器和命令能力由注册表中的类型安全 adapter 绑定，不将函数写入持久化配置，不用 any 消解不同数据类型。

## 24. View Adapter 与绘制契约

每种轨道 adapter 接收项目/媒体身份、数据 revision、可见时间范围、像素尺度和选中对象，输出：

- 当前可见项及有界 overscan，包含稳定 ID、几何位置、显示层级和状态。
- 命中目标与允许操作；没有编辑能力的统计曲线不提供拖边界。
- 完整性状态：loading、ready、empty、unavailable、needs-review。
- 从图形回到业务对象/证据的定位信息。

renderer 只负责显示和命中，不做业务重映射、AI 请求或仓储写入。adapter 在类型层保留各领域约束，不强制所有轨道共用一个万能数据结构。

同一数据可供 Timeline、Inspector、统计、报告、Context Builder 使用；视图隐藏不会删除业务数据。

## 25. 轨道设置与持久化作用域

只展示已经实现的轨道类型。支持显示/隐藏、高度、用户顺序和 Macro 折叠。

V1 个人轨道偏好保存在本地 UI 设置，按项目与稳定 instance ID 隔离；同类型默认值可继承设备级设置。不进入业务备份，不影响别人打开项目时的事实数据。

当前旧全局设置升级规则：

- video-frames 与 shots 合并后，任一可见则 Visual 可见；高度采用合并轨默认值并按新范围约束。
- groups 的可见偏好用于各已存在结构轨；其一条旧高度不机械复制成三条相同高度。
- primary-audio 映射主音轨；Marker 使用默认值。
- 新默认顺序按第 5 节，无法无歧义转换的旧顺序不猜测；保留恢复默认入口。
- 未知/重复 instance ID 忽略显示但不修改业务记录，过高/过低值按合法范围约束。

用户显式隐藏/固定的设置优先于 Semantic Zoom；缩放仅调整已显示轨的内容密度，不不断改写偏好。

## 26. 视口与缩放数学

视口以 viewportStartSeconds、pixelsPerSecond、viewportWidth 为权威状态；visibleEnd 从它们推导，避免 zoom、scrollLeft、range 多份权威状态互相漂移。

```text
x(t) = (t - viewportStartSeconds) × pixelsPerSecond
visibleEnd = viewportStartSeconds + viewportWidth / pixelsPerSecond
fitFilmScale = usableWidth / durationSeconds
fitRangeScale = usableWidth / (rangeEndSeconds - rangeStartSeconds)
```

全片适配允许小于 1px/秒。范围聚焦留少量边缘空间；空范围、零时长、隐藏视口不计算除法。

zoomAt 以指针或用户指定锚点 t 为中心，使变更后的 t 仍处于原像素 x：

```text
newStart = anchorTime - anchorX / newPixelsPerSecond
```

最后按媒体范围约束，贴近片头片尾时允许锚点因约束偏移。放大上限须覆盖目标素材的逐帧检视需求，不能统一固定为全片缩放 20 倍；极端 VFR 短帧还提供帧步进与边界前后帧对照。

当前 7200 秒、1000px 视口在旧实现中最低宽 7200px、最高 20px/秒；这是公式限制，不是测得的性能指标。本版替换该限制。

高倍率采用视口相对坐标及有界分块，不能创建随全片时长无限增长的 Canvas。滚动条若保留，其比例映射到逻辑视口，不要求每一媒体像素都对应真实 DOM 宽度。

## 27. Semantic Zoom 与信息密度

区分导航意图和 LOD：

- 导航意图：当前研究 Film、Story、Scene 或 Shot。
- LOD：对象在当前尺度实际占多少像素，能够显示多少内容。

| 场景 | Visual | 结构/Marker | 分析 |
| --- | --- | --- | --- |
| 全片 | 切点密度、节奏纹理 | 宏观标题、Marker 聚合 | 有单位的低密度统计 |
| 中尺度 | 有空间的代表帧与 Shot 标签 | Scene/Sequence 范围 | 对白概览、节奏 |
| 近尺度 | 更密采样、精确切点 | 详细标签和自由观察 | 对白文本、局部证据 |
| 单镜/逐帧 | 按真实时间定位的帧与边界对照 | 保留导航上下文 | 当前相关分析 |

标签按空间逐步简化：完整信息 → 编号/时长 → 编号 → 边界。LOD 阈值带滞回，避免缩放临界点闪烁；阈值在阶段 1 用实际字体和视口验证。

不自动永久隐藏某类 Scope；聚合后仍可找到每条 Marker。手动固定的轨道保持显示。

## 28. 查询、渲染与播放更新

按数据 revision 构建 Shot ID→索引映射、有序 Shot 边界数组及每 kind 的有效区间索引。数据未变化不在每次播放 tick 重建索引。

- Shot/结构查询目标 O(log N + K)，K 为可见项加有界缓冲。
- 允许重叠的 Dialogue/分析区间根据实际查询模式建立索引；不能直接套用非重叠查找。
- 全片下 K 可能等于总量，因此密集对象按屏幕像素聚合，而非为每个不可辨认对象挂 DOM。
- 播放头独立轻量更新，使用 transform；只有跨 Shot 时更新播放中镜头高亮。
- 轨道几何依赖数据版本和视口，避免 currentTime 使所有范围/缩略图重算。
- 拖动预览与自动滚动用 RAF 合并；UI 交互优先于背景提取。
- DOM/SVG 处理交互与标签，Canvas 可处理密集纹理/波形；是否引入其他渲染技术由 profile 决定。

不因 OpenReel 有独立 Playhead 就假定 React 更新完全隔离，也不把参考项目的全量 clip map 当作万级 Shot 性能方案。

## 29. 缩略图、波形与资源预算

Shot + Frame 共用现有媒体提取队列，不为每个 Shot 创建解码器。视口统一生成请求后映射到各镜头。

缩略图调度契约：

- 按实际像素宽度和 tileWidth 计算采样预算，默认可见区加左右各一视口缓冲。
- 缩略图请求以强媒体身份、frame、提取规格/版本去重，项目切换不复用错误源。
- 可见区优先，随后预取；PTS 用于定位与优先级，不用错误的 frame/fps 排序。
- 同一媒体的时间轴提取初始限制为一个活动解码任务，复用队列；增加并发必须有基准证据。
- 设置明确队列上限、解码像素预算和 LRU 缓存字节上限；ImageBitmap、VideoFrame 和对象 URL 在淘汰时释放。
- 请求代次变化时丢弃过时结果，已缓存同源帧可复用，不能展示旧项目结果。
- 很短 Shot 保持真实宽度，可只显示边界；不能为塞入缩略图而扩大时间范围。

波形复用已有 peaks 与派生缓存；按视口选取或聚合峰值，后续以多分辨率分块避免高倍率巨幅绘图。不因缩放重新解码整部音频。

正式数据与派生缓存分别管理。预算字节值须在阶段 0 的基准设备上测量并写入实施记录，未冻结预算不得宣称长片性能达标。内存峰值统计必须包含解码表面及缓存，不能只测 JS heap。

## 30. 首批分析轨：Editing Pace

数据来自正式 Shot 边界及媒体时间映射，不调用 LLM 计算。它表达剪辑形式，不能直接等同紧张感、情绪强度或叙事节奏。

V1 明确两个视图：

1. 逐镜时长：每个完整 Shot 的媒体时长，单位秒。
2. 窗口切点密度：默认 30 秒居中窗口、1 秒采样步长；片头片尾裁剪为实际窗口长度。

```text
cutsPerMinute(t) =
  60 × count(cutTime >= windowStart && cutTime < windowEnd)
     / (windowEnd - windowStart)
```

片头/片尾哨兵不是切点。只统计正式序列内部的有效连接边界；若存在未覆盖时间，该窗口显示数据不完整，不把未知区间当作零切点。转场边界是否计入按检测类型策略固定，UI 应标明“镜头边界密度”，不能混称音乐 BPM。

局部均值/中位镜长采用前后各 5 个 Shot 加当前 Shot 的窗口，共至多 11 个；片头片尾按实际样本数计算并展示数量。时间窗口密度和按镜头数窗口统计分别标识。

- 均值=sum(duration)/count；偶数样本中位数取两个中间值平均。
- Section/Scene 聚合从其底层 Shot 重算，或按 count 加权合并 sum；不平均各 Scene 的中位数。
- 1/duration 若展示须称逆镜长，不能冒充实测 cuts/min。
- 不加入未经定义的 0–100 综合节奏分。
- 缓存键包含媒体身份、Shot revision、统计算法版本、窗口与边界策略。
- 候选镜头只产生“候选统计”，不混入正式分析。

后续画面运动、音频能量与事件密度各自成维度；它们与剪辑变化的相关不自动证明因果。

## 31. 首批文本轨：Dialogue

V1 优先接入真实导入字幕，保留源文件时间、文本、语言和导入来源；没有说话人信息时保持未知，不猜测人物身份。

Dialogue 用来验证 range+text、多实例、重叠区间与源时间映射：

- 不同说话人可以同时说话；同源字幕也可能重叠，不使用结构同层排斥规则。
- 单击选择句段并可定位播放；Inspector 展示原始文本与来源。
- 字幕范围只投影到统一时间坐标，不强制吸附 Shot。
- 向上汇总对白占比时取区间并集后除以范围长度，不能把重叠说话时间相加到超过 100%。
- 错误格式、空字幕、源媒体不匹配和重复导入有明确状态。
- ASR 是后续数据生产能力，不是轨道渲染器职责。

导入格式与解析库实施前按仓库研究流程单独确定，不能把未来能力假定为当前已存在。Emotion 不作为首批曲线验证的必需项。

## 32. 算法、统计、模型与用户的职责

```text
媒体/已有数据
  → 算法观测或检测候选
  → 可重复统计
  → 按对象构建上下文
  → LLM/VLM 解释候选
  → 用户采纳/修改/拒绝
  → 正式分析与证据
```

算法观测可能出错，“可计算”不等于“已证实”。区分来源和审核状态：

- 媒体观测：时间戳、采样画面，以及带来源的检测/识别结果。
- 派生统计：算法、参数、覆盖范围和版本明确的计算。
- 模型假设：解释、结构建议、关系候选。
- 用户确认：当前采用的观点，不表示客观概率 1.0。

用户修正优先作为当前工作值，原机器来源保留；模型不得覆盖用户确认字段。AI 在当前对象上下文出现，可带轻量提问入口，不建设与正常分析割裂的第二套数据。

V1 不默认启动全片 ASR/人物识别/多模态上传。AI 调用由明确动作或用户配置触发，显示数据范围；点击对象本身不自动产生付费请求。

## 33. Context Builder 与输出校验

先建立单一服务内的类型化任务，不要求多个进程或 Agent。按 scope、selectedEntity、研究问题和预算构建上下文：

| 任务 | 核心输入 |
| --- | --- |
| Shot | 当前镜头、相邻有限镜头、代表帧、相关字幕、已确认字段 |
| Scene | 场景范围、Shot 统计、关键镜头/证据、字幕、相邻场景摘要 |
| Story | 选定宏观范围、场景摘要、事件证据、用户确认结构与观点 |

不得每次发送整部影片；压缩摘要保留 evidence ID、原范围、缺失和不确定性。没有运动证据时不能仅凭一张图确认运镜。

每个任务冻结 context manifest：媒体身份、对象与依赖 revision、证据清单、模型/提示词/输出 schema 版本。输出至少区分 observations、interpretations、evidenceRefs 和 proposedChanges。

提示词要求观察与解释分离、证据不足时说明、禁止把导演意图写成事实、默认不套编剧模板；服务层另外验证：

- JSON schema 与枚举、字段长度、数值范围。
- 引用只指向输入提供且可解析的证据。
- 帧/时间范围、目标对象、媒体身份和 revision 有效。
- 修改建议属于允许命令，模型不直接写正式数据。
- 未经校准的 confidence 不展示成“准确率 82%”。

上下文中的字幕、笔记和外部文本是数据，不能提升为系统指令。选择切换后结果归原对象，不串写当前 Inspector。

## 34. AI 结构建议的状态机

候选与正式 Group 分开：

```text
pending → accepted
        → rejected
        → stale
```

候选包含 ID、目标层级/对象、建议帧或范围、解释摘要、evidenceRefs、媒体身份、依赖 revision、生成配置版本和状态。

- 接受：重新校验依赖和合法边界，生成与人工操作相同的领域命令。
- 调整后接受：保留原候选来源和用户调整记录。
- 忽略：标记 rejected，输入版本未改变时不反复弹出同一建议。
- 过期：媒体/相关数据变化后 stale；先重算或重新审阅，不能直接写入。
- 事务失败：候选仍 pending，不能先显示 accepted。
- 撤销接受：恢复正式数据及候选审核状态；再按当前依赖判断是否 stale。

结构建议必须符合第 8 节；镜头内部的转折适合作为未来 Beat 候选，不能偷偷吸附成不同语义的 Scene Boundary。

AI Insight 可安静显示为独立候选图层，默认不混入“我的 Marker”。报告必须区分正式观点、未确认候选和缺失证据。

## 35. 模块边界与复用

```text
Editor / Workspace（组合与路由）
  ├─ timeline：viewport、registry、adapter、render、命中、手势草稿
  ├─ shot / shot-calibration：正式镜头与校准命令
  ├─ group：结构成员、完整性校验、结构命令与派生包含
  ├─ annotation：自由 Marker
  ├─ analysis / 相关 feature：对象分析、研究范围、统计与语义数据
  ├─ video / media：时间映射、解码、缩略图、波形
  └─ project：repository、事务、备份、恢复

上述领域数据
  → Timeline / Inspector / Report / Context Builder
```

EditorTimeline 保留为组合入口，逐步提取职责；不再增加第二套重复编辑器。业务命令留在 feature，通用 UI 只处理通用显示/输入。

复用 useTimelineViewport、FrameThumbnailStrip、媒体队列、Shot 校准、结构服务、项目历史和仓储；修改其契约而非另建平行路径。现有 Scene Engine 不因时间轴重构扩大 ABI 或承担语义分析。

新功能模块（字幕、语义事件、AI）实施前仍按仓库要求研究和记录决定，本版没有授权复制参考代码或改变技术栈。

## 36. 存储演进与旧数据保留

纯显示合并、registry 和偏好调整不要求迁移正式结构数据。需要新增 editRevision、冲突来源或新分析记录时，必须在 projectRepository 明确版本策略，覆盖读取、写入、恢复、备份和导出。

当前工作树已存在 v17/v18 Marker 读取适配及 v18 写回方向。实施按实际仓储版本继续演进，不降级 IndexedDB，不删除数据库重建。

Marker 对齐的原则：

1. label/note 转 content 时保留两者；原分类如尚存在且有信息价值，必须在内容或可恢复元数据中保全，不能因隐藏分类控件而消失。
2. shotId 不能仅转成 scope 后就宣称对象引用已保留；若仍有消费者依赖它，应在切换前迁移到明确对象分析引用或保留来源记录。
3. 已只有 v18 content/scope 的记录不能反推不存在的旧分类和 shotId。
4. 保留 id、projectId、frame、createdAt；只在真实修改时更新 updatedAt。
5. 只覆盖实际存在的当前格式边界，不扩建所有历史项目的兼容层。

迁移前有可恢复快照，失败保持原数据；导入后进行同一结构校验。导出不得只保存视觉轨配置而漏掉正式领域数据与必要来源。

本次文档修订不执行迁移。实施时同步更新当前架构文档中的已实现事实，不能提前把目标版本写成生产现状。

## 37. 实施阶段与出口条件

| 阶段 | 交付范围 | 必须满足的出口 |
| --- | --- | --- |
| 0：契约与基线 | 时间/PTS、结构约束、命令、ID/引用规则、revision/恢复设计、性能场景 | 例子与测试清单冻结；记录设备/浏览器、现状 profile；资源预算有明确值与依据 |
| 1：只读视图与视口 | Visual 合并、按 kind 分结构轨、最小 registry、fitFilm/fitRange、可见查询/LOD | 不改正式领域数据；全片到短镜可浏览；未分镜项目可用；布局与媒体队列无重复 |
| 2：领域编辑闭环 | 创建/拆合/边界移动、校准引用重整、事务、撤销与恢复 | 一次手势一次历史；跨层冲突拒绝；失败不假保存；刷新/恢复后数据一致 |
| 3：Marker 与上下文 | content/scope UI、独立轨聚合、对象选择/Inspector、研究导航 | 实际格式数据无丢失；Shot/Scene/Story 原地切换；输入法和取消正确；迟到结果不串对象 |
| 4：首批真实分析 | Editing Pace + 导入字幕 Dialogue | 统计可复算、有单位与覆盖率；重叠对白可显示；改边界后缓存失效 |
| 5：AI 候选 | Context Builder、证据定位、结构化输出、审核状态、采纳命令 | 过期/非法引用拒绝；用户观点不被覆盖；候选与正式状态可撤销且一致 |
| 后续 | Beat/Event、Emotion、人物/音乐等、多方案 | 各自完成领域研究、来源语义、存储和回归，不靠占位轨宣称完成 |

阶段 1 可在新时间映射与只读查询成熟后进行，但阶段 2 不能早于数据/事务契约。基础 fitRange 在阶段 1，完整研究导航在阶段 3，避免功能入口名相同却语义冲突。

## 38. 验收矩阵与性能门槛

以下为目标，不是已达到的测试结果。

| 类别 | 验收案例 |
| --- | --- |
| 时间 | CFR、VFR、非整数名义帧率、片头/末帧/N 哨兵、边界 B 的归属、零时长错误 |
| 结构 | 单镜 Scene、空白区、跳层 Section、同范围异层、非法半跨、共线边界、外缘与共享边界 |
| 身份/内容 | split/merge 的 ID、摘要、对象分析、证据、旧目标引用、needs-review 与撤销 |
| 校准/重检测 | 切点移动、Shot 拆合、跨结构合并拒绝、候选重跑、无法重映射的保留 |
| 持久化 | 失败回滚、配额不足、重复点击、revision 冲突、刷新、重新打开、备份恢复 |
| 交互 | 选择与播放隔离、fitRange/研究范围区分、Esc、pointercancel、输入法、键盘替代 |
| 分析 | 密度窗口边缘、偶数中位数、跨层汇总、对白并集占比、数据缺失与缓存失效 |
| AI | schema 错误、不存在的证据、过期候选、迟到结果、接受失败、撤销采纳 |

性能场景：

- 标准档：两小时、3000 Shot、10000 Marker，含实际结构与字幕。
- 压力档：10000 Shot，验证全片聚合与近尺度可见集合。
- 固定硬件/浏览器/视口，区分冷缓存、热缓存与后台媒体提取。
- 滚动、缩放、边界拖动的主线程每帧处理耗时初始目标 P95 ≤16.7ms，并记录实际帧间隔、长任务和掉帧；不以该单项宣称稳定 60fps。
- 记录 DOM 数、队列长度、解码并发、峰值内存与连续缩放后的资源回收。相同近尺度视口的挂载量应随可见项变化；全片使用像素预算聚合。
- 分别测 UI 响应、媒体 seek/解码和持久化延迟，不让 UI 平滑掩盖数据保存阻塞。

实际实施使用仓库现有 pnpm 脚本：UI 改动执行开发指南 build gate；历史/结构/校准改动执行对应已有回归并补充必要领域测试；发布范围使用 verify:web。测试不能用清空用户数据来准备环境，构建通过不替代浏览器与数据验收。

## 39. 参考依据与采纳边界

研究文件与确认事实统一记录于 [REFERENCE_PROJECT_INDEX.md](../../reference-projects/REFERENCE_PROJECT_INDEX.md)，本节只说明设计采用范围。

- 本地 OpenReel：采用组件组合、统一视口/坐标、像素吸附与轻量播放头思路；不照搬 NLE 命令、秒制正式模型或全量渲染路径，不宣称其长片性能已验证。
- [OpenTimelineIO Time Ranges](https://opentimelineio.readthedocs.io/en/latest/tutorials/time-ranges.html)：采用坐标系与排他结束语义，不引入完整编辑编排模型。
- [ELAN tier types](https://www.mpi.nl/corpus/html/elan/ch02s03.html) 与 [tier attributes](https://www.mpi.nl/corpus/html/elan/ch02s04.html)：参考不同分析层的类型/关系分离，领域约束不由显示顺序决定。
- [wavesurfer peaks](https://wavesurfer.xyz/docs/peaks/)：参考峰值数据与播放解码分离，保持本地派生缓存边界，不要求替换现有库。
- [用户分享对话](https://chatgpt.com/share/6aaa08c5-b588-83ea-938b-ae7d1e5dc5bb)：已读取文字讨论；三尺度、上下文 Inspector 和算法/大模型分工已整合。示意图片未视觉复核，外部引文不自动作为本方案独立证据。

对话中的多 Agent、默认全部轨道、强制父子树与评分只是候选提议；本版已选择最小满足产品目标的边界，不保留互相冲突的备选要求。

## 40. 冻结决策与文档维护

本版确定以下方向：

1. 一个结构方案内的局部连续范围；同层不重叠、跨层完整包含，可跳层。
2. Group 是 V1 正式结构唯一来源；边界、范围和父子关系派生。
3. Shot 切点校准与结构成员边界编辑使用不同领域命令。
4. 身份、分析内容、证据和研究引用与边界变更一起处理，不能静默删除。
5. 正式画面锚点用整数帧，区间半开；媒体秒和 PTS 经统一服务转换。
6. Shot/Scene/Story 是分析尺度；显式选择决定 Inspector。
7. Marker 是自由观察，Beat 是后续语义事件，对象分析另有引用。
8. Track 是视图，definition、instance、preference 与业务数据分开。
9. Semantic Zoom 调整信息密度，保留用户选择与研究上下文。
10. 可见查询、全片聚合、资源预算与数据正确性同属首版要求。
11. 首批分析为 Editing Pace 与真实 Dialogue，AI 候选不直写正式数据。
12. 按阶段出口验收，不将文档设计或构建通过等同于完成产品功能。

阶段 0 尚需形成的实施附件仅包括：确切仓储升级/恢复表示、资源预算数值与基准设备、测试命令到用例的映射。它们应依据届时源码与测量填写，不再重开上述产品模型选择。

后续改变已冻结决策时，说明影响并同步本文件、参考索引及相关实现文档。最终交付应让用户从任意一帧找到所属结构、相关观察和可核查的分析证据，也能从宏观问题返回具体画面。
