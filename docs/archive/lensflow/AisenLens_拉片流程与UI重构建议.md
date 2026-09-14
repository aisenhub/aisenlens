# AisenLens 拉片流程与 UI 重构建议

> 基于当前 `aisenhub/aisenlens` 公开仓库的产品结构与实现现状整理  
> 目标：从“围绕功能组织编辑器”升级为“围绕专业拉片认知流程组织工作台”

---

## 1. 核心结论

AisenLens 当前最主要的问题并不是功能不足，而是：

> **底层已经具备较丰富的拉片能力，但用户界面仍然按照“功能模块”组织，而不是按照“专业拉片流程”组织。**

目前编辑器同时混合了：

- 项目与素材管理
- 自动分镜
- 自动分镜候选 Review
- 人工切镜
- 镜头列表
- 时间线
- Scene / Section / Sequence 分组
- 镜头分析
- 批注
- Marker
- 构图 Overlay
- 模板
- 音频
- 导出
- 开发者与标定工具

这些能力单独存在都合理，但当它们同时以一级功能入口暴露给用户时，用户很难建立一个明确的认知：

> **我现在处于拉片的哪一步？下一步应该做什么？**

因此，这次优化不应该只是一次视觉改版，而应该是一次：

# AisenLens Pull-Apart Workflow Redesign

即：

> **从“功能驱动型编辑器”升级为“流程驱动型拉片工作台”。**

---

# 2. 新的产品底层逻辑

建议把完整拉片过程定义为：

```text
PREPARE
准备
↓
CALIBRATE
校准
↓
OVERVIEW
总览
↓
ANALYZE
深拆
↓
LEARN
沉淀
↓
CREATE
创作
```

考虑当前产品成熟度，第一阶段实际可以先上线：

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

                         Export →
```

未来真正具备 Storyboard、Shot List、创作方案、Prompt、参考镜头重组等能力之后，再将 Export 进一步升级为：

```text
Create
```

---

# 3. 一个新增的重要产品原则：UI 可以先于功能实现

对于**产品流程中明确有必要存在、但当前尚未实现底层能力的功能**，不建议因为功能未完成就完全不做 UI。

可以采用：

# UI First / Capability Later

也就是：

> **先建立正确的信息架构、入口、页面、状态和交互骨架，底层功能随后逐步接入。**

例如未来确定需要：

- Film Overview
- Scene Board
- Pattern / Technique
- Sound Analysis
- Dialogue Track
- Structure Track
- Creation Workspace

即使当前算法、数据模型或业务逻辑还没有完全实现，也可以先建设 UI。

但必须遵守下面三个规则。

## 3.1 不允许伪装成已实现功能

尚未实现时，不显示虚假分析结果。

错误示例：

```text
AI 已识别 12 个 Scene
```

实际上 Scene AI 还不存在。

正确方式：

```text
Scene Structure

尚未建立 Scene 结构

[手动建立 Scene]
[自动识别 Scene · 即将推出]
```

---

## 3.2 UI 骨架应该是真实产品结构，而不是 Demo

UI First 不等于画假页面。

应该提前实现：

- 页面层级
- 导航
- Toolbar
- Empty State
- Loading State
- Disabled State
- Pending State
- Result State
- Error State
- Inspector
- Timeline Track
- Card / List / Grid 结构
- 未来数据接口位置

这样后续接入能力时，不需要再次改变产品架构。

---

## 3.3 建议给能力增加明确状态

可以统一定义：

```text
Available
当前可用

Manual
当前支持人工操作

Experimental
实验能力

Coming Soon
UI 已存在，能力尚未开放
```

例如：

```text
Scene Detection
Experimental

Dialogue Analysis
Coming Soon

Shot Detection
Available
```

这样既可以提前构建未来产品形态，又不会误导用户。

---

# 4. 当前 AisenLens 编辑器的问题

当前编辑器大致可以抽象成：

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 项目列表  项目名                     导出   保存                            │
├────┬─────────────┬──────────────────────────┬────────────┬─────────────────┤
│工具│ 工具详情    │                          │ Shot List  │ 画面/维度/批注  │
│栏  │             │        Video             │            │ /分组           │
│64px│   208px     │                          │ 224~240px  │ 256px           │
│    │             ├──────────────────────────┤            │                 │
│    │             │        Timeline          │            │                 │
└────┴─────────────┴──────────────────────────┴────────────┴─────────────────┘
```

这里最大的问题不是控件数量，而是任务层级混杂。

同一屏幕同时承担：

1. 项目配置
2. 素材准备
3. 镜头生产
4. 镜头校准
5. 镜头浏览
6. 镜头分析
7. 影片结构分析
8. 工具配置
9. 开发者调试

因此用户实际上没有“工作阶段”。

---

# 5. 当前产品结构的 7 个核心问题

| 当前设计 | 问题 | 建议 |
|---|---|---|
| 所有能力进入一个 EditorWorkspace | 没有阶段概念 | Project Workspace 分阶段 |
| 左栏按照功能分类 | 用户需要自己理解操作顺序 | 按 Workflow 分类 |
| Auto Shot Review 藏在小面板 | 最关键的数据确认步骤被降级 | 独立 Calibrate |
| Group 统一叫“分组” | 结构语义过弱 | Scene / Section / Sequence |
| Shot List 永久常驻 | 强化“逐镜头填表”心智 | Scene First，Shot Browser 按需 |
| 右侧“画面 / 维度 / 批注 / 分组” | 按数据类型组织，而非认知过程 | Evidence → Facts → Interpretation → Learning |
| Export 被当成终点 | 拉片结果没有沉淀为知识 | Learn / Pattern / Technique |

---

# 6. 最重要的重构：Auto Shot → Calibrate

AisenShot 底层实际上已经存在 Candidate 概念，并且 Candidate 带有：

- startFrame
- endFrame
- kind
- score
- threshold
- detectors
- evidence
- boundary
- transitionRange
- engineVersion
- configHash

因此它本质上不是简单的：

> 自动切镜

而是：

> **机器提出镜头边界 → 用户进行校准 → 确认成为正式 Shot。**

这个过程应该被产品 UI 明确表达。

---

# 7. Calibrate 页面

自动扫描完成后，不应该继续把 Review 塞在一个小工具面板里。

建议进入独立工作区：

```text
CALIBRATE
确认影片镜头结构
```

页面：

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Projects   Film Name          PREPARE ✓   CALIBRATE ●   OVERVIEW ○   │
├────────────────┬────────────────────────────────────┬────────────────────┤
│ REVIEW QUEUE   │                                    │ BOUNDARY           │
│                │                                    │                    │
│ 12 待确认      │             VIDEO                  │ 00:12:32:14        │
│ 174 已接受     │                                    │ Hard Cut           │
│                │                                    │                    │
│ ● Boundary 18  │                                    │ Score       .81    │
│   边界较模糊   │                                    │ Threshold   .76    │
│                ├───────────────┬────────────────────┤                    │
│ ○ Boundary 43  │ Before Frame  │ After Frame        │ Evidence           │
│ ○ Boundary 71  │               │                    │ Detector A .82     │
│                │               │                    │ Detector B .63     │
│                │               │                    │                    │
│                │               │                    │ [拒绝] [确认]      │
├────────────────┴───────────────┴────────────────────┴────────────────────┤
│                       abbreviated timeline                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

# 8. 不要把 score 直接称为“准确率”

如果算法没有做 probability calibration，不应该显示：

```text
准确率 81%
```

建议使用：

```text
检测强度
Score

检测阈值
Threshold

阈值余量
Margin

检测证据
Evidence
```

这样更科学。

可以根据 Score 与 Threshold 的距离划分：

```text
High Confidence
Auto Accepted

Needs Review
需要人工确认

Low Confidence
默认拒绝或重点检查
```

---

# 9. Prepare 不应该只是“素材面板”

目前素材管理属于左侧 Tool。

建议升级为完整阶段：

# Prepare

目标：

> 建立本次拉片研究的基本环境。

页面：

```text
PREPARE
建立影片地图

┌──────────────────────────────────────────┐
│              VIDEO PREVIEW               │
└──────────────────────────────────────────┘

素材
✓ 视频已关联     test.mov
✓ 1920 × 1080
✓ 24 fps
✓ 08:32
✓ 音频存在

镜头结构
○ 尚未建立

内容类型
[ 综合 ] [ 短视频 ]

检测方式
[均衡]
硬切 + 淡入淡出
最短镜头 0.5s

                [建立镜头地图 →]
```

这里可以直接复用当前：

- Auto Shot Preset
- Detection Detail
- Transition
- Minimum Shot Duration

只是改变产品语言。

以前：

```text
自动分镜设置
```

以后：

```text
建立镜头地图
```

---

# 10. 新建项目可以增加 Study Intent

用户新建项目时，可以增加：

```text
你这次主要想研究什么？

● 综合拉片
○ 镜头 / 摄影
○ 剪辑 / 节奏
○ 导演 / 叙事
○ 广告 / 短视频
```

第一阶段不一定需要马上修改数据库。

可以先映射：

```text
Study Intent
→ Project Template
```

未来再增加正式字段：

```ts
studyIntent
```

---

# 11. Overview 是当前最缺的一层

AisenLens 已经有：

- Shot
- Shot Duration
- Group
- Scene / Section / Sequence
- Timeline
- Waveform
- Marker
- Template
- Analysis

但目前没有完整的：

> **Film Level Understanding**

也就是说：

用户可以研究 Shot，却很难先回答：

> “整部作品整体是什么结构？”

因此必须增加：

# Overview

---

# 12. Overview 第一版完全可以不依赖 AI

直接基于已有数据生成：

```text
OVERVIEW

Film Map
──────────────────────────────────────────────────────

00:00                                           08:42

SEQUENCE
|──────── Sequence 1 ────────|──── Sequence 2 ─────|

SCENE
| S01 | S02   | S03 | S04       | S05 |

SHOT DENSITY
▁▂▂▃▄▆██▇▅▃▂▅▇██▆▃

MARKERS
       ●                ◆            ●

AUDIO
▁▂▃▅▃▂▂▆██▅▃▂
```

右侧统计：

```text
186 Shots
12 Scenes
3 Sequences

Avg Shot     2.81 s
Median Shot  2.34 s
Shortest     0.42 s
Longest      14.81 s
```

这些都是：

# Facts

不涉及 AI 判断。

---

# 13. Timeline 不需要推倒重写

当前 Timeline 已经支持：

- Audio
- Frame Thumbnail
- Group
- Shot
- Zoom
- Pan
- Track Order
- Track Visibility
- Track Height
- Multi Audio Track

因此建议：

> **保留 Timeline Engine，只做语义升级。**

现在：

```text
音频
帧带
分组
分镜
```

以后：

```text
VIDEO
Frame Strip

STRUCTURE
Sequence
Scene

EDITING
Shot

SOUND
Waveform
Music
Dialogue
SFX

NOTES
Markers
```

---

# 14. 对尚未实现的 Track，可以 UI 先行

例如 Dialogue Track 当前没有底层分析。

仍然可以先出现：

```text
SOUND

Waveform          ✓

Music             Manual

Dialogue          Coming Soon

SFX               Coming Soon
```

时间线 Track Menu 中可以提前设计：

```text
☑ Waveform
☐ Music
🔒 Dialogue · Coming Soon
🔒 SFX · Coming Soon
```

这样未来增加功能时，不需要重新改变 Timeline 信息架构。

---

# 15. “分组”应该退出普通用户语言

当前底层已经存在：

```text
scene
section
sequence
```

普通用户不需要理解一个抽象的：

```text
Group
```

应该直接显示：

```text
Scene
Section
Sequence
```

例如：

现在：

```text
分镜
└─ 镜头分组
```

未来：

```text
STRUCTURE

Scenes
Sequences
Sections
```

---

# 16. 现阶段可以继续保持 Group 为平面结构

当前 Group 数据本质是：

```text
Scene → Shots

Section → Shots

Sequence → Shots
```

而不是严格：

```text
Sequence
└─ Section
   └─ Scene
      └─ Shot
```

第一阶段没有必要为了 UI 立即重写数据库。

可以先在 Timeline 中分别显示：

```text
Sequence Track
Scene Track
```

未来真正需要严格层级，再新增：

```ts
StructureNode {
  id
  type
  parentId
}
```

---

# 17. Analyze 应该 Scene First

目前编辑器整体是：

> Shot First

建议改为：

> Scene First

默认 Analyze 页面：

```text
ANALYZE

Scenes 12                                  [Timeline] [Grid]

┌──────────────────────┐
│ [Key frame]          │
│                      │
│ Scene 01             │
│ 00:42 · 11 shots     │
│                      │
│ 地下室 · 家庭早餐    │
│ 建立人物生活状态     │
└──────────────────────┘

┌──────────────────────┐
│ [Key frame]          │
│ Scene 02             │
│ 01:18 · 23 shots     │
│                      │
│ 家教机会出现         │
└──────────────────────┘
```

用户点击 Scene：

```text
Scene
↓
Shot Strip
↓
Shot Inspector
```

而不是一进入项目就面对：

```text
Shot #001
Shot #002
Shot #003
...
Shot #500
```

---

# 18. Shot List 不建议永久常驻

当前 ShotList 有很强的完整管理能力：

- 搜索
- Filter
- Group
- Completion
- Split
- Delete
- Play

这些能力可以保留。

但 UI 角色应该从：

```text
Permanent Panel
```

变成：

```text
Shot Browser
```

三种镜头导航方式：

### Scene 内

```text
Shot Strip

[01][02][03][04][05]
```

### 时间关系

```text
Timeline
```

### 全片搜索

```text
Shot Browser
```

Shot Browser 可以：

- Drawer
- Modal
- Side Sheet
- Analyze → Shots 页面

形式出现。

---

# 19. 删除永久 ShotList 可以释放横向空间

当前 ShotList 长期占用约 224–240px。

建议释放后，把真正需要空间的：

```text
Shot Inspector
```

从：

```text
256px
```

扩大到：

```text
320–360px
```

因为真正应该获得空间的是：

> 理解镜头

而不是：

> 导航镜头

---

# 20. 新 Analyze 标准布局

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Projects    Parasite / Study 01       Saved ✓      ↶  ↷      Export    │
├──────────────┬───────────────────────────────────────┬─────────────────────┤
│              │                                       │                     │
│ PREPARE ✓    │                                       │ SHOT 037            │
│ CALIBRATE ✓  │                                       │                     │
│ OVERVIEW     │               VIDEO                   │ Evidence             │
│              │                                       │ Facts                │
│ ANALYZE ●    │                                       │ Interpretation       │
│   Scenes     │                                       │ Learning             │
│   Shots      ├───────────────────────────────────────┤                     │
│   Sound      │ [34] [35] [36] [37] [38] [39]       │                     │
│              ├───────────────────────────────────────┴─────────────────────┤
│ LEARN        │ Scene   |──────────── Scene 08 ─────────────|               │
│              │ Shots   |34|35|36|37|38|39|                               │
│              │ Audio   ▂▃▅██▃▂▁▄▆▃                                       │
│              │ Marker             ◆                                      │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

固定五个区域：

1. Project Top Bar
2. Workflow Sidebar
3. Main Workspace
4. Context Inspector
5. Timeline

---

# 21. 当前 64px 功能工具栏建议取消

目前：

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

这些不属于同一级。

建议重排：

| 当前 | 新位置 |
|---|---|
| 素材 | Prepare |
| 自动分镜 | Prepare |
| Candidate Review | Calibrate |
| Scene / Group | Overview / Analyze |
| 模板 | Project Setup / Study Mode |
| 蒙版 | Viewer Tools |
| Marker | Timeline Toolbar |
| 快捷键 | Help |
| Developer | Advanced / Debug |
| Settings | Project / Global Settings |

最终 Workflow Sidebar：

```text
Prepare

Calibrate

Overview

Analyze
  Scenes
  Shots
  Sound

Learn
```

---

# 22. Developer 不应该是普通用户一级入口

开发者工具、自动分镜标定、高级参数属于：

```text
Settings
→ Advanced
→ Developer Tools
```

或者：

```text
Debug Mode
```

正常用户默认隐藏。

这样可以显著降低整个产品的“工程工具感”。

---

# 23. Mask / Overlay 应该属于 Viewer Tool

Composition Overlay 和 Content Overlay 本质是：

> 视频查看辅助工具

而不是完整的拉片阶段。

建议放到播放器：

```text
VIDEO VIEWER

                         [Viewer Tools ▾]

                         Rule of Thirds
                         Safe Area
                         Golden Ratio
                         Drawing
                         Content Overlay
```

这样产品结构会清晰很多。

---

# 24. Shot Inspector 应该彻底重构

现在：

```text
画面
维度
批注
分组
```

建议改成：

# Evidence → Facts → Interpretation → Learning

页面：

```text
SHOT #037
01:32.450 → 01:35.820
3.37s

AUTO · HARD CUT
────────────────────

EVIDENCE
────────────────────
[首帧] [关键帧] [尾帧]

+ 添加截图证据

对白
“……”

────────────────────
FACTS
────────────────────

景别         中近景
运动         缓慢推近
色彩         暖色
声音         同期声
时长         3.37s

────────────────────
INTERPRETATION
────────────────────

画面在做什么？
……

叙事作用 / 我的分析
……

────────────────────
LEARNING
────────────────────

我可以从这个镜头带走什么？
……

[保存为技法]
```

---

# 25. 现有数据已经支持前三层

当前 Shot 已经具备：

```text
startFrame
endFrame

detection

firstFrameScreenshot
lastFrameScreenshot
primaryScreenshot
screenshotIds

analysisFields

description

notes
```

因此第一阶段主要是：

```text
Existing Data
↓
Reclassification
↓
New UI
```

不需要先做大型数据库 Migration。

---

# 26. Evidence 应该成为 AisenLens 的重要专业特征

Evidence 可以包括：

```text
EVIDENCE

Boundary
[首帧] → [尾帧]

Reference Frames
[关键帧]
[构图截图]
[人物表情]

Detection
Auto Shot
Hard Cut
AisenShot
```

未来 AI Interpretation 如果存在，也应该能够回答：

> 这个判断基于哪些 Evidence？

这样可以提升产品可信度。

---

# 27. Facts 与 Interpretation 必须严格区分

例如：

```text
推镜
```

属于 Fact。

而：

```text
建立悬念
```

属于 Interpretation。

不应该在 UI 中把两者混为一谈。

可以写：

```text
运动方式
推镜

常见用途（参考）
聚焦主体 / 缩小心理距离 / 强化信息

具体作用需要结合上下文判断
```

---

# 28. “填写完成度”应该降级

当前产品比较强调：

```text
已填 3/5
必填项已完成
```

这种表达很容易把 AisenLens 变成：

> Data Annotation Tool

建议主状态改为：

```text
Analyzed

Needs Review

Has Insight
```

模板完成度作为 Secondary：

```text
Facts 4/5
```

即可。

---

# 29. Scene 可以直接复用当前 Group 能力

现有 Group 已经有：

- title
- kind
- shotIds
- range
- duration
- summary

所以它本身已经很接近：

# Scene

UI 可以直接升级：

现在：

```text
分组名称
分组类别
分组范围
分组分析
```

以后：

```text
Scene 08

标题
Basement Dinner

范围
Shot 37 → Shot 52
01:43

Scene Purpose
……

Turning Point
……

我的分析
……
```

---

# 30. 需要优先修复一个 Group Summary 问题

当前 Group Inspector 的 Summary 输入逻辑需要检查。

建议确保：

```ts
summary: event.target.value
```

而不是继续保存旧：

```ts
summary: group.summary
```

因为 Scene Analysis 后续会成为核心数据。

---

# 31. Marker 可以直接参与 Film Overview

当前 Marker：

```text
important
composition
emotion
turning-point
```

未来可以直接画入 Film Map：

```text
Important         ●      ●
Composition            ◆
Emotion           ▲              ▲
Turning Point                  ★
```

尤其 Turning Point 天然适合：

```text
Structure / Overview
```

---

# 32. Project Library 也应该表达 Workflow

当前项目卡主要显示：

```text
186 镜头
37 批注
昨天
```

建议升级：

```text
Parasite

✓ 镜头已校准
12 Scenes · 186 Shots

Analyze
Scene 08 / 12

上次编辑 2小时前
```

用户应该第一眼知道：

> 我上次拉到哪了？

而不是：

> 数据库里有多少数据？

---

# 33. Project Progress 应该表达流程

例如：

```text
Prepare       ✓

Calibrate     ✓

Overview      ✓

Analyze       42%

Learn         3 insights
```

第一阶段甚至不需要增加正式 Workflow State。

可以通过已有数据推导：

```text
有 Media
→ Prepare Complete

Auto Shot Applied
→ Calibrate Complete

有 Scene
→ Overview Available

有 Analysis
→ Analyze Started

有 Pattern
→ Learn Started
```

---

# 34. Learn 第一版应该很轻

暂时不需要复杂 AI。

只需要支持：

```text
选择几个 Shots / 一个 Scene
↓
保存为方法
```

例如：

```text
方法名称
────────────────
冲突前逐步缩短镜头时长

适用情况
────────────────
冲突已建立但尚未爆发

观察
────────────────
4.1s → 2.8s → 1.7s → 0.8s

我的理解
────────────────
提高压迫感，让高潮有预期。
```

这样用户拉片后的价值不会停留在：

```text
Export Report
```

而会进入：

```text
Personal Knowledge
```

---

# 35. Pattern / Technique 可以后续再做 Domain

未来建议新增：

```ts
PatternRecord {
  id
  projectId

  title

  sourceShotIds[]
  sourceGroupIds[]

  observation
  interpretation
  reusableRule

  tags[]

  createdAt
  updatedAt
}
```

未来：

```text
Project Pattern
↓
Global Technique Library
```

---

# 36. Pattern 功能适合 UI First

即使数据库暂时没有 `PatternRecord`，可以先实现：

```text
LEARN

Techniques

┌────────────────────────────┐
│ 暂无已保存技法             │
│                            │
│ 在 Analyze 中选择镜头后，  │
│ 可以保存为可复用技法。     │
└────────────────────────────┘
```

并在 Shot Inspector 先放：

```text
[保存为技法]
```

如果功能未开放：

```text
[保存为技法 · Coming Soon]
```

这样信息架构可以提前稳定。

---

# 37. 推荐的工程 Shell

未来建议：

```text
EditorPage
└─ ProjectMediaGate
   └─ ProjectWorkspaceShell
      │
      ├─ ProjectTopBar
      ├─ WorkflowSidebar
      │
      └─ WorkspaceView
          │
          ├─ PrepareView
          ├─ CalibrateView
          ├─ OverviewView
          ├─ AnalyzeWorkspace
          └─ LearnView
```

---

# 38. 不建议推倒现有 EditorWorkspace

可以渐进式改造。

第一阶段：

```text
EditorWorkspace
↓
AnalyzeWorkspace
```

然后逐步迁出：

```text
Material
→ Prepare

Auto Shot
→ Prepare

Candidate Review
→ Calibrate

Calibration Tool
→ Developer / Advanced
```

这样对当前生产功能风险最低。

---

# 39. AnalyzeWorkspace 推荐结构

```text
AnalyzeWorkspace

├─ VideoViewer
│  ├─ VideoPreviewCanvas
│  └─ VideoPlaybackControls
│
├─ SceneShotStrip
│
├─ AnalysisTimeline
│
└─ ContextInspector
   ├─ ShotInspector
   └─ SceneInspector
```

现有：

- VideoPreviewCanvas
- VideoPlaybackControls
- EditorTimeline

都可以继续复用。

---

# 40. 当前一级入口的处理建议

| 当前 | 处理 |
|---|---|
| 素材 | Prepare |
| 分镜 | Prepare + Calibrate |
| 拉片模板 | Project Settings / Study Mode |
| 视频蒙版 | Viewer Tool |
| 时间线标记 | Timeline Tool |
| 快捷键 | Help |
| 开发者 | Advanced |
| 设置 | Global / Project Settings |

最终左侧不再是：

```text
功能工具栏
```

而是：

```text
Workflow Navigator
```

---

# 41. 同一个 Shot 的不同入口必须有明确职责

当前 Shot 同时在：

```text
分镜工具
Shot List
Inspector
Timeline
```

未来应该明确：

```text
Calibrate
= 生产和确认 Shot

Timeline
= 看 Shot 的时间关系

Shot Browser
= 查找 Shot

Shot Inspector
= 理解 Shot
```

这样不会再产生重复入口带来的认知混乱。

---

# 42. 功能开发优先级

| 优先级 | 改造 | 当前是否具备基础 | 是否可 UI First | 是否改 DB |
|---|---|---|---|---|
| P0 | ProjectWorkspaceShell | 部分 | 是 | 否 |
| P0 | Workflow Sidebar | 否 | 是 | 否 |
| P0 | Calibrate 独立页面 | 是 | 是 | 否 |
| P0 | Developer / Mask / Template 降级 | 是 | 是 | 否 |
| P0 | ShotList → Shot Browser | 是 | 是 | 否 |
| P1 | Overview / Film Map | 大部分 | 是 | 否 |
| P1 | Group → Scene / Structure UI | 是 | 是 | 否 |
| P1 | Evidence / Facts / Interpretation Inspector | 是 | 是 | 否 |
| P1 | 修复 Group Summary | 是 | 不适用 | 否 |
| P2 | Study Intent | 部分 | 是 | 可暂不改 |
| P2 | Scene Board | 大部分 | 是 | 否 |
| P2 | Sound Workspace | 部分 | 是 | 少量 |
| P2 | Dialogue / SFX Track | 暂无 | **非常适合 UI First** | 后续 |
| P3 | Pattern / Technique | 暂无 | **适合 UI First** | 是 |
| P3 | 严格 Structure Tree | 暂无 | 可先 UI | 是 |
| P3 | Create Workspace | 暂无 | 可先 UI | 后续 |

---

# 43. 第一轮暂时不要做的事情

目前不建议优先：

- 修改 AisenShot 核心算法
- 重写 Timeline
- 重写 IndexedDB
- 做复杂 Scene AI
- 做完整 AI 情绪曲线
- 一次性增加大量分析维度
- 把 AI Chat 放到产品核心
- 一键生成大量无法验证的影片解释
- 为未来功能提前大规模重做数据库

当前最重要的事情是：

> **先把已有能力放到正确的位置。**

---

# 44. 最终目标 UI

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Projects   AisenLens / Parasite        Saved ✓     ↶ ↷      Export     │
├──────────────┬───────────────────────────────────────┬─────────────────────┤
│              │                                       │                     │
│ ✓ PREPARE    │                                       │ SHOT 037            │
│ ✓ CALIBRATE  │                                       │ 3.37s               │
│              │                VIDEO                  │                     │
│   OVERVIEW   │                                       │ EVIDENCE            │
│              │                                       │ [A] [B] [C]         │
│ ● ANALYZE    │                                       │                     │
│   Scenes     ├───────────────────────────────────────┤ FACTS               │
│   Shots      │ 34   35   36  [37]  38   39          │ MCU                 │
│   Sound      │                                       │ Slow Push           │
│              ├───────────────────────────────────────┤                     │
│   LEARN      │ SCENE   |──────── Scene 08 ────────| │ INTERPRETATION      │
│              │ SHOTS   |34|35|36|37|38|39|          │                     │
│              │ AUDIO   ▁▂▅██▃▂▄▆                    │ LEARNING            │
│              │ MARKER              ◆                 │                     │
└──────────────┴───────────────────────────────────────┴─────────────────────┘
```

---

# 45. 每一个区域只回答一个问题

## 左侧 Workflow Sidebar

回答：

> 我正在拉片的哪一步？

---

## 中央 Workspace

回答：

> 我现在正在研究什么？

---

## 底部 Timeline

回答：

> 它和前后时间、镜头、声音之间是什么关系？

---

## 右侧 Inspector

回答：

> 关于这个对象，我看到了什么、知道什么、如何解释、学到了什么？

即：

```text
Evidence
↓
Facts
↓
Interpretation
↓
Learning
```

---

# 46. AisenLens 的长期产品方向

AisenLens 不应该最终停留在：

```text
视频
↓
自动切镜
↓
逐镜填写
↓
导出表格
```

而应该变成：

```text
视频
↓
建立镜头结构
↓
校准镜头
↓
理解全片
↓
理解 Scene
↓
理解 Shot
↓
提炼 Pattern
↓
形成自己的影视方法库
```

也就是：

> **从“拉片记录工具”逐步升级为“影视理解与方法沉淀系统”。**

---

# 47. 最终原则

整个重构可以坚持五条原则：

### 1. Workflow First

导航按照专业工作流程组织，而不是按照代码 Feature 组织。

### 2. Scene First

用户优先理解影片结构，然后深入 Shot。

### 3. Evidence Before Interpretation

先展示证据和事实，再进入解释。

### 4. Existing Capability First

尽量复用现有 Shot、Timeline、Group、Marker、Template、Screenshot、Audio 能力，不做无必要重写。

### 5. UI First When Necessary

对于产品方向上明确必要、但当前尚未完成的能力：

> **可以先实现真实 UI 与交互骨架，然后逐步接入底层能力。**

前提是：

- 不制造虚假结果
- 明确功能状态
- Empty / Disabled / Coming Soon 状态真实
- 提前稳定信息架构
- 后续功能接入时尽量不再改变用户工作流

---

# 48. 一句话总结

AisenLens 下一阶段最重要的不是继续堆功能，而是让：

> **用户看到的产品结构，终于追上已经逐步成熟的底层工程能力。**

重构后的核心产品逻辑应当是：

```text
素材
↓
镜头候选
↓
镜头校准
↓
影片总览
↓
Scene 分析
↓
Shot 分析
↓
技法沉淀
↓
未来创作
```

这才是一套真正专业、科学、可扩展的拉片工作流。
