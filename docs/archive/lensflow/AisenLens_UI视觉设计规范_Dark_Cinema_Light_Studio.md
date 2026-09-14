# AisenLens UI 视觉设计规范

> 目标：建立一套适用于专业拉片与影视分析工具的双主题视觉系统。  
> 核心方向：
>
> - **Dark Theme = Cinema Mode**
> - **Light Theme = Studio Mode**
>
> 两套主题共享相同的信息架构与交互逻辑，但拥有不同的视觉人格。

---

# 1. 总体设计定位

AisenLens 不应该呈现为典型的 AI SaaS 产品。

不建议使用：

- 大面积紫蓝渐变
- 玻璃拟态堆叠
- 发光边框
- 大量 Sparkle 图标
- 过度卡片化
- AI Chat 作为主要界面
- 夸张动效

更适合的方向是：

> **专业影视工作站 + 科学分析仪器 + 极轻的 AI 感**

整体视觉关键词：

```text
Cinematic
Precise
Calm
Dense
Evidence-driven
Tool-like
```

中文：

> 影视感、精确、冷静、高信息密度、证据感、工具感。

---

# 2. 参考产品气质

建议吸收以下几类软件的优点。

## 2.1 DaVinci Resolve / Final Cut Pro

学习：

- 视频 Viewer 是视觉中心
- Timeline 高信息密度
- Inspector 与 Viewer 明确分区
- 专业工具的紧凑布局
- 长时间工作时 UI 不抢内容

避免：

- 菜单过深
- 功能密度过高
- 新用户认知门槛过高

---

## 2.2 Figma

学习：

- 左右面板职责明确
- Inspector 信息层级清晰
- Active / Hover / Selected 状态精确
- 面板可折叠、可调整
- 控件紧凑

---

## 2.3 Linear

学习：

- 克制的深色与浅色主题
- 高信息密度
- 少装饰
- Typography 稳定
- 小面积 Accent

---

# 3. 双主题人格

---

# 3.1 Dark Theme — Cinema Mode

定位：

> **像一间专业调色室。**

适合：

- 长时间看片
- Shot Analysis
- Video Viewer
- Scene 深拆
- Timeline 精细操作

视觉关键词：

```text
Cinematic
Focused
Immersive
Dark
```

设计目标：

> 让 UI 消失，让视频和时间关系出现。

---

# 3.2 Light Theme — Studio Mode

定位：

> **像运行在 macOS 上的专业剪辑工作站。**

适合：

- Film Overview
- Structure
- Scene Board
- 数据整理
- Pattern
- Notes
- 项目管理

视觉关键词：

```text
Clean
Professional
Precise
Utility
```

设计目标：

> 让结构出现，让 UI 像仪器。

---

# 4. Dark Theme 视觉方向

当前 AisenLens 已经采用深色中性色 + 单一蓝色 Accent，这一方向应继续保留。

推荐 Surface 层级：

```text
App Background       #080808
Navigation           #0A0A0A
Panel                #0D0D0D
Card / Inspector     #111111
Input                rgba(255,255,255,.04)
Hover                rgba(255,255,255,.04~.06)
```

设计原则：

> Surface hierarchy > Border hierarchy

即：

尽量用背景明度差建立层级，而不是每块区域都加边框。

---

# 5. Light Theme 视觉方向

Light Theme 不应该简单把 Dark Theme 反色。

不建议：

```text
Pure White Background
+
White Cards
+
Heavy Shadow
```

这种效果很容易变成普通 SaaS。

推荐方向：

> **macOS Professional Utility**

主要使用冷中性浅灰，而不是暖米白。

---

# 6. Light Theme 色彩体系

推荐基础 Token：

```css
--app-bg: #F1F1F1;

--app-bg-nav: #E9E9E9;

--app-bg-panel: #F5F5F5;

--app-bg-deep: #E3E3E3;

--app-bg-card: #FFFFFF;

--app-bg-input: #FFFFFF;
```

文字：

```css
--app-text-base: #1D1D1F;

--app-text-dim: #4D4D4F;

--app-text-muted: #747477;

--app-text-faint: #A8A8AA;
```

边界：

```css
--app-border: #D6D6D6;

--app-border-mid: #C5C5C5;
```

主色：

```css
--accent: #1677E8;
```

选中背景：

```css
--selected-bg: #E3F0FF;
```

Hover：

```css
--hover-bg: rgba(0,0,0,.035);
```

---

# 7. Semantic Colors

颜色必须承担明确语义，而不是装饰。

| 语义 | 推荐颜色 |
|---|---|
| Current / Selected | Blue |
| Confirmed / Valid | Green |
| Needs Review | Amber |
| Error / Destructive | Red |
| Interpretation / AI | Purple |
| User Note | Neutral |
| Scene / Structure | Low-saturation Violet |

推荐：

```css
--success: #34A853;

--warning: #C98A00;

--danger: #D9363E;

--ai: #7657C8;
```

---

# 8. Accent 使用原则

主蓝色只承担：

```text
Current
Selected
Focused
Primary Action
```

例如：

- Active Shot
- Active Scene
- Workflow 当前步骤
- Focus Ring
- Primary CTA
- Selection

不要用于：

- 所有标题
- 所有 Icon
- 所有按钮
- 大面积背景
- AI 内容

否则 Accent 会失去意义。

---

# 9. Selection Style

白色主题尤其推荐 macOS 风格 Selection。

例如 Shot List：

```text
Shot 037
```

使用：

```text
浅蓝背景
+
左侧 2px 蓝线
```

而不是整块高饱和蓝色。

例如：

```css
background: #E3F0FF;
border-left: 2px solid #1677E8;
```

---

# 10. Fact / Interpretation / User Note 的视觉语法

这是 AisenLens 应该重点建立的视觉语言之一。

---

## 10.1 FACT

视觉：

- Neutral
- 白 / 灰
- 无特殊图标
- 高可读性

示例：

```text
FACT

景别         中景
运动         推镜
时长         3.24 s
```

---

## 10.2 AI INTERPRETATION

视觉：

- 小面积紫色
- Sparkle 只做来源标识
- 不用紫色大 Card

示例：

```text
✦ INTERPRETATION

人物从防御状态转向接受……
```

可以附加：

```text
AI generated
Confidence
Source
```

---

## 10.3 MY NOTE

视觉：

- Neutral
- 编辑态明显
- 可以用细竖线区分

示例：

```text
MY NOTE

这里的关键不是情绪强调，
而是人物第一次停止回避。
```

---

# 11. Viewer

无论 Light / Dark Theme：

> **Video Viewer 都建议保持深色。**

Light Theme 推荐：

```text
Light App Chrome
+
Dark Video Viewer
```

原因：

- 视频视觉更稳定
- 不受界面亮度影响
- 更符合专业剪辑软件习惯

Viewer 背景：

```text
#050505
```

或：

```text
#0A0A0A
```

---

# 12. Viewer 工具位置

Viewer Tool 不应该占据一级导航。

例如：

```text
Viewer Tools ▾

Rule of Thirds
Safe Area
Golden Ratio
Composition Drawing
Content Overlay
Zoom
Fit
Fullscreen
```

建议放在 Viewer 右上角或播放控制区。

---

# 13. Light Theme 布局结构

推荐 macOS Split View 风格：

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Toolbar                                                             │
├────────────┬─────────────────────────────────────┬──────────────────┤
│ Sidebar    │                                     │ Inspector        │
│            │                                     │                  │
│            │              Viewer                 │                  │
│            │                                     │                  │
│            ├─────────────────────────────────────┤                  │
│            │ Timeline                            │                  │
└────────────┴─────────────────────────────────────┴──────────────────┘
```

主要靠：

- Surface Difference
- 1px Divider

区分区域。

不要依赖：

- 大圆角
- 卡片
- Shadow

---

# 14. Sidebar

Sidebar 推荐宽度：

```text
152–176px
```

导航：

```text
PROJECT

Prepare
Calibrate

OVERVIEW

Film Map
Structure

ANALYZE

Scenes
Shots
Sound

LEARN

Patterns
```

选中状态：

```text
浅蓝背景
+
小圆角
```

或者：

```text
左侧 2px 蓝线
```

不需要每一项都有大 Icon。

原则：

> 操作需要 Icon，概念不一定需要 Icon。

---

# 15. Toolbar

白色主题顶部应该像 macOS Toolbar，而不是 Web Button Row。

推荐：

```text
←   Parasite

              ↶  ↷     Search     Share     Export
```

大多数操作：

- Icon
- Icon + Label
- Hover 才出现背景

只有真正主操作：

```text
Export
```

可以使用强调按钮。

保存状态：

```text
Saved
Saving…
Unsaved
```

作为状态，而不是永远展示一个大型 Save Button。

---

# 16. Inspector

Inspector 是整个专业感最重要的区域之一。

推荐布局：

```text
SHOT 037
3.37 s

Evidence
────────────────────
[ frame ][ frame ][ frame ]

Properties
────────────────────
Shot Size             MCU
Movement               Push
Color                  Neutral
Sound                  Sync

Interpretation
────────────────────
Turning Point

Notes
────────────────────
……
```

原则：

> Section + Divider + Content

而不是：

> Card + Card + Card

---

# 17. View Mode / Edit Mode

右侧 Inspector 默认不应该像表单。

推荐默认：

```text
景别                     中景
运动                     推镜
```

用户点击 Value 后进入 Edit：

```text
景别
[ 中景 ▼ ]
```

也就是：

```text
View First
Edit On Demand
```

这样：

- 信息密度更高
- 更像专业软件
- 更少表单感

---

# 18. Typography

继续使用 Geist 是合适的。

建议：

```text
UI Font     Geist

Numeric /
Timecode    Mono
```

推荐字号：

```text
Window Title      13–14px / Semibold

Section Title     11–12px / Semibold

Body              12–13px

Meta              11px

Timecode          11px / Mono
```

避免在 Workspace 中大量使用：

- 超大字号
- 超粗字
- 全大写
- 超窄 Display Font

Marketing 页面可以更有品牌感。

Workspace 要安静。

---

# 19. Mono 字体的使用范围

只用于：

```text
00:14:32:08

SHOT 037

3.24s

24fps

Score .813

Threshold .760
```

原则：

> 时间、镜号、帧、数值 → Mono

其他正文仍然使用 Geist。

---

# 20. Roundness

专业工作区不要使用过大的圆角。

推荐：

```text
Main Panel       0–4px

Control          5–6px

Button           6px

Popover          8px

Modal            10–12px
```

Marketing 页面可以：

```text
12–16px
```

但 Workspace 不建议大量：

```text
rounded-xl
rounded-2xl
```

---

# 21. Shadow

Workspace 中基本不用 Shadow。

Shadow 只用于：

- Modal
- Popover
- Dropdown
- Drawer
- Floating Inspector

其他区域用：

```text
Surface
+
Divider
```

建立层级。

---

# 22. Card 使用原则

避免：

```text
Evidence Card
Facts Card
Interpretation Card
Learning Card
```

更推荐：

```text
EVIDENCE
────────────────
...


FACTS
────────────────
...


INTERPRETATION
────────────────
...


LEARNING
────────────────
...
```

专业软件更像：

> Panel

而不是：

> Dashboard。

---

# 23. Segmented Control

白色主题可以大量使用 macOS 风格 Segmented Control。

适合：

```text
Grid | Timeline

Scenes | Shots | Sound

Shot | Scene | Transcript
```

推荐视觉：

```text
Background      #E1E1E1

Selected        #FFFFFF

Shadow          0 1px 2px rgba(0,0,0,.12)
```

---

# 24. Checkbox 与 Toggle

保持紧凑。

例如：

```text
☑ Safe Area
☑ Grid
☐ Content Overlay
```

Switch 只用于真正的 On / Off 状态。

不要大量使用大型 SaaS Toggle。

---

# 25. Timeline 是品牌界面

AisenLens 最有机会形成视觉辨识度的地方不是 Logo，而是 Timeline。

推荐结构：

```text
SEQUENCE  ━━━━━━━━━━━━━━━

SCENE       ━━━━━  ━━━━━━━

SHOTS     | | || | | | ||

AUDIO     ▁▂▃▄██▅▃▂

MARKERS       ◆     ●
```

Timeline 应该形成固定视觉语法：

- Scene：低饱和
- Shot：边界精确
- Active Shot：蓝色
- Selected Scene：淡色 Fill
- Playhead：明显
- Waveform：不抢视觉
- Marker：小而精确

---

# 26. Light Theme Timeline Tokens

建议：

```css
--timeline-bg: #E8E8E8;

--timeline-shot: #D6DEE8;

--timeline-shot-hover: #C8D8E9;

--timeline-shot-active: #2D78DF;

--timeline-shot-played: #B9D0ED;

--timeline-scene: #DDD8E8;

--timeline-waveform: #5E6B72;

--playhead: #E43C3C;
```

---

# 27. Playhead 颜色

推荐：

```text
Selection = Blue

Playhead = Red
```

这样符合很多专业视频工具的视觉心智。

蓝色：

```text
我选中了什么
```

红色：

```text
我现在播放到哪里
```

两种状态不会混淆。

---

# 28. Calibrate 页面风格

Calibrate 可以比其他页面更有“工程仪器感”。

例如：

```text
BOUNDARY 018

Hard Cut

Score       .813
Threshold   .760
Margin      +.053

Detector

ColorDiff   .82
Edge        .61
Motion      .37
```

配：

```text
BEFORE                    AFTER

[frame]                   [frame]
```

这里可以加强：

- Mono
- Numerical Data
- Evidence
- Precise Divider
- Small Charts

核心感觉：

> AisenShot 不是黑盒。

---

# 29. Overview 页面风格

Overview 应该比 Analyze 更“宽”和“松”。

例如：

```text
┌─────────────────────────────────────────┐
│                                         │
│              FILM MAP                   │
│                                         │
│ Sequence                                │
│ Scene                                   │
│ Shot Density                            │
│ Audio                                   │
│ Markers                                 │
│                                         │
└─────────────────────────────────────────┘
```

Overview：

> 看整体。

所以 UI 应该给用户一种“拉远”的视觉感觉。

---

# 30. Analyze 页面风格

Analyze：

> 看局部。

因此可以：

- 更密
- Inspector 常驻
- Timeline 更突出
- Shot Strip 更明确
- Video Viewer 更大

两种页面的视觉密度不同，本身就可以帮助用户建立层级认知。

---

# 31. Scene Board

Scene Board 可以比 Shot Browser 更视觉化。

推荐：

```text
┌──────────────────┐
│                  │
│   16:9 Keyframe  │
│                  │
├──────────────────┤
│ Scene 08         │
│ 01:42 · 17 shots │
│ Dinner           │
└──────────────────┘
```

原则：

- 16:9
- 信息少
- 网格统一
- Hover 才出现操作
- 不做 Pinterest 风格

---

# 32. Shot Browser

Shot Browser 需要更高信息密度。

例如：

```text
[frame]
Shot 037
3.24s
MCU
```

支持：

- Search
- Filter
- Scene
- Duration
- Shot Size
- Marker
- Analysis Status

它是：

> 镜头数据库

而不是：

> 永久侧栏。

---

# 33. AI 的视觉比例

建议整个产品：

```text
50% Professional NLE

30% Figma / Linear

15% Scientific Tool

5% AI
```

AI 不应该主导视觉人格。

---

# 34. AI 文案原则

不要大量使用：

```text
AI Scene Analysis

AI Shot Analysis

AI Insights

AI Assistant
```

更推荐：

```text
Scene Analysis

Interpretation

Patterns
```

如果需要说明来源：

```text
✦ AI generated
```

作为 Secondary Label。

核心区别：

> AisenLens 不是 AI 产品。

而是：

> 一款专业产品，其中使用了 AI。

---

# 35. Motion

动画必须非常克制。

推荐：

```text
120–180ms
```

适合：

- hover
- panel expand
- collapse
- inspector switch
- selection

不要大量使用：

- blur
- glow
- spring
- scale
- 大范围 fade

原则：

> 定位稳定性优先。

---

# 36. Light Theme 的材质感

可以少量使用半透明：

Topbar：

```css
background: rgba(248,248,248,.88);

backdrop-filter: blur(18px);
```

Sidebar：

```css
background: rgba(235,235,235,.85);
```

但仅建议用于：

- Topbar
- Sidebar
- Popover

不要整个界面玻璃化。

---

# 37. Dark / Light 主题的差异

---

## Dark

重点：

```text
Video
Shot
Timeline
```

感觉：

> Cinema / Immersion

---

## Light

重点：

```text
Structure
Overview
Inspector
Scene
Knowledge
```

感觉：

> Studio / Precision

---

# 38. 推荐品牌语言

Dark Theme：

> **Cinema Mode**

中文：

> 影院 / 沉浸模式

---

Light Theme：

> **Studio Mode**

中文：

> 工作室 / 专业工作模式

产品设置里仍可保持：

```text
Dark
Light
System
```

但品牌传播层面可以使用 Cinema / Studio。

---

# 39. AisenLens 视觉语法总结

建议整个设计系统建立以下映射：

```text
Blue
= Current / Selected

Yellow
= Needs Review

Green
= Confirmed

Purple
= Interpretation / AI

Red
= Error / Playhead

Mono
= Time / Frame / Shot / Metric

Large Image
= Evidence

Small Marker
= Moment / Annotation

Horizontal Band
= Temporal Structure

Vertical Section
= Analysis Hierarchy
```

---

# 40. 最终 Style Direction

英文：

> **A dark cinematic analysis workstation with the precision of an engineering instrument.**

Light Theme：

> **A clean macOS-style professional studio utility for structured film analysis.**

中文：

> **Dark 像一间调色室，Light 像一台 Mac 上的专业剪辑工作站。**

---

# 41. 最终设计原则

任何 UI 元素都应该帮助用户回答至少一个问题：

```text
我现在在哪一层？

我正在看什么？

这是事实还是解释？

它和前后镜头是什么关系？

下一步应该做什么？
```

如果一个 UI 元素无法帮助回答这些问题，也不是必要操作，就应该考虑降低权重或删除。

---

# 42. 一句话总结

AisenLens 的 UI 不应该追求：

> “看起来像先进 AI 软件。”

而应该追求：

> **“看起来像一款真正值得专业创作者每天使用几个小时的影视分析工作站。”**
