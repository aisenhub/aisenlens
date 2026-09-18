---
title: "AisenLens Native Studio Design System"
doc_type: design-system
status: target-design
version: 2.0
last_reviewed: 2026-09-18
workspace:
  - global
scope:
  - webapp
  - design-system
depends_on:
  - GLOBAL_WORKSPACE_ARCHITECTURE
source_of_truth_for:
  - native-studio-experience
  - visual-tokens
  - material-and-depth
  - workspace-panels
  - interaction-feedback
  - motion-system
  - component-visual-rules
  - view-preferences
  - accessibility-ui
  - visual-regression
implementation_areas:
  - apps/webapp/src/index.css
  - apps/webapp/src/components
  - apps/webapp/src/components/ui
  - apps/webapp/src/features/workflow
---

# AisenLens Native Studio Design System

> Version: 2.0
> Design direction: **Native Desktop Workbench / Fluid Creative Studio**
> Platform target: desktop-first web application
> Status: target design and implementation contract

## 0. Supersession

本版本是一次完整视觉与交互换代。

2026-09-17 的 `Calm Professional Workspace / Cinematic Editorial`、Primary Violet、旧 Surface/Spacing/Motion/Density 规则，以及由这些规则派生的旧 UI 原则，**全部停止作为正式设计依据**。

旧设计只存在于 Git 历史与历史审计中，不形成兼容要求。Phase 04 起的新 UI 不需要保持旧视觉选择、旧 token 名称或旧交互手感。

本文件重新定义 AisenLens 的唯一 UI / UX Design System Source of Truth。

---

# 1. Product Experience Target

AisenLens 不是“网页套壳的后台系统”，也不是“影视主题 SaaS”。

目标是：

> **在浏览器里获得接近专业桌面创作软件的连续、精确、可定制和低摩擦体验。**

用户应该感受到：

- 界面像一个持续存在的工作台，而不是一组网页；
- Panel 可以 resize / collapse / reveal，并记住布局；
- 选择一个对象后，Viewer / Timeline / Inspector 立即同步；
- 鼠标、触控板和键盘都能高效操作；
- Context Menu、Popover、Inspector、Command Palette 从操作来源自然出现；
- Drag、Scrub、Seek、Resize、Selection 都有连续反馈；
- Loading、Save、AI、Export 不冻结整个工作台；
- 页面切换不会让用户觉得“离开了软件又打开一个网页”；
- 动效不是装饰，而是空间关系和状态连续性的反馈；
- 视觉细节服务于可操作性、层级和速度感。

---

# 2. Native Studio Principles

## 2.1 Single-Window Continuity

三个一级 Workspace 共享同一个稳定 App Window。

```text
AisenLens Window
├── Window Bar / Global Chrome
├── Workspace Rail
└── Workspace Frame
    ├── Navigation / Structure Panel
    ├── Primary Work Surface
    ├── Inspector / Detail Panel
    └── Timeline / Context Surface
```

切换 Workspace 时：

- Window Bar 不重建；
- Project identity 不消失；
- Panel 几何尽量保持连续；
- 相同对象的 Selection 尽量保持；
- 不使用“整页白屏 → 新页面出现”的网页式切换；
- 不为每个功能创建独立大页面。

## 2.2 Spatial UI

界面要有稳定的空间记忆。

用户应能形成肌肉记忆：

- 左侧：导航、结构、对象列表；
- 中央：主要编辑 / Viewer / Data Surface；
- 右侧：Inspector / Properties / Review；
- 下方：Timeline / Shot Strip / Task Context；
- 顶部：项目状态和高频全局动作。

低频动作从操作来源附近出现，而不是统一跳到远处。

## 2.3 Direct Manipulation First

能直接操作对象时，不优先使用表单。

优先：

- drag boundary；
- scrub media；
- resize panel；
- reorder item；
- inline rename；
- click-to-select；
- double-click / Enter-to-open；
- context menu；
- keyboard command。

表单只用于真正需要参数输入的任务。

## 2.4 Source-Anchored Interaction

Popup / Menu / Quick Action / Inline Editor 应与触发源保持视觉关系。

例如：

```text
Toolbar button
   ↓
Popover from button

Timeline boundary
   ↓
Boundary quick actions

Selected Shot
   ↓
Inspector + contextual toolbar
```

禁止无原因把局部动作跳转到屏幕中央 Modal。

## 2.5 Immediate Feedback

每一个可交互元素都要快速回答用户：

- “我 hover 到了什么”
- “我按下了什么”
- “什么被选中了”
- “拖到了哪里”
- “系统是否接收了命令”
- “正在保存还是已保存”
- “这个结果是否 stale / candidate / conflict”

视觉反馈必须早于后台任务完成。

## 2.6 Performance Is Part of Design

“丝滑”不是 Motion 参数，而是运行时能力。

以下都属于 UI 质量：

- drag 不掉帧；
- scrub 不抖动；
- panel resize 不触发整棵树重算；
- playback 不让无关 Inspector 重渲染；
- 大列表 virtualize；
- async result 不让 layout jump；
- overlay 打开不阻塞主线程；
- background task 不冻结编辑。

任何“视觉设计”如果持续制造昂贵 blur、shadow、layout thrash 或 rerender，应被认为设计失败。

## 2.7 Keyboard + Pointer Parity

专业桌面工作流必须同时适合：

- mouse；
- trackpad；
- keyboard；
- mixed workflow。

高频命令必须有可发现快捷键；右键菜单、Command Palette、Tooltip 和 Menu 中可显示 shortcut。

## 2.8 Personal Workspace

用户可以改变：

- Panel 宽度；
- Panel 显示/隐藏；
- Density；
- Grid/List；
- Thumbnail Size；
- Inspector 开关；
- Timeline 高度；
- Workspace view/mode。

这些都是 UI Preference，不是 Project canonical fact。

---

# 3. Experience Character

新视觉气质：

```text
Precise
Fluid
Spatial
Dense
Tactile
Quietly Premium
Technical
Fast
```

不是：

```text
SaaS Dashboard
Marketing Landing Page
Game HUD
Glass Everywhere
Card Grid Everywhere
Huge Touch UI
Decorative Motion
Neon Cyberpunk
```

目标不是复刻某个桌面软件，而是让浏览器中的 AisenLens 具备原生专业工具的可信度。

---

# 4. Layer Architecture

AisenLens 使用四个视觉层：

```text
Layer 0 — Window Background
Layer 1 — Work Surface
Layer 2 — Fixed Chrome
Layer 3 — Floating Chrome
```

## Layer 0 — Window Background

整个应用窗口的底色。

用途：

- 窗口边缘；
- panel gap；
- resize seam；
- workspace transition 背景。

## Layer 1 — Work Surface

真正承载内容和编辑的主要区域：

- Viewer；
- Timeline；
- Data Table；
- Shot Grid；
- Inspector body；
- Structure List。

主要使用稳定、不透明 Surface。

## Layer 2 — Fixed Chrome

持续存在的功能 chrome：

- Global Window Bar；
- Workspace Rail；
- Panel Header；
- Toolbar；
- Transport controls；
- Inspector Header。

可以使用轻度材质，但必须稳定、可读。

## Layer 3 — Floating Chrome

真正浮于工作内容上的界面：

- Popover；
- Context Menu；
- Command Palette；
- Floating Toolbar；
- Drawer；
- Modal；
- Toast；
- Tooltip。

允许更明显的 blur / shadow / material。

---

# 5. Material System

## 5.1 Solid Work Surface

大面积工作区域默认使用 solid / near-solid material。

原因：

- 保持文本和数据可读性；
- 避免大面积 backdrop blur 性能成本；
- Timeline / Table / Viewer 在长时间使用时更稳定；
- 降低视觉噪音。

## 5.2 Studio Glass

Studio Glass 是 AisenLens 的功能层材质，不是背景主题。

适用：

- toolbar group；
- floating transport；
- popover；
- context menu；
- command palette；
- overlay inspector；
- compact workspace rail；
- source-anchored action group。

不适用：

- 整个 Data Table；
- 大面积 Timeline track；
- 所有 Card；
- 所有 Panel body；
- 长文本区域。

推荐实现：

```css
background: var(--material-glass);
backdrop-filter: blur(22px) saturate(135%);
border: 1px solid var(--material-glass-stroke);
box-shadow: var(--shadow-float);
```

必须有不支持 `backdrop-filter` 时的 opaque fallback。

## 5.3 Depth

Depth 不只依赖 shadow。

组合使用：

- surface luminance；
- hairline；
- backdrop material；
- local shadow；
- overlap；
- motion；
- source anchoring。

---

# 6. Color System

新配色从零设计，不兼容旧 Primary Violet / Blue palette。

视觉主题：

> **Graphite + Frost + Signal Blue**

Signal Blue 用于精确交互、当前选择和工具反馈；不是装饰色。

## 6.1 Dark Theme

```css
:root,
[data-theme="dark"] {
  --window-bg: #080A0D;
  --workspace-bg: #0D1014;
  --panel-bg: #11151A;
  --surface-1: #151A20;
  --surface-2: #1A2027;
  --surface-3: #202832;

  --surface-hover: #242D38;
  --surface-pressed: #2A3541;
  --surface-selected: #1B3043;

  --viewer-bg: #050609;

  --stroke-soft: rgba(255,255,255,.055);
  --stroke-default: rgba(255,255,255,.095);
  --stroke-strong: rgba(255,255,255,.17);
  --stroke-highlight: rgba(255,255,255,.24);

  --text-primary: #F4F7FB;
  --text-secondary: #B7C0CC;
  --text-tertiary: #818C9A;
  --text-disabled: #59626E;

  --accent: #63B3FF;
  --accent-hover: #7AC0FF;
  --accent-pressed: #3F9EEA;
  --accent-soft: rgba(99,179,255,.16);
  --accent-strong: #9ACFFF;
  --accent-foreground: #07111A;

  --success: #4FD49A;
  --warning: #F2B84B;
  --danger: #FF6B78;
  --info: #63B3FF;

  --material-glass: rgba(17,21,26,.72);
  --material-glass-strong: rgba(17,21,26,.88);
  --material-glass-stroke: rgba(255,255,255,.12);
}
```

## 6.2 Light Theme

```css
[data-theme="light"] {
  --window-bg: #E8EBEF;
  --workspace-bg: #F1F3F6;
  --panel-bg: #F7F8FA;
  --surface-1: #FFFFFF;
  --surface-2: #F2F4F7;
  --surface-3: #E9EDF2;

  --surface-hover: #E5EAF0;
  --surface-pressed: #DCE3EB;
  --surface-selected: #E1F0FF;

  --viewer-bg: #07090C;

  --stroke-soft: rgba(15,23,34,.065);
  --stroke-default: rgba(15,23,34,.11);
  --stroke-strong: rgba(15,23,34,.19);
  --stroke-highlight: rgba(15,23,34,.28);

  --text-primary: #171C24;
  --text-secondary: #4C5664;
  --text-tertiary: #778291;
  --text-disabled: #A6AFBA;

  --accent: #006BDC;
  --accent-hover: #0A78EC;
  --accent-pressed: #0058B7;
  --accent-soft: rgba(0,107,220,.12);
  --accent-strong: #004E9F;
  --accent-foreground: #FFFFFF;

  --success: #147A52;
  --warning: #9B6500;
  --danger: #C93545;
  --info: #006BDC;

  --material-glass: rgba(248,250,252,.74);
  --material-glass-strong: rgba(248,250,252,.9);
  --material-glass-stroke: rgba(255,255,255,.72);
}
```

## 6.3 Intelligence Signal

AI 不拥有另一套完整主题，但允许一个极低频的“Intelligence Signal”。

```css
--intelligence-a: #7F8CFF;
--intelligence-b: #55D7C4;
```

只能用于：

- AI command icon accent；
- generating indicator；
- candidate edge / thin highlight；
- Ask / Suggest 的来源识别。

不得用于：

- 大面积 panel background；
- 正式 AnalysisRecord；
- Shot 类型；
- Timeline 普通轨道；
- 所有 AI 文本。

Candidate 的主要状态仍通过 label + icon + state token 表达。

## 6.4 Status Mapping

```text
Confirmed       success
Candidate       accent + candidate label
Stale           warning
Evidence Needed warning
Conflict        danger
Save Error      danger
Saving          info
Disabled        neutral
Current         accent
Playing         accent + motion/current-position cue
```

颜色永远不是唯一状态信号。Accent-filled control 必须使用主题专用的 `--accent-foreground`，不能假设所有 accent background 都安全承载白字。当前 V2 对比度基线：Dark `#63B3FF` + `#07111A` ≈ 8.53:1；Light `#006BDC` + `#FFFFFF` ≈ 5.08:1。

---

# 7. Token Architecture

Token 单向分四层：

```text
Primitive
  ↓
Semantic
  ↓
Component
  ↓
State / Mode Override
```

## 7.1 Primitive

只在中央 token 文件使用：

```text
graphite-*
frost-*
signal-blue-*
green-*
amber-*
red-*
intelligence-*
```

Feature 不得直接消费 primitive。

## 7.2 Semantic

跨 Workspace 公共 token：

```text
window
workspace
panel
surface
stroke
text
accent
status
material
shadow
focus
motion
geometry
```

## 7.3 Component

仅当 semantic 不足时创建：

```text
timeline-*
viewer-*
shot-card-*
inspector-*
toolbar-*
transport-*
table-*
```

禁止页面私有 token namespace。

## 7.4 Framework Adapter

Tailwind / shadcn token 不是 Source of Truth。

```text
--background
--foreground
--card
--popover
--primary
--secondary
--muted
--destructive
--input
--ring
```

必须指向 AisenLens semantic tokens。

---

# 8. Typography

仓库已有 Geist，因此 V2 不新增字体依赖。

```css
--font-ui:
  "Geist",
  "PingFang SC",
  "Microsoft YaHei",
  "Noto Sans CJK SC",
  system-ui,
  sans-serif;

--font-mono:
  ui-monospace,
  SFMono-Regular,
  Menlo,
  Consolas,
  monospace;
```

不再使用 `Arial Narrow` 作为 display identity。

Typography roles：

| Role | Size / Line | Weight |
|---|---:|---:|
| Window / Workspace Title | 16 / 22 | 600 |
| Panel Title | 13 / 18 | 600 |
| Control | 13 / 18 | 500 |
| Body | 13 / 19 | 400–450 |
| Data / Metadata | 12 / 17 | 450 |
| Caption | 11 / 15 | 450 |
| Micro / Timecode | 10–11 / 14 | 500 |
| Mono Data | 12 / 16 | 450 |

原则：

- 桌面软件通过层级、对齐和 weight 建结构，不靠巨大标题；
- Data / Timeline / Inspector 可以高密度，但不得降到不可读；
- Timecode、frame、technical identifier 使用 mono；
- 重要数值使用 tabular numerals。

---

# 9. Spacing & Geometry

V2 使用 **2px precision grid**，不是旧 4px base grid。

```css
--space-1: 2px;
--space-2: 4px;
--space-3: 6px;
--space-4: 8px;
--space-5: 10px;
--space-6: 12px;
--space-8: 16px;
--space-10: 20px;
--space-12: 24px;
--space-16: 32px;
--space-20: 40px;
```

常见：

```text
Icon ↔ Label        6px
Control gap         4–8px
Toolbar group gap   8–12px
Panel padding       8–12px
Inspector section   12–16px
Major region gap    1px seam / 8px floating gap
```

---

# 10. Radius & Concentric Geometry

圆角用于触感和层级，不作为“友好 SaaS”装饰。

```css
--radius-control: 6px;
--radius-input: 7px;
--radius-surface: 8px;
--radius-panel: 10px;
--radius-float: 12px;
--radius-modal: 14px;
--radius-pill: 999px;
```

嵌套浮层应保持近似 concentric geometry：

```text
outer radius ≈ inner radius + padding
```

例如 12px floating group 内的 6px button。

---

# 11. Hairlines & Separators

桌面工作台使用 precision hairline。

```css
--hairline: 1px;
```

用途：

- panel seam；
- table header；
- timeline track；
- inspector group；
- resize boundary；
- selected edge。

避免用粗 border 当主要层级工具。

在高 DPI 屏上可以通过 alpha 而非物理 0.5px 保证一致性。

---

# 12. Shadow & Elevation

V2 允许明确的 floating depth，但只用于真正浮层。

```css
--shadow-float:
  0 16px 44px rgba(0,0,0,.28),
  0 2px 8px rgba(0,0,0,.22);

--shadow-popover:
  0 12px 32px rgba(0,0,0,.24),
  0 1px 4px rgba(0,0,0,.18);

--shadow-modal:
  0 28px 80px rgba(0,0,0,.36);
```

常规 Panel / Table / Timeline 不使用大 shadow。

---

# 13. Window & Panel Geometry

## 13.1 Global Window Bar

默认高度：

```text
44px
```

承载：

- project/back；
- project name；
- save/sync state；
- command/search；
- global settings；
- window-level utilities。

不要把 feature toolbar 塞进 Global Window Bar。

## 13.2 Workspace Rail

目标宽度：

```text
56px compact
176px expanded
```

只承担：

- Preparation；
- Analysis；
- Results；
- Project Settings。

支持 compact / expanded。

## 13.3 Navigation / Structure Panel

默认：

```text
240px
min 180px
max 360px
```

可 resize / collapse。

## 13.4 Inspector

默认：

```text
320px
min 280px
max 480px
```

可 resize / collapse / overlay。

## 13.5 Timeline / Context Panel

默认高度按 Workspace 决定，但用户可 resize。

推荐：

```text
collapsed  32–36px
compact    112px
default    168px
expanded   260–360px
```

布局状态持久化。

---

# 14. Resize Behavior

Resize handle：

```text
visible seam: 1px
interactive hit zone: 6px
```

hover 时：

- cursor 立即变更；
- seam 使用 accent-soft；
- 不改变 panel 内容布局直到 drag 开始。

drag 时：

- pointer capture；
- rAF 更新；
- 不触发昂贵业务 query；
- release 后再执行需要的持久化；
- double-click 可恢复默认尺寸（适用时）。

---

# 15. Interaction State Model

共享状态：

```text
rest
hover
pressed
focus-visible
selected
disabled
loading
error
dragging
drop-target
```

领域状态附加：

```text
confirmed
candidate
stale
conflict
needs-evidence
playing
current
```

## Hover

- 80–100ms；
- 只改变 luminance / stroke / icon opacity；
- 不改变布局尺寸；
- 可 reveal quick actions。

## Pressed

- 立即；
- 允许 `scale(.985)` 的小型 floating/control feedback；
- 不用于大型 panel；
- pointer up / cancel 必须恢复。

## Selected

Selected 表示对象成为当前工作上下文。

必须：

- 比 Hover 更强；
- 跨 panel 一致；
- 不覆盖 keyboard focus；
- 可驱动 Viewer / Inspector / Timeline。

## Focus

Focus-visible 独立于 Selected。

```css
--focus-ring-color: var(--accent);
--focus-ring-width: 2px;
--focus-ring-offset: 1px;
```

---

# 16. Motion System

动效目标：

> **让 UI 感觉有惯性、有来源、有连续性，但永远不拖慢专业操作。**

## 16.1 Motion Tokens

```css
--motion-instant: 60ms;
--motion-hover: 90ms;
--motion-control: 120ms;
--motion-reveal: 160ms;
--motion-panel: 220ms;
--motion-workspace: 280ms;

--ease-standard: cubic-bezier(.2,.8,.2,1);
--ease-out-spring: cubic-bezier(.16,1,.3,1);
--ease-in: cubic-bezier(.4,0,1,1);
```

## 16.2 Rules

- 禁止全局 `transition: all`；
- 高频 hover / scrub / selection 不超过 120ms；
- panel open/close 约 180–240ms；
- workspace geometry transition 最长约 280ms；
- animate `transform / opacity` 优先；
- width/height 动画只用于 bounded panel geometry；
- source-anchored popover 使用触发点作为 transform-origin；
- async result 到达时避免大面积 layout shift；
- drag 路径不加装饰性 easing。

## 16.3 Reduced Motion

`prefers-reduced-motion: reduce`：

- decorative transform 禁用；
- panel / popover 接近即时；
- selection/current state 仍清楚；
- playback/time 本身不被破坏。

---

# 17. Direct Manipulation Contract

所有直接操纵组件遵守：

1. pointerdown 立即进入可预测状态；
2. drag threshold 区分 click；
3. drag 中持续显示 target / delta / preview；
4. invalid target 立即反馈；
5. pointercancel 可安全恢复；
6. commit 与 visual preview 分离；
7. save failure 不假装成功；
8. Undo/Redo 入口保持可发现。

Timeline / Boundary / Resize / Reorder 禁止依赖“鼠标松开后突然跳到结果”的无预览交互。

---

# 18. Cursor Language

使用标准桌面 cursor 语义：

```text
default
pointer
text
grab / grabbing
col-resize
row-resize
ew-resize
crosshair
not-allowed
```

不要为普通 UI 制作装饰性 custom cursor。

---

# 19. Button & Control System

## 19.1 Heights

```text
Compact   24px
Default   28px
Comfort   32px
Primary   34–36px
```

专业工作台默认使用 28px。

## 19.2 Button Types

```text
Accent
Neutral
Ghost
Icon
Danger
Toolbar
Segmented
```

Primary/Accent 不应出现在每个 section。

## 19.3 Icon Button

默认：

```text
28 × 28
icon 14–16
radius 6
```

Toolbar 中可以 26–28px。

## 19.4 Inputs

默认高度：

```text
28px
```

Editing 状态才提升视觉重量。

---

# 20. Toolbar

Toolbar 是“当前工作表面的操作层”。

原则：

- 高频动作可见；
- 低频动作进入 More / Context Menu；
- 功能按组排列；
- group 可使用 Studio Glass；
- selected tool 有清晰 pressed/selected state；
- shortcut 可在 tooltip 显示；
- toolbar 不因不同对象频繁整体重排。

---

# 21. Context Menu

右键是一级专业交互，不是补充功能。

Context Menu：

- 出现在 pointer source 附近；
- 根据 selection/context 动态变化；
- 最常用动作在上；
- destructive group 放底部；
- shortcut 右对齐；
- disabled command 保留位置并可解释原因；
- 支持 keyboard invocation。

---

# 22. Command Palette

`⌘K / Ctrl+K`：

- 搜索 command；
- 搜索 navigation target；
- 打开 Workspace / View；
- 执行对象级动作（有 context 时）；
- 展示 shortcut；
- 不复制整个产品的设置页面。

打开目标：

```text
< 100ms perceived response
```

---

# 23. Sidebars / Panels

Panel 是持续工作区域，不是 Card。

Panel Header：

- 32–36px；
- title 左对齐；
- context action 右侧；
- sticky；
- resize/collapse affordance 一致。

Panel body：

- 可独立 scroll；
- selection 保持；
- reopen 时恢复 scroll/selection（有意义时）。

Panel collapse 后保留可恢复入口，不让用户猜如何找回。

---

# 24. Viewer

Viewer 是精确操作表面。

必须：

- 永远深色；
- controls 可淡出但可快速召回；
- transport 位置稳定；
- zoom/pan/scrub 直接；
- selected/current/playback 状态清楚；
- overlay 不修改源媒体；
- hover controls 不遮挡关键区域太久。

Transport 可以使用 Studio Glass floating group。

---

# 25. Timeline

Timeline 是桌面应用“原生感”的核心。

视觉：

- track row 高度规则稳定；
- playhead 高对比；
- selection 与 playback 不混淆；
- boundary hit area 大于可见 line；
- hover 立即显示可操作 affordance；
- zoom level 改变信息密度而不是缩放整个 DOM。

交互：

- wheel / trackpad zoom 策略一致；
- drag 有 live preview；
- snapping 明确；
- context menu；
- keyboard navigation；
- playhead 与 selection 独立；
- large project virtualize / window。

---

# 26. Inspector

Inspector 是 properties + analysis + evidence 的工作面板。

特点：

- dense；
- section 可 collapse；
- reading mode 与 editing mode 明确；
- selection change 不闪烁整 panel；
- field autosave 局部显示；
- technical metadata 使用次级层级；
- candidate/stale/conflict 有一致 state row。

Inspector 不能退化成巨大网页 Form。

---

# 27. Data Table

Results Data View 使用真正的 desktop data grid 语义：

- sticky header；
- row selection；
- column resize；
- column reorder；
- keyboard navigation；
- contextual actions；
- inline edit（只有 Authority 允许时）；
- virtualized rows；
- horizontal scroll；
- row density preference。

不要把 table 数据拆成 Card 列表来“响应式”。

---

# 28. Shot Grid / Media Grid

Grid 支持：

- card size；
- aspect ratio；
- metadata visibility；
- multi-select；
- range select；
- keyboard move；
- hover scrub（有能力时）；
- quick action；
- drag reorder / grouping（有业务语义时）。

Selection 使用统一 Signal Blue，而不是 feature 私有色。

---

# 29. AI Interaction Material

AI 是工具能力，不是另一个 Workspace。

AI interaction 允许：

- Intelligence icon；
- subtle two-tone edge；
- generating pulse；
- source label；
- candidate badge。

不允许：

- AI 页面拥有完全不同 theme；
- 大面积渐变背景；
- “AI 魔法”动画阻塞编辑；
- Candidate 看起来像已确认数据。

AI generating 动画必须可取消，且不阻塞其他工作。

---

# 30. Loading & Background Work

桌面软件体验原则：

> **后台工作不应该把整个软件锁住。**

优先：

- local spinner；
- row progress；
- task shelf；
- status indicator；
- progressive result。

避免：

- 全屏 loading；
- 整页 skeleton；
- blocking modal 等待 detector/export/AI。

有真实百分比才显示百分比。

---

# 31. Save & Sync Feedback

Save state：

```text
dirty
saving
saved
error
conflict
```

显示位置稳定，不 toast-spam。

Saved 可以安静；
Error / Conflict 必须可行动。

---

# 32. Empty State

Empty state 像桌面工具的空工作区：

- 明确当前对象为空；
- 1 个主要行动；
- 必要 shortcut / drop target；
- 不做大型营销插画。

---

# 33. Notifications

Toast 只用于短暂结果。

持续任务使用：

- status bar；
- task panel；
- inline progress。

Error 需要用户处理时不能只靠 3 秒 toast。

---

# 34. View Preference Ownership

View Preference 不进入 Project canonical domain data。

| Preference / state | Ownership | Persistence |
|---|---|---|
| Theme | user UI | persistent client |
| Workspace rail compact/expanded | user UI | persistent client |
| Panel width | workspace + user | persistent client |
| Panel visibility | workspace + user | persistent client |
| Timeline height | workspace + user | persistent client |
| Grid/List | workspace view + user | persistent client |
| Density | workspace view + user | persistent client |
| Thumbnail size / ratio | media view + user | persistent client |
| Visible metadata / columns | view + user | persistent client |
| Last view/mode | workspace + user | persistent client |
| Selected entity | application/navigation | URL/session where appropriate |
| ResearchScope | application/navigation | URL/session |
| Playback position | transient workspace | session by default |
| Timeline viewport | transient view | session by default |
| ExportPreset | Results domain contract | not generic UI preference |

如果当前没有统一 preference service，Phase 04 建立版本化 client preference namespace；不得新建 domain canonical store。

---

# 35. Workspace Layout Memory

每个 Workspace 记住自己的布局。

例如：

```text
Analysis
  navWidth
  inspectorWidth
  timelineHeight
  inspectorOpen
  density
  viewMode
```

切换 Preparation → Analysis → Results → Analysis 后，应恢复 Analysis 的布局，而不是回到默认值。

提供“Reset Workspace Layout”。

---

# 36. Density

Density 是 UI geometry 维度，不是页面。

```text
Comfort
Standard
Compact
```

### Comfort
- 32px row；
- 更多间距；
- 更适合浏览/Review。

### Standard
- 28px row；
- 默认专业编辑。

### Compact
- 24px row；
- Data / Timeline / 大项目。

用户可按 Workspace 记忆。

---

# 37. Workspace View / Mode

Mode 代表 Panel Configuration，不代表新的一级页面。

初始目标：

| Workspace | Modes |
|---|---|
| Preparation | Import / Detection / Boundary Review |
| Analysis | Watch / Shots / Analyze |
| Results | Data / Export / Creative |

未来可增加 Compare / Storyboard 等，但必须有真实任务再新增。

---

# 38. Responsive Desktop Matrix

AisenLens 是 desktop-first。

## ≥ 1440 — Pro Layout

- Workspace Rail；
- Navigation；
- Primary；
- Inspector；
- Timeline；
- 可同时存在；
- resize 完整开放。

## 1180–1439 — Compact Desktop

- 保证 Primary；
- Navigation / Inspector 至少一侧允许 collapse；
- Toolbar 收拢低频动作；
- Timeline 可 compact。

## 960–1179 — Focus Desktop

- 同时只保留一个 secondary panel；
- 另一 Panel 以 overlay/drawer 打开；
- Workspace Rail 默认 compact；
- 主编辑仍可完成。

## < 960 — Review / Survival Layout

不承诺完整专业编辑等价。

优先：

- Viewer；
- basic navigation；
- review / comments / light field work；
- 单 Panel overlay。

复杂 Timeline boundary editing / dense Data Table 可以限制或提示使用更宽窗口。

---

# 39. Scroll Behavior

- Panel 独立 scroll；
- Header 可 sticky；
- Horizontal scroll 只在 Timeline / Data Grid 等真实需要处存在；
- trackpad gesture 不被无意义拦截；
- programmatic scroll 必须可取消；
- selection reveal 使用短、受控 motion；
- 不使用长 smooth-scroll 穿越大量内容。

---

# 40. Keyboard System

基础：

```text
Space        Play / Pause
← / →        Frame / timeline navigation
↑ / ↓        Previous / Next item
Enter        Open / Edit / Confirm contextually
Esc          Exit edit / close top overlay
M            Marker
S            Split where legal
F            Fullscreen / focus viewer
I            Toggle Inspector
⌘K / Ctrl+K Command Palette
⌘Z / Ctrl+Z Undo
⇧⌘Z / Ctrl+Shift+Z Redo
```

规则：

- 不抢系统标准快捷键；
- 文本输入时暂停冲突 command；
- shortcut 通过 Tooltip/Menu/Command Palette 可发现；
- keyboard focus 与 selection 分开。

---

# 41. Accessibility

最低：

- WCAG AA；
- focus-visible 清晰；
- 状态不只靠颜色；
- keyboard-only 可完成核心路径；
- overlay trap / restore 正确；
- accessible name；
- icon-only button 必须有 label/tooltip；
- reduced-motion；
- high zoom 下不截断关键操作。

专业高密度不等于牺牲可访问性。

---

# 42. Performance Experience Budget

这些不是跨设备硬 FPS SLA，而是实施 gate：

## Pointer / Hover

- hover state 应在下一可用 frame 可见；
- 禁止 hover 触发网络/重 query；
- 禁止 hover 导致 layout reflow。

## Drag / Resize / Scrub

- 交互更新使用 rAF / compositor-friendly 路径；
- drag 中避免 canonical persistence；
- commit 在 interaction end；
- expensive derived work 可延迟。

## Large Lists

- 大量 Shot / Result / Timeline item 必须 window/virtualize；
- 不因为 selected item 改变而重建整个列表。

## Blur / Glass

- 大面积 work surface 禁止 backdrop blur；
- 同屏高成本 glass layer 数量要受控；
- slow device / unsupported browser 有 solid fallback。

## Motion

- 不使用 heavy filter animation；
- 不对 box-shadow 做持续动画；
- 主要使用 opacity/transform。

---

# 43. Overlay Layer Tokens

```css
--z-base: 0;
--z-sticky: 10;
--z-floating: 20;
--z-dropdown: 30;
--z-popover: 40;
--z-drawer: 50;
--z-modal: 60;
--z-toast: 70;
--z-command: 80;
--z-tooltip: 90;
```

禁止 feature arbitrary `z-[9999]`。

Portal / focus ownership 统一由 shared overlay system 管理。

---

# 44. Current Repository Migration

当前 `apps/webapp/src/index.css` 是旧实现，不是目标。

已确认旧实现包含：

- `--app-*` palette；
- blue `#3b82f6` accent；
- 独立 `--ai` purple；
- `--timeline-shot-*` 自有 palette；
- hard-coded focus blue；
- `Arial Narrow` display；
- raw z-index；
- legacy responsive panel shadow；
- `transition-all` 等旧 component style。

Phase 04 必须迁移，而不是继续扩展。

## 44.1 Migration Mapping

| Legacy | Native Studio target |
|---|---|
| `--app-bg` | `--window-bg / --workspace-bg` |
| `--app-bg-nav` | `--panel-bg` |
| `--app-bg-panel` | `--panel-bg / --surface-1` |
| `--app-bg-card` | `--surface-1` |
| `--app-bg-hover` | `--surface-hover` |
| `--app-selected-bg` | `--surface-selected / --accent-soft` |
| `--app-text-*` | `--text-*` |
| `--app-border*` | `--stroke-*` |
| `--app-accent` | `--accent` |
| `--viewer-bg` | `--viewer-bg` V2 value |
| `--playhead` | Timeline current-position component token |
| `--waveform` | Timeline neutral component token |
| `--ai` | `--intelligence-a/b` limited signal |
| `--timeline-shot-*` | semantic-backed Timeline component tokens |
| shadcn semantic vars | adapter to Native Studio semantic vars |

短期 alias 只能集中存在于中央样式入口，并必须有删除条件。

没有正式用户需要视觉向后兼容，因此不建立长期 legacy theme。

---

# 45. CSS / Component Enforcement

Phase 04 以后：

- 不新增无理由 raw hex / rgb / hsl / oklch；
- 不新增 feature 私有 palette；
- 不新增 feature 私有 radius scale；
- 不新增 feature 私有 shadow system；
- 不新增 arbitrary z-index；
- 不新增 `transition-all`；
- 不让 Tailwind/shadcn 成为第二套设计语义；
- 不把 View Preference 写进 canonical domain；
- 不复制 Button/Input/Menu/Popover/Inspector primitives；
- 不新增“页面级视觉主题”。

例外：

- 媒体本身；
- 用户选择的标注/导出颜色；
- 可视化数据本身；
- 第三方嵌入内容；
- 特殊技术色值（必须局部且有明确语义）。

---

# 46. Visual Regression Matrix

不强制引入第三方视觉回归平台，但真实浏览器 evidence 是硬门。

## Phase 04

至少保存：

- Dark Pro Layout；
- Light Pro Layout；
- Compact Desktop；
- Focus Desktop；
- Studio Glass toolbar/popover；
- Panel resize；
- hover / pressed / selected / focus；
- modal / popover / context menu；
- reduced-motion；
- layout memory restore。

## Phase 05

- Boundary Review；
- drag/move boundary；
- Inspector open/collapsed；
- save/error；
- keyboard confirm。

## Phase 06

- Analysis Watch；
- Shots；
- Analyze；
- Selected ≠ Playing；
- Evidence；
- Data Review；
- AI Review；
- Correction return。

## Phase 07

- Timeline zoom levels；
- drag；
- playhead；
- selection；
- dense tracks；
- context menu。

## Phase 08

- Data table；
- column resize；
- Export；
- Creative；
- empty/error/loading。

动态媒体帧不要求脆弱的逐像素一致；重点检查 geometry、token、state、focus、overflow、layer、density、motion continuity。

---

# 47. Phase Responsibility

## Phase 04

冻结并实现：

- Native Studio token；
- global chrome；
- shared panel；
- resize/collapse；
- Studio Glass primitives；
- Button/Input/Menu/Popover/Overlay；
- motion；
- preference service；
- layout memory；
- keyboard/focus；
- static visual-token gate。

## Phase 05–08

只消费 Design System。

如果需要新增全局视觉语义：

1. 先判断是否可由现有 semantic/component token 表达；
2. 不能表达才修改本文件；
3. 不得在 feature 内偷偷创建第二套。

## Phase 09

AI 只扩展 Intelligence Signal，不重做视觉主题。

## Phase 10

做 performance / accessibility / visual regression hardening。

## Phase 11

清除 legacy token、临时 adapter、无 owner visual exception。

---

# 48. Native Studio Acceptance

AisenLens 的 UI 只有同时满足下面这些条件，才算达到目标：

1. 浏览器中看起来和操作起来像持续存在的桌面工作台；
2. Panel geometry 可控、可记忆、可恢复；
3. pointer / keyboard 都高效；
4. Selection、Playback、Focus、Research Context 不混乱；
5. drag / scrub / resize 连续；
6. overlay 从来源出现并恢复 focus；
7. loading/save/background task 不冻结主工作面；
8. 大项目仍保持可操作；
9. 颜色、材质、动效和深度属于同一系统；
10. 用户不需要因为切换任务反复“进入新页面”。

---

# 49. One Sentence Design Principle

> **AisenLens 应该像一款装进浏览器的专业桌面创作软件：精确、连续、可塑、即时，而且每一次操作都有自然的空间与触感反馈。**
