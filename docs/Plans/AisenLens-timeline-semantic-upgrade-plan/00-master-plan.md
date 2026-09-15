# AisenLens 语义时间轴优化：总执行计划

> 计划状态：第一期 Phase 01–06 功能验收完成；Phase 07–09 研究完成但产品按数据源阻塞
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 规划核实基线：`main@28d8263d627778194b92ee86160e14fee7b26997`
> 注意：执行前必须重新核对本地分支、HEAD、工作区和远端；此 SHA 只是本次规划研究基线。


## 0. 本计划如何使用

> 执行更新（2026-09-15）：用户已明确要求完成全部计划。Phase 01–06 已在 `apps/webapp` 实施；Phase 07–09 已完成研究/准入判断，其中数据源不足的产品阶段保持阻塞。实际代码、浏览器和 Git 状态以 `verification-record.md` 为准。

本目录把《AisenLens 时间轴优化架构方案》转换为可直接交给 coding agent 的分阶段实施计划。上句是计划编制阶段的历史记录；本轮已在 `apps/webapp` 完成 Phase 01–06 实施与验收，并完成 Phase 07–09 研究/准入判断。未执行安装依赖、commit 或 push。

用户输入中的以下字段没有给出实际值，因此不虚构：

- **项目绝对路径**：`E:\Projects\Aisenlens`；执行前仍用 `git rev-parse --show-toplevel` 核实。
- **目标模块**：根据架构与代码核实，确定为 `apps/webapp` 中的 `timeline / editor / group / annotation / project / shot` 直接关联模块。
- **架构文档**：本计划包内 [`reference-AisenLens-时间轴优化架构方案.md`](./reference-AisenLens-时间轴优化架构方案.md)。
- **补充讨论结论**：已经并入该架构文档与本计划的“冻结契约”。
- **本次范围 / 暂不实施**：用户没有另外填写。为避免把远期能力混进本期验收，本计划将 **01–06 定义为第一期核心改造**；AI 结构建议、Dialogue/Emotion、其他分析轨定义为 **07–09 第二期/后续增强**。它们是研究与准入计划，研究通过后补齐可执行规格，但不进入第一期交付门。
- **计划保存目录**：`docs/Plans/AisenLens-timeline-semantic-upgrade-plan/`。本目录为待实施计划，不替代有效架构文档。

## 1. 用户问题与目标行为

当前 AisenLens 时间轴已经能播放、缩放、平移、显示音频、帧带、分镜、Group，并在 Ruler 上显示四分类 Marker。目标不是重写一个传统剪辑软件时间轴，而是把它升级成 AisenLens 自己的**语义分析时间轴**：

```text
Section
Sequence
Scene
Shot + Frame
Marker
Dialogue / Emotion / ...
Audio
```

本期目标行为：

1. 从全片宏观结构逐级下钻到镜头：`Section → Sequence → Scene → Shot → Frame`。
2. Shot 与 Frame 在 UI 上合并为视觉主轨，但 Shot 领域模型保持独立。
3. Scene / Sequence / Section 共享统一的 Boundary First 结构编辑语言。
4. Marker 取消四分类，变成单一自由文本、独立轨道、跨层级观察；`frame` 是真实锚点，`scope` 是观察尺度。
5. Group 继续作为底层结构存储机制，但用户 UI 弱化/退出泛化“Group”概念。
6. Track System 先变成可扩展架构，再逐步接入真实分析轨；不提前做假的 Dialogue / Emotion / Music。
7. Semantic Zoom 根据缩放尺度改变信息密度。
8. 结构轨既是展示，也是导航系统。
9. 数据迁移、undo/redo、autosave、过期写保护、backup/recovery 必须形成完整闭环。
10. AI 只能提供高层结构边界建议，不能直接写正式结构。

## 2. 已核实的代码事实

以下为本次规划时基于实际 `main` 代码核实的事实。执行时仍必须重新核对。

### 2.1 仓库与架构约束

根 `AGENTS.md` 与当前架构文档明确：

- React 19 + TypeScript + Vite + Tailwind CSS v4。
- pnpm workspace，使用 Corepack；Zustand 管理轻量客户端状态。
- 产品 Web 唯一来源是 `apps/webapp`；Desktop/Mobile 壳不是当前 Web 功能阻塞门。
- 产品数据 local-first；IndexedDB 数据库 `aisenlens-projects` 当前版本为 **17**。
- 时间轴和镜头领域以整数帧和半开区间 **`[startFrame, endFrame)`** 表达范围。
- 组件不能直接操作 IndexedDB，持久化必须经 service/repository。
- 数据结构变更必须同步 schema、类型、repository、验证与当前架构文档。
- 不允许通过清空 IndexedDB / localStorage 逃避数据升级。
- 当前项目不承诺长期旧格式兼容；不要为假设性历史格式增加 fallback。

### 2.2 当前 Timeline

已核实的核心文件：

- `apps/webapp/src/features/editor/components/EditorTimeline.tsx`
- `apps/webapp/src/features/timeline/hooks/useTimelineTrackPreferences.ts`
- `apps/webapp/src/features/timeline/hooks/useTimelineViewport.ts`
- `apps/webapp/src/features/timeline/components/TimelineRuler.tsx`
- `TimelineTrack.tsx`
- `TimelineTrackHeader.tsx`
- `TimelineTrackSettings.tsx`

当前 Track ID：

```ts
"primary-audio" | "video-frames" | "groups" | "shots"
```

当前默认顺序：

```text
音频 → 帧带 → 分组 → 分镜
```

当前 Track 偏好已支持：

- visible
- height
- order
- localStorage key：`aisenlens:timeline-track-preferences`
- height clamp：20–160

`EditorTimeline` 已具备并必须复用：

- zoom / pan
- playhead drag
- frame snapping
- horizontal scroll
- 播放自动跟随
- visible range
- FrameThumbnailStrip
- AudioWaveform
- Shot 点击选择
- Group 范围渲染

因此本次是定向重构现有 Timeline，不创建第二套 Timeline。

### 2.3 当前 Shot

`apps/webapp/src/features/shot/types.ts` 的 `ShotRecord` 已包含：

- stable id / projectId / order
- startFrame / endFrame
- status
- detection provenance
- screenshot/analysis/notes

`ShotDetectionMeta` 对 auto-shot 已保存 task/candidate/kind/media/preset/engine/config 等来源信息，但当前没有核实到“稳定数值置信度”字段。

结论：

- 第一阶段可以展示真实的 detection source / kind / provenance。
- “自动检测置信度”不能用假百分比；列入 Phase 07 前置验证，只有存在真实、稳定、有明确定义的 score 才允许展示。

### 2.4 当前 Group / Structure

`apps/webapp/src/features/group/types.ts` 已存在：

```ts
type ShotGroupKind = "scene" | "section" | "sequence"

interface ShotGroupRecord {
  id: string
  projectId: string
  kind: ShotGroupKind
  title: string
  summary: string
  shotIds: string[]
  createdAt: string
  updatedAt: string
  validity?: {
    status: "valid" | "needs-review"
    reason: string | null
  }
}
```

`groupService.ts` 已有：

- `getContiguousShotIds`
- `getShotGroupIndexes`
- `adjustShotGroupRange`
- `createShotGroup`
- load/save

`structureValidation.ts` 当前：

- 同 kind 不能重叠。
- Sequence 与 Scene 重叠时必须完整包含 Scene。
- Scene 不能半跨 Sequence。
- **Section 尚没有对应的层级完整性校验。**

当前 `EditorWorkspace.tsx` 仍通过 `selectedShotIds + createShotGroup(...)` 创建结构，因此主交互还是 selection-first，不是 Boundary First。

### 2.5 当前 Marker

`annotation/types.ts` 当前 Marker 是：

```ts
category: "important" | "composition" | "emotion" | "turning-point"
frame: number
shotId: string | null
label: string
note: string
```

`AnnotationMarkerPanel.tsx` 当前提供四个创建按钮：

- 重要镜头
- 构图精妙
- 情绪高点
- 转折点

Marker 目前**没有独立轨道**；`TimelineRuler.tsx` 直接根据 category 颜色把 Marker 画在时间尺上，并用 `marker.shotId === activeShotId` 作为 active 判断。

### 2.6 当前历史、保存与并发边界

`EditorWorkspace` 的 history snapshot 已包含：

- annotationMarkers
- shotGroups
- shots
- selectedMarkerId
- selectedGroupId
- 其他编辑状态

`useEditorHistory.ts` 提供 commit / undo / redo。

现有持久化链已具备：

```text
Editor state mutation
→ 400ms autosave
→ single-flight / serialized save
→ saveProjectEditorState
→ expectedUpdatedAt stale protection
→ IndexedDB transaction
```

`saveProjectEditorState` 在同一 readwrite transaction 中更新 shots / groups / markers / template / research 等数据。

**冻结要求：本次不能让 Timeline 子组件直接调用 repository，也不能绕过现有 history + autosave。**

### 2.7 当前 IndexedDB / Backup / Recovery

`projectRepository.ts`：

- `DATABASE_VERSION = 17`
- Marker store：`annotation-markers`
- indexes：
  - `projectId`
  - `[projectId, frame]`
- category / shotId 不是索引，因此 Marker v2 无需为它们改 index。
- Recovery snapshot 内嵌 `markers: AnnotationMarker[]`。

`projectBackupService.ts`：

- backup `VERSION = 3`
- manifest 包含 groups / markers
- validation 当前会验证 `marker.shotId`
- import 当前会 remap marker/shot references

因此 Marker 改造不是纯 UI：必须处理 IndexedDB 版本、Recovery、Backup、导入校验。

### 2.8 当前快捷键冲突

`editor/shortcuts/definitions.ts` 已存在：

- `M` = `marker.create`
- `Enter` = `shot.splitAtPlayhead`
- `Esc` = `interaction.cancel`

目标结构导航也希望 Enter Drill Down，所以必须冻结为**上下文快捷键**：

- 结构 range 获得 DOM focus 时：`Enter` = Drill Down，并阻止全局 Shot split。
- 其他情况下：继续保留全局 `Enter` = Shot split。
- `Esc` 优先取消正在编辑/拖拽/弹窗等局部交互；只有没有局部 cancel 时才执行 Go Up。
- `M` 保留，只把语义改成自由文本 Marker 创建。

## 3. 已确定原则与待验证参数

### 3.1 语义分类

- **Structure**：Section / Sequence / Scene / Shot。
- **Visual Backbone**：Shot + Frame。
- **Annotation**：Marker。
- **Analysis Dimension**：Dialogue / Emotion / Music / Character / Camera / Composition / Color / Rhythm / Narrative 等。
- **Media**：Audio。

Structure、Marker、Analysis Dimension 是不同职责，不做成一棵 ownership tree。

### 3.2 默认空间顺序

第一期：

```text
Section
Sequence
Scene
Shot + Frame
Marker
Audio
```

未来有真实分析轨后：

```text
Section
Sequence
Scene
Shot + Frame
Marker
Dialogue
Emotion
...
Audio
```

原则：

- 空间顺序：宏观 → 微观。
- 视觉权重：越接近 Shot 越强。
- Shot + Frame 是 Timeline 视觉主轴。

### 3.3 持久化结构

继续使用 `ShotGroupRecord` 存 Scene / Sequence / Section。

第一期不新增：

```ts
parentSequenceId
parentSectionId
children
```

也不新增独立持久化 Boundary 表。

Boundary 是由 Group ranges 派生的交互表示。

### 3.4 时间语义

所有 Timeline / Structure / Marker 正式数据：

- frame 为整数。
- range 为 `[startFrame, endFrame)`。
- UI 可以换算 seconds，但领域/持久化以 frame 为权威。
- 当前 `analysis/ResearchRange` 用 microseconds，它属于 Research Workbench，不得直接当成新 Timeline Analysis Track 的权威时间模型。

### 3.5 结构不变量

层级：

```text
section > sequence > scene > shot
```

规则：

1. 每个 `ShotGroupRecord.shotIds` 必须按项目 Shot 顺序形成连续片段。
2. 同 kind ranges 不能重叠。
3. 不强制 Section / Sequence / Scene 覆盖整片；允许 sparse structure。
4. 不强制 lower level 一定有 parent；层级可选。
5. 不同 kind overlap 时，高层必须**完整包含**低层，不能切穿低层。
6. Scene boundary 必须落在 Shot boundary。
7. Sequence boundary：
   - 优先目标附近合法 Scene boundary。
   - 目标未被 Scene 覆盖时允许 Shot boundary；项目其他位置有 Scene 不阻止 fallback。
8. Section boundary：
   - 优先 Sequence boundary。
   - 目标未被 Sequence 覆盖时可吸附合法 Scene boundary。
   - 目标没有低层覆盖时可吸附合法 Shot boundary。所有候选仍必须满足完整包含。
9. parent 关系由范围推导，不持久化 parent id。
10. 无效命令返回明确失败原因，不能部分修改 state。

### 3.6 Boundary 身份与命令

不创建持久化 boundary id。

仅对当前 Shot revision 有效的派生引用（Shot 拆分/合并/替换后须重新解析，不能当持久化身份）：

```ts
type StructureBoundaryRef = {
  kind: "scene" | "sequence" | "section"
  afterShotId: string
}
```

推荐新增唯一纯领域命令模块：

`apps/webapp/src/features/group/services/structureCommands.ts`

统一返回：

```ts
type StructureCommandResult =
  | { ok: true; groups: ShotGroupRecord[]; affectedGroupIds: string[]; changes: StructureChangeSet }
  | { ok: false; reason: string }
```

`StructureChangeSet` 描述 created/removed/rangeChanged/ID 映射，由编辑器组合 Research 影响后原子提交。孤立起止端点用 `{ groupId, edge: "start" | "end" }` 派生引用，不用 afterShotId 伪造影片起点。详见 Phase 01 §6.3、Phase 03 §7。

身份规则：

- move shared boundary：左右两个 range ID 保留。
- split：包含原 range 第一镜的左段保留原 ID；右段新 ID。
- legacy 未结构化 gap 首次划分：只在 gap 内创建需要的 range，不覆盖相邻已有 range。
- merge：较早/左侧 range ID 保留，右侧删除。
- merge 只要将丢弃右侧非空内容，就显示预览与明确选择；不根据默认标题猜测用户是否编辑。左空右非空也必须处理。
- promote：**增加高一级 boundary**，低一级 boundary 保留；绝不能把 Scene record 直接改 kind。
- demote：移除/合并高一级 boundary，低一级 boundary 保留。

### 3.7 Marker v2 权威模型

目标正式模型：

```ts
const annotationMarkerScopes = [
  "free",
  "film",
  "section",
  "sequence",
  "scene",
  "shot",
] as const

interface AnnotationMarker {
  id: string
  projectId: string
  frame: number
  content: string
  scope: AnnotationMarkerScope
  createdAt: string
  updatedAt: string
}
```

不再持久化：

- category
- label
- note
- shotId

规则：

- `frame` 是真实锚点。
- `scope` 是观察尺度，不是 parent。
- Section/Sequence/Scene/Shot 上下文由 frame + ranges 实时推导。
- 创建时，如果用户正明确处于某个结构 drill-down context，可以默认对应 scope；否则 `free`。
- 不根据 legacy `shotId` 猜新的 scope。

### 3.8 Marker 当前数据升级

先执行 Phase 01 §5.0 的当前记录/快照保留核实。仅需保留实际当前数据时采用下述一次性转换；无当前数据则验证新库初始化，不新增假设历史 converter。专项不适用必须有依据，不标通过。

第一期把 IndexedDB **v17 → v18**。

旧 marker：

```text
content =
  trim(label)
  + (trim(note) 非空时 "\n" + trim(note))
```

如果 label/note 都为空，为防止生成空 Marker，仅用旧 category 的中文可见名兜底：

- important → 重要镜头
- composition → 构图精妙
- emotion → 情绪高点
- turning-point → 转折点

然后：

```text
scope = "free"
```

删除旧字段：

- category
- label
- note
- shotId

升级必须同时迁移：

1. `annotation-markers` store。
2. `recovery-snapshots` 内嵌的 `markers`。

索引保持不变。

Backup format **v3 → v4**，校验新 Marker schema。按当前项目“只支持当前格式”的既有政策，本计划默认不为 v3 backup 长期保留 runtime fallback；如果执行前确认已有必须恢复的 v3 外部备份，需要产品 owner 明确授权一次性 converter。

### 3.9 Track Registry 权威契约

新增单一 registry，建议：

`features/timeline/trackRegistry.ts`

```ts
type TimelineTrackCategory =
  | "structure"
  | "visual"
  | "annotation"
  | "analysis"
  | "media"

type TimelineRenderMode =
  | "point"
  | "range"
  | "segment"
  | "curve"
  | "waveform"
  | "frames"
  | "boundary"

interface TimelineTrackDefinition {
  id: string
  label: string
  category: TimelineTrackCategory
  layers: readonly TimelineRenderMode[] // 非空，支持复合展示
  defaultVisible: boolean
  defaultHeight: number
  minHeight: number
  maxHeight: number
}
```

第一期只注册真实存在的：

```text
section
sequence
scene
visual
markers
primary-audio
```

未来轨只有真实数据源+真实 UI 完成后才注册。

### 3.10 Track Preference v2

现有 localStorage preference 升级为 v2：

- visible
- height
- order

推荐新 key：

`aisenlens:timeline-track-preferences:v2`

旧 key只读取迁移一次，不双写。

旧轨映射：

- `video-frames + shots` → `visual`
- `groups` → `scene` 的用户可见偏好基线
- `section/sequence` 根据真实数据 + registry 默认 + 用户显式设置初始化
- `primary-audio` 保留
- `markers` 使用新默认
- unknown old id 丢弃

需要能区分“registry 默认”和“用户显式隐藏”，避免项目已有 Section/Sequence 时强行覆盖用户偏好。

结构链 `Section → Sequence → Scene → Visual` 的相对顺序固定，避免层级被用户反向拖乱；Marker / Analysis 在 Visual 后、Audio 前调整，Audio 留媒体区。

建议默认高度：

- Section 22
- Sequence 24
- Scene 28
- Visual 72
- Marker 28
- Audio 48

### 3.11 Undo / Save

- structure split / merge / move / promote / demote：每次完成操作只产生一个 history entry。
- boundary drag：
  - pointermove 只更新临时 preview。
  - pointerup 才 `editorHistory.commit()` + 正式 state。
  - Esc/pointercancel 恢复原 preview，不写 history、不触发正式保存。
- Marker create/update/delete：各一个 history entry。
- 继续走现有 400ms autosave / single-flight / `expectedUpdatedAt`。
- save error / stale conflict 保留现有 dirty/恢复语义。
- Timeline 子组件不直接写 repository。

### 3.12 渲染细节与导航尺度

当前 viewport 的 `max(1, width/duration) × zoom(1..20)` 无法覆盖长片全片适配与帧级放大。Phase 05 必须修改最小/最大比例及 fitRange，不得只增加 enum。

- 导航尺度由显式 navigation focus 决定。
- 渲染细节由单一 resolver 决定，初始候选 pps 分界可参考 20/48/100/240，但这些是待测参数，不是叙事层级定义。
- 使用 overview / coarse / medium / fine / frame-detail 表达细节，避免把 px/s 等同 Film/Sequence/Scene。
- 最小 pps 支持全片适配；最大 pps 依据帧率及可操作帧宽确定，包含 frame-detail 可达性。
- 短片、两小时长片、不同视口/帧率必须验证全片 fit、逐级细节和极短范围 fit。
- Phase 04 先建立最小 navigation focus 契约，Phase 05 在其上增加视口和逐级导航，不反向依赖尚未实现的 API。

### 3.13 快捷键

- `M`：创建自由 Marker。
- `Enter`：
  - 结构块 focus → Drill Down。
  - 其他 → 保留 Shot split。
- `Esc`：
  - 优先取消编辑/拖动。
  - 没有局部交互时 Go Up。
- 双击结构 range：Zoom to Range。
- 不新增未经需求验证的全局快捷键。


### 3.14 审查决策清单

| 项目 | 已确定原则 | 实施前要验证/记录 |
|---|---|---|
| 结构联动 | 单层命令不隐式修改其他层；破坏包含则拒绝 | Phase 03 共享边界与稀疏范围测试 |
| 引用与撤销 | Group 变更及 Research 影响在同一逻辑操作中处理 | Phase 01/03 对接现有 Research 服务、历史快照及事务 |
| 存储升级 | 保留实际存在的当前数据，不引入通用历史兼容层 | Phase 01 记录当前数据、snapshot 范围及一次性升级决策；禁止删库 |
| Track | 定义/adapter/renderer/callback 边界清晰 | Phase 02 冻结类型化接入表与复合 layers |
| 导航 | 显式焦点与播放上下文分开 | Phase 04 最小状态，05 逐级导航 |
| 缩放 | 长片 fit 与帧级细节均可达 | Phase 05 记录 pps、frame pixel width、帧率、视口 |
| 性能 | 固定 fixture 与基线比较，达成已记录预算 | Phase 02 留基线，05/06 同条件测量 |
| 第二期 | 07/08 可独立研究，按真实信号依赖实施 | 新模块研究结论写 reference-projects/REFERENCE_PROJECT_INDEX.md |

精确数值、私有 API 命名可根据证据调整；不得因“冻结”措辞阻止修复已证实的设计矛盾。改变产品行为或数据保留范围的决定须遵循当前用户授权与有效规范。

## 4. 与旧实现的冲突及替代关系

| 当前实现 | 目标 | 退出方式 |
|---|---|---|
| `video-frames` + `shots` 两轨 | `visual` 单轨 | Phase 02 验收后删除旧两轨 runtime |
| `groups` 一轨混合 3 kind | `section/sequence/scene` 三语义轨 | Phase 02 读同一 groups；03 退出 generic Group 主交互 |
| 选 Shot → Create Group | Boundary First | Phase 03 保留 selection create 为辅助，并委托同一命令 |
| Marker 四 category | content + scope | Phase 01 DB/schema/UI 一次迁移 |
| Marker 画在 Ruler | Marker Track | Phase 02 移出 Ruler |
| Marker `shotId` | frame + derived context | Phase 01 删除持久化字段；04 上下文 resolver |
| Scene/Sequence 特判校验 | 通用 hierarchy 校验含 Section | Phase 01 |
| 无 parent tree | 继续扁平 | 全阶段禁止自行加 parentId |
| Enter 全局 Split Shot | 结构 focus 时 Drill Down | Phase 05 context-sensitive |
| 分析轨未实现 | Track extension first | Phase 02；08/09 真实数据后接入 |

## 5. 阶段顺序与交付物

### 第一期：核心优化

1. [`01-contract-persistence.md`](./01-contract-persistence.md)
   Marker v2、目标 DB v18/backup v4、经核实的升级范围、通用结构不变量与引用生命周期契约。

2. [`02-track-system-visual-backbone.md`](./02-track-system-visual-backbone.md)
   Track Registry v2、偏好迁移、Shot+Frame 合轨、结构三轨、独立 Marker Track。

3. [`03-structure-boundary-interactions.md`](./03-structure-boundary-interactions.md)
   Boundary First、split/move/merge/promote/demote、selection 辅助路径、退出 generic Group 主入口。

4. [`04-marker-context-scope.md`](./04-marker-context-scope.md)
   Marker scope、展开模式、按 frame 推导结构 context、Inspector 聚合。

5. [`05-semantic-zoom-navigation.md`](./05-semantic-zoom-navigation.md)
   viewport 缩放范围改造、渲染细节、Macro collapse、Zoom to Range、Drill Down/Go Up、Breadcrumb。

6. [`06-integration-validation-cleanup.md`](./06-integration-validation-cleanup.md)
   全链路回归、数据/并发/恢复、旧路径清理、浏览器/主题/响应式/性能、文档同步、最终 Web gate。

依赖：

```text
01 → 02 → 03 → 04 → 05 → 06
```

### 第二期 / 后续增强

7. [`07-phase2-ai-structure-suggestions.md`](./07-phase2-ai-structure-suggestions.md)
   AI Suggested Boundary。先验证真实信号、score 与本地推理能力。

8. [`08-phase2-dialogue-emotion-tracks.md`](./08-phase2-dialogue-emotion-tracks.md)
   Dialogue + Emotion 验证 segment/text 与 segment/curve Track；无真实数据源则停在研究，不上空壳。

9. [`09-future-analysis-track-expansion.md`](./09-future-analysis-track-expansion.md)
   Music / Character / Camera / Composition / Color / Rhythm / Narrative 的逐项接入门。

第二期依赖：核心稳定后 07A 与 08A 可独立研究；如 AI 依赖转录，08 数据源先于相关 07 实施；09 依赖真实分析轨验证，不强制 07 → 08。

逐条覆盖见 [`architecture-coverage-matrix.md`](./architecture-coverage-matrix.md)。

## 6. 可以并行与必须串行的工作

### 必须串行

- DB v18 / Marker type → 所有 Marker UI。
- Track ID / Registry → EditorTimeline 轨道布局。
- Track System → Boundary UI。
- Structure Commands → drag/promote/demote UI。
- 核心交互 → Semantic Zoom/navigation。
- 所有核心阶段 → Phase 06 总验。

### 仅在用户或适用规范授权多 Agent 时并行，且必须有文件所有权

以下为可选文件分工，不构成本次文档修订或未来任务的自动委派指令。

Phase 01 内：

- Agent A：`group/services` 通用 structure validation。
- Agent B：`annotation/types`、Marker migration pure logic 与测试。
- **Integration owner 独占** `projectRepository.ts / projectBackupService.ts / EditorWorkspace.tsx`。

Phase 02 内：

- Agent A：Track Registry + preference v2。
- Agent B：VisualTimelineTrack。
- Agent C：MarkerTimelineTrack。
- Integration owner 最后独占 `EditorTimeline.tsx` 完成集成。

Phase 07/08 的研究可在核心稳定后并行，但不得把未验证 future 功能混入 01–06 的验收。

## 7. 主要风险与处理

### Risk A：Marker 数据丢失

- 经 Phase 01 决策需要升级时，v18 同步转换当前 marker store + recovery snapshot。
- v4 backup 校验新 schema。
- 真实 v17 fixture 验证 id/project/frame/timestamps/content 保留。
- 不通过删库“解决”。

### Risk B：Section 规则缺口

- Phase 01 用 hierarchy rank 通用化，不继续堆 Scene/Sequence if。
- 覆盖 Section ↔ Sequence / Scene partial overlap。

### Risk C：Boundary drag 产生大量 undo/save

- preview 与正式 state 分离。
- pointerup 单次 commit。
- autosave只观察正式 state。

### Risk D：Semantic Zoom 性能退化

- 复用 visible range / FrameThumbnailStrip。
- 低 zoom 减少 labels/thumbnails/marker detail。
- 禁止每视频帧一个 React node。
- 记录真实测试条件，不虚构跨设备 FPS。

### Risk E：快捷键破坏 Shot split

- Enter 只在结构 DOM focus 时被局部消费。
- 全局 `shot.splitAtPlayhead` 不删除。
- Browser test 同时覆盖 focus / no-focus。

### Risk F：Analysis Track 与 ResearchRange 时间单位混用

- 明确禁止把 `startUs/endUs` 直接变成 Timeline 权威单位。
- Phase 08 如新增正式 temporal analysis persistence，必须用 frame-based contract；ResearchRange 只能经显式 adapter。

## 8. 第一期完成标准

第一期以下条件全部满足才算功能验收完成；已交付还须满足用户实际要求的交付动作，见 §9：

- Marker 已是单一自由文本模型，DB v18 + recovery + backup v4 完成。
- Timeline 不再同时存在旧 Frames + Shots 两条视觉轨。
- Section / Sequence / Scene 是独立语义结构轨。
- Marker 是独立轨，不再由 Ruler 承担。
- Boundary First 可新增、移动、合并/移除、Promote/Demote，并且全都可 undo/redo。
- selection create 仅为辅助入口并复用同一 domain command/validation。
- generic Group 主入口退出，不存在两套结构编辑规则。
- 默认 Section → Sequence → Scene → Shot+Frame，且 Visual 权重最高。
- 可用缩放区间内细节行为真实可观察，长片全片 fit 与 frame-detail 均可达；极短媒体低档按 Phase 05 §3.3 记录不适用。
- Macro Structure 可折叠。
- 双击 range 可 fit；结构 focus Enter 可 drill-down；Esc 可 go-up 且不破坏局部 cancel；无结构 focus Enter 仍 Split Shot。
- Marker context 由 frame 派生，不持久化 parent/shotId。
- Track Registry 可扩展，但没有假 Dialogue/Emotion/AI/confidence UI。
- `corepack pnpm verify:web` 在最终代码版本真实执行并记录。
- 必要浏览器、数据升级、失败恢复检查真实执行并记录；当前数据转换不适用时有范围与依据。
- 每阶段功能验收与 Git 状态分别记录；提交/推送仅在用户任务授权时执行。
- `verification-record.md` 据实完成。

## 9. 功能验收与 Git 执行规则

本计划不是 commit/push 授权。遵循当前用户指令和根 AGENTS.md，功能完成与 Git 状态分别记录。

- 功能状态：未开始 / 进行中 / 阻塞 / 验证失败 / 验收完成。
- Git 状态：未授权或未要求 / 未提交 / 已提交 / 已推送并核实 / 推送失败。
- 下一阶段依赖前一阶段实际代码与验收，不依赖是否推送。工作区未提交时记录 HEAD、文件清单和内容摘要/校验值，以便复核实际版本。
- “已交付”仅在用户要求的功能与交付动作均完成时使用；未要求推送不影响本地功能验收。
- 推送失败保留失败证据，不能写已推送；如任务要求远程交付，则整体交付尚未完成。
- 分支遵循用户指定；需要新分支且无指定时使用 `codex/semantic-timeline-upgrade`，先查同名。
- 已授权提交时先 `git diff --check` 并审 staged diff；只提交本任务文件。
- 已授权推送后核实本地 HEAD 与远程目标分支一致；记录代码 SHA 与验证记录版本，不反复 amend。
- 禁止 force push、重写共享历史、合并 main、部署，除非另有针对该操作的明确授权。

## 10. 文档索引

- [架构原文副本](./reference-AisenLens-时间轴优化架构方案.md)
- [架构覆盖矩阵](./architecture-coverage-matrix.md)
- [01 契约与持久化](./01-contract-persistence.md)
- [02 Track System 与视觉主轨](./02-track-system-visual-backbone.md)
- [03 Structure Boundary](./03-structure-boundary-interactions.md)
- [04 Marker Context / Scope](./04-marker-context-scope.md)
- [05 Semantic Zoom / Navigation](./05-semantic-zoom-navigation.md)
- [06 Integration / Cleanup](./06-integration-validation-cleanup.md)
- [07 AI Structure Suggestions](./07-phase2-ai-structure-suggestions.md)
- [08 Dialogue / Emotion](./08-phase2-dialogue-emotion-tracks.md)
- [09 Future Analysis Tracks](./09-future-analysis-track-expansion.md)
- [Agent 执行交接](./agent-handoff.md)
- [实施验证记录模板](./verification-record.md)
