# AisenLens 逐镜分析工作台 UI / UX / 交互架构方案

> 文档定位：AisenLens「逐镜分析」核心工作台的产品、UX、交互与前端架构设计基线  
> 上位架构：`素材准备 → 逐镜分析 → 成果应用`  
> 关联文档：`AisenLens_时间轴优化架构方案(2).md`、全局工作台 UI / IA 设计方案、素材准备工作台设计方案  
> 适用范围：逐镜分析工作台、影片结构导航、播放器、上下文 Inspector、多轨 Timeline、分析模板、AI 辅助、Marker、结构编辑、跨工作区纠错与同步  
> 设计目标：让用户在绝大多数项目时间内，以稳定、连续、专业的方式完成“观察 → 定位 → 理解 → 记录 / 确认”

---

# 1. 产品定位

逐镜分析工作台是 AisenLens 的核心生产界面。

它不是：

- 普通视频播放器；
- 视频标注工具；
- 表单录入页；
- NLE 视频剪辑器；
- AI 聊天页；
- Timeline 独立编辑器。

它应该是一套围绕正式镜头数据进行研究的长期 Workspace。

核心用户循环：

```text
看
↓
定位
↓
理解
↓
记录 / 确认
↓
继续下一个对象
```

对应 UI：

```text
影片结构导航
↓
视频 + Timeline
↓
上下文 Inspector
↓
分析字段 / Marker / AI 建议
```

---

# 2. 与全局工作台的关系

AisenLens 全局一级工作区固定为：

```text
素材准备
逐镜分析
成果应用
```

职责：

```text
素材准备
= 负责 Video → Official Shots / Boundaries

逐镜分析
= 负责 Official Shots → Structured Analysis Dataset

成果应用
= 负责 Analysis Dataset → 查看 / 导出 / 分享 / 创作转化
```

因此逐镜分析是：

> **正式 Shot 的消费者，而不是 Shot 的 Authority。**

---

# 3. 冻结职责边界：逐镜分析不能修改 Shot

这是本方案的重要冻结决策。

逐镜分析工作台：

### 可以

- 选择 Shot；
- 播放与定位 Shot；
- 分析 Shot；
- 创建 / 调整 Scene；
- 创建 / 调整 Sequence；
- 创建 / 调整 Section；
- 添加 Marker；
- 编辑分析字段；
- 接收 / 拒绝 AI Candidate；
- 浏览 / 调整 Timeline Viewport；
- 编辑属于分析阶段的结构数据。

### 不可以

- 修改 Shot 起止帧；
- 拖动 Shot Boundary；
- 在当前帧切开 Shot；
- 删除 Shot Boundary；
- 合并相邻 Shot；
- 重新运行自动分镜；
- 直接修改自动检测结果。

原则：

> **逐镜分析可以重新解释镜头，但不能重新定义镜头。**

“镜头是什么”由素材准备负责。

“镜头意味着什么”由逐镜分析负责。

---

# 4. Shot Authority 与 Analysis Authority

推荐领域边界：

```text
素材准备
Authority:
- Video
- Shot
- Shot Boundary
- Shot Split / Merge / Boundary Adjustment


逐镜分析
Authority:
- Scene
- Sequence
- Section
- Marker
- Analysis Record
- AI Candidate
- Research Scope
- Timeline View Preference


成果应用
Authority:
- 主要消费 Analysis Dataset
- 不重新定义源分析事实
```

这条边界应同时写入产品设计与代码 feature ownership。

---

# 5. 与时间轴方案的核心一致性

逐镜分析工作台必须完全继承时间轴方案中的核心定义：

> 时间是统一坐标，结构是导航骨架，Marker 是自由观察，分析维度提供不同解释视角。

Timeline 不建立第二份业务事实。

同一套领域数据应同时供：

```text
Timeline
Inspector
成果数据表
统计
报告
AI Context Builder
```

消费。

---

# 6. 整体 UI 架构

逐镜分析工作台固定四个核心区域：

```text
左：影片结构导航
中：视频观察与证据
右：分析与编辑 Inspector
下：时间与结构 Timeline
```

推荐桌面布局：

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Project Header                                                                      │
├──────────────┬─────────────────────────────────────────────────────────────────────┤
│              │ Analysis Workspace Toolbar                                           │
│ 全局一级导航 │ Research Scope                模板：电影语言   ✦ AI   ⋯              │
│              ├───────────────┬──────────────────────────────┬──────────────────────┤
│ ✓ 素材准备   │               │                              │                      │
│              │ 影片结构      │           VIDEO              │ Analysis Inspector   │
│ ● 逐镜分析   │ Navigator     │                              │                      │
│              │               │                              │                      │
│   成果应用   │               │                              │                      │
│              │               ├──────────────────────────────┤                      │
│              │               │      Playback Controls       │                      │
│              ├───────────────┴──────────────────────────────┤                      │
│              │                                              │                      │
│              │              MULTI-TRACK TIMELINE            │                      │
│              │                                              │                      │
│ ⚙ 项目设置   │                                              │                      │
└──────────────┴──────────────────────────────────────────────┴──────────────────────┘
```

---

# 7. 推荐桌面尺寸

以 1440 × 900 为主设计基准。

## 7.1 全局 Shell

| 区域 | 推荐尺寸 |
|---|---:|
| Project Header | 48px |
| 全局一级导航 | 176px |
| Analysis Toolbar | 44px |
| 工作区高度 | `100vh - 92px` |

## 7.2 Analysis Workspace

建议默认 Grid：

```text
columns:
232px | minmax(520px, 1fr) | 352px

rows:
minmax(0, 1fr) | 272px
```

视觉：

```text
┌──────232──────┬──────── flexible ────────┬────352────┐
│ Navigator     │ Player                   │ Inspector │
│               │                          │           │
├───────────────┴──────────────────────────┤           │
│ Timeline 272px                           │           │
└──────────────────────────────────────────┴───────────┘
```

允许用户调整：

```text
Navigator
200–320px

Inspector
320–460px

Timeline
180–420px
```

布局偏好属于 UI Preference，不属于业务数据。

---

# 8. 工作台四类核心状态

必须严格分开：

```text
PlaybackPosition
SelectedEntity
ResearchScope
Viewport
```

---

# 9. PlaybackPosition

表示：

> 当前媒体正在播放 / 预览到哪里。

它只负责媒体位置。

播放器播放到下一 Shot 时：

- 更新播放位置；
- 可以更新轻量 Playing Indicator；
- 不自动改变 SelectedEntity；
- 不自动改变 ResearchScope。

---

# 10. SelectedEntity

表示：

> 用户当前明确选择并准备查看 / 编辑的对象。

类型至少支持：

```text
Film
Section
Sequence
Scene
Shot
Marker
Dialogue
```

后续可扩展：

```text
Beat
Event
其他分析实体
```

不要通过多个 nullable ID 猜当前对象。

推荐带类型 Union。

---

# 11. ResearchScope

表示：

> 当前用户正在研究的上下文范围。

例如：

```text
Film
Scene 12
Sequence 03
Section 02
Shot 027
自定义范围（未来）
```

ResearchScope 不等于 SelectedEntity。

例如：

```text
ResearchScope = Scene 12
SelectedEntity = Shot 027
PlaybackPosition = Shot 031
```

这是合法且常见的状态。

---

# 12. Viewport

表示 Timeline 当前可见时间范围及缩放。

包含：

```text
viewportStart
pixelsPerSecond
viewportWidth
trackLayout
scroll
```

Viewport 只决定“怎么看”。

不改变业务事实。

---

# 13. 四种状态的交互矩阵

| 用户操作 | Playback | Selection | Research Scope | Viewport |
|---|---|---|---|---|
| 播放视频 | 改变 | 不变 | 不变 | 可跟随 Playhead |
| 拖 Playhead | 改变 | 不变 | 不变 | 不变 |
| 单击 Shot | 不变 | Shot | 不变 | 保证对象可见 |
| 单击 Scene | 不变 | Scene | 不变 | 保证对象可见 |
| 双击对象 | 不变 | 对象 | 不变 | Fit Range |
| Enter | 不变 | 对象 | 进入对象 Scope | Fit Range |
| Esc | 不变 | 恢复上下文 | 返回上一 Scope | 恢复旧 Viewport |
| 点击 Evidence | Seek | 不变 | 不变 | 必要时确保可见 |

---

# 14. Analysis Workspace Toolbar

Toolbar 要克制。

建议：

```text
影片 / Scene 12

Shot 027 / 138

                模板：电影语言 ▾     ✦ AI · 3      ⚙      ⋯
```

左侧核心：

- Research Breadcrumb；
- 当前 Selection 简要状态。

右侧：

- Template Selector；
- AI Status；
- Analysis Settings；
- More。

---

# 15. Research Breadcrumb

Breadcrumb 表达 ResearchScope，而不是虚构固定树。

例如：

```text
影片
```

或者：

```text
影片 / Scene 12
```

或者：

```text
影片 / Section 02 / Scene 12
```

如果项目没有 Sequence，则不显示 Sequence。

如果结构允许跳层：

```text
影片 / Section 02 / Shot 027
```

也是合法的。

---

# 16. Research Navigation

建议：

### 单击对象

更新 Selection。

### 双击对象

Fit Range。

### Enter

进入当前对象 ResearchScope。

### Esc

优先：

1. 取消当前手势；
2. 关闭浮层；
3. 返回上一 ResearchScope。

### Breadcrumb

直接切换到实际存在的上层 Scope。

---

# 17. 左侧 Structure Navigator

不要命名为“镜头列表”。

推荐：

> **影片结构**

它负责导航整个正式结构骨架。

支持：

```text
Film
Section
Sequence
Scene
Shot
```

---

# 18. Structure Navigator 示例

完整结构：

```text
影片结构                                      ⌕

▾ Section 01  第一幕
    ▾ Sequence 01
        ▾ Scene 01  房间
             001
             002
             003

        ▾ Scene 02  街道
             004
             005
             006

▾ Section 02
    ...
```

允许缺层：

```text
Section
  Scene
    Shot
```

或：

```text
Scene
  Shot
```

甚至：

```text
Shot 001
Shot 002
Shot 003
```

---

# 19. Structure Row 信息

## Scene

```text
▾ Scene 12
  酒吧对话
  12 镜 · 01:43
```

## Shot

```text
027
3.27s
```

## Sequence

```text
▾ Sequence 03
  冲突升级
```

## Section

```text
▾ Section 02
  第二幕
```

---

# 20. Selection 与 Playing 必须分开

例如：

```text
027       ← Selected
028
029   ●   ← Playing
030
```

推荐：

- Selected：Accent 背景；
- Playing：小型播放指示；
- Hover：弱背景；
- Needs Review：警告图标；
- AI Candidate：不要污染结构行主状态，可使用轻量 badge。

---

# 21. Needs Review Structure

如果某 Scene / Sequence / Section 因底层 Shot 变化或引用冲突进入 needs-review：

```text
⚠ Scene 12
```

它应：

- 保留原标题；
- 保留原摘要；
- 保留来源；
- 不伪装成完全有效结构；
- 可进入复核。

---

# 22. 中央 Player Stage

Player Stage 包含：

```text
Selection Context Bar
↓
Video
↓
Playback Controls
```

示例：

```text
Shot 027
00:24:17.042 – 00:24:20.317 · 3.27s
────────────────────────────────────────

┌───────────────────────────────────────┐
│                                       │
│                                       │
│                 VIDEO                 │
│                                       │
│                                       │
└───────────────────────────────────────┘

⏮    ←1     ▶     +1→     ⏭

00:24:18.472 / 02:11:43
```

---

# 23. Selection Context Bar

如果 Selection = Shot：

```text
Shot 027
Scene 12 · 3.27s
```

Selection = Scene：

```text
Scene 12 · 酒吧对话
12 镜 · 01:43
```

Selection = Marker：

```text
Marker
00:24:18.472
```

它始终反映 Selection，而不是 Playing。

---

# 24. Video Overlay 原则

默认尽量少。

推荐只显示：

```text
Playing Shot 031
```

或：

```text
Scene 12
```

不要长期叠加：

- 景别；
- 构图；
- AI 建议；
- Marker；
- 技术参数。

如果后续需要：

```text
显示分析 Overlay
```

作为显式开关。

---

# 25. Playback Controls

推荐常驻：

```text
上一镜
上一帧
Play / Pause
下一帧
下一镜
```

快捷键：

```text
Space
播放 / 暂停

← / →
±1 Frame

Shift + ← / →
±5 Frame

↑ / ↓
上一镜 / 下一镜
```

输入框、Textarea、中文输入法合成、Modal 必须优先消费键盘事件。

---

# 26. Analysis Inspector 定位

右侧 Inspector 是整个工作台的数据生产中心。

它不是固定 Shot Form。

必须随 SelectedEntity 动态变化：

```text
Shot
Scene
Sequence
Section
Film
Marker
Dialogue
...
```

---

# 27. Shot Inspector

示例：

```text
Shot 027                                ⋯

3.27s
Scene 12


分析
────────────────────────

景别

中景                                  ▾


摄影机运动

缓慢推镜                              ▾


构图

中心构图                              ▾


光线

柔和侧光


色彩

暖色 · 低饱和


声音

环境声


────────────────────────

镜头内容

人物坐在窗边，
拿起桌上的杯子。


────────────────────────

备注

[                                   ]
```

---

# 28. Analysis Field Renderer

模板字段不应该全部使用 Select。

建议至少支持：

| Field Type | UI |
|---|---|
| Enum | Dropdown / Segmented |
| Multi Enum | Chips |
| Boolean | Toggle |
| Short Text | Input |
| Long Text | Textarea |
| Number | Number Input |
| Rating | Discrete Scale / Slider |
| Evidence | Evidence Picker |
| Reference | Entity Picker |

---

# 29. 未分析字段

没有数据时：

```text
光线

未分析
```

不要：

```text
未知
```

更不能自动给模板默认结果。

“未分析”表示：

> 当前没有正式结论。

---

# 30. Scene Inspector

示例：

```text
Scene 12
酒吧对话

00:21:32 – 00:23:15
12 镜
01:43


场景信息
────────────────

标题
酒吧对话

地点
酒吧

时间
夜


戏剧分析
────────────────

目标
[                           ]

冲突
[                           ]

变化
[                           ]

结果
[                           ]


镜头统计
────────────────

镜头数     12
平均镜长   4.3s
中位镜长   3.8s

覆盖率
分析完成 9 / 12
```

---

# 31. Scene Statistics 原则

统计必须从底层正式 Shot 重算。

不能错误聚合：

```text
Scene Median
+
Scene Median
↓
Film Median
```

类似中位数、覆盖率、镜头密度等均需要依据真实底层样本重算或使用合法聚合规则。

---

# 32. Sequence / Section Inspector

示例：

```text
Sequence 03
冲突升级

包含
Scene 12–16

时长
08:43


结构分析
────────────────

事件
[                       ]

阶段目标
[                       ]

变化
[                       ]

关键镜头
[ Shot 027 ] [ Shot 043 ]


观察
...
```

---

# 33. Film Inspector

Film 级主要提供：

- 全片基本信息；
- Section / Sequence / Scene 数量；
- Shot 数量；
- 真实统计；
- 分析覆盖率；
- 全片对象分析；
- 当前研究模板下的 Film / Story 字段。

不要把所有 Track 数据堆成 Dashboard。

Timeline 负责时间结构，Inspector 负责当前对象。

---

# 34. Marker Inspector

Marker 不应混入 Analysis Field。

示例：

```text
Marker

00:24:17.042


观察

这个动作切换非常值得研究。


Scope

Free


当前位置

Scene 12
Shot 027


创建时间
...


删除 Marker
```

---

# 35. Marker 创建

快捷键：

```text
M
```

Playhead 处弹出：

```text
┌─────────────────────────────┐
│ 添加观察                    │
│                             │
│ 这个切换值得研究…           │
│                             │
│ Enter 保存                  │
└─────────────────────────────┘
```

默认：

```text
scope = free
```

不能因为当前处于 Scene Scope，就暗中自动改 Marker Scope。

---

# 36. Marker 与 Object Analysis 的区别

必须区分：

```text
Marker
= 时间定位 + 自由观察

Object Analysis
= 明确讨论 Shot / Scene / Sequence / Section 等对象
```

Scene 的目标、冲突、变化、结果不能塞进 Marker。

---

# 37. Analysis Template 定位

Template 不是业务数据。

Template 定义：

> **当前工作台允许研究哪些字段。**

推荐结构：

```text
AnalysisTemplate
  ├─ Shot Fields
  ├─ Scene Fields
  └─ Story Fields
```

---

# 38. Template 与三个分析尺度

推荐与：

```text
Shot
Scene
Story
```

三个分析尺度一致。

例如“电影语言模板”：

```text
SHOT

景别
构图
机位
摄影机运动
光线
色彩
声音
动作
备注


SCENE

目标
冲突
变化
结果


STORY

阶段功能
主题
关键事件
```

---

# 39. Template Selector

Toolbar：

```text
模板：电影语言 ▾
```

Dropdown：

```text
✓ 电影语言
  摄影研究
  剪辑研究
  广告分析

────────────

管理分析模板…
```

切换模板：

> 只改变当前工作台的字段视图。

不要删除当前模板未显示的数据。

---

# 40. Analysis Settings Drawer

Template 与 AI 统一放在：

> **分析设置**

建议大型右侧 Drawer：

```text
560–680px
```

示例：

```text
                                   ┌──────────────────────────────┐
                                   │ 分析设置                 ×   │
                                   │                              │
                                   │ 分析模板     AI 辅助          │
                                   │ ─────────                    │
                                   │                              │
                                   │ 当前模板                     │
                                   │ 电影语言                     │
                                   │                              │
                                   │ Shot                         │
                                   │ ☰ 景别                       │
                                   │ ☰ 构图                       │
                                   │ ☰ 运镜                       │
                                   │ ☰ 光线                       │
                                   │ ☰ 色彩                       │
                                   │                              │
                                   │ + 添加字段                   │
                                   │                              │
                                   │ Scene                        │
                                   │ ☰ 目标                       │
                                   │ ☰ 冲突                       │
                                   │ ☰ 变化                       │
                                   │                              │
                                   │ Story                        │
                                   │ ☰ 阶段功能                   │
                                   └──────────────────────────────┘
```

---

# 41. Template 不直接生成 Timeline Track

这是冻结原则。

错误：

```text
Template 增加字段
↓
自动变成 Timeline Track
```

正确：

```text
Template Field
↓
Analysis Domain Data
↓
如果存在对应 Timeline Adapter
↓
可以显示为 Track
```

原因是不同数据有不同形态：

```text
Point
Range
Samples / Curve
Structural Range
Object Analysis
```

不能强制序列化成统一 start / end / value。

---

# 42. Template 与 Track Preference 的关系

Template 可以推荐 Track。

但用户手动隐藏的 Track Preference 优先。

例如：

```text
切换到剪辑研究模板
```

可以提示：

```text
推荐开启 Editing Pace
```

但不要自动覆盖用户明确隐藏的轨道。

---

# 43. Analysis Field 状态模型

建议字段至少支持：

```text
empty
candidate
draft
confirmed
stale
```

---

# 44. Field Empty

```text
景别
未分析
```

---

# 45. Field AI Candidate

```text
✦ AI 建议：中景

[采用] [忽略]
```

---

# 46. Field Draft

```text
中景
● 未保存
```

---

# 47. Field Confirmed

```text
中景
✓
```

---

# 48. Field Stale

```text
中景
⚠ 数据变化后需要复核
```

---

# 49. 来源与可追溯性

默认不要显示大量元数据。

字段旁：

```text
中景              ✓
```

点击 / Hover：

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

# 50. AI 产品定位

AI 不是独立页面。

AI 是：

> **分析工作台中的 Candidate Producer。**

AI 不能直接覆盖正式分析。

推荐链路：

```text
算法 / 媒体观测
↓
可重复统计
↓
Context Builder
↓
LLM / VLM Candidate
↓
用户采纳 / 修改 / 拒绝
↓
正式 Analysis Record
```

---

# 51. AI Status 入口

Toolbar：

```text
✦ AI
```

状态：

```text
灰色
AI 关闭

Accent
AI 开启

✦ AI · 8
8 个建议待确认
```

---

# 52. AI Settings

Analysis Settings → AI 辅助：

```text
AI 辅助
● 开启


生成方式

● 按需生成
  点击“AI 分析”时生成建议

○ 自动准备候选
  当前对象进入研究范围时，
  后台准备建议，但不写正式数据


参与字段

✓ 景别
✓ 构图
✓ 运镜
✓ 光线
✓ 色彩

○ 主观意义


批量处理

[ 为未分析镜头生成建议 ]


数据保护

✓ 不覆盖人工确认字段
✓ 数据变化后候选标记为过期
✓ 保留建议来源与证据
```

---

# 53. 不推荐 AI 自动正式填充

此前的“自动填充”概念应调整为：

> **自动生成候选**

正式数据必须经过：

```text
用户采纳
```

或者未来定义非常明确的可信业务规则。

LLM/VLM 默认不直写正式结论。

---

# 54. AI Candidate 状态机

建议：

```text
pending
→ accepted
→ rejected
→ stale
```

含义：

- pending：等待用户审核；
- accepted：用户采纳；
- rejected：用户明确忽略；
- stale：依赖的数据 / revision 已发生变化。

---

# 55. AI Suggestion Card

直接嵌入 Field：

```text
摄影机运动

当前
固定机位


┌─────────────────────────────────┐
│ ✦ AI 建议                       │
│                                 │
│ 缓慢推镜                        │
│                                 │
│ 依据                            │
│ 主体在画面中的比例持续增大      │
│                                 │
│ [ 采用 ]            [ 忽略 ]    │
└─────────────────────────────────┘
```

---

# 56. AI Evidence

建议必须尽量绑定证据：

```text
✦ AI 建议：缓慢推镜

证据

[ Frame 12 ] [ Frame 36 ] [ Frame 72 ]

00:12.3 → 00:15.1

[ 定位证据 ]
```

点击 Evidence：

```text
PlaybackPosition
→ 证据位置
```

但：

```text
SelectedEntity
→ 不变
```

---

# 57. AI 轻量问答入口

Inspector 底部可提供：

```text
✦ 问 AI 关于这个镜头…
```

输出必须区分：

```text
观察
解释
证据
```

例如：

```text
为什么这个镜头会有压迫感？

观察
• 低机位
• 主体占比高
• 空间纵深较弱

解释
这些因素可能增强人物在画面中的压迫感。

证据
Frame 234
Frame 278
```

聊天内容不是正式字段。

需要：

```text
[ 添加到备注 ]
[ 写入字段… ]
```

经用户确认后再进入正式数据。

---

# 58. Context Builder 范围

AI 不能每次发送整部影片。

### Shot Task

```text
当前 Shot
有限相邻 Shot
代表帧
相关字幕
已确认字段
必要统计
```

### Scene Task

```text
当前 Scene
底层 Shot 统计
关键 Shot / Evidence
字幕
相邻 Scene 摘要
```

### Story Task

```text
当前宏观研究范围
Scene 摘要
事件证据
用户确认结构
用户已有观点
```

UI 中要明确：

```text
分析当前镜头
分析当前 Scene
分析当前范围
```

而不是模糊的：

```text
AI 分析
```

---

# 59. Timeline 定位

Timeline 是：

> **统一时间坐标上的结构与分析可视化骨架。**

不是第二个编辑器。

---

# 60. Timeline 默认信息架构

推荐继承：

```text
STRUCTURE
  Section
  Sequence
  Scene

VISUAL
  Shot + Frame

OBSERVATION
  Marker

ANALYSIS
  Editing Pace
  Dialogue
  ...

MEDIA
  Audio
```

---

# 61. Timeline 默认视觉

```text
              23:00                24:00                25:00

Section    ┃──────────── Section 02 ─────────────────────┃

Sequence   ┃──── Sequence 03 ────┃── Sequence 04 ───────┃

Scene      ┃ Scene 10 ┃ Scene 11 ┃──── Scene 12 ────────┃

Shot       │23│24│25│26│27│28│29│30│31│32│33│
Frame      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

Marker              ●                 ●

Pace       ▁▂▅█▆▃▂▂▅▇▅▃▂

Dialogue      ━━━━━━━        ━━━━━   ━━━━━━

Audio      ≋≋≋≋████≋≋≋≋≋████████≋≋≋
```

---

# 62. Timeline Track 尺寸

建议默认：

```text
Section
20–24px

Sequence
22–26px

Scene
26–32px

Shot + Frame
64–80px

Marker
压缩默认，按内容展开

Analysis Tracks
按类型定义

Audio
按主音轨视图需求
```

Shot + Frame 视觉权重最高。

---

# 63. Timeline Toolbar

建议：

```text
[ 全片适配 ] [ 当前范围 ]

−  ━━━━━━━  +

轨道 ▾

                        00:24:17.042
```

定义：

```text
全片适配
= fitFilm

当前范围
= fitRange(ResearchScope)
```

---

# 64. Track Settings

点击：

```text
轨道 ▾
```

展示：

```text
显示轨道


结构

✓ Section
✓ Sequence
✓ Scene


视觉

✓ Shot + Frame


观察

✓ Marker


分析

✓ Editing Pace
○ Dialogue
○ 景别
○ 运镜


媒体

✓ 主音轨
```

仅展示真实实现的 Track。

无数据时：

```text
Dialogue
暂无字幕数据
```

不要绘制假数据。

---

# 65. Track Definition / Instance / Preference

必须分离：

```text
TrackDefinition
= 轨道类型

TrackInstance
= 当前真实数据源

TrackPreference
= 用户怎么看
```

Preference 包括：

```text
visible
order
height
```

用户隐藏轨道：

> 只改变 UI，不删除业务数据。

---

# 66. Shot Track 在逐镜分析中的权限

Shot Track：

### 允许

- 点击选择；
- 双击 Fit Shot；
- Enter 进入 Shot Scope；
- Seek；
- Inspect；
- 显示正式 Boundary；
- 作为 Evidence；
- Context Menu。

### 禁止

- 拖动 Shot Boundary；
- Split Shot；
- Merge Shot；
- 删除 Boundary；
- 修改正式 Shot 帧范围。

定义：

```text
Shot Boundary
= selectable / inspectable
≠ editable
```

---

# 67. Structure Tracks 的编辑能力

在逐镜分析中：

```text
Scene
Sequence
Section
```

仍然属于 Analysis Workspace Authority。

允许通过领域命令：

```text
CreateRange
SplitRange
MoveSharedBoundary
ResizeOuterEdge
MergeAdjacentRanges
DeleteRange
```

修改。

Timeline renderer 不直接修改数组或持久化。

---

# 68. Structure 编辑 UI

右键 Scene：

```text
进入 Scene
重命名
在此拆分 Scene
与下一个 Scene 合并
删除 Scene
```

Sequence：

```text
进入 Sequence
在此拆分 Sequence
与下一个 Sequence 合并
删除 Sequence
```

结构边界修改主要发生在 Timeline。

Inspector 不重复建设结构编辑器。

---

# 69. Editing Pace Track

首批真实分析轨之一。

推荐两个真实模式：

```text
镜头时长
镜头边界密度 / min
```

不要创建：

```text
综合节奏分 82
```

这种没有清晰来源的指标。

---

# 70. Editing Pace Tooltip

镜头时长：

```text
Shot 027

镜头时长
3.27s

局部均值
4.12s

局部中位
3.84s

样本
11 Shots
```

边界密度：

```text
00:24:30

镜头边界密度
18.4 cuts/min

窗口
30s
```

必须带单位与样本范围。

---

# 71. Dialogue Track

真实字幕导入后：

```text
Dialogue

─────「你为什么来了？」──────

                ───「我不知道。」────
```

点击：

```text
SelectedEntity = Dialogue
```

Inspector：

```text
对白

00:24:12.4 – 00:24:15.7

你为什么来了？

来源
Imported SRT

Speaker
未知
```

Dialogue：

- 可重叠；
- 不使用结构同层排斥；
- 不强制吸附 Shot；
- 保留源字幕时间精度。

---

# 72. Semantic Zoom

Timeline 不应在所有缩放级别展示同样内容。

建议四级：

```text
全片
中尺度
近尺度
单镜 / 逐帧
```

---

# 73. 全片 LOD

Shot：

```text
| | |||||| | |||| |
```

不显示每个缩略图。

Scene：

```text
Scene 1
Scene 2
Scene 3
```

Marker：

聚合 / 密度。

Pace：

低密度真实曲线。

---

# 74. 中尺度 LOD

Shot：

```text
024
025
026
```

显示代表帧。

结构名称保留主要标题。

---

# 75. 近尺度 LOD

```text
Shot 027
3.27s

[frame][frame][frame]
```

显示精确 Boundary。

---

# 76. 单镜 / 逐帧 LOD

```text
F231
F232
F233
F234
```

提供精确帧定位。

逐镜分析中仍然不能直接拖 Shot Boundary。

---

# 77. ResearchScope 与 Timeline 的连接

例：

```text
ResearchScope = Film
```

Timeline：

```text
显示全片
```

用户选择 Scene 12 并 Enter：

```text
ResearchScope = Scene 12
```

则：

- Breadcrumb 变为 Scene 12；
- Timeline Fit Scene 12；
- Navigator 聚焦 Scene 12；
- Inspector = Scene 12；
- Video PlaybackPosition 不强制跳转。

随后选择 Shot 27：

```text
SelectedEntity = Shot 27
ResearchScope = Scene 12
```

Scope 不自动改变。

---

# 78. 分析过程中发现 Shot 错误

这是 Exception Path。

用户可能发现：

```text
两个实际镜头被错误合并为一个 Shot
```

或者：

```text
一个 Shot 被误切成两个
```

或者：

```text
Boundary 偏了几帧
```

逐镜分析不能直接修正。

---

# 79. Shot 问题入口

可从三个地方进入：

### Inspector More Menu

```text
Shot 027                                  ⋯

重新分析
添加 Marker
复制时间码

────────────

调整分镜…
```

### Timeline Boundary Hover

```text
镜头切点

00:24:17.042

需要调整？
前往镜头复核 →
```

### Timeline Context Menu

```text
选择镜头
进入镜头
添加 Marker
复制时间码

────────────

调整分镜…
```

---

# 80. 调整分镜确认

推荐轻量确认：

```text
需要调整这个分镜？

将在「素材准备 → 镜头复核」
定位到当前镜头。

已有分析内容会保留，
如镜头结构发生变化，相关分析将标记为需要复核。

[取消]

[前往镜头复核]
```

---

# 81. Contextual Navigation 到素材准备

跳转不能只是：

```text
stage=prepare
```

应该携带：

```text
workspace=prepare
step=review
focusShotId=shot-027
focusFrame=34827
returnContext=...
```

素材准备进入后直接定位对应 Shot / Boundary。

用户不应重新搜索。

---

# 82. Return Context

跳转前保存：

```text
returnContext = {
  workspace: "analysis",
  researchScope,
  selectedEntity,
  viewport,
  templateId,
}
```

完成复核后提供：

```text
[ 完成并返回逐镜分析 ]
```

回到尽可能接近原来的工作位置。

---

# 83. Shot 修改后的同步原则

Shot 修改不是简单刷新。

需要输出：

```text
oldShotId
→ newShotIds[]
```

以及：

```text
affectedFrameRange
affectedStructure
affectedAnalysis
```

---

# 84. Shot Split

例如：

```text
Shot 027
↓
Shot 027A
Shot 027B
```

原：

```text
景别 = 中景
运镜 = 固定
内容 = 人物从门口走向桌边，然后坐下
```

不能自动复制给两个新 Shot 作为 confirmed data。

正确：

```text
原分析
↓
保留来源
↓
新 Shot Analysis = stale / needs-review
```

---

# 85. Shot Split Inspector 状态

例如：

```text
Shot 028

⚠ 分镜变化后需要复核

这个镜头来自原 Shot 027 的拆分。


原分析

景别
中景

摄影机运动
固定

内容
人物从门口走向桌边，然后坐下


[ 采用部分原分析 ]

[ 重新分析 ]
```

支持逐字段采纳。

---

# 86. Shot Merge

例如：

```text
Shot 027
Shot 028
↓
Shot 027
```

两边原分析不能自动选一个覆盖新 Shot。

应保留：

```text
来源 A
来源 B
```

并让合并后的 Shot 进入：

```text
needs-review
```

---

# 87. Structural Remap 与 Semantic Revalidation

必须分开。

## 可以自动重算 / 重映射

```text
Shot Membership
Scene Containment
Timeline Boundary
Duration
Shot Count
Editing Pace
其他 deterministic statistics
```

## 不能自动确认

```text
Shot 景别
Shot 内容
Scene 目标
Scene 冲突
Scene 总结
AI Interpretation
其他语义结论
```

这些应：

```text
stale / needs-review
```

---

# 88. Scene / Sequence / Section 同步

如果 Shot Split 不改变某结构范围：

```text
Scene 12

Shot 025
Shot 026
Shot 027
Shot 028
```

变为：

```text
Scene 12

Shot 025
Shot 026
Shot 027A
Shot 027B
Shot 028
```

结构成员可自动重映射。

但：

```text
Scene Summary
Scene Goal
Scene Conflict
```

如依赖变化，应标记需复核。

---

# 89. Editing Pace 自动更新

Shot Split / Merge 后：

```text
Shot Duration
Cuts/min
Local Median
Local Mean
```

可直接重算。

因为这些是 deterministic statistics。

无需用户确认。

---

# 90. 返回 Analysis Workspace 的同步提示

例如：

```text
✓ 分镜已更新

你刚刚调整了 Shot 027。

1 个原镜头被拆成 2 个镜头。
原分析内容已保留，需要重新确认。

[ 查看影响 ]
```

不能静默修改。

---

# 91. 数据变化影响队列

推荐未来加入：

```text
⚠ 数据复核 3
```

展开：

```text
数据变化影响

2 个 Shot 分析需要复核
1 个 Scene 总结需要复核


Shot 027
由于镜头拆分

Shot 028
由于镜头拆分

Scene 12
底层镜头结构发生变化
```

---

# 92. 数据复核与 AI Candidate 必须分开

不要统一成：

```text
待处理 8
```

推荐：

```text
⚠ 数据复核 3
✦ AI 建议 8
```

语义：

```text
数据复核
= 已有正式结论可能失效

AI 建议
= 新的候选内容等待确认
```

---

# 93. 自动恢复 Selection

如果原：

```text
SelectedEntity = shot-027
```

但修改后 shot-027 不存在。

系统使用 Shot Mapping：

```text
shot-027
↓
shot-027a
shot-027b
```

回来时：

```text
原 Shot 027 已拆成两个镜头。

[ Shot 027A ]
[ Shot 027B ]
```

可默认聚焦第一个，但需要明确提示两个变化对象。

---

# 94. Workbench Error State：尚未有正式 Shot

仍允许：

```text
Video Playback
Frame Strip
Marker
```

禁用：

```text
Shot Inspector
Scene Editing
Editing Pace
依赖正式 Shot 的统计
```

提示：

```text
尚未完成素材准备

你仍然可以浏览视频和添加观察。
完成镜头准备后即可进行逐镜分析。

[ 前往素材准备 ]
```

---

# 95. Workbench Error State：媒体丢失

显示：

```text
⚠ 原始媒体当前不可访问

结构和分析数据仍可查看。

[ 重新关联媒体 ]
```

保留：

- Structure；
- Analysis Data；
- Marker；
- Text；
- Metadata。

禁用：

- Video；
- Frame；
- Audio；
- 媒体依赖算法。

---

# 96. 保存状态

正常：

```text
✓ 已保存
```

弱显示。

保存中：

```text
保存中…
```

失败：

```text
⚠ 保存失败    重试
```

异常状态才提升视觉权重。

---

# 97. Undo / Redo

保留全局编辑历史入口：

```text
Cmd/Ctrl + Z
Cmd/Ctrl + Shift + Z
```

对于一次拖动边界：

> 一次 gesture = 一次 command = 一条 history。

只对 Analysis Workspace Authority 的数据生效。

Shot 修改由素材准备自己的事务链负责。

---

# 98. Responsive Strategy

AisenLens 应 Desktop First。

### ≥ 1440px

完整：

```text
Navigator + Player + Inspector + Timeline
```

### 1180–1439px

建议：

```text
Navigator 208px
Inspector 320px
Timeline 240px
```

### < 1180px

- Navigator 可折叠；
- Inspector 可 Drawer 化；
- Video 与 Timeline 必须保留；
- 不为移动端牺牲桌面主体验。

---

# 99. Panel Collapse

建议允许：

```text
⌘1
Structure Navigator

⌘2
Inspector

⌘3
Timeline
```

也可 Toolbar 图标控制。

场景：

### 专注播放

```text
Navigator 隐藏
Inspector 隐藏
Timeline 缩小
```

### 专注分析

```text
Inspector 扩宽
```

### 专注结构

```text
Timeline 拉高
```

仍然是同一个 Workspace。

---

# 100. 前端组件结构

推荐目标：

```text
AnalysisWorkspace
│
├── AnalysisWorkspaceToolbar
│   ├── ResearchBreadcrumb
│   ├── SelectedEntitySummary
│   ├── TemplateSelector
│   ├── AiStatusButton
│   └── AnalysisSettingsButton
│
├── StructureNavigator
│   ├── StructureTree
│   ├── PlayingIndicator
│   └── StructureStatusBadge
│
├── PlayerStage
│   ├── SelectionContextBar
│   ├── VideoPreviewCanvas
│   └── PlaybackControls
│
├── ContextInspector
│   ├── ShotInspector
│   ├── SceneInspector
│   ├── StoryInspector
│   ├── MarkerInspector
│   ├── DialogueInspector
│   ├── AnalysisFieldRenderer
│   ├── AnalysisFieldStatus
│   └── AiSuggestionCard
│
├── AnalysisSettingsSheet
│   ├── TemplateSettings
│   └── AiSettings
│
├── DataReviewQueue
│
└── TimelineDock
    ├── TimelineToolbar
    ├── TrackHeaders
    ├── StructureTracks
    ├── VisualTrack
    ├── MarkerTrack
    ├── AnalysisTracks
    └── AudioTracks
```

---

# 101. Workspace Navigation State

不要继续将所有状态堆进单一 EditorWorkspace。

推荐：

```text
WorkspaceNavigationState

PlaybackPosition
SelectedEntity
ResearchScope
Viewport
NavigationStack
```

---

# 102. Analysis State

建议独立：

```text
AnalysisTemplateState
AnalysisRecordState
AnalysisDraftState
AnalysisReviewState
AiCandidateState
```

---

# 103. Timeline State

独立：

```text
TimelineViewportState
TrackPreferenceState
TrackInstanceState
GestureDraftState
```

Track Preference 不能与 Analysis Data 混合。

---

# 104. Shot Sync State

跨素材准备回来后建议专门存在：

```text
ShotChangeSet
ShotIdMapping
AffectedFrameRange
AffectedAnalysisRefs
AffectedStructureRefs
RevalidationQueue
```

---

# 105. 数据链路

推荐统一：

```text
Video
↓
Official Shot / Scene / Sequence / Section
↓
SelectedEntity
↓
Analysis Template
↓
Analysis Fields
↓
Human / Algorithm / AI Candidate
↓
Confirmed Analysis Record
↓
Timeline Adapter
↓
Timeline Visualization
↓
成果应用
```

---

# 106. 同一 Analysis Record 的消费者

例如用户把：

```text
Shot 027
景别 = CU
```

改成：

```text
MS
```

应该同步影响：

```text
Inspector
Timeline 景别 Track
成果应用数据表
AI Context
导出结果
```

因为它们读取同一份 Analysis Record。

不维护多份重复数据。

---

# 107. Timeline Renderer 原则

Renderer：

只负责：

```text
display
geometry
hit testing
visual state
```

不负责：

```text
business remap
AI request
repository mutation
```

领域行为通过 adapter / command。

---

# 108. Timeline Adapter 原则

每种 Track Adapter 应根据：

```text
project/media identity
data revision
visible time range
pixel scale
selected entity
```

输出：

```text
visible items
geometry
status
hit targets
business references
```

---

# 109. Performance 原则

设计需兼容：

```text
2 小时
3000 Shot
10000 Marker
```

以及压力场景：

```text
10000 Shot
```

因此：

- 全片按像素聚合；
- 不挂载不可辨认的全部 DOM；
- Playback 更新与范围 geometry 解耦；
- 可见查询优先；
- Shot / Structure 用索引；
- 缩略图与 Audio 共用资源预算；
- Timeline Canvas / SVG / DOM 分工依据 profile。

---

# 110. AI 实施顺序

UI 可以先定义 AI Entry 和 Candidate 状态。

但产品开发建议：

```text
阶段 1–4
Human-first
真实 Structure
真实 Marker
真实统计
真实 Timeline Track

阶段 5
AI Candidate
Context Builder
Evidence
审核 / 采纳
```

不要为了显示“AI”而提前建设半套无法验证的数据。

---

# 111. V1 工作台建议范围

V1 优先：

- 四区域布局；
- Playback / Selection / Scope / Viewport 分离；
- Structure Navigator；
- Shot / Scene / Story Inspector；
- Analysis Template；
- Marker；
- Shot + Frame Timeline；
- Scene / Sequence / Section Track；
- Editing Pace；
- Audio；
- Track Preference；
- “调整分镜 → 返回素材准备”路径；
- Shot Change Mapping 与基础 stale 状态。

---

# 112. V1.5

建议：

- Dialogue；
- Data Review Queue；
- 更完整 Template Field Types；
- 更完整 Scene / Story Fields；
- Evidence Picker；
- Timeline Analysis Adapters；
- Layout Preference 持久化；
- Shot 变更影响预览。

---

# 113. V2 / AI

建议：

- AI Candidate；
- Context Builder；
- Evidence UI；
- 批量候选；
- Candidate Review；
- Stale Candidate；
- AI 结构建议；
- 更多 Analysis Track；
- Beat / Event 等语义实体。

---

# 114. 工作台交互层级统一规则

全产品统一：

```text
核心长期任务
→ Workspace

当前对象编辑
→ Inspector

持续配置
→ Drawer / Sheet

高频切换
→ Dropdown / Popover

重要确认
→ Modal

持续过程
→ Workspace 内原地状态变化
```

---

# 115. 最终主 Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ← 项目库    花样年华                                          已保存                  ⚙      │
├──────────────┬───────────────────────────────────────────────────────────────────────────────┤
│              │ 影片 / Scene 12                         模板：电影语言 ▾   ✦ AI · 3      ⋯     │
│ ✓ 素材准备   ├────────────────┬──────────────────────────────────┬───────────────────────────┤
│              │                │ Shot 027                         │ Shot 027                  │
│ ● 逐镜分析   │ 影片结构       │ 00:24:17 – 00:24:20 · 3.27s     │                           │
│              │                │                                  │ 分析                      │
│   成果应用   │ ▾ Scene 10     │ ┌──────────────────────────────┐ │                           │
│              │    021         │ │                              │ │ 景别                      │
│              │    022         │ │                              │ │ 中景                   ▾  │
│              │                │ │            VIDEO             │ │                           │
│              │ ▾ Scene 11     │ │                              │ │ 摄影机运动                │
│              │    023         │ │                              │ │ 缓慢推镜               ▾  │
│              │    024         │ └──────────────────────────────┘ │                           │
│              │    025         │                                  │ ┌───────────────────────┐ │
│              │                │  ⏮   ←1    ▶    +1→    ⏭        │ │ ✦ AI 建议              │ │
│              │ ▾ Scene 12     │                                  │ │ 固定机位                │ │
│              │    026         │ 00:24:18.472 / 02:11:43          │ │ [采用] [忽略]           │ │
│              │ ▶  027         │                                  │ └───────────────────────┘ │
│              │    028         │                                  │                           │
│              │    029    ●    │                                  │ 构图                      │
│              │    030         │                                  │ 中心构图               ▾  │
│              │                │                                  │                           │
│              │                │                                  │ 光线                      │
│              │                │                                  │ 未分析                    │
│              │                │                                  │                           │
│              │                │                                  │ 镜头内容                  │
│              │                │                                  │ 人物坐在窗边……            │
│              ├────────────────┴──────────────────────────────────┤                           │
│              │ 全片适配   当前范围      − ━━━━━ +       轨道 ▾  │                           │
│              │                                                               │               │
│              │ Section ┃──────────── Section 02 ─────────────────┃           │
│              │ Sequence┃──── Sequence 03 ───┃ Sequence 04 ───────┃           │
│              │ Scene   ┃Scene10┃Scene11┃──── Scene 12 ───────────┃           │
│              │ Shot    │23│24│25│26│27│28│29│30│31│32│                        │
│              │ Frame   ░░░░░░░░░░░░░░░░░░░░░░░░░░░                           │
│              │ Marker          ●                ●                              │
│              │ Pace    ▁▂▅█▆▃▂▂▅▇▅                                              │
│              │ Audio   ≋≋≋████≋≋≋≋██████≋≋                                    │
│              │                                                               │
│ ⚙ 项目设置   │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┴───────────────┘
```

---

# 116. 冻结设计原则

最终建议将以下原则作为逐镜分析工作台的冻结决策：

1. **视频是观察中心，Inspector 是数据生产中心，Timeline 是结构中心。**
2. **PlaybackPosition、SelectedEntity、ResearchScope、Viewport 永远分离。**
3. **Structure Navigator 与 Timeline 共享同一结构数据，不建立第二套层级。**
4. **逐镜分析只消费正式 Shot，不直接修改 Shot。**
5. **Shot 问题必须返回“素材准备 → 镜头复核”处理，并携带 Context。**
6. **Shot 变化后，deterministic 数据自动重算，semantic 数据进入 stale / needs-review。**
7. **Analysis Template 只定义研究字段，不直接成为业务数据或 Timeline Track。**
8. **Timeline Track 必须通过领域 Adapter 消费真实数据。**
9. **AI 默认只产生 Candidate；用户确认后才成为正式分析。**
10. **模型不得覆盖用户确认字段。**
11. **Inspector、Timeline、成果数据表、AI Context 必须读取同一份 Analysis Data。**
12. **Marker 是自由观察，对象分析与 Marker 分离。**
13. **Scene / Sequence / Section 可在分析工作台编辑；Shot Boundary 不可编辑。**
14. **任何宏观观点最终都应能够下钻到具体 Shot / Frame / Evidence。**
15. **Workspace 是工作的地方，Settings 是改变 Workspace 行为的地方。**
16. **正常状态安静，异常状态突出。**
17. **用户语言优先于工程语言。**
18. **显示层不成为业务事实来源。**
19. **结构、分析、AI、Timeline Preference 必须分层管理。**
20. **从任意画面都应该能够找到所属结构、相关观察与可核查证据；从宏观问题也能够回到具体画面。**

---

# 117. 一句话总结

AisenLens 的逐镜分析工作台应该让用户感觉：

> **我始终在同一个影片研究空间里，通过结构找到镜头，通过视频验证事实，通过 Inspector 形成观点，通过 Timeline 理解上下文；如果镜头本身有问题，我回素材准备修正镜头，再带着完整上下文回到这里继续分析。**

而不是：

> “我在多个互不连贯的工具页面之间操作不同模块。”
