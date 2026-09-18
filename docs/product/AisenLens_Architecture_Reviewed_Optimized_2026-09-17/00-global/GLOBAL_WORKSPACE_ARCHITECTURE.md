---
title: "AisenLens Global Workspace Architecture"
doc_type: product-architecture
status: target-design
version: 1.0
last_reviewed: 2026-09-17
workspace:
  - global
  - preparation
  - analysis
  - results
scope:
  - webapp
depends_on:
  - WORKSPACE_DESIGN_SYSTEM
source_of_truth_for:
  - global-information-architecture
  - workspace-boundaries
  - global-navigation
  - cross-workspace-flow
implementation_areas:
  - apps/webapp/src/app
  - apps/webapp/src/pages
  - apps/webapp/src/features/workflow
---

# AisenLens 全局产品架构与工作台 IA

> 本文从原《AisenLens 全局工作台 UI / IA 设计方案》收敛而来。Global 只拥有全局 IA、Workspace 边界、导航和跨工作区原则；逐镜分析、Timeline、Inspector、成果应用细节已下沉到各自 Source of Truth。原章节编号保留，便于追溯。

## 1. 设计目标

AisenLens 的核心不是“把很多视频分析功能放在一个软件里”，而是让用户沿着一条稳定、自然、专业的工作流完成：

**原始视频 → 可分析镜头 → 结构化分析数据 → 可展示 / 可分享 / 可继续创作的成果**

因此，全局 UI 不应继续按“功能模块”组织，而应围绕用户的工作阶段组织。

最终建议将项目内一级工作区收敛为三个：

1. **素材准备**
2. **逐镜分析**
3. **成果应用**

三者分别对应：

- 素材准备 = 数据输入与结构化准备
- 逐镜分析 = 数据生产
- 成果应用 = 数据消费、展示、输出与转化

---

# 2. 全局产品信息架构

推荐最终结构：

```text
AisenLens
│
└── 项目
    │
    ├── 素材准备
    │      └── 导入 → 智能切分 → 镜头复核
    │
    ├── 逐镜分析
    │      └── 单一分析工作台
    │             ├── 分析模板（设置）
    │             └── AI 辅助（设置）
    │
    └── 成果应用
           ├── 数据表
           ├── 导出与分享
           └── 创作转化
```

---

# 3. 为什么取消原来的「总览」

原有总览中的核心信息，例如：

- 剪辑节奏
- Scene / 场景分组
- 影片结构
- 镜头密度
- 时间结构

不应继续被设计成一个需要单独访问的“总览页”。

这些数据本质上都是：

> **沿着影片时间轴理解视频结构的辅助信息。**

因此应被吸收到逐镜分析工作台中的 Timeline。

未来 Timeline 不只是镜头时间线，而是 AisenLens 的“结构数据骨架”。

例如：

```text
时间
───────────────────────────────────────────────

Scene
┌──── Scene 01 ─────┐┌────── Scene 02 ───────┐

Shot
│01│02│03│04│05│06│07│08│09│

Rhythm
▂ ▃ ▅ █ ▆ ▃ ▂ ▂ █ ▇ ▄

Audio
~~~~~~~▃▅████▅▂~~~~~~~~

Marker
      ●                 ●

景别
LS────MS────CU──CU────LS────

运镜
固定────推────固定────摇────
```

这样用户不需要“去总览页看完再回来”，而是在真正分析的同时获得宏观结构。

---

# 4. 全局 Workspace Shell

## 4.1 整体结构

推荐桌面端：

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← 项目库   项目名称                                 已保存        ⚙     │
├────────────────┬─────────────────────────────────────────────────────────┤
│                │                                                         │
│ ✓ 素材准备     │                                                         │
│                │                                                         │
│ ● 逐镜分析     │                  当前工作区                             │
│                │                                                         │
│   成果应用     │                                                         │
│                │                                                         │
│                │                                                         │
│                │                                                         │
│                │                                                         │
│                │                                                         │
│ ⚙ 项目设置     │                                                         │
└────────────────┴─────────────────────────────────────────────────────────┘
```

建议左侧宽度：

```text
168px ~ 190px
```

---

## 4.2 三个稳定区域

### 左侧

负责：

> **切换工作阶段**

只出现：

- 素材准备
- 逐镜分析
- 成果应用

不要继续堆叠模板、AI、导出、创作等二级能力。

---

### 顶部

负责：

> **项目级状态与管理**

例如：

- 返回项目库
- 项目名称
- 保存状态
- 项目设置

不应随着页面切换不断添加大量操作按钮。

---

### 主工作区

负责：

> **完成当前工作阶段的实际任务**

所有强交互都发生在这里。

---

# 5. 左侧导航的设计原则

三个一级入口不是一次性 Stepper，而是三个长期存在的 Workspace。

用户可以来回切换。

因此不要设计成：

```text
① 素材准备
   ↓
② 逐镜分析
   ↓
③ 成果应用
```

而应设计为：

```text
✓  素材准备

●  逐镜分析

   成果应用
```

含义：

- `✓`：已经达到可继续使用的状态
- `●`：当前所在 Workspace
- 普通状态：可访问但当前未选中

---

# 6. 三个一级工作区

---

# 6.1 素材准备

素材准备负责：

> 把原始视频变成可靠、可分析的镜头序列。

内部流程：

```text
导入素材
   ↓
智能切分
   ↓
镜头复核
   ↓
准备完成
```

原来的“准备”和“校准”合并为同一个 Workspace。

产品层不再出现独立一级“校准”。

详细页面设计另见：

**《AisenLens 前处理工作台 UX/UI 设计方案》**

---

# 6.2 逐镜分析

逐镜分析是整个 AisenLens 的核心工作区。

它应该是用户使用时间最长、最稳定的页面。

核心任务只有一个：

> **观察镜头，并形成结构化分析数据。**

因此逐镜分析只保留一个主页面：

**分析工作台**

不再将：

- 分析模板
- AI 辅助

提升成和分析工作台同级的页面。

它们属于：

> **改变分析工作台行为的配置。**

---

# 6.3 成果应用

成果应用负责：

> 使用已经完成的分析数据。

主要包含：

1. 数据表
2. 导出与分享
3. 创作转化

逻辑顺序：

```text
查看成果
   ↓
发布 / 分享成果
   ↓
把成果转化为新的创作方案
```

---

# 7. 下沉后的详细设计边界

以下细节不再由 Global 重复定义：

- 逐镜分析工作台：`../02-analysis/ANALYSIS_WORKSPACE.md`
- Analysis Inspector：`../02-analysis/inspector/ANALYSIS_INSPECTOR.md`
- Timeline：`../04-domain/timeline/TIMELINE_ARCHITECTURE.md`
- Analysis Data：`../04-domain/analysis-data/ANALYSIS_DATA_MODEL.md`
- Evidence / Provenance：`../04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md`
- 成果应用：`../03-results/RESULTS_WORKSPACE.md`

Global 只冻结它们之间的职责关系，不复制下位文档规则。

# 32. 全局数据流

推荐将整个产品理解为：

```text
RAW VIDEO
   │
   ▼
┌──────────────┐
│   素材准备   │
└──────────────┘
   │
   ▼
SHOTS
   │
   ▼
┌──────────────┐
│   逐镜分析   │
│              │
│ Template     │
│ Human        │
│ AI           │
└──────────────┘
   │
   ▼
ANALYSIS DATASET
   │
   ├────────────┬───────────────┐
   ▼            ▼               ▼
 数据表       导出分享       创作转化
   │            │               │
   │            ▼               ▼
   │         Export         创作方案
   │                            │
   │                            ▼
   │                         Shot List
   │                            │
   │                          未来
   │                            ▼
   │                         AI Previs
   │
   ▼
可查询 / 可复用分析数据库
```

---

# 33. Native Studio 全局窗口层级

全局 UI 层级由 `WORKSPACE_DESIGN_SYSTEM.md` V2 Native Studio 统一定义。Global Architecture 只冻结职责与边界：

### App Window / Global Chrome

持续存在于三个 Workspace 之上，承载 Project identity、保存/同步状态、全局命令与 Workspace 切换。切换 Workspace 时 App Window 不重建。

### Workspace Panels

Navigation / Primary / Inspector / Timeline 是同一窗口中的可调工作区域。Panel 可以 resize / collapse / restore，并按 Workspace 记忆布局；它们不是独立网页。

### Floating Chrome

Popover / Context Menu / Command Palette / Floating Toolbar / Drawer 从触发源附近出现，用于局部动作和短时配置。必须保持 source anchoring、shared overlay ownership 与 focus restore。

### Modal

只用于必须阻塞当前上下文的重要决策。Detector、AI、Export、decode、scan 等后台工作不得用 Modal 锁住整个工作台。

---

# 34. Native Studio 全局交互契约

## 34.1 Single-window continuity

Workspace / View 切换保持项目上下文、Selection 与可恢复的 Panel geometry。复杂功能默认在同一个工作窗口内展开，不做网页式整页跳转。

## 34.2 Direct manipulation

能直接 drag / scrub / resize / reorder / inline edit 的任务，不优先转换成参数表单。操作中必须有 live preview、invalid-target feedback 与 safe cancel。

## 34.3 Source-anchored actions

Context Menu、Popover、Quick Action、Inline Editor 与触发对象保持空间关系；局部动作不无理由跳到窗口中央。

## 34.4 Background work stays nonblocking

Detection、decode、save、export、AI 等任务使用局部 progress/task UI。已有内容继续可操作；只有真正互斥的 transaction 才锁定相关控件，而不是整个 Workspace。

## 34.5 Desktop input parity

Mouse / trackpad / keyboard 都是正式输入。Context Menu、Command Palette、focus-visible、shortcut discovery、Undo/Redo 属核心能力，不是附加增强。

## 34.6 User-facing language

产品 UI 使用用户任务语言；工程标识、revision、task snapshot、detector parameter 等只在诊断或专家设置中出现。

---

# 35. Native Studio 信息密度与布局

信息密度由可操作的桌面布局系统控制，而不是单纯“隐藏次要信息”。

主要手段：

- resizable / collapsible Panel；
- Comfort / Standard / Compact Density；
- Workspace-specific layout memory；
- contextual reveal；
- Data Grid / Timeline semantic zoom；
- Inspector section；
- View Preference。

用户可以根据当前任务主动决定屏幕上同时存在多少信息。系统负责保证最小可操作尺寸、层级、键盘/指针可达性和高密度下的可读性。

具体颜色、材质、token、motion、Panel geometry、responsive matrix 与 performance experience 全部以 `WORKSPACE_DESIGN_SYSTEM.md` V2 为唯一 Source of Truth。

---

# 36. 页面关系总结

最终推荐：

```text
AisenLens Project Workspace
│
├── 素材准备
│
├── 逐镜分析
│      └── Analysis Workspace
│              │
│              ├── Template Selector
│              └── Analysis Settings Drawer
│                       ├── 分析模板
│                       └── AI 辅助
│
└── 成果应用
       │
       ├── 数据表
       │
       ├── 导出与分享
       │      └── Export Studio
       │
       └── 创作转化
              └── Creation Workspace
```

---

# 37. 推荐的产品定位表达

最终 AisenLens 不再是：

> 一个集合了自动切镜、分析、AI、表格、导出、创作等工具的软件。

而应该呈现为：

> **一套从视频理解到创作转化的专业工作流。**

完整链路：

```text
视频
↓
镜头
↓
分析数据
↓
可视化成果
↓
可分享成果
↓
可执行创作方案
```

这套架构的最大价值是：

**未来功能继续增加时，一级导航仍然不需要变化。**

任何新能力都可以很自然地判断应该属于：

- 数据输入
- 数据生产
- 数据消费

从而保证 AisenLens 的产品结构长期保持稳定。
