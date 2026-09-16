# AisenLens 语义时间轴优化：总执行计划

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 规划核实基线：`main@28d8263d627778194b92ee86160e14fee7b26997`  
> 注意：执行前必须重新核对本地分支、HEAD、工作区和远端；此 SHA 只是本次规划研究基线。


## 0. 本计划如何使用

本目录把《AisenLens 时间轴优化架构方案》转换为可直接交给 coding agent 的分阶段实施计划。本轮只研究与编写计划，没有修改产品代码、安装依赖、启动开发服务、执行测试、提交 Git 或推送 GitHub。

用户输入中的以下字段没有给出实际值，因此不虚构：

- **项目绝对路径**：未提供。执行 agent 必须在开始时用 `git rev-parse --show-toplevel` 与当前工作目录核实。
- **目标模块**：根据架构与代码核实，确定为 `apps/webapp` 中的 `timeline / editor / group / annotation / project / shot` 直接关联模块。
- **架构文档**：本计划包内 [`reference-AisenLens-时间轴优化架构方案.md`](./reference-AisenLens-时间轴优化架构方案.md)。
- **补充讨论结论**：已经并入该架构文档与本计划的“冻结契约”。
- **本次范围 / 暂不实施**：用户没有另外填写。为避免把远期能力混进本期验收，本计划将 **01–06 定义为第一期核心改造**；AI 结构建议、Dialogue/Emotion、其他分析轨定义为 **07–09 第二期/后续增强**。它们仍有完整实施计划，但不进入第一期交付门。
- **计划保存目录**：未指定仓库内目录。本压缩包本身就是计划目录。复制进本地仓库后，执行 agent 先核实仓库当前文档约定，再决定最终存放路径；不得假设某个 `docs/plans/...` 目录已存在。

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

## 3. 已确定、不得重新发散的目标架构

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
   - 有 Scene boundary 时吸附 Scene boundary。
   - 项目没有 Scene 层时退化到 Shot boundary。
8. Section boundary：
   - 优先 Sequence boundary。
   - 无 Sequence 时吸附 Scene boundary。
   - 两者都没有时吸附 Shot boundary。
9. parent 关系由范围推导，不持久化 parent id。
10. 无效命令返回明确失败原因，不能部分修改 state。

### 3.6 Boundary 身份与命令

不创建持久化 boundary id。

稳定引用：

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
  | { ok: true; groups: ShotGroupRecord[]; affectedGroupIds: string[] }
  | { ok: false; reason: string }
```

身份规则：

- move shared boundary：左右两个 range ID 保留。
- split：包含原 range 第一镜的左段保留原 ID；右段新 ID。
- legacy 未结构化 gap 首次划分：只在 gap 内创建需要的 range，不覆盖相邻已有 range。
- merge：较早/左侧 range ID 保留，右侧删除。
- merge 若两边都有用户 metadata，必须明确让用户决定保留/合并方式；禁止静默丢失。
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

### 3.8 Marker 数据迁移

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

interface TimelineTrackDefinition {
  id: string
  label: string
  category: TimelineTrackCategory
  renderMode: TimelineRenderMode
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

结构链 `Section → Sequence → Scene → Visual` 的相对顺序固定，避免层级被用户反向拖乱；Marker / Analysis / Audio 可在允许范围内调整。

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

### 3.12 Semantic Zoom

直接复用当前 TimelineRuler 已经存在的 pps 分界，定义单一 resolver：

- `<20 px/s`：film
- `20–<48 px/s`：sequence
- `48–<100 px/s`：scene
- `100–<240 px/s`：shot
- `>=240 px/s`：frame-detail

如果真实浏览器验证发现标签密度不理想，Phase 05 可以调整数值，但仍保持单一五级语义源。

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
   Marker v2、DB v18、backup v4、恢复迁移、通用结构不变量。

2. [`02-track-system-visual-backbone.md`](./02-track-system-visual-backbone.md)  
   Track Registry v2、偏好迁移、Shot+Frame 合轨、结构三轨、独立 Marker Track。

3. [`03-structure-boundary-interactions.md`](./03-structure-boundary-interactions.md)  
   Boundary First、split/move/merge/promote/demote、selection 辅助路径、退出 generic Group 主入口。

4. [`04-marker-context-scope.md`](./04-marker-context-scope.md)  
   Marker scope、展开模式、按 frame 推导结构 context、Inspector 聚合。

5. [`05-semantic-zoom-navigation.md`](./05-semantic-zoom-navigation.md)  
   Semantic Zoom、Macro collapse、Zoom to Range、Drill Down/Go Up、Breadcrumb。

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

逐条覆盖见 [`architecture-coverage-matrix.md`](./architecture-coverage-matrix.md)。

## 6. 可以并行与必须串行的工作

### 必须串行

- DB v18 / Marker type → 所有 Marker UI。
- Track ID / Registry → EditorTimeline 轨道布局。
- Track System → Boundary UI。
- Structure Commands → drag/promote/demote UI。
- 核心交互 → Semantic Zoom/navigation。
- 所有核心阶段 → Phase 06 总验。

### 可并行，但必须有文件所有权

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

- v18 明确迁移 marker store + recovery snapshot。
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

第一期只有以下全部满足才能标记“已交付”：

- Marker 已是单一自由文本模型，DB v18 + recovery + backup v4 完成。
- Timeline 不再同时存在旧 Frames + Shots 两条视觉轨。
- Section / Sequence / Scene 是独立语义结构轨。
- Marker 是独立轨，不再由 Ruler 承担。
- Boundary First 可新增、移动、合并/移除、Promote/Demote，并且全都可 undo/redo。
- selection create 仅为辅助入口并复用同一 domain command/validation。
- generic Group 主入口退出，不存在两套结构编辑规则。
- 默认 Section → Sequence → Scene → Shot+Frame，且 Visual 权重最高。
- Semantic Zoom 五级行为真实可观察。
- Macro Structure 可折叠。
- 双击 range 可 fit；结构 focus Enter 可 drill-down；Esc 可 go-up 且不破坏局部 cancel；无结构 focus Enter 仍 Split Shot。
- Marker context 由 frame 派生，不持久化 parent/shotId。
- Track Registry 可扩展，但没有假 Dialogue/Emotion/AI/confidence UI。
- `corepack pnpm verify:web` 在最终代码版本真实执行并记录。
- 必要浏览器、数据迁移、失败恢复检查真实执行并记录。
- 每阶段所有必要提交均 push 到远程任务分支。
- `verification-record.md` 据实完成。

## 9. Git 执行规则

本轮没有执行 Git。

未来执行 agent 每阶段：

1. 开始前核实：

```powershell
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
git rev-parse HEAD
```

2. 沿用已指定任务 branch；没有时按项目规范创建。若届时仓库无更具体规范，建议 `feat/semantic-timeline-upgrade`，但必须先检查是否已存在。
3. 阶段必要验证后：
   - `git diff --check`
   - 检查 staged diff
   - 只提交该阶段与必要依赖
   - commit message 带阶段语义
   - push 到同一远程任务 branch
   - 核实远程 branch 确实包含 commit
   - 更新 verification record
4. push 失败：状态不能是“已交付”。
5. 禁止 force push、重写共享历史、合并 main、创建 Release、部署。

完整执行提示词见 [`agent-handoff.md`](./agent-handoff.md)。

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
