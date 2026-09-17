# AisenLens Workspace Design System

> Version: 0.1  
> Scope: 拉片工作台 / 分镜分析 / 镜头管理 / 影片分析  
> Design direction: Calm Professional Workspace / Cinematic Editorial

---

## 1. Design Philosophy

AisenLens 是一个长时间使用的影视分析工作环境，而不是传统 SaaS Dashboard。

设计目标不是让 UI 看起来“功能很多”，而是：

> 让影片、镜头和分析内容成为视觉中心，让界面退到背景。

核心关键词：

- Calm
- Precise
- Cinematic
- Lightweight
- Professional
- Contextual

### 1.1 核心原则

#### Content First

电影画面始终拥有最高视觉权重。

UI 不应该和画面争夺注意力。

视觉优先级：

```text
Film Frame
↓
Current Shot
↓
Analysis
↓
Metadata
↓
Controls
```

---

#### Surface over Border

优先使用：

- Surface difference
- Background level
- Spacing
- Typography

建立层级。

避免依赖：

- 大量 Border
- Card Outline
- Shadow
- Divider

---

#### Progressive Disclosure

默认界面只显示当前任务所需的信息。

更多功能通过：

- Hover
- Selection
- Context Menu
- Inspector
- Popover
- Command Palette

逐步出现。

功能复杂 ≠ 界面复杂。

---

#### Selection Driven Workspace

Workspace 的状态围绕当前选中的对象变化。

例如：

```text
Selected Shot
↓
Player seeks
↓
Shot Strip highlights
↓
Inspector updates
↓
AI Analysis updates
↓
Metadata updates
```

Selection 是工作区的核心状态。

---

#### Contextual Tools

工具属于上下文，而不是属于整个产品。

例如：

看片状态显示：

```text
播放 / 截帧 / 标记 / 倍速
```

镜头状态显示：

```text
拆分 / 合并 / 标签 / AI分析
```

人物分析状态显示：

```text
角色 / 表演 / 情绪 / 动作
```

禁止建立一个塞满所有功能的 Global Toolbar。

---

# 2. Workspace Architecture

整体结构：

```text
┌──────────────────────────────────────────────────────────────┐
│ Global Header                                                │
├──────────────┬───────────────────────────────┬───────────────┤
│ Navigation   │                               │ Inspector     │
│ Panel        │       Primary Workspace       │ Panel         │
│              │                               │               │
│              │                               │               │
├──────────────┴───────────────────────────────┴───────────────┤
│ Optional Shot Strip / Timeline                               │
└──────────────────────────────────────────────────────────────┘
```

Workspace 由四种区域组成：

```text
App Shell
├── Navigation Panel
├── Primary Workspace
├── Inspector Panel
└── Context Panel
```

Panel 必须可以：

- Resize
- Collapse
- Expand
- Hide
- Restore

---

# 3. Recommended Layout

Desktop ≥ 1440px：

```text
Navigation     220–280px
Primary        flexible
Inspector      300–380px
Shot Strip     128–220px
Header         48–52px
```

推荐默认：

```text
Navigation: 240px
Inspector: 336px
Header: 48px
Shot Strip: 160px
```

最小宽度：

```text
Navigation min: 180px
Inspector min: 280px
Primary min: 640px
```

---

# 4. Surface System

不要把界面理解成：

```text
Page
Card
Card
Card
```

应该理解成：

```text
Canvas
└── Workspace
    ├── Panel
    ├── Surface
    └── Floating Surface
```

Surface Level：

```text
Level 0 Canvas
Level 1 Panel
Level 2 Surface
Level 3 Elevated Surface
Level 4 Overlay
```

---

# 5. Dark Theme

Dark Mode 不使用纯黑。

整体采用轻微冷蓝 / 紫灰 Neutral。

```css
:root[data-theme="dark"] {

  --bg-canvas: #0D0F17;

  --bg-panel: #12141E;

  --bg-workspace: #151722;

  --bg-surface: #1B1D29;

  --bg-surface-hover: #222432;

  --bg-surface-active: #262837;

  --bg-surface-selected: #292B3B;

  --bg-viewer: #08090D;

  --border-subtle:
    rgba(255,255,255,.055);

  --border-default:
    rgba(255,255,255,.085);

  --border-strong:
    rgba(255,255,255,.14);

  --text-primary:
    #F3F3F6;

  --text-secondary:
    #A7A8B3;

  --text-tertiary:
    #737582;

  --text-disabled:
    #50525D;

  --accent:
    #625BFF;

  --accent-hover:
    #716BFF;

  --accent-active:
    #554EE8;

  --accent-soft:
    rgba(98,91,255,.14);
}
```

---

# 6. Light Theme

Light Mode 不使用“全白”。

通过微弱灰度层级建立空间。

```css
:root[data-theme="light"] {

  --bg-canvas:
    #F3F3F5;

  --bg-panel:
    #F7F7F9;

  --bg-workspace:
    #FAFAFB;

  --bg-surface:
    #FFFFFF;

  --bg-surface-hover:
    #F0F0F3;

  --bg-surface-active:
    #ECECF0;

  --bg-surface-selected:
    #E8E8EF;

  --bg-viewer:
    #101114;

  --border-subtle:
    rgba(0,0,0,.055);

  --border-default:
    rgba(0,0,0,.085);

  --border-strong:
    rgba(0,0,0,.14);

  --text-primary:
    #202126;

  --text-secondary:
    #656771;

  --text-tertiary:
    #92939C;

  --text-disabled:
    #BABBC1;

  --accent:
    #5B53FF;

  --accent-hover:
    #5149EC;

  --accent-active:
    #4841DA;

  --accent-soft:
    rgba(91,83,255,.10);
}
```

---

# 7. Viewer Rule

无论 Light / Dark Workspace：

> Viewer 都保持深色环境。

例如：

```text
Light Workspace

#FAFAFB
     ↓
#101114
     ↓
Film
```

Viewer 必须成为视觉中的：

**Dark Stage**

这样用户注意力会自然进入影片。

---

# 8. Accent Color

Accent 不用于装饰。

只用于：

```text
Active
Selected
Focus
Playhead
Primary Action
Current Position
Interactive State
```

推荐 Accent：

```text
Primary Violet
#625BFF
```

界面 Neutral 色占比建议：

```text
Neutral 90–95%
Accent  3–5%
Semantic 2–5%
```

---

# 9. Semantic Colors

Accent Color 与 Semantic Color 必须分离。

```css
--success: #3CB179;
--warning: #D99A3E;
--danger:  #E45C5C;
--info:    #4C8DDB;
```

使用：

```text
Success → 已完成 / 已确认
Warning → 需要检查
Danger  → 错误 / 删除 / 无效
Info    → 系统信息
```

禁止使用 Semantic Color 做界面装饰。

---

# 10. Typography

原则：

> 小字号差异 + Weight + Color + Spacing 建立层级。

不要依赖巨大字号。

推荐：

```text
Workspace Title
20px / 28px / 500

Section Title
15px / 22px / 500

Control
13px / 20px / 500

Body
13px / 20px / 400

Metadata
12px / 18px / 400

Caption
11px / 16px / 400
```

字体：

中文：

```text
PingFang SC
HarmonyOS Sans SC
MiSans
Source Han Sans
```

英文 / 数字：

```text
Inter
Geist
SF Pro
```

推荐 font-weight：

```text
400
500
600
```

避免大量：

```text
700+
```

---

# 11. Spacing System

使用 4px Base Grid。

```text
4
8
12
16
20
24
32
40
48
64
```

Token：

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

常用规则：

```text
Icon ↔ Text        6–8px

Control ↔ Control  8px

Content Padding    12–16px

Panel Padding      12–16px

Section Gap        20–24px
```

---

# 12. Radius System

工作台保持：

> 精密 + 柔和

而不是“可爱 SaaS”。

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-xl: 12px;
--radius-pill: 999px;
```

应用：

```text
Button          6px
Input           6px
Shot Card       8px
Popover         8px
Context Menu    8px
Modal           10–12px
Chip            pill
Avatar          circle
```

禁止：

所有 Card 统一 16–24px 巨大圆角。

---

# 13. Border Rules

Normal 状态：

几乎不可见。

```text
Dark
rgba(255,255,255,.055)

Light
rgba(0,0,0,.055)
```

只有以下状态增强：

```text
Hover
Selected
Focus
Error
Drag Target
```

Selected：

```text
Accent border
+
Accent soft background
```

---

# 14. Shadow Rules

默认不依赖 Shadow 建层级。

禁止：

```text
Panel Shadow
Card Shadow
Input Shadow
```

允许 Shadow：

```text
Popover
Dropdown
Context Menu
Modal
Floating Toolbar
Command Palette
```

推荐：

```css
box-shadow:
0 8px 28px rgba(0,0,0,.18);
```

Dark 可更弱。

---

# 15. Button System

按钮类型：

```text
Primary
Secondary
Ghost
Icon
Danger
```

Primary：

```text
Accent Background
White Text
```

Secondary：

```text
Neutral Surface
Subtle Border
```

Ghost：

```text
Transparent
Hover Surface
```

尺寸：

```text
S   28px
M   32px
L   36px
```

默认工作台大量使用：

```text
Ghost
Icon Button
Secondary
```

Primary Button 应该非常少。

---

# 16. Icon Button

推荐：

```text
28 × 28
32 × 32
```

Icon：

```text
16px
18px
```

默认：

```text
transparent
```

Hover：

```text
surface-hover
```

Active：

```text
surface-active
```

Selected：

```text
accent-soft
accent icon
```

---

# 17. Input System

默认高度：

```text
32px
```

搜索框：

```text
32–36px
```

规则：

```text
Border subtle
No heavy shadow
6px radius
12–13px text
```

Focus：

```text
Accent border
+
1–2px Focus Ring
```

---

# 18. Focus Ring

Focus 必须独立于 Selected。

```css
outline:
2px solid rgba(98,91,255,.55);

outline-offset:
2px;
```

Focus 用于：

Keyboard Navigation。

Selected 用于：

Object State。

两者不能混用。

---

# 19. Shot Card

Shot Card 是工作台最重要的组件之一。

结构：

```text
┌────────────────────────────┐
│                            │
│        Film Frame          │
│                            │
│ #023                 04.2s │
├────────────────────────────┤
│ CU · Dolly In              │
│ 50mm · Eye Level           │
└────────────────────────────┘
```

视觉优先级：

```text
Frame
↓
Shot Number
↓
Shot Type
↓
Duration
↓
Camera Metadata
```

---

# 20. Shot Card States

Shot Card 至少需要：

```text
Default
Hover
Selected
Playing
Marked
Analyzing
Error
Disabled
```

Default：

只显示必要 Metadata。

Hover：

显示：

```text
Play
More
Quick Mark
Quick Analyze
```

Selected：

```text
Accent outline
Accent-soft surface
```

Playing：

```text
Play indicator
Current time
```

Analyzing：

避免大型 Loading。

使用：

```text
small spinner
or
subtle progress line
```

---

# 21. Shot Card Hover Preview

推荐加入：

**Hover Scrub**

鼠标左右移动：

```text
Thumbnail
→ Preview frames
```

不要强制打开 Player。

Hover 操作：

```text
▶
截帧
标记
AI
···
```

默认隐藏。

---

# 22. Shot Strip

Shot Strip 是：

> 当前 Sequence 的视觉上下文。

默认高度：

```text
140–180px
```

Compact：

```text
96–120px
```

Expanded：

```text
200–240px
```

Shot Strip 卡片之间：

```text
6–8px gap
```

Current Shot：

必须明显。

其他 Shot：

保持低对比。

---

# 23. Navigation Panel

Navigation 不应该像传统文件树那么“重”。

内容：

```text
项目
影片
章节
Sequence
Scene
Collection
```

Item Height：

```text
28–32px
```

Indent：

```text
16px
```

Selected：

```text
surface-selected
```

不要默认使用 Accent 背景。

Accent 只作为：

```text
small marker
icon
or subtle text
```

---

# 24. Inspector

Inspector 的核心原则：

> 不是表单，而是当前镜头的上下文。

结构：

```text
Shot 023

Basic
├ Duration
├ Shot Size
├ Angle
└ Movement

Composition
├ Subject
├ Position
└ Depth

Camera
├ Lens
├ Camera
└ Movement

Character

Dialogue

Sound

Color

AI Analysis
```

---

# 25. Inspector Section

默认不使用 Card 包 Section。

避免：

```text
┌─────────┐
│ Camera  │
└─────────┘
```

推荐：

```text
CAMERA

Lens          50mm
Movement      Dolly In
Angle         Eye Level
```

Section 通过：

```text
Spacing
Typography
Subtle divider
```

区分。

---

# 26. Inspector Density

Inspector 支持：

```text
Comfortable
Compact
```

Comfortable：

```text
Row 32px
```

Compact：

```text
Row 26–28px
```

专业用户长时间使用后通常更偏 Compact。

---

# 27. Toolbar

Global Header 只放：

```text
Project
Search
Workspace Mode
Share
Global Actions
```

禁止放所有业务工具。

---

## Context Toolbar

看片：

```text
Play
Speed
Frame
Marker
Capture
```

镜头编辑：

```text
Split
Merge
Tag
Analyze
```

分镜：

```text
Move
Insert
Duplicate
Delete
```

---

# 28. Toolbar Density

Toolbar Height：

```text
36–40px
```

Button：

```text
28–32px
```

图标优先。

文字只用于：

- 重要行为
- 不易理解的行为
- Primary Action

---

# 29. Popover

用于：

```text
Sort
Filter
Group
View
Appearance
Metadata
```

宽度：

```text
220–320px
```

Padding：

```text
8px
```

Item：

```text
28–32px
```

避免大型下拉。

---

# 30. Context Menu

Right Click 是专业工作台的重要入口。

Shot Context Menu：

```text
播放
打开
截帧

────────

拆分
合并
复制

────────

AI 分析
添加标签

────────

删除
```

Context Menu 可以承载低频操作。

因此不需要把这些全部摆在屏幕上。

---

# 31. Command Palette

推荐加入：

```text
⌘ K / Ctrl K
```

功能：

```text
Search Shot
Jump Scene
Run AI Analysis
Add Marker
Change Layout
Toggle Inspector
Toggle Timeline
Export
```

它是降低 Toolbar Complexity 的关键。

---

# 32. Interaction State Model

所有核心对象统一状态：

```text
Default
Hover
Pressed
Focused
Selected
Disabled
Loading
Error
```

设计系统必须确保每个组件状态逻辑一致。

---

# 33. Hover Rule

Hover 只用于：

```text
Reveal
Preview
Highlight
Quick Action
```

禁止 Hover 导致：

```text
layout jump
size change
major content reflow
```

---

# 34. Selected Rule

Selected 应该意味着：

> 这个对象正在驱动其他 Panel。

例如：

```text
Selected Shot
↓
Player
Inspector
Timeline
Analysis
```

因此 Selected 必须比 Hover 更明显。

---

# 35. Motion

Motion 不是装饰。

负责表达：

```text
State
Continuity
Relationship
Position
```

推荐：

```text
Hover
80–120ms

Button
100–140ms

Dropdown
120–160ms

Popover
140–180ms

Panel
180–240ms

Modal
180–240ms

Layout
200–280ms
```

避免：

```text
> 300ms
```

用于高频工作流。

---

# 36. Easing

推荐：

```css
--ease-standard:
cubic-bezier(.2,.8,.2,1);

--ease-exit:
cubic-bezier(.4,0,1,1);

--ease-enter:
cubic-bezier(0,0,.2,1);
```

---

# 37. Media First Rule

电影内容必须保持：

```text
Full color
Full contrast
Full visual fidelity
```

UI：

```text
Low saturation
Low contrast
Neutral
```

也就是说：

```text
Media owns color.
UI owns structure.
```

---

# 38. Density Modes

工作台必须支持不同 Density。

### Visual Mode

适合：

找镜头 / 浏览。

```text
Large Thumbnail
Minimal Metadata
```

### Analysis Mode

```text
Medium Thumbnail
More Metadata
Inspector Open
```

### Data Mode

```text
Small Thumbnail
List
Dense Metadata
```

---

# 39. Workspace Modes

建议至少设计：

```text
Watch
Shots
Analyze
Storyboard
Compare
```

不是完全不同页面。

而是：

> 同一个 Workspace 的不同 Panel Configuration。

例如：

Watch：

```text
Navigation
Viewer
Shot Strip
```

Analyze：

```text
Navigation
Viewer
Inspector
```

Storyboard：

```text
Navigation
Large Shot Grid
Inspector
```

---

# 40. View Preference

用户可以调整：

```text
Grid / List

Thumbnail Size

Aspect Ratio

Show Title

Show Duration

Show Metadata

Show Shot Number

Show Tags
```

工作台不应该只有一个设计师规定的 Density。

---

# 41. Empty States

Empty State 不要做：

```text
巨大插画
营销文案
```

应该：

```text
简单 Icon
一句解释
一个 Action
```

例如：

```text
还没有镜头

拖入影片或开始自动拆镜。
```

---

# 42. Loading

避免 Skeleton 满屏闪烁。

优先：

```text
已有内容保持
+
局部 loading
```

例如 AI 分析：

不要：

```text
整个 Inspector Loading
```

应该：

```text
AI Analysis
Analyzing...
```

其他 Metadata 仍然正常显示。

---

# 43. AI UI Rule

AI 不应该成为独立视觉世界。

禁止：

```text
大渐变
发光紫
AI everywhere
```

AI 是一种能力，不是视觉主题。

推荐：

```text
普通 Surface
+
AI Icon
+
Accent 状态
```

AI 输出：

```text
结构化
可编辑
可接受
可拒绝
可追溯
```

---

# 44. AI Analysis Component

例如：

```text
AI Analysis

Shot Size
Close Up
[Accept]

Movement
Slow Dolly In
[Accept]

Lighting
Soft side lighting
[Accept]
```

AI 建议与真实 Metadata 必须视觉区分。

建议：

```text
AI Proposal
→ Accent-soft background

Confirmed Data
→ Normal Surface
```

---

# 45. Editing Philosophy

核心原则：

> View first, edit second.

默认：

```text
Label      Value
Lens       50mm
```

点击后：

```text
Lens       [50mm ▼]
```

不要默认把 Inspector 做成巨大 Form。

---

# 46. Accessibility

文本最低：

```text
WCAG AA
```

重要状态不能只依赖颜色。

例如：

错误：

```text
Red
+
Error icon
+
Text
```

Selected：

```text
Accent
+
Border
+
Surface
```

---

# 47. Keyboard First

专业工作台必须从一开始考虑快捷键。

基础：

```text
Space
Play / Pause

← →
Frame step

↑ ↓
Previous / Next Shot

M
Marker

S
Split

F
Fullscreen

I
Toggle Inspector

⌘K
Command Palette
```

所有 Tooltip 可以显示快捷键。

---

# 48. Tooltip

Tooltip delay：

```text
500–700ms
```

内容：

```text
Split Shot    S
```

而不是长篇解释。

---

# 49. Design Anti-Patterns

禁止以下设计：

### Dashboardization

```text
一堆 KPI
一堆统计 Card
```

拉片是创作工作，不是 BI。

---

### Card Everything

不是所有东西都需要 Card。

优先：

```text
Surface
Spacing
Typography
```

---

### Rainbow UI

不要：

```text
镜头 蓝
人物 绿
声音 紫
动作 红
AI 粉
```

颜色只负责语义。

---

### Huge Radius

避免大量：

```text
16px
20px
24px
```

---

### Heavy Shadow

工作区不是营销 Landing Page。

---

### Permanent Controls

低频工具不要永久出现。

---

### Deep Page Navigation

工作流程尽量不离开 Workspace。

---

# 50. Final Visual Rule

任何页面完成后，都需要问：

> 如果把电影画面全部隐藏，这个界面是不是还特别抢眼？

如果答案是：

> 是。

说明 UI 太重。

正确状态应该是：

> 没有电影内容时，界面很安静；电影内容出现后，整个产品才真正“亮起来”。

---

# 51. Final Design Formula

AisenFlow Workspace：

```text
Frame.io
Workspace Architecture

+

Linear
Interaction Discipline

+

Craft
Light Surface Warmth

+

Cinema
Content Hierarchy
```

最终追求：

```text
Simple
but not Empty

Dense
but not Heavy

Professional
but not Cold

Cinematic
but not Decorative
```

---

# 52. One Sentence Design Principle

> UI 是电影的工作环境，而不是电影的竞争者。