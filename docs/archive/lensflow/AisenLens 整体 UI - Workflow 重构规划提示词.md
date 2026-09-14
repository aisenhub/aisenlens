你现在需要为开源项目 **AisenLens** 制定一次完整的产品流程与 UI 架构重构计划。

这是一个智能、自由、完全本地化的逐镜分析 / 拉片工具。

这次任务**不是立即修改代码**。

第一阶段只进行：

1. 当前仓库审计
2. 产品结构理解
3. UI / Workflow 架构设计落地
4. 制定 Master Plan
5. 把 Master Plan 拆解成适合 Coding Agent 独立执行的阶段计划

在规划完成以前，不要修改生产代码。

---

# 一、必须先阅读的资料

请完整阅读并综合以下四份文档：

1. `拉片产品与开源生态调研报告.md`
2. `AI拉片平台_产品信息架构_页面流转_UI_Wireframe.md`
3. `AisenLens_拉片流程与UI重构建议.md`
4. `AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md`

四份文档的职责不同，不要把其中任何一份孤立使用。

它们分别代表：

- 专业拉片方法与行业调研
- 理想产品 IA / Workflow / Wireframe
- 针对 AisenLens 当前实现的具体重构建议
- AisenLens Dark / Light 双主题视觉规范

如果文档内容和当前仓库实现存在冲突：

> **以当前仓库真实代码为实现事实，以文档表达的产品目标为重构方向。**

不要因为文档中的旧描述而假设当前代码仍然如此。

---

# 二、开始规划以前，必须重新审计当前仓库

不要直接根据文档生成计划。

先读取当前 `main` 分支，并确认至少以下内容：

- App / 页面路由结构
- ProjectLibrary
- ProjectMediaGate
- EditorPage
- EditorWorkspace
- VideoPreview / Playback Controls
- EditorTimeline
- ShotList
- Shot 数据模型
- Auto Shot 数据模型
- Auto Shot Control / Review / Apply
- Calibration
- Shot Group / Scene / Section / Sequence
- Template
- Annotation / Marker
- Screenshot
- Composition Overlay
- Content Overlay
- Audio / Waveform / Audio Track
- Export
- Project persistence
- Recovery / Undo / Redo
- 当前 Dark / Light Theme token
- responsive / mobile editor 行为
- 测试体系
- 与本次重构相关的已有 TODO / docs / audit

同时识别：

- 哪些能力已经存在
- 哪些能力部分存在
- 哪些只缺 UI 重编排
- 哪些确实需要新增 Domain / 数据结构
- 哪些只是未来规划

规划必须建立在真实代码之上。

---

# 三、几个不可违反的产品原则

## 1. 不重做 AisenShot 核心算法

当前镜头分割算法已经完成重点优化。

除非 UI 重构遇到明确的接口阻碍，否则：

> 不要把本次项目演变成 Auto Shot Algorithm Refactor。

保留并利用现有：

`candidate → review → apply → official shots`

语义。

---

## 2. Workflow First

现有 UI 最大问题之一，是按 Feature 组织：

素材、分镜、模板、Overlay、Marker、开发工具、分析……

目标架构必须改成按照用户专业拉片过程组织：

```text
Prepare
↓
Calibrate
↓
Overview
↓
Analyze
↓
Learn
↓
Create
```

现阶段 Create 可以只保留架构或未来入口。

---

## 3. Scene First

不要继续让 Shot List 成为整个产品的中心。

用户认知层级应该逐渐形成：

```text
Film
↓
Sequence / Section
↓
Scene
↓
Shot
```

但不要为了第一阶段 UI 强行重写当前 Group 数据模型。

优先复用当前：

```text
scene
section
sequence
```

能力。

---

## 4. Evidence Before Interpretation

Shot / Scene 分析 UI 必须逐渐形成：

```text
Evidence
↓
Facts
↓
Interpretation
↓
Learning
```

必须明确区分：

- 客观或机器识别事实
- AI / 人的解释
- 用户自己的笔记
- 可迁移方法

不要继续把所有内容混成普通表单字段。

---

## 5. Existing Capability First

大量功能当前已经存在。

原则：

> 能重编排就不重写。
> 能迁移 UI 就不新造 Domain。
> 能复用 Timeline 就不要重新实现 Timeline。
> 能复用 Group 就不要先重建 Scene Engine。
> 能复用 Template 就不要第一阶段发明复杂 Study Schema。

---

## 6. UI First / Capability Later

这是本项目非常重要的一项原则。

对于产品流程上明确有必要存在，但当前底层能力尚未实现的功能：

> **允许先实现真实 UI、页面、导航、状态与交互骨架，再逐步实现后端或算法能力。**

例如未来可能需要：

- Film Map
- Structure View
- Scene Board
- Dialogue Track
- SFX Track
- Sound Workspace
- Pattern
- Technique
- Create Workspace

如果当前能力不存在，可以先实现：

- Empty State
- Manual State
- Coming Soon State
- Experimental State
- Disabled State
- Loading State
- Error State
- UI Skeleton
- 数据接口边界

但：

### 严禁制造虚假能力

绝对不能为了让页面好看而显示假的：

- AI Scene Detection 结果
- AI 情绪曲线
- Dialogue
- Pattern
- Confidence
- Character Analysis

如果尚未实现，应明确显示：

```text
Manual
Experimental
Coming Soon
Unavailable
```

UI First 的意义是：

> 提前稳定产品信息架构。

而不是：

> 制作 Fake Demo。

---

# 四、视觉方向

必须参考：

`AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md`

目标不是普通 Web SaaS，也不是紫蓝渐变 AI 产品。

整体风格：

> 专业影视工作站 + 科学分析仪器 + 极轻 AI 感。

---

## Dark Theme

定义为：

`Cinema Mode`

方向：

- 专业调色室
- 深黑中性色
- 视频 Viewer 为视觉中心
- Timeline 高信息密度
- 单一蓝色 Selection
- 少 Card
- 少 Glow
- 少 Gradient
- 少装饰
- AI 紫色只做来源提示

---

## Light Theme

定义为：

`Studio Mode`

方向：

- macOS 专业剪辑软件
- Final Cut / Logic / Compressor 一类专业工具气质
- 冷中性浅灰
- Split View
- 小圆角
- 极少 Shadow
- Light Chrome + Dark Viewer
- 蓝色表示 Selection
- 红色表示 Playhead
- Inspector 更像系统属性面板而不是 SaaS Form

---

## 两个主题必须共享：

- spacing system
- typography hierarchy
- component structure
- information hierarchy
- semantic state
- workflow
- interaction model

不能维护两套完全不同的 UI。

只允许 Theme Token 和少量材质表现不同。

---

# 五、目标信息架构

Master Plan 至少应评估下面这套结构是否适合当前代码：

```text
ProjectWorkspaceShell

├── ProjectTopBar
│
├── WorkflowSidebar
│
└── WorkspaceView
    │
    ├── PrepareView
    │
    ├── CalibrateView
    │
    ├── OverviewView
    │
    ├── AnalyzeWorkspace
    │   ├── Scenes
    │   ├── Shots
    │   └── Sound
    │
    ├── LearnView
    │
    └── CreateView     // future / optional UI-first
```

Analyze Workspace 推荐继续围绕：

```text
AnalyzeWorkspace

├── VideoViewer
│   ├── VideoPreviewCanvas
│   └── VideoPlaybackControls
│
├── SceneShotStrip
│
├── AnalysisTimeline
│
└── ContextInspector
    ├── SceneInspector
    └── ShotInspector
```

不要无条件照抄。

先根据当前代码验证以后再决定最终组件边界。

---

# 六、需要重点解决的现有 UI 问题

Master Plan 必须明确分析以下问题并提出迁移方案：

### 当前左侧功能工具栏

现有类似：

```text
素材
分镜
模板
蒙版
标记
快捷键
开发者
设置
```

需要重新归位。

推荐方向：

```text
素材
→ Prepare

Auto Shot
→ Prepare

Auto Shot Review
→ Calibrate

Group
→ Structure / Scene

Template
→ Study / Project Settings

Composition / Content Overlay
→ Viewer Tools

Marker
→ Timeline Tool

Shortcut
→ Help

Developer
→ Advanced / Debug

Settings
→ Project / Global Settings
```

---

### 当前 ShotList

不要默认永久常驻。

重新定义：

```text
Shot Strip
= Scene 内导航

Timeline
= 时间关系

Shot Browser
= 全片查找

Shot Inspector
= 深入理解
```

Shot Browser 可以做：

- 页面
- Drawer
- Side Sheet

由规划判断最适合现有架构的实现。

---

### 当前 Inspector

从：

```text
画面
维度
批注
分组
```

逐步转成：

```text
Evidence
Facts
Interpretation
Learning
```

尽量先复用现有数据：

- first frame
- last frame
- screenshots
- detection
- analysisFields
- description
- notes

不要第一阶段进行无必要的数据 Migration。

---

### Group

普通用户 UI 中逐步减少“分组”这个抽象词。

优先显示：

```text
Scene
Section
Sequence
```

但底层现阶段允许继续使用既有 Group Domain。

---

# 七、Master Plan 的输出要求

请首先创建：

```text
docs/plans/aisenlens-workflow-redesign/00-master-plan.md
```

它应该是整个项目的唯一总计划。

必须包含以下部分：

## 1. Executive Summary

说明：

- 当前问题
- 目标状态
- 为什么这次不是换皮
- 最终希望形成什么产品心智

---

## 2. Current-State Architecture

真实描述当前代码。

包括：

```text
Pages
Workspace
Panels
Timeline
Shot
Auto Shot
Group
Template
Overlay
Marker
Audio
Export
Persistence
```

需要指出重要文件与职责。

---

## 3. Current → Target Mapping

建立完整迁移表：

```text
现有功能 / 组件
→
未来属于哪个 Workflow 阶段
→
保留 / 搬迁 / 重构 / 降级 / 删除一级入口
```

例如：

```text
AutoShotControlPanel
→ Prepare

ResultReview
→ Calibrate

ShotGroupPanel
→ Scene / Structure

CompositionOverlayPanel
→ Viewer Tools
```

---

## 4. Target Information Architecture

定义：

- Workspace Shell
- Workflow Navigation
- 各阶段页面
- 页面之间的切换关系
- Scene / Shot / Timeline / Inspector 的关系

---

## 5. Data Model Impact

将需求分成：

```text
No DB Change

UI-derived State

Small Schema Extension

New Domain Required Later
```

避免第一阶段过度设计数据库。

---

## 6. Component Architecture

说明：

- 哪些现有组件直接复用
- 哪些迁移
- 哪些需要抽取
- 哪些新增
- EditorWorkspace 应该如何渐进收敛

尤其不要再制造第二个 God Component。

---

## 7. State Ownership

明确：

- Project state
- Workflow state
- Playback state
- Selection state
- Shot editing state
- Calibration state
- Inspector state
- UI-only state

各自归属哪里。

---

## 8. UI First Capability Matrix

建立表格：

```text
Capability
Current Implementation
Target UI
First Version Behavior
Future Integration
```

例如：

```text
Dialogue Track
不存在
Timeline 中保留入口
Coming Soon / Disabled
未来接 ASR
```

---

## 9. Theme Architecture

说明如何实现：

```text
Cinema Mode
Studio Mode
System
```

要求：

- 共用组件
- 共用 Layout
- Token 驱动
- 禁止大量主题条件分支
- Video Viewer 可在 Light Theme 下继续保持深色

---

## 10. Migration Strategy

非常重要。

必须说明如何从当前 EditorWorkspace 平稳迁移。

推荐思想：

```text
先建立 Shell
↓
旧 Editor 先作为 Analyze Workspace 运行
↓
逐渐搬出 Prepare
↓
搬出 Calibrate
↓
新增 Overview
↓
重构 Inspector
↓
新增 Learn
↓
最后清理旧入口
```

避免 Big Bang Rewrite。

---

## 11. Compatibility / Persistence

明确：

- 已有用户项目必须能打开
- existing shots 不丢
- analysisFields 不丢
- screenshots 不丢
- markers 不丢
- groups 不丢
- template 不丢
- auto-shot task 不丢
- recovery snapshot 不破坏

---

## 12. Testing Strategy

至少覆盖：

- Existing project reopen
- New project
- Media relink
- Auto Shot
- Candidate Review
- Apply
- Manual Split
- Merge
- Undo / Redo
- Scene / Group
- Timeline
- Analysis editing
- Screenshot
- Overlay
- Audio
- Save
- Reload
- Export
- Dark Theme
- Light Theme
- Responsive

---

## 13. Performance Risks

尤其检查：

- EditorWorkspace render scope
- ShotList
- Timeline
- video playback state
- long video
- screenshots
- waveform
- theme changes

不能为了重构 UI 明显损害播放和时间线性能。

---

## 14. Accessibility

至少规划：

- keyboard
- focus
- contrast
- icon labels
- selected state
- dialog
- menu
- timeline interaction

---

## 15. Rollback Strategy

每个阶段必须可以独立验证和回退。

不要设计“只有 6 个阶段全部完成才能运行”的架构。

---

# 八、然后拆分 Agent 可执行阶段计划

完成 Master Plan 后，再创建独立阶段计划。

建议目录：

```text
docs/plans/aisenlens-workflow-redesign/

00-master-plan.md

01-workspace-shell-and-navigation.md

02-prepare-and-calibrate.md

03-overview-and-structure.md

04-analyze-scene-shot-inspector.md

05-learn-patterns-and-future-create.md

06-dual-theme-visual-system.md

07-cleanup-migration-and-regression.md
```

可以根据真实代码调整阶段数，但必须满足：

> 每一个阶段都可以由一个 Coding Agent 在独立任务中完成并验证。

---

# 九、每个阶段计划必须满足 Agent-friendly

每份阶段计划必须是**自包含执行文档**。

不能只写：

```text
根据 Master Plan 完成 UI。
```

必须明确写出：

## Scope

本阶段只做什么。

## Non-goals

明确本阶段绝对不做什么。

## Current Files

涉及的现有文件。

## New Files

预期新增的文件。

## Data Changes

有没有 Schema / Persistence 变化。

## Component Changes

组件如何调整。

## User Flow

用户在本阶段完成后具体怎么操作。

## UI States

至少考虑：

- Empty
- Loading
- Ready
- Disabled
- Error
- Coming Soon
- Experimental

## Theme Requirements

引用双主题视觉规范中与当前页面相关的要求。

## Migration

旧功能如何继续工作。

## Acceptance Criteria

必须可以逐项验证。

## Tests

需要新增/调整哪些测试。

## Manual QA

给出人工检查步骤。

## Regression Checklist

当前已有能力中哪些不能被破坏。

## Completion Gate

什么条件满足才可以进入下一阶段。

---

# 十、阶段划分原则

阶段应该按照“风险和依赖关系”拆，而不只是按照页面名称拆。

大体优先顺序应该倾向：

```text
1. Framework / Shell

2. Existing workflow relocation

3. Prepare / Calibrate

4. Overview / Structure

5. Analyze / Inspector

6. Learn / Future capability

7. Theme polish / migration cleanup
```

但请根据当前代码真实依赖关系调整。

---

# 十一、第一阶段应该优先重构框架，而不是页面细节

第一阶段的主要目标应该类似：

```text
建立 ProjectWorkspaceShell
建立 WorkflowSidebar
建立 Workspace routing/state
建立 ProjectTopBar
让旧 EditorWorkspace 作为 Analyze Workspace 临时运行
迁移一级导航
建立主题/Layout 基础
```

这一阶段：

不要大改：

- Auto Shot Algorithm
- Shot DB
- Timeline Engine
- Group Domain
- Analysis 数据
- Export

重点是：

> 建立未来所有页面都能稳定挂载的产品骨架。

---

# 十二、UI 风格必须作为所有阶段的约束，而不是最后再换皮

不要等所有页面写完后，再单独做：

```text
UI Beautification
```

每个阶段计划都必须引用：

`AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md`

例如 Prepare 阶段就明确：

- Cinema Mode 如何展示
- Studio Mode 如何展示
- spacing
- divider
- panel
- button
- empty state
- semantic colors

Visual System 可以有最终统一阶段，但视觉规则必须从 Phase 1 就生效。

---

# 十三、不要过度忠于旧 UI

这次是产品 Workflow 重构。

不要因为：

```text
当前按钮就在这里
```

就默认：

```text
未来还应该在这里
```

需要判断的是：

> 从专业拉片流程看，这个能力应该出现在哪个阶段？

---

# 十四、也不要过度忠于理想稿

反过来也不能因为设计文档画了某个页面，就完全忽略现有工程。

必须优先寻找：

```text
已有能力
+
正确重编排
```

而不是：

```text
重新实现所有东西
```

---

# 十五、处理缺失功能的方法

任何在设计目标中存在、当前代码没有实现的功能，都必须归为以下之一：

```text
A. 当前阶段必须实现

B. UI First，能力后续接入

C. 暂时 Coming Soon

D. 不进入当前 Roadmap
```

Master Plan 必须给出理由。

不能默默遗漏。

也不能全部塞进 Phase 1。

---

# 十六、计划中必须维护一个 Capability Matrix

例如：

| Capability | Current | Target | Phase | Strategy |
|---|---|---|---|---|
| Auto Shot | 已实现 | Prepare | 2 | Move / reuse |
| Candidate Review | 已实现 | Calibrate | 2 | Redesign UI |
| Film Map | 无独立页面 | Overview | 3 | Build from existing facts |
| Scene Board | Group 基础存在 | Analyze | 3/4 | UI-first + reuse groups |
| Dialogue | 未实现 | Sound | later | UI first |
| Pattern | 未实现 | Learn | 5 | new domain |
| Storyboard | 未实现 | Create | future | Coming Soon |

实际内容必须根据仓库重新确认。

---

# 十七、计划中必须维护一个“Reuse Map”

AisenLens 当前已经投入很多工程能力。

必须避免重构过程中重复实现。

明确列出：

```text
Existing Component / Service
→
Future Usage
```

例如：

```text
VideoPreviewCanvas
→ Analyze VideoViewer

VideoPlaybackControls
→ Analyze VideoViewer

EditorTimeline
→ AnalysisTimeline

ShotGroupRecord
→ Scene / Section / Sequence UI

AnnotationMarker
→ Overview + Timeline

Screenshot
→ Evidence

Template
→ Study / Facts schema

AutoShotCandidate
→ Calibrate Evidence

CompositionOverlay
→ Viewer Tool
```

---

# 十八、禁止事项

规划期间不要：

1. 修改生产代码
2. 重写 AisenShot
3. 大规模改数据库
4. 删除旧数据
5. 创建 Fake AI Result
6. 把 AI Chat 设计成核心入口
7. 一次性重写 EditorWorkspace
8. 重写 Timeline
9. 把所有未来功能塞进第一阶段
10. 单纯追求 UI “好看”而牺牲专业工作流
11. 只做视觉换皮而不解决信息架构
12. 制定无法独立验证的大阶段

---

# 十九、最终规划完成以后，输出总结

规划完成以后，请最后输出：

## A. 你对当前 AisenLens 最大产品问题的判断

不超过 10 条。

## B. 最终目标架构

用 Mermaid 或 ASCII 表达。

## C. 阶段列表

每个阶段说明：

```text
目标
主要改动
是否改 DB
风险
预计影响区域
依赖
```

不要提供时间估算。

## D. 前三个阶段的推荐执行顺序

解释为什么。

## E. 当前明确不应该做的事情

防止后续 Agent scope creep。

---

# 二十、计划文档质量标准

这不是产品概念稿。

目标是：

> **另一个 Coding Agent 只阅读某个阶段计划和相关源代码，就可以安全地开始实现。**

所以计划必须：

- 文件级具体
- 组件级具体
- 数据流具体
- 状态具体
- 验收具体
- 测试具体

同时不能提前把实现细节锁死到不合理程度。

对于尚未验证的实现决策，标记：

```text
Decision Required
```

并给出推荐方案与备选方案。

---

# 最终目标

这次重构完成以后，AisenLens 的用户体验不再是：

```text
打开一个复杂编辑器
↓
自己寻找各种工具
↓
自动分镜
↓
逐个镜头填表
↓
导出
```

而应该逐渐成为：

```text
导入素材

↓ PREPARE

建立镜头地图

↓ CALIBRATE

确认镜头结构

↓ OVERVIEW

理解整部影片

↓ ANALYZE

Scene → Shot → Evidence → Interpretation

↓ LEARN

提炼可以带走的方法

↓ CREATE

未来应用到自己的创作
```

产品最终定义：

> **AisenLens 是一个把成片反向理解成创作决策，并帮助创作者沉淀影视方法的专业本地工作台。**

现在先完成仓库审计，然后生成 Master Plan 和阶段实施计划。

在所有规划完成前，不修改生产代码。