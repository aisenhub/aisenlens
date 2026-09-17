# AisenLens Analysis Inspector UI / UX / 数据交互架构方案

> 文档定位：AisenLens「逐镜分析工作台」右侧 Analysis Inspector 的产品、UX、数据与组件设计基线  
> 上位架构：`素材准备 → 逐镜分析 → 成果应用`  
> 所属工作区：逐镜分析  
> 关联设计：逐镜分析工作台方案、时间轴优化架构方案、全局工作台 UI / IA 方案  
> 核心目标：让 Inspector 成为正式分析数据的主生产界面、AI 候选审核界面、Evidence 证据入口，以及后续 Timeline / 成果应用 / AI Context 的统一数据入口

---

# 1. 产品定位

Analysis Inspector 不是普通属性面板。

它应该被定义为：

> **AisenLens 的分析数据操作系统。**

Timeline 决定用户：

> 在什么时间与结构中研究。

Video 决定用户：

> 看到了什么。

Inspector 决定用户：

> 对这个 Shot / Scene / Story 对象最终形成了什么正式分析结论，这些结论来自哪里，又由什么证据支持。

因此 Inspector 同时承担：

```text
人工分析入口
+
AI Candidate 审核入口
+
Evidence 管理入口
+
正式 Analysis Data 编辑入口
+
成果应用的数据生产入口
```

---

# 2. Inspector 在整体数据链中的位置

推荐理解为：

```text
                Analysis Inspector
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   人工分析入口     AI 审核入口      Evidence
        │              │              │
        └──────────────┼──────────────┘
                       ▼
             Canonical Analysis Data
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
       Timeline      成果数据表      AI Context
                                    / Export
                                    / 创作转化
```

原则：

> Inspector 不维护一份自己的数据副本。

它是 Canonical Analysis Data 的主要编辑入口。

---

# 3. Inspector 的核心职责

Inspector 负责：

- 展示当前 `SelectedEntity`
- 展示当前对象的正式 Analysis Record
- 允许用户人工编辑分析字段
- 展示字段来源 Provenance
- 展示 AI Candidate
- 接收 / 拒绝 AI Candidate
- 管理 Evidence
- 展示 stale / needs-review 状态
- 处理 Shot 变化后的数据复核
- 展示对象级统计
- 展示对象级备注
- 为 Timeline 与成果应用提供正式数据入口

Inspector 不负责：

- 修改 Shot Boundary
- Split / Merge Shot
- 重新运行自动切镜
- 管理全局项目设置
- 直接持有 Timeline Track 数据
- 将 AI Candidate 自动写入正式结论
- 将 Template 当成业务数据

---

# 4. 一个 Shell，多种 Entity Renderer

不要为 Shot / Scene / Story 建三套完全不同的右栏。

推荐：

```text
AnalysisInspector
│
├── InspectorHeader
│
├── EntitySummary
│
├── AnalysisFields
│
├── Evidence
│
├── AI Suggestions
│
└── Object Notes
```

根据：

```text
SelectedEntity
```

动态加载：

```text
ShotInspectorRenderer
SceneInspectorRenderer
SequenceInspectorRenderer
SectionInspectorRenderer
FilmInspectorRenderer
MarkerInspectorRenderer
DialogueInspectorRenderer
```

公共的：

- Field 系统
- Evidence 系统
- Provenance 系统
- AI Candidate 系统
- Review 状态

完全复用。

---

# 5. Inspector 默认尺寸

推荐：

```text
默认宽度
352px

最小宽度
320px

分析密集状态
400px

最大建议宽度
460px
```

超过 460px 的复杂配置：

> 不继续横向扩 Inspector。

改用：

```text
Drawer / Sheet
```

例如：

- 分析模板管理
- AI 设置
- 批量分析
- 大型 Evidence 浏览器

---

# 6. Inspector 总体布局

推荐：

```text
┌───────────────────────────────────┐
│ Shot 027                     ⋯    │
│ Scene 12 · 3.27s                  │
│ ✓ 8 / 10 字段    ✦ 3 个 AI 建议   │
├───────────────────────────────────┤
│                                   │
│ 核心分析                          │
│                                   │
│ 景别                              │
│ 中景                           ▾   │
│                                   │
│ 摄影机运动                        │
│ 缓慢推镜                       ▾   │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ ✦ AI 建议：固定机位           │ │
│ │ [查看证据]   [采用] [忽略]    │ │
│ └───────────────────────────────┘ │
│                                   │
│ 构图                              │
│ 中心构图                       ▾   │
│                                   │
│ 光线                              │
│ 未分析                  ✦ AI 分析 │
│                                   │
│ ───────────────────────────────   │
│                                   │
│ 内容                              │
│ 人物走进酒吧，在桌边坐下……      │
│                                   │
│ ───────────────────────────────   │
│                                   │
│ 证据                              │
│ [F231] [F278] [+ 添加证据]        │
│                                   │
│ ───────────────────────────────   │
│                                   │
│ 备注                              │
│ ...                               │
│                                   │
├───────────────────────────────────┤
│ ✦ 问 AI 关于这个镜头…             │
└───────────────────────────────────┘
```

---

# 7. 核心视觉原则

视觉主次：

```text
正式分析值
>
字段状态
>
Evidence
>
AI Candidate
>
Provenance Metadata
>
技术元数据
```

核心原则：

> **正式分析值永远是视觉主体。**

AI 是候选。

Evidence 是依据。

Metadata 是辅助。

---

# 8. Inspector Header

Header 必须 Sticky。

建议高度：

```text
56–68px
```

---

# 9. Shot Header

示例：

```text
Shot 027                             ⋯
Scene 12 · 3.27s

✓ 8 / 10 字段     ✦ 3 个建议
```

---

# 10. Scene Header

```text
Scene 12 · 酒吧对话                  ⋯
12 Shots · 01:43

✓ 72% 分析覆盖
```

---

# 11. Story Header

Sequence：

```text
Sequence 03 · 冲突升级               ⋯
4 Scene · 08:43
```

Section：

```text
Section 02 · 第二幕                  ⋯
7 Scene · 32:14
```

Film：

```text
影片                                 ⋯
02:11:43 · 138 Shot
```

---

# 12. Marker Header

```text
Marker                               ⋯
00:24:17.042
```

---

# 13. Header 状态不能做成“评分”

不推荐：

```text
分析完整度
82 分
```

推荐真实事实：

```text
8 / 10 字段已分析
```

Scene：

```text
9 / 12 Shot 完成核心分析
```

或：

```text
75% Shot 有景别数据
```

所有覆盖率必须以真实样本为基础。

---

# 14. Shot Header More Menu

建议：

```text
重新生成 AI 建议
添加 Marker
复制时间码
复制镜头引用

─────────────

调整分镜…
```

其中：

```text
调整分镜…
```

必须进入：

```text
素材准备 → 镜头复核
```

Inspector 本身不允许 Split / Merge / Move Shot Boundary。

---

# 15. Inspector Body 不使用一级 Tabs

不建议：

```text
[分析] [AI] [证据] [备注]
```

原因：

- AI 与 Evidence 都属于当前分析字段
- 切 Tab 会不断打断上下文
- 用户容易忘记当前正式值和 Candidate 的关系

推荐：

> 单一连续 Scroll。

顺序：

```text
正式分析
↓
AI Candidate 就近出现
↓
Evidence 就近出现
↓
对象级 Notes
```

---

# 16. Analysis Field 是 Inspector 的核心组件

每个字段使用统一协议。

视觉示例：

```text
┌─────────────────────────────────┐
│ 摄影机运动                 ✓    │
│                                 │
│ 缓慢推镜                     ▾   │
│                                 │
│ F231 · F278               证据  │
│                                 │
│ ✦ AI 建议：固定机位             │
│ [查看依据]       [采用] [忽略]  │
└─────────────────────────────────┘
```

内部概念：

```text
FieldLabel
FieldStatus
FieldEditor
Provenance
Evidence
AICandidate
Validation
```

---

# 17. Field 默认视觉

最普通状态：

```text
景别

中景                           ▾
```

存在 Evidence：

```text
景别

中景                           ▾

F234 · F287
```

存在 AI Candidate：

```text
景别

中景                           ▾


✦ AI 建议
中近景

[查看证据]   [采用]   [忽略]
```

---

# 18. 不在 Field 主界面长期暴露技术元数据

不要常驻：

```text
Source=Human
Revision=37
EvidenceCount=2
Model=xxx
PromptVersion=v7
Confidence=0.82
```

这些应该进入：

```text
Field Details / Provenance Popover
```

---

# 19. Template 与数据库 Schema 必须分离

这是 Inspector 架构的重要基础。

推荐两层：

```text
Field Definition
+
Template Field Configuration
```

---

# 20. Field Definition

Field Definition 表示稳定业务语义。

概念示例：

```ts
interface AnalysisFieldDefinition {
  id: string
  key: string

  scope:
    | "shot"
    | "scene"
    | "story"

  label: string

  valueType:
    | "enum"
    | "multi-enum"
    | "boolean"
    | "short-text"
    | "long-text"
    | "number"
    | "rating"
    | "reference"

  options?: AnalysisFieldOption[]

  unit?: string

  evidencePolicy:
    | "none"
    | "optional"
    | "recommended"
    | "required"

  capabilities: {
    aiSuggestable: boolean
    timelineVisualizable: boolean
    exportable: boolean
  }
}
```

---

# 21. Field ID 必须稳定

例如：

```text
shot.camera_movement
shot.shot_size
shot.composition
shot.lighting
shot.color
scene.goal
scene.conflict
story.function
```

不要因为不同 Template 创建：

```text
movie.cameraMovement
cinematography.cameraMovement
```

两套重复字段。

---

# 22. Template Field Configuration

Template 只决定：

> 当前视图如何使用一个稳定 Field。

概念：

```ts
interface TemplateFieldConfig {
  fieldId: string

  visible: boolean
  order: number
  groupId: string

  labelOverride?: string

  required?: boolean

  aiEnabled?: boolean

  aiInstruction?: string

  defaultExpanded?: boolean
}
```

---

# 23. Template 的正确定位

推荐：

```text
Field Catalog
= 稳定分析语义

Template
= 当前研究视图
```

因此：

```text
Template
≠ Database Schema
```

---

# 24. Template 切换不会删除数据

例如用户从：

```text
电影语言
```

切到：

```text
摄影研究
```

变化的是：

- 显示哪些字段
- 字段顺序
- Group
- Label
- AI Participation

不变化的是：

> 已存在的 Analysis Record。

隐藏字段仍然保留数据。

---

# 25. Analysis Record

正式分析数据建议独立记录。

概念：

```ts
interface AnalysisRecord<T = unknown> {
  id: string

  subject: {
    type: "shot" | "scene" | "sequence" | "section" | "film"
    id: string
  }

  fieldId: string

  value: T

  status:
    | "confirmed"
    | "stale"

  provenance: AnalysisProvenance

  evidenceRefs: string[]

  createdAt: string
  updatedAt: string

  revision: number
}
```

---

# 26. AI Candidate 不属于 Analysis Record

AI Candidate 是模型建议。

正式 Analysis Record 是当前采用的分析结论。

二者不能混为一个实体。

---

# 27. Analysis Candidate

建议：

```ts
interface AnalysisCandidate<T = unknown> {
  id: string

  subjectRef: SubjectRef
  fieldId: string

  proposedValue: T

  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "stale"

  observation?: string
  interpretation?: string

  evidenceRefs: string[]

  contextManifestId: string

  source: {
    provider?: string
    model?: string
    promptVersion?: string
  }

  dependencyRevision: number
}
```

---

# 28. AI Candidate 状态机

```text
pending
↓
accepted

pending
↓
rejected

pending
↓
stale
```

含义：

```text
pending
等待用户审核

accepted
用户采纳

rejected
用户明确忽略

stale
依赖数据 / revision 已发生变化
```

---

# 29. 分析数据来源必须区分

建议至少区分：

| 来源 | 示例 | 是否直接成为正式值 |
|---|---|---|
| User | 用户手动选择“中景” | 是 |
| Algorithm | Shot duration = 3.27s | 计算事实 |
| Derived | Editing Pace | 可重复统计 |
| Imported | SRT Dialogue | 源数据 |
| AI Candidate | AI 判断“中景” | 否 |
| AI → User Confirmed | AI 建议后用户采纳 | 是 |
| Remapped / Migrated | Shot 变化后的来源数据 | 默认需复核 |

---

# 30. 不用一个 Confidence 混合所有来源

不要：

```text
Confidence
82%
```

来同时描述：

- 算法事实
- AI 判断
- 人工结论
- 导入数据

不同数据来源有不同语义。

---

# 31. 算法 / Derived 数据视觉

例如：

```text
镜头时长

3.27s
计算值
```

或者：

```text
平均镜长

4.32s
基于 12 Shot
```

这类 deterministic 数据通常不需要：

```text
[采用]
```

---

# 32. AI 数据视觉

AI 必须表现为 Candidate：

```text
✦ AI 建议

中近景

[查看依据]

[采用]
[忽略]
```

---

# 33. 用户人工输入默认成为正式工作值

例如：

```text
景别
未分析
```

用户选择：

```text
中景
```

建议：

```text
用户编辑
↓
自动保存
↓
AnalysisRecord
provenance = user
status = confirmed
```

不再额外要求用户点击：

```text
确认
```

---

# 34. 人工值保存状态

输入后：

```text
● 保存中
```

成功：

```text
✓
```

失败：

```text
⚠ 保存失败
重试
```

正常状态安静，异常状态突出。

---

# 35. AI 与正式值冲突

例如：

```text
摄影机运动

正式值
固定机位
```

AI：

```text
缓慢推镜
```

UI：

```text
摄影机运动

固定机位                       ✓


✦ AI 有不同建议

缓慢推镜

主体尺寸在镜头中持续增加。

[查看证据]
[采用 AI 值]
[忽略]
```

绝不静默覆盖。

---

# 36. 采用 AI 值

流程：

```text
Candidate pending
↓
再次验证 dependency revision
↓
写入 AnalysisRecord
↓
provenance = ai-user-confirmed
↓
Candidate = accepted
```

正式值表达：

> AI 提议，用户确认。

---

# 37. Provenance

推荐概念：

```text
User
```

用户直接输入。

```text
Algorithm
```

算法事实。

```text
Derived
```

统计派生。

```text
Imported
```

外部数据。

```text
AI Candidate
```

未确认。

```text
AI → User Confirmed
```

AI 建议经用户采用。

```text
Remapped / Migrated
```

数据重映射后需要重新确认。

---

# 38. Provenance 默认不抢占界面

主 UI：

```text
中景              ✓
```

点击：

```text
来源
```

再显示：

```text
来源
用户确认

最后更新
09/16 14:31

原建议
AI · 中景

证据
F234 / F287
```

---

# 39. Evidence 是一等数据

不要只让用户在备注里写：

```text
参考 00:23:11 的画面
```

应该建立：

```text
EvidenceRef
```

它必须能够重新定位回原始媒体 / 数据。

---

# 40. Evidence 类型

建议：

```text
Frame
Time Range
Shot
Neighbor Shot
Dialogue
Marker
Statistic
Audio Range
```

后续可以扩展：

```text
Event
External Reference
```

---

# 41. EvidenceRef

概念：

```ts
interface EvidenceRef {
  id: string

  type:
    | "frame"
    | "range"
    | "shot"
    | "dialogue"
    | "marker"
    | "statistic"
    | "audio-range"

  targetId?: string

  frame?: number
  startFrame?: number
  endFrame?: number

  label?: string
}
```

---

# 42. Evidence 核心原则

Evidence 核心是：

> **可以重新定位回原始影片 / 原始数据。**

截图、缩略图只是缓存 / 视觉表示。

不要把截图 Blob 作为唯一 Evidence。

---

# 43. Evidence Chip

示例：

```text
证据

[F 234]
[00:24:12–00:24:14]
[Shot 026]
[对白 12]
```

---

# 44. Evidence Hover

例如：

```text
┌──────────────────────────┐
│ [ Frame Preview ]        │
│                          │
│ F234                     │
│ 00:24:17.042             │
│                          │
│ 点击定位                 │
└──────────────────────────┘
```

---

# 45. Evidence 点击行为

点击 Evidence：

```text
PlaybackPosition
→ Evidence
```

但：

```text
SelectedEntity
→ 不变
```

这是一条重要冻结规则。

例如：

```text
SelectedEntity = Scene 12
```

点击：

```text
Shot 027 Evidence
```

视频跳到 Shot 027。

Inspector 仍显示：

```text
Scene 12
```

---

# 46. Evidence Picker

字段下面：

```text
+ 添加证据
```

打开轻量 Popover：

```text
添加证据

○ 当前帧
  F234 · 00:24:17.042

○ 当前镜头
  Shot 027

○ 选择时间范围…

○ 当前字幕
  “你为什么来了？”

○ Marker…

────────────

[添加]
```

---

# 47. Evidence Policy

Field Definition 可声明：

```text
none
optional
recommended
required
```

---

# 48. Evidence Policy 示例

```text
景别
optional
```

```text
摄影机运动
recommended
```

因为运镜通常需要时间范围或多帧证据。

```text
导演意图
required
```

如果用户把它设为正式研究结论，可以要求 Evidence。

---

# 49. Evidence Required 不应阻止早期记录

即使：

```text
required
```

用户仍可以先输入。

UI 显示：

```text
⚠ 尚未添加证据
```

真正需要强校验时机可以是：

- 标记为正式研究结论
- 发布
- 导出严谨报告
- 完成分析检查

---

# 50. AI Suggestion 必须区分观察与解释

推荐：

```text
✦ AI 建议

摄影机运动
缓慢推镜


观察

主体在画面中的像素占比持续增大，
背景空间关系变化较小。


解释

这更符合缓慢推镜，而不是主体单纯向镜头移动。


证据

[F234] [F278]


[采用]
[忽略]
```

---

# 51. AI 不展示长推理链

用户需要：

```text
简洁依据
+
Evidence
```

不需要巨大 Reasoning Transcript。

---

# 52. 多字段 AI 分析

点击：

```text
✦ 分析当前镜头
```

AI 返回多个 Candidate。

不要全部展开成大型卡片墙。

推荐：

```text
✦ 5 个 AI 建议等待确认

[开始审核]
```

---

# 53. AI Review Mode

点击：

```text
开始审核
```

Inspector 暂时进入：

```text
AI 建议 1 / 5

摄影机运动

当前
未分析

建议
缓慢推镜

证据
[F234] [F278]

[忽略]

[采用并下一个]
```

---

# 54. AI Review：已有正式值

```text
AI 建议 2 / 5

景别

当前
中景

AI 建议
中近景

[保留当前]

[采用 AI 建议]
```

---

# 55. 不默认提供“全部采用”

特别是以下字段：

```text
主题
导演意图
场景作用
人物心理
叙事意义
```

不应该一键全部接受。

未来若提供批量接受，只适用于明确低风险字段。

---

# 56. Shot Inspector Field Groups

建议模板支持 Group。

例如：

```text
镜头属性
─────────
景别
机位
构图

摄影机
─────────
运镜
焦段
景深

画面
─────────
光线
色彩

叙事
─────────
内容
作用

声音
─────────
对白
环境声

研究备注
─────────
...
```

---

# 57. Group 展开规则

推荐：

```text
第一个核心 Group
默认展开

有错误 / Candidate / stale 的 Group
自动展开

其他
记住用户折叠状态
```

---

# 58. Shot Relationship Analysis

真正的拉片分析不仅关注单镜。

可以增加：

```text
与前后镜头
```

例如：

```text
← Shot 026

切换关系
动作匹配

→ Shot 028

切换关系
视线连续
```

这类关系不应硬塞入单 Shot Field。

长期可以建：

```text
Transition / ShotRelationship
```

独立对象。

---

# 59. Scene Inspector 不只是 Shot 字段放大版

Scene 必须有独立 Schema。

示例：

```text
Scene 12
酒吧对话

12 Shot · 01:43
```

内容：

```text
场景定义

地点
时间
人物


戏剧结构

目标
冲突
变化
结果


视听组织

镜头数量
平均镜长
剪辑节奏
主要景别
声音结构


关键证据

[Shot 027]
[Shot 033]


场景总结

...
```

---

# 60. Scene Statistics 与 Interpretation 分区

Derived：

```text
镜头数
12

平均镜长
4.3s
```

Interpretation：

```text
场景节奏逐渐加快
```

二者视觉分区。

不要让用户误解：

> “场景节奏逐渐加快”是同等级的客观计算事实。

---

# 61. Scene Evidence

Scene 字段可以引用底层 Shot：

```text
冲突升级

证据
[Shot 027]
[Shot 031]
[Dialogue 12]
```

点击：

> Seek 到 Evidence。

Inspector：

> 继续保持 Scene 12。

---

# 62. Story Inspector

Story 是分析尺度，不额外制造一个强制数据库区间层。

Story Inspector 主要用于：

```text
Film
Section
Sequence
```

---

# 63. Sequence Inspector

例如：

```text
Sequence 03
冲突升级

08:43
4 Scene


叙事任务

[                         ]


事件发展

起点
[...]

变化
[...]

结果
[...]


关键 Scene

[Scene 12]
[Scene 14]


关键镜头

[Shot 027]
[Shot 043]
```

---

# 64. Section Inspector

例如：

```text
Section 02
第二幕

32:14


阶段作用
[...]

人物状态变化
[...]

主要冲突
[...]

关键 Sequence
[Sequence 03]
[Sequence 05]
```

---

# 65. Film Inspector

例如：

```text
影片

02:11:43
138 Shot
23 Scene
```

包含：

- 结构信息
- 分析覆盖率
- 核心主题
- 全片视听规律
- 关键 Scene
- 关键 Evidence

不要把 Film Inspector 做成新的“总览页”。

Film 只是：

```text
SelectedEntity = Film
```

时的 Inspector。

---

# 66. Inspector 与 Timeline 的双向交互

Timeline 和 Inspector 必须消费同一数据。

---

# 67. Field → Timeline

例如字段：

```text
景别
```

More Menu：

```text
在时间轴显示此维度
```

点击：

```text
TrackPreference.visible = true
```

不是：

> Field 自己创建 Timeline Data。

---

# 68. Timeline → Inspector

点击：

```text
景别 Track
Shot 027 = MS
```

执行：

```text
SelectedEntity = Shot 027
```

然后：

```text
Inspector.scrollToField("shot.shot_size")
```

形成双向联动。

---

# 69. Inspector 修改 → Timeline 更新

用户：

```text
Shot 027
景别

CU
↓
MS
```

保存：

```text
AnalysisRecord changed
↓
Timeline Adapter invalidated
↓
Track 更新
```

没有第二套 Timeline 写入逻辑。

---

# 70. Inspector 与成果应用的数据契约

成果应用的数据表不读取：

```text
Template UI State
```

而读取：

```text
Subject Records
+
Field Definitions
+
Analysis Records
```

---

# 71. 数据表动态列

例如：

```text
镜号
截图
时长
景别
运镜
构图
光线
色彩
...
```

字段列来自 Field Definition / Analysis Record。

Template 可以作为默认显示配置。

---

# 72. Template 对成果应用的作用

Template 可以提供：

```text
默认显示字段
默认字段顺序
默认 Label
```

但成果应用仍允许：

```text
显示字段
```

重新配置。

隐藏字段仍可以导出。

---

# 73. Output Capability

Field Definition 可提供：

```ts
capabilities: {
  exportable: true
}
```

绝大多数正式分析字段：

```text
exportable = true
```

内部调试数据：

```text
exportable = false
```

---

# 74. 成果应用默认只消费 Confirmed Data

默认进入成果的数据：

```text
confirmed AnalysisRecord
```

默认排除：

```text
pending AI Candidate
stale
unsaved draft
```

---

# 75. stale 在成果数据表中的表现

默认：

```text
—
```

Tooltip：

```text
原值需要复核
```

高级模式可以：

```text
显示需要复核的数据
```

显示：

```text
中景 ⚠
```

---

# 76. AI Candidate 不作为成果正式列

不要让普通数据表混入：

```text
AI 建议
```

作为正式值。

编辑模式下可以有辅助列：

```text
AI 建议
```

但成果展示：

> 只消费正式 Analysis Record。

---

# 77. 创作转化的数据来源

创作转化默认消费：

```text
confirmed Analysis
+
Derived Statistics
+
用户 Marker / Notes
+
Evidence
```

不自动把：

```text
pending AI Candidate
```

当成用户已经采用的观点。

---

# 78. Shot 修改后的 stale

Shot 修改只能在：

```text
素材准备 → 镜头复核
```

发生。

如果回来：

```text
Shot 027
↓
Shot 027A + Shot 027B
```

原分析：

```text
status = stale
```

---

# 79. Inspector 的 Data Review 提示

Header：

```text
⚠ 这个镜头的结构发生了变化

3 个字段需要重新确认

[开始复核]
```

---

# 80. Data Review Mode

例如：

```text
数据复核 1 / 3

景别

原 Shot 027
中景

当前 Shot
027A

[舍弃旧值]

[保留并确认]

[重新填写]
```

---

# 81. stale Review 与 AI Candidate 可以同时存在

例如：

```text
原值
中景

✦ 新 AI 建议
近景
```

用户可以：

- 保留原值
- 采用新建议
- 自己重填

但 AI 仍是 Candidate。

---

# 82. Data Review 与 AI Review 必须分开

Inspector Header：

```text
⚠ 数据复核 3
✦ AI 建议 5
```

二者不能统一为：

```text
待处理 8
```

因为语义不同。

---

# 83. “分析完成”概念

Template 可定义：

```text
core / required fields
```

例如：

```text
景别
运镜
构图
内容
```

全部完成：

```text
✓ 核心分析完成
```

---

# 84. “分析完成”不应成为流程锁

用户可以：

- 跳过
- 回头补
- 只分析部分 Field
- 暂时保持未分析

AisenLens 是研究 Workspace，不是填报系统。

---

# 85. 键盘交互

Field 录入频繁，键盘效率重要。

建议：

```text
Tab
下一个可编辑 Field

Shift + Tab
上一个 Field

Cmd/Ctrl + Enter
完成长文本编辑
```

Enum 字段未来可支持快捷键。

具体快捷键集中在统一 Shortcut 系统，不在 UI 到处印。

---

# 86. 长文本自动保存

例如：

```text
镜头内容
Scene Summary
Object Notes
```

建议：

```text
local draft
↓
debounced autosave
↓
repository
↓
publish canonical value
```

对象切换前：

> 必须处理未保存 Draft。

不能静默丢失。

---

# 87. Field Renderer Registry

不要让 Template 直接决定 React Component。

Template 只提供：

```text
valueType
```

静态 Registry：

```ts
const analysisFieldRegistry = {
  enum: EnumField,
  "multi-enum": MultiEnumField,
  boolean: BooleanField,
  "short-text": ShortTextField,
  "long-text": LongTextField,
  number: NumberField,
  rating: RatingField,
  reference: ReferenceField,
}
```

---

# 88. 推荐 Field 组件目录

```text
fields/

AnalysisFieldRenderer.tsx

renderers/
  EnumField.tsx
  MultiEnumField.tsx
  BooleanField.tsx
  ShortTextField.tsx
  LongTextField.tsx
  NumberField.tsx
  RatingField.tsx
  ReferenceField.tsx
  EvidenceField.tsx
```

---

# 89. 不建设任意动态插件系统

Analysis Field Renderer 与 Timeline Track 一样：

> 使用类型安全的静态 Registry。

不需要做通用第三方插件平台。

---

# 90. Inspector 组件结构

推荐：

```text
AnalysisInspector
│
├── InspectorHeader
│   ├── EntityIdentity
│   ├── AnalysisProgress
│   ├── DataReviewBadge
│   ├── AiCandidateBadge
│   └── EntityMenu
│
├── InspectorBody
│   │
│   ├── EntitySummary
│   │
│   ├── AnalysisFieldGroup[]
│   │   └── AnalysisField
│   │       ├── FieldLabel
│   │       ├── FieldEditor
│   │       ├── FieldStatus
│   │       ├── FieldEvidence
│   │       ├── FieldProvenance
│   │       └── AiCandidateCard
│   │
│   ├── ObjectEvidence
│   ├── RelatedEntities
│   └── ObjectNotes
│
└── InspectorFooter
    └── AiAskBar
```

---

# 91. Entity Renderer 结构

```text
ContextInspector
│
├── ShotInspectorRenderer
├── SceneInspectorRenderer
├── SequenceInspectorRenderer
├── SectionInspectorRenderer
├── FilmInspectorRenderer
├── MarkerInspectorRenderer
└── DialogueInspectorRenderer
```

公共 Field System 复用。

---

# 92. Entity Renderer 的差异

不同实体主要差在：

```text
Entity Summary
允许 Field Scope
Derived Statistics
Related Entities
Special Actions
```

不应该差在：

> 整套 UI 系统。

---

# 93. AI Ask Bar

Footer 可选：

```text
✦ 问 AI 关于这个镜头…
```

或者 Scene：

```text
✦ 问 AI 关于这个场景…
```

---

# 94. AI Ask 输出

推荐结构化显示：

```text
观察
...

解释
...

证据
...
```

用户可以：

```text
[添加到备注]
[写入字段…]
```

经用户明确动作进入正式数据。

---

# 95. AI Ask 不是正式分析

Chat / Q&A 内容默认：

> 非正式。

除非用户：

```text
写入字段
```

或者：

```text
添加为正式备注
```

---

# 96. Context Builder 与 Inspector

Inspector 发起 AI 请求时必须明确：

```text
SelectedEntity
ResearchScope
当前 Template
当前 confirmed fields
相关 Evidence
依赖 revision
```

---

# 97. Shot Context

推荐：

```text
当前 Shot
有限相邻 Shot
代表帧
时间范围
相关 Dialogue
已确认 Field
相关 Marker
必要 Derived Statistics
```

---

# 98. Scene Context

推荐：

```text
当前 Scene
Shot 列表
Shot 统计
关键 Evidence
Dialogue
Scene 内 Marker
相邻 Scene 摘要
已确认 Scene Field
```

---

# 99. Story Context

推荐：

```text
当前 Section / Sequence / Film
Scene 摘要
关键 Shot
用户确认结构
事件 Evidence
已确认观点
```

---

# 100. Inspector 与 Timeline 不建立重复数据

关系：

```text
Analysis Record
↓
Inspector Editor

Analysis Record
↓
Timeline Adapter

Analysis Record
↓
成果应用
```

不是：

```text
Inspector Data
Timeline Data
Export Data
```

三份。

---

# 101. 数据变化传播

用户修改：

```text
Shot 027
景别 = CU → MS
```

统一链路：

```text
AnalysisRecord changed
↓
publish revision
↓
Inspector re-render
↓
Timeline adapter invalidate
↓
成果应用 query 更新
↓
AI Context 依赖失效
```

---

# 102. 数据失效传播

如果 Shot 结构变化：

```text
Shot 027
↓
Shot 027A / Shot 027B
```

相关：

```text
AnalysisRecord
AI Candidate
Scene Summary
Context Manifest
```

按依赖关系进入：

```text
stale / needs-review
```

不能静默宣称仍成立。

---

# 103. Inspector 的最终数据流

```text
SelectedEntity
      │
      ▼
Analysis Template
      │
      ▼
Field Configs
      │
      ▼
Inspector Field Renderer
      │
      ├──────────────┐
      │              │
      ▼              ▼
User Edit        AI Candidate
      │              │
      │          Review / Evidence
      │              │
      └──────┬───────┘
             ▼
      Analysis Record
             │
             ├──────────────┬───────────────┬──────────────┐
             ▼              ▼               ▼              ▼
        Timeline         数据表           Export        AI Context
                                                         / 创作转化
```

---

# 104. V1 推荐范围

优先实现：

- Inspector Shell
- Shot / Scene / Story Renderer
- Field Definition
- Template Field Config
- Field Renderer Registry
- Analysis Record
- User Provenance
- EvidenceRef
- Evidence Chip / Picker
- confirmed / stale 状态
- Shot Change Review
- Template 与 Inspector 联动
- Timeline 与 Field 联动基础能力

---

# 105. V1.5

建议：

- 更多 Field Types
- Scene / Story 更完整 Schema
- Derived Statistics 区域
- Related Entities
- Shot Relationship
- Field Provenance Popover
- Data Review Queue
- 成果应用字段能力对接
- Dialogue Evidence

---

# 106. V2 / AI

建议：

- Analysis Candidate
- AI Review Mode
- Candidate Evidence
- Context Builder
- AI Ask Bar
- Candidate stale
- 批量分析候选
- AI → User Confirmed Provenance
- Model / Prompt Version Trace
- More Evidence Types

---

# 107. 冻结设计原则

建议冻结以下原则：

1. **Inspector 是正式 Analysis Data 的主要编辑入口，而不是独立数据副本。**
2. **Template 是分析视图，不是数据库 Schema 本身。**
3. **Field Definition 使用稳定 ID，跨 Template 复用。**
4. **正式 Analysis Record 与 AI Candidate 必须分离。**
5. **用户人工输入默认成为正式工作值。**
6. **AI 默认只产生 Candidate。**
7. **算法事实、AI 解释、人工结论、导入数据必须保留不同 Provenance。**
8. **Evidence 是一等数据。**
9. **Evidence 必须能够重新定位到原始媒体或数据。**
10. **点击 Evidence 改变 PlaybackPosition，但不改变 SelectedEntity。**
11. **Shot / Scene / Story 使用同一个 Inspector Shell 与 Field System。**
12. **Scene / Story 不只是放大 Shot 字段，而应拥有独立 Schema。**
13. **Timeline、成果数据表、导出、AI Context 都消费同一份 Analysis Record。**
14. **stale 数据不能被成果应用默认为正式结论。**
15. **AI Candidate 不进入成果正式列。**
16. **AI 建议尽量区分 Observation 与 Interpretation。**
17. **AI 建议必须尽可能关联 Evidence。**
18. **复杂配置进入 Analysis Settings Drawer，不继续膨胀 Inspector。**
19. **Shot Boundary 修改不属于 Inspector。**
20. **Inspector 必须优先表现正式分析值，而不是 AI 内容。**

---

# 108. 一句话总结

AisenLens 的 Analysis Inspector 最终不应该让用户感觉：

> “我在右边填写一个视频标注表单。”

而应该让用户感觉：

> **“这是我对当前 Shot / Scene / Story 的正式研究记录；哪些是计算事实、哪些是我的判断、哪些是 AI 建议、每个结论依据什么证据，我都能清楚区分，而且这些数据会自动进入 Timeline、成果表格、导出、AI Context 和未来的创作转化。”**

这正是 Inspector 从普通视频标注属性栏，升级为专业拉片分析系统核心界面的关键。
