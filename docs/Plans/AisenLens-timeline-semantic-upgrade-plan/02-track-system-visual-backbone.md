# 02 — Track System、Shot+Frame 视觉主轨与独立 Marker Track

> 计划状态：功能验收完成；Git 交付未授权/未执行
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标与前置条件

前置：

- Phase 01 功能验收完成，Git 状态独立记录。
- Marker v2 / 目标 DB schema / Structure validator 已在当前工作区集成并通过验收。
- 新 agent 先读 `verification-record.md`，确认实际 HEAD 覆盖这些能力。

本阶段目标：

1. 建立唯一 Track Registry。
2. Track preference 升级 v2。
3. `video-frames + shots` 合并为 `visual`。
4. `groups` 拆成 `section / sequence / scene` 三条语义轨。
5. Marker 从 Ruler 移入独立 `markers` track。
6. 默认顺序宏观→微观，Visual 是最高视觉权重。
7. 不提前实现 Dialogue/Emotion/Music 等未来轨。
8. Group 底层仍是同一 `shotGroups` state。

## 2. 必读与已核实能力

必读：

- `00-master-plan.md`
- `01-contract-persistence.md`
- `verification-record.md`
- `EditorTimeline.tsx`
- `useTimelineTrackPreferences.ts`
- `useTimelineViewport.ts`
- `TimelineTrack.tsx`
- `TimelineTrackHeader.tsx`
- `TimelineTrackSettings.tsx`
- `TimelineRuler.tsx`
- `FrameThumbnailStrip.tsx`
- `AudioWaveform`
- `group/types.ts`
- `annotation/types.ts`

已核实：

- Timeline 已有 viewport / visible range / zoom / pan / playhead。
- FrameThumbnailStrip 已接收 `pixelsPerSecond` 与 visible range，应复用。
- AudioWaveform 已存在。
- Track 设置已有 visible/height/order，不应推倒重做。
- Ruler 当前承担 Marker，目标必须让它回到纯时间尺职责。

## 3. 修改与新增文件

### 必须修改

- `features/editor/components/EditorTimeline.tsx`
- `features/timeline/hooks/useTimelineTrackPreferences.ts`
- `features/timeline/components/TimelineTrackSettings.tsx`
- `features/timeline/components/TimelineRuler.tsx`
- `features/timeline/components/TimelineTrackHeader.tsx`（仅当 registry/category/锁定顺序真实需要）
- `EditorWorkspace.tsx`（只用于 props/callback 连接，不塞 track render 业务）

### 建议新增（当前不存在）

- `features/timeline/trackRegistry.ts`
- `features/timeline/components/VisualTimelineTrack.tsx`
- `features/timeline/components/StructureTimelineTrack.tsx`
- `features/annotation/components/MarkerTimelineTrack.tsx`
- `apps/webapp/test/timeline-track-preferences-v2.test.ts`
- `apps/webapp/test/timeline-structure-view-model.test.ts`

如果已有 `TimelineTrack` 足以承载某个简单 wrapper，不为目录好看而新增组件。

## 4. Track Registry 单一权威

第一期六条真实 track：

| id | category | layers | 默认高度 | 默认职责 |
|---|---|---|---:|---|
| `section` | structure | range | 22 | 宏观结构 |
| `sequence` | structure | range | 24 | 叙事事件 |
| `scene` | structure | range | 28 | 核心场景 |
| `visual` | visual | frames + range + boundary | 72 | Shot + Frame 主轴 |
| `markers` | annotation | point | 28 | 自由观察 |
| `primary-audio` | media | waveform | 48 | 现有主音频波形 |

默认顺序：

```text
section
sequence
scene
visual
markers
primary-audio
```

Registry 是 label/category/layers/defaults/min/max 的唯一 source；`EditorTimeline` 不再维护第二份 label map。

### 顺序约束

结构链：

```text
Section → Sequence → Scene → Visual
```

相对顺序固定。

Marker / 未来 Analysis 在 Visual 后、Audio 前调整；Audio 留媒体区。

### 4.1 最小类型化接入契约

Registry 管理定义，同一 feature 的类型化接入表关联 adapter、renderer、callback；EditorTimeline 不维护第二套类别/label 条件分支。

- adapter 输入所属领域数据、可靠 frame range、选择状态，输出轨道 view model；未知引用返回 issue。
- renderer 输入 view model、共享 viewport（frame↔pixel、visible range）、detail level、受控 selection 与 callbacks。
- 正式编辑由 callback 向现有编辑器提交 intent；renderer 不存正式数据、不写仓库。
- 将单值 renderMode 改为非空 layers 或等价类型化 composition；Visual = frames + range + boundary。
- 基于真实六轨验证，不提前建万能 renderer、插件 API 或独立 package。
- 已实现能力无项目数据时仍保留设置/创建入口和真实空态；尚未实现能力不注册。
- availability（能力/媒体前提）与 dataState（empty/loading/ready/error）分开。
- Section→Sequence→Scene→Visual 固定；Marker/Analysis 在 Visual 后、Audio 前调整，Audio 留媒体区。

### 4.2 命中与键盘操作

命中优先级：boundary handle > Shot 标签/选择区 > Frame strip。

- 点击 Shot 标签选择并 seek Shot start；点击帧带按整数帧精确 seek 并更新所处 Shot。
- overlay 不吞掉帧带事件；boundary 交互不冒泡到 seek。
- 结构、Marker 可键盘聚焦选择；边界提供操作菜单和相邻合法切点调整入口，不仅依赖 hover/drag。
- 同帧/重叠 Marker 提供候选列表或循环选择，所有记录均可访问；cluster 不取消该入口。
- Browser 验证事件冒泡、输入快捷键隔离、焦点可见性和窄视口。

## 5. Track Preference v2

旧 key：

```text
aisenlens:timeline-track-preferences
```

新 key：

```text
aisenlens:timeline-track-preferences:v2
```

一次性读取迁移：

```text
visual.visible =
  old.video-frames.visible || old.shots.visible

visual.height =
  max(old.video-frames.height, old.shots.height, visual.minHeight)

primary-audio = 继承旧值

scene = 继承 old.groups 的用户倾向

section / sequence =
  根据 registry default + 当前项目真实 group + 用户明确 override

markers = registry default
```

要求：

- unknown old id 丢弃。
- 不双写 v1/v2。
- malformed localStorage 不 crash，回 registry default。
- 用户显式隐藏与“默认因有数据而展示”必须可区分，否则打开项目会反复覆盖用户选择。

### Empty optional levels

Section/Sequence/Scene 都是 optional。

- 没数据时不要求三条轨全部占空间。
- 用户仍能在 Track Settings 主动显示空轨，为 Phase 03 开始结构化做准备。
- Phase 02 不提供尚未实现的假 Boundary 按钮；真正编辑在 Phase 03。

## 6. Shot + Frame 视觉主轨

### 6.1 数据层不合并

`ShotRecord` 不改为 Frame owner，也不取消 Shot。

Visual track 是 presentation composition：

```text
FrameThumbnailStrip
+ Shot range overlays
+ Shot labels
+ Shot boundaries
+ selection/filter/completeness states
```

### 6.2 必须保留现有行为

- active Shot。
- matching Shot。
- incomplete required analysis state。
- Shot 标签/选择区 click → active + seek shot start。
- Frame strip click → 精确帧 seek，遵循 4.2 命中规则。
- playhead。
- horizontal scroll。
- zoom/pan。
- filtering visual state。

### 6.3 Shot Boundary 一等视觉对象

每个相邻 Shot 的 cut point：

- 有明确线/handle。
- hover 显示可交互状态。
- click 可选中/定位。
- tooltip 只展示真实存在的：
  - manual/auto source
  - hard-cut/fade/tail
  - provenance 简要
- 如果连接已有 shot calibration/trim，调用既有领域 service/callback。

如本阶段实现 boundary drag：

- 必须调用现有 `moveSharedShotBoundary` 等能力。
- frame snap 为整数。
- pointerup 单次 history commit。
- 不能由 VisualTrack 自己改 Shot start/end。

如果为了风险控制把 drag 保留给既有 calibration UI，本阶段也必须至少让 boundary 成为可见且可进入现有校准能力的对象。

**禁止虚构 confidence 百分比。**

## 7. 三条 Structure 语义轨

不再渲染 `groups` 一条混合轨。

同一 `shotGroups`：

```ts
sectionGroups = groups.filter(g => g.kind === "section")
sequenceGroups = groups.filter(g => g.kind === "sequence")
sceneGroups = groups.filter(g => g.kind === "scene")
```

Range view model：

- 根据 ordered Shots 推导 start/end。
- UI seconds 只由 frame/frameRate 转换。
- group 失去 shot reference 或 validity needs-review 时显示明确 warning style。
- 不 silently skip 让用户误以为结构正常。
- click 继续复用 selectedGroupId。

Phase 02 只负责新语义轨“正确展示与选择”；Boundary editing 在 Phase 03。

## 8. Marker 独立 Track

`TimelineRuler` 移除：

- markers props。
- marker rendering。
- marker filter。
- marker color map。
- activeShot marker logic。

新 MarkerTrack：

- position = `marker.frame / frameRate` 映射 viewport。
- 默认压缩 pin。
- selected state。
- click → select + seek。
- hover/title → content。
- 单一视觉语言，不再 category colors。
- 高度 28，Phase 04 再做 scope expanded mode。

Ruler 保留：

- ticks
- in/out selection
- playhead handle
- seek

## 9. UI 状态

### Visual

- no source：复用现有安全空态。
- no Shot：可以显示 Frame strip，但无 Shot overlay。
- thumbnails unavailable/loading：沿用 FrameThumbnailStrip 语义。

### Structure

- no group：空轨。
- invalid group：warning/needs-review。
- hidden：不渲染 body，但设置中可恢复。

### Marker

- no marker：空轨，不显示假 pin。
- selected marker：清晰选中。

### Audio

- waveform unavailable/loading：继续复用现有组件行为。

## 10. 旧路径退出

Phase 02 完成后，正式 runtime 不再包含：

```text
video-frames track
shots track
groups track
```

具体：

- `TimelineTrackId` 删除旧三个 ID。
- `EditorTimeline.trackNodes` 不保留隐藏 old path。
- Ruler 不渲染 Marker。
- v1 preference 不作为 runtime source。
- 不做 “new visual + old tracks hidden behind flag” 双系统。

Generic Group editing UI 可以暂时存在到 Phase 03，但它只能编辑同一个 `shotGroups`，不能形成第二份数据。

## 11. 测试计划

修改渲染前按 Phase 06 §7 记录同 fixture/设备/视口的现有性能基线。新增 targeted tests 接入稳定测试入口，不能只手工运行一次。

### 已存在命令

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web-boundaries
```

### 建议新增 targeted tests

新增文件后：

```powershell
cd apps/webapp
node --experimental-strip-types --test test/timeline-track-preferences-v2.test.ts
node --experimental-strip-types --test test/timeline-structure-view-model.test.ts
```

覆盖：

- v1 preference → v2。
- malformed preference。
- structure locked order。
- show/hide/height。
- group ranges 按 kind。
- invalid/missing shot ref。

### Browser 验收

至少用：

- Full hierarchy 项目。
- Scene-only。
- 无结构。
- 100+ Shots。
- 多 Marker。

验证：

1. default order macro→micro。
2. Visual frames + Shot overlay 完全对齐。
3. Shot click/seek 无回归。
4. Marker 只在 MarkerTrack，不在 Ruler。
5. preference 修改 reload 后保留。
6. v1 preference migration 不产生 ghost track。
7. zoom/pan/playhead/auto-follow 正常。
8. 实际产品当前支持的主题与常用 desktop/narrow viewport；先核实再测，不预设更多主题。

## 12. 完成门槛与交给 Phase 03

完成：

- 六条 core track 已由单一 registry 管理。
- old track runtime 删除。
- Visual 合轨可用。
- Marker 独立轨可用。
- Section/Sequence/Scene 正确展示。
- preference v2 验证。
- Browser + typecheck/lint/build 实际记录。
- 功能验收状态与 Git 状态分别记录；仅在任务授权时 commit/push 并核远端。

交给 03：

- 可复用 StructureTimelineTrack。
- 可复用 Shot cut positions。
- Track layout 已定。
- Phase 03 只需在这些语义轨上增加正式 Boundary editing，不再动 Track taxonomy。
