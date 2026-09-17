---
title: "AisenLens Master Development Plan"
doc_type: master-development-plan
status: approved
version: 1.0
last_reviewed: 2026-09-17
scope:
  - webapp
  - architecture
  - domain
  - workspace
  - ui-ux
  - persistence
  - ai
  - results-export
  - documentation-governance
depends_on:
  - README.md
  - ARCHITECTURE_INDEX.md
  - audit/FINAL_ARCHITECTURE_AUDIT.md
  - audit/FINAL_SOURCE_OF_TRUTH_MATRIX.md
  - audit/FINAL_CONCEPT_REGISTRY.md
  - implementation/MIGRATION_PLAN.md
  - implementation/IMPLEMENTATION_BOUNDARY.md
  - 90-implementation/IMPLEMENTATION_MAP.md
source_of_truth_for:
  - total-development-sequence
  - phase-gates
  - cross-domain-delivery-plan
  - ui-ux-delivery-governance
---

# AisenLens 总开发计划（Master Development Plan）

> 本文档是基于 2026-09-17 最新 AisenLens Refined Architecture Package 制定的**总开发执行计划**。它负责回答“先做什么、后做什么、每阶段交付什么、什么条件才算完成”。
>
> 它**不替代**各 Domain / Workspace / Design System Source of Truth；当细节冲突时，仍以 `README.md` 中登记的对应权威文档为准。本文档必须覆盖现有包中所有正式设计、审计、实施、迁移与原始输入所承载的工作范围，不允许因总计划化而遗漏功能、状态、交互、数据或治理要求。

---

# 1. 总目标

AisenLens 的开发不是把若干页面拼起来，而是完成一条稳定、可演进、可审计的产品链：

```text
Media
  ↓
Detection Candidate
  ↓
Boundary Review
  ↓
Official Shot
  ↓
Analysis Structure / Analysis Record
  ↓
Confirmed Analysis
  ↓
Results Dataset
  ↓
Export / Share / Creative Transformation
```

同时必须保持第二条 AI 边界：

```text
AI Input / Context
  ↓
AI Output
  ↓
Analysis Candidate / Structure Suggestion
  ↓
User Review
  ↓
Explicit Accept / Reject
  ↓
Formal Analysis Record / Approved Structure Command
```

整个开发周期必须守住以下总原则：

1. 一个核心 Concept 只有一个正式定义与 Source of Truth。
2. 一个正式实体只有一个 Authority；UI、AI、Results、Timeline View 不能绕过 Authority 写正式数据。
3. `CURRENT / TARGET / PROPOSED` 始终分离；目标设计不能被描述成当前已实现。
4. 所有持久化变更采用版本化迁移，不通过清库、丢字段或静默覆盖解决兼容问题。
5. Workspace 负责工作流编排，Domain 负责事实与规则，UI 负责可视化和交互，Infrastructure 实现端口。
6. UI/UX 不是“后期美化”，而是与 Domain/Persistence 同级的交付主线。
7. 每个 Phase 同时通过：架构门、数据门、UI/交互门、可恢复门、测试门、文档门，才允许进入下一阶段。
8. 原始设计内容继续保留在 Archive；总计划不以压缩篇幅为理由删除需求。
9. 运行时可靠性属于架构正确性的一部分：canonical write、migration、backup/restore、Worker、AI provider、import/export 和发布必须通过统一的 runtime contract。

---

# 2. 开发主线与优先级

开发分为 11 条并行但有依赖关系的主线：

| Workstream | 目标 | 主要权威文档 |
| --- | --- | --- |
| W0 架构与治理 | 固化 Authority、SoT、依赖方向、命令与状态边界 | `audit/*`, `README.md` |
| W1 Global Shell | 建立三 Workspace 信息架构、全局导航、Shell、页面层级 | `00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md` |
| W2 UI/UX Design System | 建立 Surface、主题、密度、组件、交互状态、无障碍、键盘规范 | `00-global/WORKSPACE_DESIGN_SYSTEM.md` |
| W3 Preparation / Shot | 导入、切分、Boundary Review、Official Shot Authority | `01-preparation/*`, Shot Contract |
| W4 Analysis Data / Evidence | AnalysisRecord、Candidate、stale、Evidence、Provenance、Template 子契约 | `04-domain/analysis-data/*`, evidence, template |
| W5 Analysis Workspace / Inspector | 逐镜工作台、ResearchScope、Selection/Playback、Inspector、AI Review | `02-analysis/*` |
| W6 Timeline | 时间坐标、层级结构、Track、Marker、LOD、渲染、历史、性能 | `04-domain/timeline/*` |
| W7 Results | Derived Dataset、数据表、导出、分享、创作转化 | `03-results/*` |
| W8 AI | Candidate、Context Builder、AI Review、结构建议、可追溯性 | Analysis/Inspector/Timeline/Template contracts |
| W9 运行时可靠性与安全 | IndexedDB durability、quota/corruption、多标签页 revision、Worker lifecycle、输入/AI 信任边界、可观测性、发布门 | `05-runtime/OPERATIONAL_ARCHITECTURE.md` |
| W10 迁移与质量 | 数据迁移、兼容、测试、性能、文档治理、dead-link/authority lint | `implementation/*`, `audit/*` |

其中 **W2 UI/UX Design System 是横切主线**，从 Phase 1 开始贯穿全部阶段，不允许延后到功能开发结束后统一补做。

---

# 3. UI / UX 提升为一级开发目标

## 3.1 UI/UX 的开发地位

UI/UX 与 Domain、Persistence、Application 同级。任何涉及用户操作的能力，必须同时交付：

- 信息架构与页面层级；
- 主路径与纠错路径；
- Loading / Empty / Error / Disabled / Processing / Success / Stale / Conflict 状态；
- Hover / Focus / Selected / Playing / Editing / Dragging / Reviewing 等交互状态；
- 键盘路径与无障碍焦点路径；
- 响应式和面板折叠策略；
- 数据来源、AI、Derived、Human Value 的视觉区分；
- Undo / Redo、自动保存、失败恢复和离开页面后的状态恢复；
- 高信息密度下的可读性、层级和性能。

## 3.2 UI/UX 总体设计原则

必须完整落实现有 Design System 中的原则：Content First、Surface over Border、Progressive Disclosure、Selection Driven Workspace、Contextual Tools、Media First、Keyboard First；同时避免 Dashboardization、Card Everything、Rainbow UI、Huge Radius、Heavy Shadow、Permanent Controls 和 Deep Page Navigation。

全局层级固定为：

```text
Workspace
  > Drawer / Sheet
    > Inspector
      > Modal
        > Dropdown / Popover / Context Menu
```

正常状态应安静，异常/待处理状态突出；用户语言优先于工程语言；Settings 用于改变工作方式，Workspace 用于完成工作。

## 3.3 UI/UX 阶段门

每个 Phase 必须满足：

1. **Flow Gate**：主流程可以从入口走到完成态，无隐藏必经步骤。
2. **State Gate**：所有关键异步、错误、空态、stale、candidate、未保存状态有明确界面。
3. **Interaction Gate**：鼠标与键盘路径无矛盾，Selection 与 Playback 等不同状态不会混为一体。
4. **Hierarchy Gate**：没有为了“有容器”而滥用 Card/Border/Modal。
5. **Accessibility Gate**：Focus ring、可操作区域、Tooltip、键盘顺序和语义文本可用。
6. **Responsive Gate**：至少覆盖文档指定桌面范围、折叠模式和窄屏策略。
7. **Performance Gate**：时间轴、列表、表格、Inspector 不因大项目规模失去交互流畅性。
8. **Visual Consistency Gate**：主题、Typography、Spacing、Radius、Shadow、Button、Input、Popover、Context Menu 等均来自统一系统。

---

# 4. Phase 0 — 基线冻结、覆盖核对与实施准备

## 4.1 目标

先把“现状、目标、权威、依赖、数据迁移风险”冻结，避免边写代码边重新发明模型。

## 4.2 工作内容

- 复核仓库 `AGENTS.md`、当前架构文档、`apps/webapp/src`、features、services、project repository、IndexedDB schema。
- 建立本次开发对应的 CURRENT code map，逐模块确认真实存在的路径。
- 将 `FINAL_CONCEPT_REGISTRY`、`FINAL_SOURCE_OF_TRUTH_MATRIX`、`AUTHORITY_MAP`、`STATE_OWNERSHIP`、`COMMAND_EVENT_MAP`、`DEPENDENCY_GRAPH` 作为变更约束输入。
- 对 Scene / Sequence / Section 最终持久化 schema 做实施前设计补全，但不得创建第二 Authority。
- 明确 `ShotRecord.analysisFields` 的迁移策略：先兼容读 → 建立独立 Analysis Repository → 迁移 → 双读核验 → 移除旧耦合。
- 明确 Template 当前模型与目标子契约之间的迁移，不得把万能 JSON 继续扩张。
- 建立 UI 基线截图/交互基线，用于后续视觉和交互回归。

### Runtime baseline

- 冻结 IndexedDB schema/migration/revision contract；
- 明确 storage quota / eviction / corruption 的恢复策略；
- 明确 multi-tab/旧异步任务的 revision correctness；
- 建立统一 task lifecycle 与 typed error taxonomy；
- 冻结 import/AI provider trust boundary、secret policy 与默认本地 diagnostics；
- 为 migration / backup / race / cancellation / corrupt fixture 建立测试基线。

## 4.3 UI/UX 交付

- 建立 Workspace、Drawer、Inspector、Modal、Popover 的层级检查清单。
- 建立 Design System token 实施清单：dark/light、accent、semantic colors、typography、spacing、radius、border、shadow、focus。
- 建立全局交互状态字典和组件状态 Story/测试矩阵。

## 4.4 Exit Criteria

- 关键 Domain 均有唯一 Owner。
- 不存在待开发团队自行决定的 P0 Authority 冲突。
- 所有数据迁移都有非破坏路径。
- UI/UX 基线和验收规范可执行。
- 本计划的文档覆盖矩阵与当前包一致。

---

# 5. Phase 1 — Global Shell + Workspace Design System

## 5.1 Global Shell

实现三一级 Workspace：**素材准备 / 逐镜分析 / 成果应用**，并落实全局左侧导航、顶部区域和主工作区三稳定区域。取消“总览”作为与主任务竞争的一级工作区；全局层只负责跨工作区导航、关系与状态，不重新定义 Domain 数据。

开发范围：

- Workspace Shell、路由与导航状态；
- 项目级上下文与当前 Workspace 切换；
- 全局 Breadcrumb / Return Context 承载基础；
- Workspace 进入条件、空态、错误态；
- 全局保存/同步/异常提示位置；
- Drawer、Inspector、Modal 的统一层级；
- 跨工作区 correction flow 的导航能力。

## 5.2 Design System

完整实现 `WORKSPACE_DESIGN_SYSTEM.md` 所定义的视觉和交互基础：

- Surface system、Dark/Light Theme、Viewer rule、Accent/Semantic colors；
- Typography、Spacing、Radius、Border、Shadow；
- Button、Icon Button、Input、Focus Ring；
- Shot Card、Shot Strip、Navigation Panel、Inspector、Inspector Section、Toolbar；
- Popover、Context Menu、Command Palette；
- Interaction State Model、Hover/Selected、Motion/Easing；
- Visual/Analysis/Data 三种 Density；
- Empty、Loading、AI UI、Editing、Accessibility、Keyboard First、Tooltip；
- View Preference 与 Workspace Modes。

## 5.3 UI/UX 重点

UI 首阶段就必须达到“可作为后续工作台母体”的质量，而不是临时壳。Shell 的视觉密度、左右面板关系、选中态、Focus、主题、快捷键、状态反馈必须稳定后，Preparation/Analysis/Results 才继续叠加。

## 5.4 Exit Criteria

- 三 Workspace 可进入、可切换且上下文不丢失。
- Design System 基础组件覆盖后续工作台必需状态。
- 禁止页面各自定义颜色、边框、圆角和临时交互语法。
- 键盘焦点、主题切换和窄屏折叠通过 smoke。

---

# 6. Phase 2 — Preparation Workspace + Official Shot Authority

## 6.1 目标

把 Preparation 建成可靠形成 Official Shot Structure 的唯一工作台，完成从素材导入到切点确认的连续任务流。

## 6.2 Step 1：导入素材

- 空状态与导入入口；
- 素材导入后的媒体信息、可用状态与错误反馈；
- Media identity 与当前 project persistence 对齐；
- 丢失媒体、重新关联、再次打开项目的行为。

## 6.3 Step 2：智能切分

- 待识别状态；
- 切分设置 Drawer；用户参数语言与专家设置分层；
- 运行中真实进度/不确定进度；
- 运行期间设置锁定；
- Candidate 与 Official Shot 严格分离；
- 识别完成后的候选结果进入 Review，不重复确认；
- 分析 Template 与 Analysis AI 从 Preparation 中移除。

## 6.4 Step 3：Boundary Review / Calibration

以 Boundary 而非 Segment 为核心导航实体：

- 左侧 Review Queue，默认优先待确认/低置信/异常项，而非强制全量；
- 中央 Boundary Frame Pair；
- 视频与双帧证据并存；
- 切点预览模式；
- 右侧 Inspector；
- “切点正确”显式确认；
- 边界微调、移动到当前帧、删除切点、补切；
- 全片 Timeline；
- “稍后处理”队列；
- Detection detail、Confidence 的克制呈现；
- Auto Next；修改后重新确认；
- Undo/Redo、保存状态；
- 未完成项与全部完成态；
- 重新打开项目后的恢复。

## 6.5 Shot Domain Command 落地

正式 Shot 修改只能通过：ConfirmBoundary、MoveBoundary、SplitShot、MergeShots 等命令；每次结构变化必须：

- 校验 `[startFrame, endFrame)`；
- expected revision；
- 生成 structure revision/event；
- 保留 lineage；
- 可撤销；
- 触发下游 stale/remap 影响评估。

## 6.6 Keyframe

保留 `KEYFRAME_DESIGN_DRAFT.md` 的 draft 状态。只实现当前已有明确需求，不把空白草稿自行升级为 approved；后续需独立设计后再进入总计划的具体开发项。

## 6.7 UI/UX 重点

Preparation 必须表现为**连续任务**而非模块仪表盘。核心原则：主操作唯一、参数渐进披露、扫描不滥用 Modal、异常优先、Review 以视觉证据为中心、正常状态降噪。

## 6.8 Exit Criteria

- 非 Shot Authority 路径无法直接写正式 Shot。
- Candidate 不会未经确认进入 Official Shot。
- Boundary Review 的鼠标、键盘、Undo/Redo、保存、重新进入流程完整。
- Analysis Workspace 只能只读消费 Official Shot。

---

# 7. Phase 3 — Analysis Data、Evidence/Provenance、Template 与持久化解耦

## 7.1 Analysis Data Model

实施稳定的 Analysis 数据核心：

- FieldDefinition / stable fieldId；
- AnalysisRecord；
- AnalysisCandidate；
- human / algorithm / AI / derived 来源区分；
- unknown / not_applicable 等字段状态；
- record revision；
- Candidate 独立生命周期；
- confirmed/stale/eligibility 分离；
- Data Review 与 AI Review 分离。

禁止一个通用 `status` enum 同时表达 Candidate、Record、Revision 多种生命周期。

## 7.2 从 ShotRecord.analysisFields 解耦

按 P0 migration：

1. 新建兼容 Analysis Repository/port；
2. 旧 ShotRecord 数据可完整读取；
3. 将 value / unknown / NA / source 等无损迁移；
4. 新写入进入 Analysis Authority；
5. 交叉核对后逐步停止旧字段写入；
6. 最终移除物理耦合，但不删除用户数据。

## 7.3 stale / remap / revalidation

建立明确规则：Shot Boundary、Identity、Scene association、Sequence、Structure Revision 变化后，哪些 Record：

- 仍有效；
- 可 deterministic remap；
- 必须 stale；
- 必须 reanalyze；
- 必须用户 semantic revalidation。

Split/Merge/Move 都必须产生可预测影响队列。

## 7.4 Evidence / Provenance

实施：

- Evidence 为一等数据；
- EvidenceRef 可重定位；
- Provenance 与所属 Record/Candidate revision 关联；
- source/model/prompt/context/time/user-confirmation 可追溯；
- evidence policy = none/optional/recommended/required 等规则按契约处理；
- required evidence 不应阻塞早期记录，但会影响完成/eligible 状态。

## 7.5 Template 子契约

把 Template 从万能 JSON 拆成清晰边界：

- TemplateDefinition / AnalysisProfile；
- AnalysisSchema（稳定字段语义归 Analysis Data）；
- UILayoutDefinition；
- RendererDefinition；
- PromptDefinition；
- ContextDefinition；
- ExportMapping。

Template 切换不得删除数据；Template 通过 stable fieldId 引用字段；UI layout、AI prompt/context、export mapping 不反向成为 Analysis schema。

## 7.6 UI/UX 交付

本 Phase 即使以数据为主，也必须交付可视状态规范：

- Human / AI / Algorithm / Derived 来源视觉；
- confirmed / stale / candidate / conflict / unknown / NA；
- save state；
- Evidence chip；
- provenance 默认弱化但可追溯；
- Template 切换的影响预览与无损提示。

## 7.7 Exit Criteria

- Analysis Fact 不再依赖 Shot 聚合作为唯一存储。
- Candidate 未 accept 不进入正式 Results/Export。
- stale 传播确定且可测试。
- Template 子域责任不再混在同一模型里。

---

# 8. Phase 4 — Analysis Workspace 主工作台

## 8.1 工作台结构

落实 Analysis Workspace 的核心桌面结构：

- 左侧 Structure Navigator；
- 中央 Player Stage；
- 右侧 Analysis Inspector；
- 底部/关联 Timeline；
- Toolbar、Research Breadcrumb、Selection Context Bar。

## 8.2 四类核心状态

必须分离并协调：

- PlaybackPosition；
- SelectedEntity；
- ResearchScope；
- Viewport。

Selection 与 Playing 不能混同；Timeline viewport 不能决定 Domain；ResearchScope 决定当前分析层级但不改变 Shot Authority。

## 8.3 Structure Navigator

覆盖 Scene / Shot / Sequence / Section 的结构行、Needs Review、当前选中、当前播放、折叠/展开、导航、双击/Enter/Esc/Breadcrumb 等交互。

## 8.4 Player / Overlay / Controls

实现 Player Stage、Selection Context Bar、Video Overlay 原则、Playback Controls，并保证 Overlay 不修改原始媒体。

## 8.5 Marker

实现 Marker 创建、Inspector、Timeline 展示、Scope，以及 Marker 与 Object Analysis 的语义区分。Marker 是自由观察，不替代正式结构层级。

## 8.6 Template 与 Analysis Settings

实现 Template Selector、Analysis Settings Drawer、三种分析尺度关系；Template 不直接生成 Timeline Track，Track Preference 独立。

## 8.7 Shot Correction Flow

Analysis 发现 Shot 错误时：

- Inspector More / Timeline Boundary Hover / Context Menu 提供“调整分镜”；
- 通过 FlagShotCorrection / Return Context 导航回 Preparation；
- Analysis 不直接修改 Shot；
- 修改后返回 Analysis，恢复 selection/context；
- 展示 Shot Split/Merge/Move 造成的数据影响队列；
- Structural Remap 与 Semantic Revalidation 分离；
- Scene/Sequence/Section、Editing Pace 等衍生状态按规则同步。

## 8.8 Error / Save / Undo / Responsive

覆盖：无 Official Shot、媒体丢失、保存状态、Undo/Redo、≥1440 / 1180–1439 / <1180 策略、Panel Collapse（专注播放/分析/结构）。

## 8.9 UI/UX 重点

Analysis 是产品最高信息密度工作台之一。UI 目标是“高密度但不仪表盘化”：内容优先、选择驱动、上下文工具、结构与媒体并重、异常和待复核突出、技术元数据不常驻抢占视觉。

## 8.10 Exit Criteria

- 主工作台从导航、播放、选择、分析、纠错到返回全部闭环。
- 四种状态可独立测试，不相互覆盖。
- Shot correction 不存在绕过 Preparation 的直接写入。
- 关键快捷键与折叠模式稳定。

---

# 9. Phase 5 — Analysis Inspector 深化

## 9.1 一个 Shell，多 Entity Renderer

建立统一 Inspector Shell，并为 Shot、Scene、Sequence、Section、Story/Film、Marker 提供差异化 renderer；Scene Inspector 不能只是 Shot 字段放大版。

## 9.2 Header / Body / Field

实现：

- 各 Entity Header；
- Header 状态不做成评分；
- More Menu；
- Body 不用一级 Tabs 堆砌；
- Analysis Field 为核心组件；
- Field 默认视觉；
- 技术元数据渐进披露；
- Field Group 展开策略；
- 长文本自动保存。

## 9.3 AI / Derived / Human 视觉

- Algorithm/Derived 与 AI 有明确视觉语义；
- 用户人工输入默认成为正式工作值；
- AI 与正式值冲突时并排审阅；
- 采用 AI 必须显式 Accept；
- 不默认“全部采用”；
- AI Suggestion 区分 observation 与 interpretation；
- 不展示长推理链。

## 9.4 Evidence / Provenance UI

- Evidence Chip；
- Hover preview；
- 点击跳转；
- Evidence Picker；
- Scene Evidence；
- Provenance 默认不抢占界面，但必须随时可查。

## 9.5 Data Review 与 AI Review

- stale Review 与 Candidate 可同时存在；
- Data Review Mode 与 AI Review Mode 分开；
- “分析完成”作为状态/提示，不做成阻塞式流程锁。

## 9.6 Timeline 双向交互

- Field → Timeline；
- Timeline → Inspector；
- Inspector 修改 → Timeline 派生可视更新；
- 不建立重复数据源。

## 9.7 Renderer Registry

建立受控 Field Renderer Registry 和推荐组件目录；不建设任意动态插件系统。

## 9.8 AI Ask / Context Builder

AI Ask Bar、输出、Shot/Scene/Story Context；Ask 结果不是正式分析，进入正式值仍走 Candidate/Accept 流程。

## 9.9 Exit Criteria

- Inspector 只编辑/呈现 Analysis Data，不拥有 Domain 生命周期。
- 所有来源/冲突/stale/evidence 状态用户可理解。
- Field renderer 可扩展但边界受控。
- AI Review 无静默覆盖路径。

---

# 10. Phase 6 — Timeline Domain + Application + View

## 10.1 时间与结构基础

实现整数 FrameIndex、MediaTime/PTS 转换边界、VFR mapping、半开区间 `[startFrame,endFrame)`；浮点秒不作为正式结构唯一事实源。

落实三种分析尺度、四级结构、覆盖方式与层级不变量、Boundary First 交互模型、正式结构唯一数据来源。

## 10.2 结构编辑与 revision

实现结构编辑命令、Promote/Demote、跨层边界、身份/内容/引用保留、Shot 校准后的成员重整、草稿/事务/history/revision、非法数据恢复。

## 10.3 Marker / Beat / Event

Marker 为自由观察；Marker display/scope/object analysis 明确；Beat/Event 保持语义边界，不与 Scene/Shot 等正式结构混淆。

## 10.4 Track 模型

区分 Track Definition、Track Instance、Preference；分析字段、Template 与 Track 不能相互反向定义。实施 Editing Pace、Dialogue 等首批轨道及其数据形态。

## 10.5 View Adapter 与渲染

实现：

- View Adapter；
- viewport/zoom math；
- Semantic Zoom；
- 信息密度切换；
- 查询/渲染/播放更新；
- 缩略图/波形资源预算；
- LOD；
- 大数据量性能门槛。

## 10.6 Timeline UI/UX

时间轴不是单纯绘图组件，而是核心研究与导航界面。重点完成：

- Boundary hover / drag / context menu；
- Selection vs Playing；
- ResearchScope 联动；
- Track visibility/preference；
- Inspector contextual integration；
- 快捷键优先级；
- 无效操作即时反馈；
- 高缩放/低缩放信息密度；
- 播放时平滑更新但不触发不必要的全树重渲染。

## 10.7 AI 结构建议

AI 结构建议具有独立 candidate 状态机，只能建议，不能直接改正式结构；Context Builder 输出必须校验依赖 revision。

## 10.8 Exit Criteria

- Domain/Application/View/Workspace Integration 边界清楚。
- viewport/hover/drag 不进入 Domain persistence。
- 时间精度、结构 revision、Undo/Redo 一致。
- 性能满足 Timeline 文档验收矩阵。

---

# 11. Phase 7 — Results Workspace、Derived Dataset、Export 与 Creative Transformation

## 11.1 Results 数据消费契约

Results 只消费 eligible/confirmed Analysis Data 与结构数据，通过统一 derived dataset/query 层生成视图，不建立第二事实源，不反向修改 Analysis Fact。

## 11.2 数据表

实现动态列、Filter、Sort、Aggregate、字段/Template 映射、stale 显示、Evidence/Provenance 查询入口。默认“查看优先”，批量编辑不得绕开 Analysis Authority。

## 11.3 Export / Share

实现统一 Export Preset，并覆盖设计中定义的核心导出类型：分析表格、视频+分析表联动输出、分析水印视频，以及后续 Share 能力。ExportMapping 来自 Template 子契约，但不得重新定义字段语义。

## 11.4 Creative Transformation

创作转化消费 confirmed/eligible facts，输出 Derived Artifact；AI 在此可生成建议/转化内容，但新产物不能被误写为原始 Analysis Fact。保留未来 AI Video Generation 的位置但不越过当前阶段范围。

## 11.5 UI/UX 重点

Results 从“分析工具感”转为“成果消费感”：表格高密度但可读、筛选与导出路径明确、stale/不可导出状态清楚、导出配置使用渐进披露，Creative 入口与正式分析数据之间有明显边界。

## 11.6 Exit Criteria

- Table / Export / Creative 使用同一 query contract。
- stale 或未确认 Candidate 不会默认进入正式输出。
- Export 可复现、可追溯输入 revision/profile/version。

---

# 12. Phase 8 — AI Candidate、Context Builder 与智能工作流增强

## 12.1 AI 总边界

AI 永远不是正式 Source of Truth。AI 可：生成 AnalysisCandidate、结构建议、解释、问答、Creative suggestion；不可：静默覆盖 Official Shot、Confirmed AnalysisRecord 或用户人工值。

## 12.2 Context Builder

按 Shot / Scene / Story 等任务构建 context，记录：模型、prompt、context definition/version、输入 dependency revision、evidence refs、输出时间；ContextDefinition 与 PromptDefinition 属 Template/AI 子契约，字段语义仍属于 Analysis Data。

## 12.3 Review

实现 Candidate pending/accepted/rejected/superseded/expired 等独立生命周期；dependency stale 后禁止无校验接受；已有正式值时必须明确冲突呈现；不默认提供“全部采用”。

## 12.4 AI UI

遵守 Design System AI UI Rule：AI 入口轻量、状态可见但不抢占主工作流；Suggestion 区分观察/解释；不展示长推理链；AI Ask 不等于正式 Analysis；AI Status/Settings 集中治理。

## 12.5 Provider / Privacy Gate

- Context Builder 只发送任务最小必要数据，并能向用户说明发送范围；
- server/provider-owned secret 不进入前端 bundle；BYOK 与项目数据分离；
- provider response 视为不可信外部输入，先解析/校验，再成为 Candidate；
- 网络失败、限流、超时只影响 Candidate，不修改正式 Analysis。

## 12.6 Exit Criteria

- 无 AI provider 可直接写正式 repository。
- 所有 accepted AI 值都有 provenance。
- dependency revision 变化后 Candidate 可预测失效或复核。

---

# 13. Phase 9 — 稳定性、运行时安全、迁移、性能、无障碍与发布门

## 13.1 数据迁移与兼容

- Shot → Analysis 解耦完整迁移；
- Template/Profile 子模型迁移；
- Scene/Sequence/Section 持久化；
- versioned repository migration；
- backup/restore 覆盖新数据；
- 不清库、不丢字段、不用 UI store 替代正式持久化。

## 13.2 数据一致性与历史

- revision 竞争与 expected revision；
- Undo/Redo transaction；
- crash/interruption recovery；
- stale propagation；
- media identity；
- candidate dependency validation。

## 13.3 性能

重点验证：大型项目 Structure Navigator、Timeline tracks、thumbnail/waveform、Inspector field groups、Results table、AI candidate 列表；避免播放更新造成无关组件重渲染。

## 13.4 Runtime reliability / security

- IndexedDB quota unavailable / transaction abort / corruption fixtures；
- multi-tab 与 delayed async result 不覆盖新 revision；
- Worker cancel/crash/retry/resource budget；
- import project/template schema + size + version validation；
- rich text/Markdown 输出采用安全渲染，不执行导入脚本/函数；
- AI Provider 最小 context、secret boundary、response validation；
- typed error -> user recovery action；
- privacy-friendly local diagnostics；远程 telemetry 若未来引入必须另设 consent/retention/redaction。

## 13.5 UI/UX 最终质量门

- Dark/Light 全面核验；
- 视觉层级与信息密度；
- 交互状态全覆盖；
- Keyboard First；
- Focus / Tooltip / Accessibility；
- Responsive / Panel collapse；
- Empty / Loading / Error / Stale / Offline-like local media issue；
- 禁止临时组件样式与重复设计语法；
- 真实用户任务 smoke：导入→切分→复核→分析→纠错→返回→导出。

## 13.6 发布门

- build/typecheck/lint；
- repository migration tests；
- domain command tests；
- workspace integration tests；
- UI state/keyboard tests；
- Timeline performance benchmark；
- export reproducibility；
- backup/restore integrity + corrupt backup rejection；
- Worker cancellation / stale-result / revision race tests；
- malformed import / provider response tests；
- release build 可回滚，schema migration 不依赖破坏性 downgrade；
- 文档状态由 target-design/implementing 提升到 implemented 必须有证据。

---

# 14. Phase 10 — 文档治理、AI Coding Agent 与长期演进

## 14.1 文档治理

持续执行：dead-link=0、duplicate authority=0、Archive 不作为正式依赖、Concept 唯一 Owner、CURRENT/TARGET 不混淆、MANIFEST/CHANGELOG 更新。

## 14.2 AI Development Guide 执行

未来 Coding Agent 修改：

- Shot 前必须读取 Shot Contract + Preparation + Command/Event；
- Timeline 前读取 Timeline + State Ownership + Shot/Analysis contracts；
- Analysis 前读取 Analysis Data + Evidence + Template；
- Inspector 前读取 Inspector + Analysis Data；
- Results/Export 前读取 Results + Analysis eligibility + Template ExportMapping；
- 冲突时按 Source of Truth 优先级，不在 feature 内重新定义共享领域模型。

## 14.3 长期模块边界

Domain contracts 不依赖 React/Workspace/Zustand；Application commands/services 向 Domain；Workspace orchestration 消费 Application；UI 向下消费；IndexedDB/Worker/AI provider 等 Infrastructure 实现 port 而不拥有语义。

---

# 15. 推荐开发批次（可执行顺序）

建议以以下批次推进，而不是按页面分别“做完再说”：

| Batch | 核心范围 | 主要可见成果 | 阻塞关系 |
| --- | --- | --- | --- |
| B0 | Phase 0 | 真实代码基线、迁移设计、UI 基线 | 无 |
| B1 | Phase 1 | Global Shell + Design System | B0 |
| B2 | Phase 2 | Preparation + Official Shot Authority | B1 |
| B3 | Phase 3 | Analysis Repository + Evidence + Template contracts | B2 的 Shot revision |
| B4 | Phase 4 + Phase 5 基础 | Analysis Workspace + Inspector V1 | B3 |
| B5 | Phase 6 | Timeline domain/view + Analysis 联动 | B2/B3/B4 |
| B6 | Phase 5 深化 + Phase 8 基础 | Data Review / AI Review / Evidence UX | B3/B4/B5 |
| B7 | Phase 7 | Results Table / Export / Creative | B3/B4/B5 |
| B8 | Phase 8 完整 | AI Candidate / Context Builder / AI Ask | B3/B5/B7 |
| B9 | Phase 9 | Migration hardening / performance / a11y / release | 前述全部 |
| B10 | Phase 10 | 文档状态、Agent 指南、长期治理 | 持续进行，发布前收口 |

---

# 16. 每个 Batch 的 Definition of Done

任何 Batch 都必须满足以下 DoD：

### Architecture / Domain
- 没有新增第二 Authority 或第二 Source of Truth。
- Command/Event/State ownership 与契约一致。
- 不产生禁止依赖。

### Persistence
- 正式数据通过 repository/service 边界持久化。
- 版本化迁移可回归验证。
- 用户数据无静默丢失。

### UI / UX
- 主流程、异常流程、纠错流程、恢复流程均可操作。
- 所有关键状态有视觉表达。
- 鼠标/键盘/Focus/Responsive 满足设计文档。
- 组件遵循 Design System，无局部私有设计语言漂移。

### Runtime / Security
- canonical write 成功后才显示已保存；quota/corruption/revision conflict 有恢复路径。
- 长任务可取消，旧结果不能覆盖新 revision。
- 外部输入与 AI response 经过校验；provider secret 不硬编码到前端。
- 默认诊断不记录用户媒体/分析正文/完整 prompt-context。

### Quality
- 单元/集成/交互 smoke 通过。
- Timeline/大型列表等性能符合专项门槛。
- Undo/Redo、保存、重开项目验证。

### Documentation
- 更新对应 Source of Truth 的 implementation status。
- 更新 IMPLEMENTATION_MAP / MIGRATION_PLAN（如阶段变化）。
- 更新 CHANGELOG / MANIFEST（交付包场景）。

---

# 17. P0 / P1 开发优先级冻结

## P0（必须先解决）

1. 正式 Shot 只能通过 Shot Authority Command 变更。
2. `ShotRecord.analysisFields` 与 Analysis Fact 的物理/逻辑解耦，无损迁移。
3. AI Candidate 与正式 Analysis Value 分离，禁止静默正式化。
4. 数据迁移、backup/restore 与 revision 机制不得破坏用户数据。
5. 冻结 canonical persistence runtime contract：quota/corruption/multi-tab/old-async-result 不得造成静默数据覆盖或清库恢复。

## P1（P0 稳定后紧接）

1. Template 子契约落地，防止万能 JSON 继续膨胀。
2. stale/remap/revalidation 明确并实现。
3. Timeline domain/application/view state 分层。
4. Analysis Workspace / Inspector 的 State、Review、Correction Flow 完整。
5. Global Shell / Design System 作为所有界面共同基线。

## P2

- Results 统一 derived dataset/query；
- Export/Creative 统一输入契约；
- Timeline Track/LOD/性能增强；
- AI Context Builder 与批量建议能力。

## P3

- 文档 lint、manifest、source mapping 自动化；
- 非关键体验增强与后续实验功能。

---

# 18. 关键风险与处理

1. **仓库尚未逐文件全量验证**：每个 Batch 启动时必须重新检查 affected files，不允许只依据设计假设代码现状。
2. **Scene/Sequence/Section schema 未完全冻结到代码形态**：在 B3/B5 前完成 schema design review，但不能新增与 Timeline/Analysis 并列的第二权威。
3. **Prompt/Context/ExportMapping 当前实现不完整**：按 Target contract 新建模块时必须保持与 FieldDefinition/Profile 的单向引用关系。
4. **UI 高密度复杂度**：优先组件化状态、键盘、Focus 和 LOD；不能靠更多 Card/Modal 缓解复杂度。
5. **迁移风险**：先兼容读、再新写、后迁移、最后删旧耦合；每步有数据对比和恢复策略。
6. **浏览器持久化风险**：IndexedDB quota/eviction/corruption 不能等同于正常数据删除；canonical data 进入只读/修复/备份恢复路径。
7. **异步竞争风险**：Worker/AI/export 旧任务晚到必须按 dependency revision 丢弃，不能覆盖新事实。
8. **外部信任边界风险**：导入内容与 AI response 均按不可信数据校验；前端不内置 server-owned secret。

---

# 19. 总体验收场景

最终至少用以下端到端任务验收整个产品架构：

1. 新项目导入媒体 → 自动切分 → 查看 Candidate → Boundary Review → 完成 Official Shot。
2. 进入 Analysis → 选择 Shot/Scene → 播放/导航/缩放 → 编辑字段 → Evidence → 自动保存。
3. AI 生成 Candidate → 查看 Observation/Interpretation → 对比已有值 → Accept/Reject → Provenance 可查。
4. Analysis 中发现 Shot 错 → Return Context 到 Preparation → Move/Split/Merge → 返回原分析上下文 → stale/remap 队列正确。
5. Timeline 进行结构浏览、Track 切换、Semantic Zoom、Marker 创建、Inspector 双向联动。
6. 切换 Template/Profile → 原有 Analysis 数据不丢失 → UI layout/renderer 更新 → Export mapping 正确。
7. Results Table 过滤/聚合 → stale 明确 → Export Preset → 表格/视频/水印视频输出。
8. Creative Transformation 从 confirmed data 生成派生产物，不反写 Analysis Fact。
9. 关闭并重新打开项目 → Media/Shot/Analysis/Evidence/Profile 恢复；Workspace/UI 临时状态按策略恢复或重建。
10. 大型项目下 Timeline、Navigator、Inspector、Results 保持可用性能和键盘操作。
11. 模拟 IndexedDB quota/transaction failure → 不显示假“已保存” → 用户可恢复/导出诊断。
12. 同项目双标签页或旧 Worker 结果晚到 → revision conflict/stale discard 生效 → 新数据不被覆盖。
13. 损坏/超版本导入包与非法 provider response → 被拒绝且不污染 canonical repository。

---

# 20. 文档覆盖策略

本总计划采用两层覆盖：

- **执行层覆盖**：前述 Phase 0–10 将所有领域、工作台、交互、数据、AI、Results、Runtime Reliability/Security、Migration、Governance 转化为可执行开发工作。
- **章节级覆盖**：附录 A 列出当前包中每一份 Markdown/TXT 文档及其全部标题，作为“不得遗漏”的检查清单。Archive 中重复的原始设计不重新成为权威需求，但其章节必须能映射到治理后的正式文档或保留为追溯材料。

在实际开发中，如果某个附录标题尚未能映射到完成的功能、明确的 Non-goal、后续版本项或已接受风险，则该 Batch 不得标记为完全完成。复审后的架构-计划逐项覆盖结论见 `../audit/MASTER_PLAN_COVERAGE_MATRIX.md`。

---

# 附录 A — 全文档章节覆盖清单


## A.00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens 全局产品架构与工作台 IA
- [ ] 1. 设计目标
- [ ] 2. 全局产品信息架构
- [ ] 3. 为什么取消原来的「总览」
- [ ] 4. 全局 Workspace Shell
- [ ] 4.1 整体结构
- [ ] 4.2 三个稳定区域
- [ ] 左侧
- [ ] 顶部
- [ ] 主工作区
- [ ] 5. 左侧导航的设计原则
- [ ] 6. 三个一级工作区
- [ ] 6.1 素材准备
- [ ] 6.2 逐镜分析
- [ ] 6.3 成果应用
- [ ] 7. 下沉后的详细设计边界
- [ ] 32. 全局数据流
- [ ] 33. 全局 UI 层级原则
- [ ] Workspace
- [ ] Drawer / Sheet
- [ ] Inspector
- [ ] Modal
- [ ] Dropdown / Popover
- [ ] 34. 交互语言原则
- [ ] 34.1 Workspace 是“工作的地方”
- [ ] 34.2 Settings 是“改变工作方式的地方”
- [ ] 34.3 正常状态安静，异常状态突出
- [ ] 34.4 用户语言优先于工程语言
- [ ] 35. 视觉信息密度原则
- [ ] 36. 页面关系总结
- [ ] 37. 推荐的产品定位表达

## A.00-global/WORKSPACE_DESIGN_SYSTEM.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens Workspace Design System
- [ ] 1. Design Philosophy
- [ ] 1.1 核心原则
- [ ] Content First
- [ ] Surface over Border
- [ ] Progressive Disclosure
- [ ] Selection Driven Workspace
- [ ] Contextual Tools
- [ ] 2. Workspace Architecture
- [ ] 3. Recommended Layout
- [ ] 4. Surface System
- [ ] 5. Dark Theme
- [ ] 6. Light Theme
- [ ] 7. Viewer Rule
- [ ] FAFAFB
- [ ] 101114
- [ ] 8. Accent Color
- [ ] 625BFF
- [ ] 9. Semantic Colors
- [ ] 10. Typography
- [ ] 11. Spacing System
- [ ] 12. Radius System
- [ ] 13. Border Rules
- [ ] 14. Shadow Rules
- [ ] 15. Button System
- [ ] 16. Icon Button
- [ ] 17. Input System
- [ ] 18. Focus Ring
- [ ] 19. Shot Card
- [ ] 20. Shot Card States
- [ ] 21. Shot Card Hover Preview
- [ ] 22. Shot Strip
- [ ] 23. Navigation Panel
- [ ] 24. Inspector
- [ ] 25. Inspector Section
- [ ] 26. Inspector Density
- [ ] 27. Toolbar
- [ ] Context Toolbar
- [ ] 28. Toolbar Density
- [ ] 29. Popover
- [ ] 30. Context Menu
- [ ] 31. Command Palette
- [ ] 32. Interaction State Model
- [ ] 33. Hover Rule
- [ ] 34. Selected Rule
- [ ] 35. Motion
- [ ] 36. Easing
- [ ] 37. Media First Rule
- [ ] 38. Density Modes
- [ ] Visual Mode
- [ ] Analysis Mode
- [ ] Data Mode
- [ ] 39. Workspace Modes
- [ ] 40. View Preference
- [ ] 41. Empty States
- [ ] 42. Loading
- [ ] 43. AI UI Rule
- [ ] 44. AI Analysis Component
- [ ] 45. Editing Philosophy
- [ ] 46. Accessibility
- [ ] 47. Keyboard First
- [ ] 48. Tooltip
- [ ] 49. Design Anti-Patterns
- [ ] Dashboardization
- [ ] Card Everything
- [ ] Rainbow UI
- [ ] Huge Radius
- [ ] Heavy Shadow
- [ ] Permanent Controls
- [ ] Deep Page Navigation
- [ ] 50. Final Visual Rule
- [ ] 51. Final Design Formula
- [ ] 52. One Sentence Design Principle

## A.01-preparation/PREPARATION_WORKSPACE.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens 素材准备工作台 UX / UI 设计方案
- [ ] 1. 背景与目标
- [ ] 2. 现状问题总结
- [ ] 2.1 前处理需要重新对齐新的全局三阶段架构
- [ ] 2.2 准备页模块并列，而不是任务连续
- [ ] 2.3 主操作竞争
- [ ] 2.4 参数暴露过多
- [ ] 2.5 扫描过程使用 Modal，导致上下文切换
- [ ] 2.6 候选结果存在重复确认
- [ ] 3. 新的信息架构
- [ ] 3.1 素材准备在全局架构中的位置
- [ ] 3.2 素材准备内部结构
- [ ] 3.3 与逐镜分析的职责边界
- [ ] 4. 前处理状态机
- [ ] 5. 页面整体布局
- [ ] 6. Step 1：导入素材
- [ ] 6.1 空状态
- [ ] 6.2 素材导入后
- [ ] 7. Step 2：智能切分
- [ ] 7.1 待识别状态
- [ ] 8. 切分设置 Drawer
- [ ] 8.1 参数命名原则
- [ ] 8.2 “高级参数”改为“专家设置”
- [ ] 9. 分析模板与 AI 辅助必须彻底离开前处理
- [ ] 10. 识别进行中
- [ ] 有真实进度时
- [ ] 无法精确计算进度时
- [ ] 10.1 运行期间设置锁定
- [ ] 11. 识别完成
- [ ] 12. 未来目标：只让用户检查不确定切点
- [ ] 13. Step 3：复核镜头
- [ ] 13.1 重新定义 Calibration Workspace
- [ ] 14. 复核工作台桌面布局
- [ ] 15. 顶部 Header
- [ ] 16. 左侧复核队列
- [ ] 16.1 默认不是“全部镜头”
- [ ] 16.2 导航实体从 Segment 转为 Boundary
- [ ] 17. 中央主视觉：Boundary Frame Pair
- [ ] 18. 视频与双帧证据同时可见
- [ ] 19. 切点预览模式
- [ ] 20. 右侧 Inspector
- [ ] 21. “切点正确”成为显式操作
- [ ] 22. 快捷键建议
- [ ] 23. 边界微调控件
- [ ] 24. “移动到当前帧”改成上下文操作
- [ ] 25. 删除切点
- [ ] 26. 补切
- [ ] 27. Timeline 设计
- [ ] 28. 全片 Timeline
- [ ] 29. “待回看 / Issues”改为“稍后处理”
- [ ] 30. 检测详情
- [ ] 31. Confidence 展示原则
- [ ] 32. 自动 Next
- [ ] 33. 修改后仍需再次确认
- [ ] 34. Undo / Redo
- [ ] 35. 保存状态
- [ ] 36. 完成复核
- [ ] 36.1 仍有待确认项
- [ ] 36.2 全部处理完成
- [ ] 37. 素材准备完成态
- [ ] 38. 项目再次打开时的行为
- [ ] 39. Modal / Drawer / Inspector 使用规范
- [ ] 40. 信息密度判断原则
- [ ] 41. 页面视觉层级
- [ ] 42. 视觉风格建议
- [ ] 42.1 减少 Border Card
- [ ] 42.2 正常状态弱化，异常状态强化
- [ ] 43. 移动端设计
- [ ] 44. 推荐组件架构
- [ ] 45. 现有组件迁移建议
- [ ] 46. 重构优先级
- [ ] V1：必须完成
- [ ] V1.5：高价值增强
- [ ] V2：智能复核
- [ ] 47. 与全局工作台方案的最终对齐
- [ ] 48. 最终理想体验
- [ ] 49. 一句话设计原则总结

## A.01-preparation/drafts/KEYFRAME_DESIGN_DRAFT.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] 关键帧方案（待设计）
- [ ] 当前状态

## A.02-analysis/ANALYSIS_WORKSPACE.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens 逐镜分析工作台 UI / UX / 交互架构方案
- [ ] 1. 产品定位
- [ ] 2. 与全局工作台的关系
- [ ] 3. 冻结职责边界：逐镜分析不能修改 Shot
- [ ] 可以
- [ ] 不可以
- [ ] 4. Shot Authority 与 Analysis Authority
- [ ] 5. 与时间轴方案的核心一致性
- [ ] 6. 整体 UI 架构
- [ ] 7. 推荐桌面尺寸
- [ ] 7.1 全局 Shell
- [ ] 7.2 Analysis Workspace
- [ ] 8. 工作台四类核心状态
- [ ] 9. PlaybackPosition
- [ ] 10. SelectedEntity
- [ ] 11. ResearchScope
- [ ] 12. Viewport
- [ ] 13. 四种状态的交互矩阵
- [ ] 14. Analysis Workspace Toolbar
- [ ] 15. Research Breadcrumb
- [ ] 16. Research Navigation
- [ ] 单击对象
- [ ] 双击对象
- [ ] Enter
- [ ] Esc
- [ ] Breadcrumb
- [ ] 17. 左侧 Structure Navigator
- [ ] 18. Structure Navigator 示例
- [ ] 19. Structure Row 信息
- [ ] Scene
- [ ] Shot
- [ ] Sequence
- [ ] Section
- [ ] 20. Selection 与 Playing 必须分开
- [ ] 21. Needs Review Structure
- [ ] 22. 中央 Player Stage
- [ ] 23. Selection Context Bar
- [ ] 24. Video Overlay 原则
- [ ] 25. Playback Controls
- [ ] 34. Marker Inspector
- [ ] 35. Marker 创建
- [ ] 36. Marker 与 Object Analysis 的区别
- [ ] 37. Analysis Template 定位
- [ ] 38. Template 与三个分析尺度
- [ ] 39. Template Selector
- [ ] 40. Analysis Settings Drawer
- [ ] 41. Template 不直接生成 Timeline Track
- [ ] 42. Template 与 Track Preference 的关系
- [ ] 43. Analysis Field 状态模型
- [ ] 50. AI 产品定位
- [ ] 51. AI Status 入口
- [ ] 52. AI Settings
- [ ] 53. 不推荐 AI 自动正式填充
- [ ] 57. AI 轻量问答入口
- [ ] 58. Context Builder 范围
- [ ] Shot Task
- [ ] Scene Task
- [ ] Story Task
- [ ] 77. ResearchScope 与 Timeline 的连接
- [ ] 78. 分析过程中发现 Shot 错误
- [ ] 79. Shot 问题入口
- [ ] Inspector More Menu
- [ ] Timeline Boundary Hover
- [ ] Timeline Context Menu
- [ ] 80. 调整分镜确认
- [ ] 81. Contextual Navigation 到素材准备
- [ ] 82. Return Context
- [ ] 83. Shot 修改后的同步原则
- [ ] 84. Shot Split
- [ ] 85. Shot Split Inspector 状态
- [ ] 86. Shot Merge
- [ ] 87. Structural Remap 与 Semantic Revalidation
- [ ] 可以自动重算 / 重映射
- [ ] 不能自动确认
- [ ] 88. Scene / Sequence / Section 同步
- [ ] 89. Editing Pace 自动更新
- [ ] 90. 返回 Analysis Workspace 的同步提示
- [ ] 91. 数据变化影响队列
- [ ] 92. 数据复核与 AI Candidate 必须分开
- [ ] 93. 自动恢复 Selection
- [ ] 94. Workbench Error State：尚未有正式 Shot
- [ ] 95. Workbench Error State：媒体丢失
- [ ] 96. 保存状态
- [ ] 97. Undo / Redo
- [ ] 98. Responsive Strategy
- [ ] ≥ 1440px
- [ ] 1180–1439px
- [ ] < 1180px
- [ ] 99. Panel Collapse
- [ ] 专注播放
- [ ] 专注分析
- [ ] 专注结构
- [ ] 100. 前端组件结构
- [ ] 101. Workspace Navigation State
- [ ] 102. Analysis State
- [ ] 103. Timeline State
- [ ] 104. Shot Sync State
- [ ] 105. 数据链路
- [ ] 110. AI 实施顺序
- [ ] 111. V1 工作台建议范围
- [ ] 112. V1.5
- [ ] 113. V2 / AI
- [ ] 114. 工作台交互层级统一规则
- [ ] 115. 最终主 Wireframe
- [ ] 116. 冻结设计原则
- [ ] 117. 一句话总结

## A.02-analysis/inspector/ANALYSIS_INSPECTOR.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens Analysis Inspector UI / UX 架构方案
- [ ] 1. 产品定位
- [ ] 2. Inspector 在整体数据链中的位置
- [ ] 3. Inspector 的核心职责
- [ ] 4. 一个 Shell，多种 Entity Renderer
- [ ] 5. Inspector 默认尺寸
- [ ] 6. Inspector 总体布局
- [ ] 7. 核心视觉原则
- [ ] 8. Inspector Header
- [ ] 9. Shot Header
- [ ] 10. Scene Header
- [ ] 11. Story Header
- [ ] 12. Marker Header
- [ ] 13. Header 状态不能做成“评分”
- [ ] 14. Shot Header More Menu
- [ ] 15. Inspector Body 不使用一级 Tabs
- [ ] 16. Analysis Field 是 Inspector 的核心组件
- [ ] 17. Field 默认视觉
- [ ] 18. 不在 Field 主界面长期暴露技术元数据
- [ ] 23. Template 的正确定位
- [ ] 24. Template 切换不会删除数据
- [ ] 31. 算法 / Derived 数据视觉
- [ ] 32. AI 数据视觉
- [ ] 33. 用户人工输入默认成为正式工作值
- [ ] 34. 人工值保存状态
- [ ] 35. AI 与正式值冲突
- [ ] 36. 采用 AI 值
- [ ] 38. Provenance 默认不抢占界面
- [ ] 43. Evidence Chip
- [ ] 44. Evidence Hover
- [ ] 45. Evidence 点击行为
- [ ] 46. Evidence Picker
- [ ] 50. AI Suggestion 必须区分观察与解释
- [ ] 51. AI 不展示长推理链
- [ ] 52. 多字段 AI 分析
- [ ] 53. AI Review Mode
- [ ] 54. AI Review：已有正式值
- [ ] 55. 不默认提供“全部采用”
- [ ] 56. Shot Inspector Field Groups
- [ ] 57. Group 展开规则
- [ ] 58. Shot Relationship Analysis
- [ ] 59. Scene Inspector 不只是 Shot 字段放大版
- [ ] 60. Scene Statistics 与 Interpretation 分区
- [ ] 61. Scene Evidence
- [ ] 62. Story Inspector
- [ ] 63. Sequence Inspector
- [ ] 64. Section Inspector
- [ ] 65. Film Inspector
- [ ] 66. Inspector 与 Timeline 的双向交互
- [ ] 67. Field → Timeline
- [ ] 68. Timeline → Inspector
- [ ] 69. Inspector 修改 → Timeline 更新
- [ ] 79. Inspector 的 Data Review 提示
- [ ] 80. Data Review Mode
- [ ] 81. stale Review 与 AI Candidate 可以同时存在
- [ ] 82. Data Review 与 AI Review 必须分开
- [ ] 83. “分析完成”概念
- [ ] 84. “分析完成”不应成为流程锁
- [ ] 85. 键盘交互
- [ ] 86. 长文本自动保存
- [ ] 87. Field Renderer Registry
- [ ] 88. 推荐 Field 组件目录
- [ ] 89. 不建设任意动态插件系统
- [ ] 90. Inspector 组件结构
- [ ] 91. Entity Renderer 结构
- [ ] 92. Entity Renderer 的差异
- [ ] 93. AI Ask Bar
- [ ] 94. AI Ask 输出
- [ ] 95. AI Ask 不是正式分析
- [ ] 96. Context Builder 与 Inspector
- [ ] 97. Shot Context
- [ ] 98. Scene Context
- [ ] 99. Story Context
- [ ] 104. V1 推荐范围
- [ ] 105. V1.5
- [ ] 106. V2 / AI
- [ ] 107. 冻结设计原则
- [ ] 108. 一句话总结

## A.03-results/RESULTS_WORKSPACE.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens 成果应用 Workspace 架构
- [ ] 19. 成果应用 Workspace
- [ ] 20. 数据表
- [ ] 20.1 定位
- [ ] 20.2 表格结构
- [ ] 21. 数据表的核心能力
- [ ] 22. 数据表默认“查看优先”
- [ ] 23. 导出与分享
- [ ] 24. 三种核心导出类型
- [ ] 24.1 分析表格
- [ ] 24.2 视频 + 分析表联动视频
- [ ] 25. 分析水印视频
- [ ] 26. 统一 Export Preset
- [ ] 27. 创作转化
- [ ] 27.1 定位
- [ ] 28. 创作转化入口
- [ ] 29. AI 在创作转化中的角色
- [ ] 30. 创作成果的最终形态
- [ ] 31. AI 视频生成未来的位置
- [ ] 32. 成果应用的数据消费契约（冻结）

## A.04-domain/analysis-data/ANALYSIS_DATA_MODEL.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens Analysis Data Model
- [ ] 19. Template 与数据库 Schema 必须分离
- [ ] 20. Field Definition
- [ ] 21. Field ID 必须稳定
- [ ] 22. Template Field Configuration
- [ ] 23. Template 的正确定位
- [ ] 24. Template 切换不会删除数据
- [ ] 25. Analysis Record
- [ ] 26. AI Candidate 不属于 Analysis Record
- [ ] 27. Analysis Candidate
- [ ] 28. AI Candidate 状态机
- [ ] 29. 分析数据来源必须区分
- [ ] 30. 不用一个 Confidence 混合所有来源
- [ ] 70. Inspector 与成果应用的数据契约
- [ ] 71. 数据表动态列
- [ ] 72. Template 对成果应用的作用
- [ ] 73. Output Capability
- [ ] 74. 成果应用默认只消费 Confirmed Data
- [ ] 75. stale 在成果数据表中的表现
- [ ] 76. AI Candidate 不作为成果正式列
- [ ] 77. 创作转化的数据来源
- [ ] 78. Shot 修改后的 stale
- [ ] 79. Inspector 的 Data Review 提示
- [ ] 80. Data Review Mode
- [ ] 81. stale Review 与 AI Candidate 可以同时存在
- [ ] 82. Data Review 与 AI Review 必须分开
- [ ] 100. Inspector 与 Timeline 不建立重复数据
- [ ] 101. 数据变化传播
- [ ] 102. 数据失效传播
- [ ] 103. Inspector 的最终数据流
- [ ] 104. 冻结数据原则

## A.04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens Evidence / Provenance 契约
- [ ] 37. Provenance
- [ ] 39. Evidence 是一等数据
- [ ] 40. Evidence 类型
- [ ] 41. EvidenceRef
- [ ] 42. Evidence 核心原则
- [ ] 47. Evidence Policy
- [ ] 48. Evidence Policy 示例
- [ ] 49. Evidence Required 不应阻止早期记录
- [ ] 50. 冻结原则

## A.04-domain/shot-structure/SHOT_STRUCTURE_CONTRACT.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens Shot Structure Contract
- [ ] 1. 目的
- [ ] 2. Authority
- [ ] 3. 时间契约
- [ ] 4. Candidate 与 Official 分离
- [ ] 5. Split / Merge / Boundary Move
- [ ] 6. 下游影响
- [ ] 7. Identity 与 Revision
- [ ] 8. 工作区边界
- [ ] 9. 冻结原则

## A.04-domain/template/TEMPLATE_CONTRACT.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens Template Contract
- [ ] Purpose
- [ ] Core separation
- [ ] Canonical concepts
- [ ] TemplateDefinition / AnalysisProfile
- [ ] AnalysisSchema
- [ ] UILayoutDefinition
- [ ] RendererDefinition
- [ ] PromptDefinition
- [ ] ContextDefinition
- [ ] ExportMapping
- [ ] Persistence
- [ ] Invariants
- [ ] Current vs Target
- [ ] CURRENT（仓库 2026-09-17 核对）
- [ ] TARGET
- [ ] Consumers

## A.04-domain/timeline/TIMELINE_ARCHITECTURE.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens 时间轴优化架构方案
- [ ] 1. 产品目标
- [ ] 2. 首版范围与后续边界
- [ ] 3. 当前实现基线
- [ ] 4. 三种分析尺度与四级结构
- [ ] 5. 时间轴信息架构
- [ ] 6. 时间坐标与精度契约
- [ ] 7. 正式结构的唯一数据来源
- [ ] 8. 覆盖方式与层级不变量
- [ ] 9. Boundary First 的交互模型
- [ ] 10. 结构编辑命令
- [ ] 11. Promote / Demote 与跨层边界
- [ ] 12. 结构身份、内容与引用保留
- [ ] 13. Shot 校准与结构成员重整
- [ ] 14. 草稿、事务、历史与 revision
- [ ] 15. 非法数据与错误恢复
- [ ] 16. Marker：单一自由观察
- [ ] 17. Marker 展示、Scope 与对象分析
- [ ] 18. Beat / Event 的语义边界
- [ ] 19. 分析维度与数据形态
- [ ] 20. 四类工作区状态
- [ ] 21. 上下文 Inspector
- [ ] 22. 导航、快捷键与交互优先级
- [ ] 23. Track Definition、Instance 与 Preference
- [ ] 24. View Adapter 与绘制契约
- [ ] 25. 轨道设置与持久化作用域
- [ ] 26. 视口与缩放数学
- [ ] 27. Semantic Zoom 与信息密度
- [ ] 28. 查询、渲染与播放更新
- [ ] 29. 缩略图、波形与资源预算
- [ ] 30. 首批分析轨：Editing Pace
- [ ] 31. 首批文本轨：Dialogue
- [ ] 32. 算法、统计、模型与用户的职责
- [ ] 33. Context Builder 与输出校验
- [ ] 34. AI 结构建议的状态机
- [ ] 35. 模块边界与复用
- [ ] 36. 存储演进与旧数据保留
- [ ] 37. 实施阶段与出口条件
- [ ] 38. 验收矩阵与性能门槛
- [ ] 39. 参考依据与采纳边界
- [ ] 40. 冻结决策与文档维护

## A.90-implementation/IMPLEMENTATION_MAP.md

**覆盖规则：** 本文件属于实施/迁移约束；对应内容已纳入 Batch 顺序、迁移和出口条件。

- [ ] AisenLens 设计 → 代码实施映射
- [ ] 推荐实施顺序
- [ ] 每个 Phase 的最小出口条件

## A.99-archive/ORIGINAL_INPUT_INDEX.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] 原始输入归档索引

## A.99-archive/original-input/00整体UI设计方案/AisenLens_Global_Workspace_UI_Architecture.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens 全局工作台 UI / IA 设计方案
- [ ] 1. 设计目标
- [ ] 2. 全局产品信息架构
- [ ] 3. 为什么取消原来的「总览」
- [ ] 4. 全局 Workspace Shell
- [ ] 4.1 整体结构
- [ ] 4.2 三个稳定区域
- [ ] 左侧
- [ ] 顶部
- [ ] 主工作区
- [ ] 5. 左侧导航的设计原则
- [ ] 6. 三个一级工作区
- [ ] 6.1 素材准备
- [ ] 6.2 逐镜分析
- [ ] 6.3 成果应用
- [ ] 7. 逐镜分析工作台
- [ ] 7.1 核心布局
- [ ] 8. 分析工作台的四个区域
- [ ] 8.1 左侧：影片结构导航器
- [ ] 8.2 中央：观察对象
- [ ] 8.3 右侧：Analysis Inspector
- [ ] 8.4 底部：多轨 Timeline
- [ ] 9. 分析模板的产品定位
- [ ] 电影语言模板
- [ ] 摄影研究模板
- [ ] 剪辑研究模板
- [ ] 10. 模板如何进入 UI
- [ ] 10.1 Toolbar 快速切换
- [ ] 11. 模板编辑方式
- [ ] 12. 模板与 Timeline 的关系
- [ ] 13. AI 辅助的产品定位
- [ ] 14. AI 状态入口
- [ ] 15. 统一「分析设置」
- [ ] 16. AI 辅助设置建议
- [ ] 17. AI 设置应该关注人与 AI 的权责关系
- [ ] 18. AI 结果应该直接嵌入 Inspector
- [ ] 19. 成果应用 Workspace
- [ ] 20. 数据表
- [ ] 20.1 定位
- [ ] 20.2 表格结构
- [ ] 21. 数据表的核心能力
- [ ] 22. 数据表默认“查看优先”
- [ ] 23. 导出与分享
- [ ] 24. 三种核心导出类型
- [ ] 24.1 分析表格
- [ ] 24.2 视频 + 分析表联动视频
- [ ] 25. 分析水印视频
- [ ] 26. 统一 Export Preset
- [ ] 27. 创作转化
- [ ] 27.1 定位
- [ ] 28. 创作转化入口
- [ ] 29. AI 在创作转化中的角色
- [ ] 30. 创作成果的最终形态
- [ ] 31. AI 视频生成未来的位置
- [ ] 32. 全局数据流
- [ ] 33. 全局 UI 层级原则
- [ ] Workspace
- [ ] Drawer / Sheet
- [ ] Inspector
- [ ] Modal
- [ ] Dropdown / Popover
- [ ] 34. 交互语言原则
- [ ] 34.1 Workspace 是“工作的地方”
- [ ] 34.2 Settings 是“改变工作方式的地方”
- [ ] 34.3 正常状态安静，异常状态突出
- [ ] 34.4 用户语言优先于工程语言
- [ ] 35. 视觉信息密度原则
- [ ] 36. 页面关系总结
- [ ] 37. 推荐的产品定位表达

## A.99-archive/original-input/00整体UI设计方案/DESIGN.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens Workspace Design System
- [ ] 1. Design Philosophy
- [ ] 1.1 核心原则
- [ ] Content First
- [ ] Surface over Border
- [ ] Progressive Disclosure
- [ ] Selection Driven Workspace
- [ ] Contextual Tools
- [ ] 2. Workspace Architecture
- [ ] 3. Recommended Layout
- [ ] 4. Surface System
- [ ] 5. Dark Theme
- [ ] 6. Light Theme
- [ ] 7. Viewer Rule
- [ ] FAFAFB
- [ ] 101114
- [ ] 8. Accent Color
- [ ] 625BFF
- [ ] 9. Semantic Colors
- [ ] 10. Typography
- [ ] 11. Spacing System
- [ ] 12. Radius System
- [ ] 13. Border Rules
- [ ] 14. Shadow Rules
- [ ] 15. Button System
- [ ] 16. Icon Button
- [ ] 17. Input System
- [ ] 18. Focus Ring
- [ ] 19. Shot Card
- [ ] 20. Shot Card States
- [ ] 21. Shot Card Hover Preview
- [ ] 22. Shot Strip
- [ ] 23. Navigation Panel
- [ ] 24. Inspector
- [ ] 25. Inspector Section
- [ ] 26. Inspector Density
- [ ] 27. Toolbar
- [ ] Context Toolbar
- [ ] 28. Toolbar Density
- [ ] 29. Popover
- [ ] 30. Context Menu
- [ ] 31. Command Palette
- [ ] 32. Interaction State Model
- [ ] 33. Hover Rule
- [ ] 34. Selected Rule
- [ ] 35. Motion
- [ ] 36. Easing
- [ ] 37. Media First Rule
- [ ] 38. Density Modes
- [ ] Visual Mode
- [ ] Analysis Mode
- [ ] Data Mode
- [ ] 39. Workspace Modes
- [ ] 40. View Preference
- [ ] 41. Empty States
- [ ] 42. Loading
- [ ] 43. AI UI Rule
- [ ] 44. AI Analysis Component
- [ ] 45. Editing Philosophy
- [ ] 46. Accessibility
- [ ] 47. Keyboard First
- [ ] 48. Tooltip
- [ ] 49. Design Anti-Patterns
- [ ] Dashboardization
- [ ] Card Everything
- [ ] Rainbow UI
- [ ] Huge Radius
- [ ] Heavy Shadow
- [ ] Permanent Controls
- [ ] Deep Page Navigation
- [ ] 50. Final Visual Rule
- [ ] 51. Final Design Formula
- [ ] 52. One Sentence Design Principle

## A.99-archive/original-input/01前处理设计方案/AisenLens_Preprocessing_Design_v2_Global_Aligned.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens 前处理工作台 UX / UI 设计方案
- [ ] 1. 背景与目标
- [ ] 2. 现状问题总结
- [ ] 2.1 前处理需要重新对齐新的全局三阶段架构
- [ ] 2.2 准备页模块并列，而不是任务连续
- [ ] 2.3 主操作竞争
- [ ] 2.4 参数暴露过多
- [ ] 2.5 扫描过程使用 Modal，导致上下文切换
- [ ] 2.6 候选结果存在重复确认
- [ ] 3. 新的信息架构
- [ ] 3.1 素材准备在全局架构中的位置
- [ ] 3.2 素材准备内部结构
- [ ] 3.3 与逐镜分析的职责边界
- [ ] 4. 前处理状态机
- [ ] 5. 页面整体布局
- [ ] 6. Step 1：导入素材
- [ ] 6.1 空状态
- [ ] 6.2 素材导入后
- [ ] 7. Step 2：智能切分
- [ ] 7.1 待识别状态
- [ ] 8. 切分设置 Drawer
- [ ] 8.1 参数命名原则
- [ ] 8.2 “高级参数”改为“专家设置”
- [ ] 9. 分析模板与 AI 辅助必须彻底离开前处理
- [ ] 10. 识别进行中
- [ ] 有真实进度时
- [ ] 无法精确计算进度时
- [ ] 10.1 运行期间设置锁定
- [ ] 11. 识别完成
- [ ] 12. 未来目标：只让用户检查不确定切点
- [ ] 13. Step 3：复核镜头
- [ ] 13.1 重新定义 Calibration Workspace
- [ ] 14. 复核工作台桌面布局
- [ ] 15. 顶部 Header
- [ ] 16. 左侧复核队列
- [ ] 16.1 默认不是“全部镜头”
- [ ] 16.2 导航实体从 Segment 转为 Boundary
- [ ] 17. 中央主视觉：Boundary Frame Pair
- [ ] 18. 视频与双帧证据同时可见
- [ ] 19. 切点预览模式
- [ ] 20. 右侧 Inspector
- [ ] 21. “切点正确”成为显式操作
- [ ] 22. 快捷键建议
- [ ] 23. 边界微调控件
- [ ] 24. “移动到当前帧”改成上下文操作
- [ ] 25. 删除切点
- [ ] 26. 补切
- [ ] 27. Timeline 设计
- [ ] 28. 全片 Timeline
- [ ] 29. “待回看 / Issues”改为“稍后处理”
- [ ] 30. 检测详情
- [ ] 31. Confidence 展示原则
- [ ] 32. 自动 Next
- [ ] 33. 修改后仍需再次确认
- [ ] 34. Undo / Redo
- [ ] 35. 保存状态
- [ ] 36. 完成复核
- [ ] 36.1 仍有待确认项
- [ ] 36.2 全部处理完成
- [ ] 37. 素材准备完成态
- [ ] 38. 项目再次打开时的行为
- [ ] 39. Modal / Drawer / Inspector 使用规范
- [ ] 40. 信息密度判断原则
- [ ] 41. 页面视觉层级
- [ ] 42. 视觉风格建议
- [ ] 42.1 减少 Border Card
- [ ] 42.2 正常状态弱化，异常状态强化
- [ ] 43. 移动端设计
- [ ] 44. 推荐组件架构
- [ ] 45. 现有组件迁移建议
- [ ] 46. 重构优先级
- [ ] V1：必须完成
- [ ] V1.5：高价值增强
- [ ] V2：智能复核
- [ ] 47. 与全局工作台方案的最终对齐
- [ ] 48. 最终理想体验
- [ ] 49. 一句话设计原则总结

## A.99-archive/original-input/01前处理设计方案/关键帧方案.txt

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] 无标题内容：按全文人工核对，不得因无标题而忽略。

## A.99-archive/original-input/02逐镜分析设计方案/AisenLens_Analysis_Inspector_UI_UX_数据交互架构方案.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens Analysis Inspector UI / UX / 数据交互架构方案
- [ ] 1. 产品定位
- [ ] 2. Inspector 在整体数据链中的位置
- [ ] 3. Inspector 的核心职责
- [ ] 4. 一个 Shell，多种 Entity Renderer
- [ ] 5. Inspector 默认尺寸
- [ ] 6. Inspector 总体布局
- [ ] 7. 核心视觉原则
- [ ] 8. Inspector Header
- [ ] 9. Shot Header
- [ ] 10. Scene Header
- [ ] 11. Story Header
- [ ] 12. Marker Header
- [ ] 13. Header 状态不能做成“评分”
- [ ] 14. Shot Header More Menu
- [ ] 15. Inspector Body 不使用一级 Tabs
- [ ] 16. Analysis Field 是 Inspector 的核心组件
- [ ] 17. Field 默认视觉
- [ ] 18. 不在 Field 主界面长期暴露技术元数据
- [ ] 19. Template 与数据库 Schema 必须分离
- [ ] 20. Field Definition
- [ ] 21. Field ID 必须稳定
- [ ] 22. Template Field Configuration
- [ ] 23. Template 的正确定位
- [ ] 24. Template 切换不会删除数据
- [ ] 25. Analysis Record
- [ ] 26. AI Candidate 不属于 Analysis Record
- [ ] 27. Analysis Candidate
- [ ] 28. AI Candidate 状态机
- [ ] 29. 分析数据来源必须区分
- [ ] 30. 不用一个 Confidence 混合所有来源
- [ ] 31. 算法 / Derived 数据视觉
- [ ] 32. AI 数据视觉
- [ ] 33. 用户人工输入默认成为正式工作值
- [ ] 34. 人工值保存状态
- [ ] 35. AI 与正式值冲突
- [ ] 36. 采用 AI 值
- [ ] 37. Provenance
- [ ] 38. Provenance 默认不抢占界面
- [ ] 39. Evidence 是一等数据
- [ ] 40. Evidence 类型
- [ ] 41. EvidenceRef
- [ ] 42. Evidence 核心原则
- [ ] 43. Evidence Chip
- [ ] 44. Evidence Hover
- [ ] 45. Evidence 点击行为
- [ ] 46. Evidence Picker
- [ ] 47. Evidence Policy
- [ ] 48. Evidence Policy 示例
- [ ] 49. Evidence Required 不应阻止早期记录
- [ ] 50. AI Suggestion 必须区分观察与解释
- [ ] 51. AI 不展示长推理链
- [ ] 52. 多字段 AI 分析
- [ ] 53. AI Review Mode
- [ ] 54. AI Review：已有正式值
- [ ] 55. 不默认提供“全部采用”
- [ ] 56. Shot Inspector Field Groups
- [ ] 57. Group 展开规则
- [ ] 58. Shot Relationship Analysis
- [ ] 59. Scene Inspector 不只是 Shot 字段放大版
- [ ] 60. Scene Statistics 与 Interpretation 分区
- [ ] 61. Scene Evidence
- [ ] 62. Story Inspector
- [ ] 63. Sequence Inspector
- [ ] 64. Section Inspector
- [ ] 65. Film Inspector
- [ ] 66. Inspector 与 Timeline 的双向交互
- [ ] 67. Field → Timeline
- [ ] 68. Timeline → Inspector
- [ ] 69. Inspector 修改 → Timeline 更新
- [ ] 70. Inspector 与成果应用的数据契约
- [ ] 71. 数据表动态列
- [ ] 72. Template 对成果应用的作用
- [ ] 73. Output Capability
- [ ] 74. 成果应用默认只消费 Confirmed Data
- [ ] 75. stale 在成果数据表中的表现
- [ ] 76. AI Candidate 不作为成果正式列
- [ ] 77. 创作转化的数据来源
- [ ] 78. Shot 修改后的 stale
- [ ] 79. Inspector 的 Data Review 提示
- [ ] 80. Data Review Mode
- [ ] 81. stale Review 与 AI Candidate 可以同时存在
- [ ] 82. Data Review 与 AI Review 必须分开
- [ ] 83. “分析完成”概念
- [ ] 84. “分析完成”不应成为流程锁
- [ ] 85. 键盘交互
- [ ] 86. 长文本自动保存
- [ ] 87. Field Renderer Registry
- [ ] 88. 推荐 Field 组件目录
- [ ] 89. 不建设任意动态插件系统
- [ ] 90. Inspector 组件结构
- [ ] 91. Entity Renderer 结构
- [ ] 92. Entity Renderer 的差异
- [ ] 93. AI Ask Bar
- [ ] 94. AI Ask 输出
- [ ] 95. AI Ask 不是正式分析
- [ ] 96. Context Builder 与 Inspector
- [ ] 97. Shot Context
- [ ] 98. Scene Context
- [ ] 99. Story Context
- [ ] 100. Inspector 与 Timeline 不建立重复数据
- [ ] 101. 数据变化传播
- [ ] 102. 数据失效传播
- [ ] 103. Inspector 的最终数据流
- [ ] 104. V1 推荐范围
- [ ] 105. V1.5
- [ ] 106. V2 / AI
- [ ] 107. 冻结设计原则
- [ ] 108. 一句话总结

## A.99-archive/original-input/02逐镜分析设计方案/AisenLens_时间轴优化架构方案.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens 时间轴优化架构方案
- [ ] 1. 产品目标
- [ ] 2. 首版范围与后续边界
- [ ] 3. 当前实现基线
- [ ] 4. 三种分析尺度与四级结构
- [ ] 5. 时间轴信息架构
- [ ] 6. 时间坐标与精度契约
- [ ] 7. 正式结构的唯一数据来源
- [ ] 8. 覆盖方式与层级不变量
- [ ] 9. Boundary First 的交互模型
- [ ] 10. 结构编辑命令
- [ ] 11. Promote / Demote 与跨层边界
- [ ] 12. 结构身份、内容与引用保留
- [ ] 13. Shot 校准与结构成员重整
- [ ] 14. 草稿、事务、历史与 revision
- [ ] 15. 非法数据与错误恢复
- [ ] 16. Marker：单一自由观察
- [ ] 17. Marker 展示、Scope 与对象分析
- [ ] 18. Beat / Event 的语义边界
- [ ] 19. 分析维度与数据形态
- [ ] 20. 四类工作区状态
- [ ] 21. 上下文 Inspector
- [ ] 22. 导航、快捷键与交互优先级
- [ ] 23. Track Definition、Instance 与 Preference
- [ ] 24. View Adapter 与绘制契约
- [ ] 25. 轨道设置与持久化作用域
- [ ] 26. 视口与缩放数学
- [ ] 27. Semantic Zoom 与信息密度
- [ ] 28. 查询、渲染与播放更新
- [ ] 29. 缩略图、波形与资源预算
- [ ] 30. 首批分析轨：Editing Pace
- [ ] 31. 首批文本轨：Dialogue
- [ ] 32. 算法、统计、模型与用户的职责
- [ ] 33. Context Builder 与输出校验
- [ ] 34. AI 结构建议的状态机
- [ ] 35. 模块边界与复用
- [ ] 36. 存储演进与旧数据保留
- [ ] 37. 实施阶段与出口条件
- [ ] 38. 验收矩阵与性能门槛
- [ ] 39. 参考依据与采纳边界
- [ ] 40. 冻结决策与文档维护

## A.99-archive/original-input/02逐镜分析设计方案/AisenLens_逐镜分析工作台_UI_UX_交互架构方案.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens 逐镜分析工作台 UI / UX / 交互架构方案
- [ ] 1. 产品定位
- [ ] 2. 与全局工作台的关系
- [ ] 3. 冻结职责边界：逐镜分析不能修改 Shot
- [ ] 可以
- [ ] 不可以
- [ ] 4. Shot Authority 与 Analysis Authority
- [ ] 5. 与时间轴方案的核心一致性
- [ ] 6. 整体 UI 架构
- [ ] 7. 推荐桌面尺寸
- [ ] 7.1 全局 Shell
- [ ] 7.2 Analysis Workspace
- [ ] 8. 工作台四类核心状态
- [ ] 9. PlaybackPosition
- [ ] 10. SelectedEntity
- [ ] 11. ResearchScope
- [ ] 12. Viewport
- [ ] 13. 四种状态的交互矩阵
- [ ] 14. Analysis Workspace Toolbar
- [ ] 15. Research Breadcrumb
- [ ] 16. Research Navigation
- [ ] 单击对象
- [ ] 双击对象
- [ ] Enter
- [ ] Esc
- [ ] Breadcrumb
- [ ] 17. 左侧 Structure Navigator
- [ ] 18. Structure Navigator 示例
- [ ] 19. Structure Row 信息
- [ ] Scene
- [ ] Shot
- [ ] Sequence
- [ ] Section
- [ ] 20. Selection 与 Playing 必须分开
- [ ] 21. Needs Review Structure
- [ ] 22. 中央 Player Stage
- [ ] 23. Selection Context Bar
- [ ] 24. Video Overlay 原则
- [ ] 25. Playback Controls
- [ ] 26. Analysis Inspector 定位
- [ ] 27. Shot Inspector
- [ ] 28. Analysis Field Renderer
- [ ] 29. 未分析字段
- [ ] 30. Scene Inspector
- [ ] 31. Scene Statistics 原则
- [ ] 32. Sequence / Section Inspector
- [ ] 33. Film Inspector
- [ ] 34. Marker Inspector
- [ ] 35. Marker 创建
- [ ] 36. Marker 与 Object Analysis 的区别
- [ ] 37. Analysis Template 定位
- [ ] 38. Template 与三个分析尺度
- [ ] 39. Template Selector
- [ ] 40. Analysis Settings Drawer
- [ ] 41. Template 不直接生成 Timeline Track
- [ ] 42. Template 与 Track Preference 的关系
- [ ] 43. Analysis Field 状态模型
- [ ] 44. Field Empty
- [ ] 45. Field AI Candidate
- [ ] 46. Field Draft
- [ ] 47. Field Confirmed
- [ ] 48. Field Stale
- [ ] 49. 来源与可追溯性
- [ ] 50. AI 产品定位
- [ ] 51. AI Status 入口
- [ ] 52. AI Settings
- [ ] 53. 不推荐 AI 自动正式填充
- [ ] 54. AI Candidate 状态机
- [ ] 55. AI Suggestion Card
- [ ] 56. AI Evidence
- [ ] 57. AI 轻量问答入口
- [ ] 58. Context Builder 范围
- [ ] Shot Task
- [ ] Scene Task
- [ ] Story Task
- [ ] 59. Timeline 定位
- [ ] 60. Timeline 默认信息架构
- [ ] 61. Timeline 默认视觉
- [ ] 62. Timeline Track 尺寸
- [ ] 63. Timeline Toolbar
- [ ] 64. Track Settings
- [ ] 65. Track Definition / Instance / Preference
- [ ] 66. Shot Track 在逐镜分析中的权限
- [ ] 允许
- [ ] 禁止
- [ ] 67. Structure Tracks 的编辑能力
- [ ] 68. Structure 编辑 UI
- [ ] 69. Editing Pace Track
- [ ] 70. Editing Pace Tooltip
- [ ] 71. Dialogue Track
- [ ] 72. Semantic Zoom
- [ ] 73. 全片 LOD
- [ ] 74. 中尺度 LOD
- [ ] 75. 近尺度 LOD
- [ ] 76. 单镜 / 逐帧 LOD
- [ ] 77. ResearchScope 与 Timeline 的连接
- [ ] 78. 分析过程中发现 Shot 错误
- [ ] 79. Shot 问题入口
- [ ] Inspector More Menu
- [ ] Timeline Boundary Hover
- [ ] Timeline Context Menu
- [ ] 80. 调整分镜确认
- [ ] 81. Contextual Navigation 到素材准备
- [ ] 82. Return Context
- [ ] 83. Shot 修改后的同步原则
- [ ] 84. Shot Split
- [ ] 85. Shot Split Inspector 状态
- [ ] 86. Shot Merge
- [ ] 87. Structural Remap 与 Semantic Revalidation
- [ ] 可以自动重算 / 重映射
- [ ] 不能自动确认
- [ ] 88. Scene / Sequence / Section 同步
- [ ] 89. Editing Pace 自动更新
- [ ] 90. 返回 Analysis Workspace 的同步提示
- [ ] 91. 数据变化影响队列
- [ ] 92. 数据复核与 AI Candidate 必须分开
- [ ] 93. 自动恢复 Selection
- [ ] 94. Workbench Error State：尚未有正式 Shot
- [ ] 95. Workbench Error State：媒体丢失
- [ ] 96. 保存状态
- [ ] 97. Undo / Redo
- [ ] 98. Responsive Strategy
- [ ] ≥ 1440px
- [ ] 1180–1439px
- [ ] < 1180px
- [ ] 99. Panel Collapse
- [ ] 专注播放
- [ ] 专注分析
- [ ] 专注结构
- [ ] 100. 前端组件结构
- [ ] 101. Workspace Navigation State
- [ ] 102. Analysis State
- [ ] 103. Timeline State
- [ ] 104. Shot Sync State
- [ ] 105. 数据链路
- [ ] 106. 同一 Analysis Record 的消费者
- [ ] 107. Timeline Renderer 原则
- [ ] 108. Timeline Adapter 原则
- [ ] 109. Performance 原则
- [ ] 110. AI 实施顺序
- [ ] 111. V1 工作台建议范围
- [ ] 112. V1.5
- [ ] 113. V2 / AI
- [ ] 114. 工作台交互层级统一规则
- [ ] 115. 最终主 Wireframe
- [ ] 116. 冻结设计原则
- [ ] 117. 一句话总结

## A.99-archive/original-input/task-input/AisenLens 连续架构审计、拆分重构与最终打包 Prompt.md

**覆盖规则：** 原始输入仅用于追溯；其已治理内容由正式 Source of Truth 承接。以下标题仍纳入覆盖核对，不能因归档而遗忘需求。

- [ ] AisenLens 架构审计、文档拆分、边界治理与最终交付任务
- [ ] 0. 总执行规则
- [ ] 1. 最重要的原则
- [ ] Domain Definition
- [ ] Workspace Design
- [ ] UI / Design System
- [ ] Application Layer
- [ ] Implementation
- [ ] 2. 不要以“文件”为第一思考单位
- [ ] 3. 第一阶段：扫描全部输入
- [ ] 4. 建立 Current State 与 Target State
- [ ] 5. 第二阶段：建立 Concept Registry
- [ ] 6. 同义概念检查
- [ ] 7. 第三阶段：建立 Authority Map
- [ ] 8. Official Shot 必须特别审计
- [ ] 9. 第四阶段：Source of Truth 审计
- [ ] 10. 第五阶段：重复审计
- [ ] 11. 第六阶段：矛盾审计
- [ ] 数据模型矛盾
- [ ] Authority 矛盾
- [ ] 生命周期矛盾
- [ ] Workspace 矛盾
- [ ] Domain / UI 矛盾
- [ ] Persistence 矛盾
- [ ] AI 矛盾
- [ ] Template 矛盾
- [ ] 12. Conflict Matrix
- [ ] 13. 第七阶段：Workspace Boundary 审计
- [ ] 14. Preparation Workspace
- [ ] 15. Analysis Workspace
- [ ] 16. Results Workspace
- [ ] 17. 第八阶段：Timeline 专项审计
- [ ] 18. 时间系统统一
- [ ] 19. 第九阶段：Analysis Domain / Inspector 专项审计
- [ ] 20. Analysis 状态机
- [ ] 21. Shot 改动与 Analysis Stale
- [ ] 22. 第十阶段：Evidence / Provenance 专项审计
- [ ] 23. 第十一阶段：Template 专项审计
- [ ] 24. 第十二阶段：AI Boundary 审计
- [ ] 25. 第十三阶段：State Ownership 审计
- [ ] 26. 第十四阶段：Command / Event 审计
- [ ] 27. 第十五阶段：Dependency Graph
- [ ] 28. 第十六阶段：重新定义最终文档 Source of Truth
- [ ] 29. 推荐文档层级原则
- [ ] 30. Global 层
- [ ] 31. Domain 层
- [ ] 32. Workspace 层
- [ ] 33. Design System
- [ ] 34. Implementation 层
- [ ] 35. 第十七阶段：实际拆分和修改文件
- [ ] 36. 拆分要求
- [ ] 37. 引用治理
- [ ] 38. Frontmatter
- [ ] 39. 文档内部结构
- [ ] 40. Invariants
- [ ] 41. 第十八阶段：映射当前代码
- [ ] 42. 不要求立即重写生产代码
- [ ] 43. 第十九阶段：重新执行第二轮审计
- [ ] 44. 第二轮 Concept Registry 校验
- [ ] 45. 第二轮 Source of Truth 校验
- [ ] 46. 文档质量检查
- [ ] 47. 空文件处理
- [ ] 48. 第二十阶段：建立最终索引
- [ ] 49. 建立 ARCHITECTURE_INDEX.md
- [ ] 50. 建立 AI_DEVELOPMENT_GUIDE.md
- [ ] 51. 建立 DECISION_LOG.md
- [ ] 52. 建立 MIGRATION_PLAN.md
- [ ] 53. Acceptance Criteria
- [ ] 54. 最终输出报告
- [ ] 55. 最终目录
- [ ] 56. Manifest
- [ ] 57. CHANGELOG
- [ ] 58. 不删除原始资料
- [ ] 59. 最终 ZIP 打包要求
- [ ] 60. 打包前验证
- [ ] 61. 最终交付要求
- [ ] 62. 最终工作原则

## A.ARCHITECTURE_INDEX.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] ARCHITECTURE INDEX

## A.CHANGELOG.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] CHANGELOG
- [ ] 2026-09-17 — Refined Architecture Package
- [ ] Preservation
- [ ] Added
- [ ] Modified without deleting original content
- [ ] Merged / de-duplicated semantically

## A.README.md

**覆盖规则：** 本文件属于产品/Domain/Workspace/Design 正式设计；标题所代表的能力必须有实现、明确版本归属或显式 Non-goal。

- [ ] AisenLens 优化设计总目录
- [ ] 目录
- [ ] 产品主链
- [ ] Authority Chain
- [ ] Source of Truth
- [ ] 文档状态
- [ ] 维护规则
- [ ] 内容守恒规则（本轮新增硬约束）

## A.audit/AUTHORITY_MAP.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] AUTHORITY MAP
- [ ] Frozen authority chain

## A.audit/COMMAND_EVENT_MAP.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] COMMAND / EVENT MAP

## A.audit/CONCEPT_REGISTRY.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] CONCEPT REGISTRY — PRE/POST GOVERNANCE CONSOLIDATED
- [ ] Alias / non-alias decisions

## A.audit/CONFLICT_AUDIT.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] CONFLICT AUDIT
- [ ] Notes

## A.audit/CONFLICT_MATRIX.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] CONFLICT MATRIX

## A.audit/CURRENT_REPOSITORY_BASELINE.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] Current Repository Baseline
- [ ] Verified CURRENT facts
- [ ] Important CURRENT/TARGET gap
- [ ] Verification scope

## A.audit/DECISION_LOG.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] DECISION LOG
- [ ] D-001 — Official Shot Authority
- [ ] D-002 — Timeline positioning
- [ ] D-003 — Analysis / Inspector separation
- [ ] D-004 — Evidence / Provenance
- [ ] D-005 — Template boundary
- [ ] D-006 — Results authority
- [ ] D-007 — Content preservation

## A.audit/DEPENDENCY_GRAPH.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] DEPENDENCY GRAPH
- [ ] Allowed direction
- [ ] Cross-domain dependencies
- [ ] Forbidden dependencies
- [ ] Cycle audit

## A.audit/DOCUMENT_QUALITY_CHECK.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] DOCUMENT QUALITY CHECK

## A.audit/DUPLICATE_AUDIT.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] DUPLICATE AUDIT
- [ ] Content-preservation handling

## A.audit/FINAL_ARCHITECTURE_AUDIT.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] FINAL ARCHITECTURE AUDIT
- [ ] Executive Summary
- [ ] Current Architecture
- [ ] Target Architecture
- [ ] Concept Registry Summary
- [ ] Authority Map
- [ ] Source of Truth Summary
- [ ] Major Duplicates
- [ ] Major Conflicts
- [ ] P0
- [ ] P1
- [ ] Workspace Boundaries
- [ ] Timeline Decision
- [ ] Analysis / Inspector Decision
- [ ] Evidence Decision
- [ ] Template Decision
- [ ] AI Boundary
- [ ] State Ownership
- [ ] Dependency Rules
- [ ] Final Documentation Architecture
- [ ] Implementation Boundary
- [ ] Migration Priorities
- [ ] Remaining Risks
- [ ] Final validation result

## A.audit/FINAL_CONCEPT_REGISTRY.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] FINAL CONCEPT REGISTRY
- [ ] Alias / non-alias decisions

## A.audit/FINAL_SOURCE_OF_TRUTH_MATRIX.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] FINAL SOURCE OF TRUTH MATRIX
- [ ] Enforcement rule

## A.audit/SOURCE_OF_TRUTH_MATRIX.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] SOURCE OF TRUTH MATRIX
- [ ] Enforcement rule

## A.audit/STATE_OWNERSHIP.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] STATE OWNERSHIP
- [ ] Invariant

## A.audit/WORKSPACE_BOUNDARY_AUDIT.md

**覆盖规则：** 本文件属于架构治理/验收约束；对应结论必须体现在 Phase gate、DoD、风险或迁移计划中。

- [ ] WORKSPACE BOUNDARY AUDIT
- [ ] Correction flow

## A.implementation/AI_DEVELOPMENT_GUIDE.md

**覆盖规则：** 本文件属于实施/迁移约束；对应内容已纳入 Batch 顺序、迁移和出口条件。

- [ ] AI DEVELOPMENT GUIDE
- [ ] Conflict precedence
- [ ] Mandatory rules

## A.implementation/IMPLEMENTATION_BOUNDARY.md

**覆盖规则：** 本文件属于实施/迁移约束；对应内容已纳入 Batch 顺序、迁移和出口条件。

- [ ] IMPLEMENTATION BOUNDARY

## A.implementation/MIGRATION_PLAN.md

**覆盖规则：** 本文件属于实施/迁移约束；对应内容已纳入 Batch 顺序、迁移和出口条件。

- [ ] MIGRATION PLAN

---

## A.audit/ARCHITECTURE_REVIEW_2026-09-17.md

- [ ] Overall assessment / findings fixed / accepted-deferred items / recommended implementation order

## A.audit/MASTER_PLAN_COVERAGE_MATRIX.md

- [ ] Product/domain/UI/runtime architecture areas all mapped to plan phases or explicit non-goals
- [ ] Any future architecture document addition updates this matrix and the Master Plan

## A.05-runtime/OPERATIONAL_ARCHITECTURE.md

- [ ] Runtime boundaries
- [ ] Persistence safety / quota / corruption / multi-tab revision
- [ ] Worker and task lifecycle
- [ ] Security and trust boundaries / AI provider boundary
- [ ] Observability without leaking content
- [ ] Typed error model
- [ ] Delivery / CI gates and rollback
- [ ] Feature rollout
- [ ] Capacity and performance budgets
- [ ] Release invariants

# 附录 B — 使用本计划的规则

1. 开发团队以本文确定**顺序和出口条件**，以对应 Source of Truth 文档确定**具体行为和模型细节**。
2. 每个 Batch 开始时，从附录 A 勾选本 Batch 涉及章节；结束时逐项标注 implemented / deferred-with-reason / non-goal / accepted-risk。
3. 不允许用“已经做了类似功能”代替章节核对；同名 UI 与同一 Domain Concept 不是同一件事。
4. UI/UX 章节与 Domain 章节拥有同等完成权重：后端/模型完成但界面状态、纠错、键盘、恢复未完成时，Batch 不得标为 Done。
5. 新需求优先判断归属到既有 Domain/Workspace/Design System，不新增平行 Source of Truth。
6. 当实现发现设计与 CURRENT 冲突，先更新 current baseline/decision，再实施；不得静默偏离设计。

