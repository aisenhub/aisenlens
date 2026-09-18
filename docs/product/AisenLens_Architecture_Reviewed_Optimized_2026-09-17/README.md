---
title: "AisenLens Optimization Design Index"
doc_type: design-index
status: approved
version: 1.1
last_reviewed: 2026-09-18
scope:
  - repository-docs
  - webapp
source_of_truth_for:
  - design-document-governance
  - design-source-of-truth-map
---

# AisenLens 优化设计总目录

计划文档在plans文件中，计划执行中有问题就去参考架构文件和总计划。

本目录把本轮优化方案按三条轴组织：

1. **用户工作流**：素材准备 → 逐镜分析 → 成果应用。
2. **跨工作区领域契约**：Shot / Timeline / Analysis Data / Evidence & Provenance。
3. **运行时工程契约**：Persistence / Worker / AI Provider / Import-Export / Security / Observability / Release。

目标不是让文档目录机械复制代码目录，而是让每个设计问题只有一个明确的 Source of Truth，再通过 `implementation_areas` 映射到现有 `apps/webapp/src/features/*`。

## 目录

```text
00-global/
  GLOBAL_WORKSPACE_ARCHITECTURE.md
  WORKSPACE_DESIGN_SYSTEM.md
01-preparation/
  PREPARATION_WORKSPACE.md
  drafts/KEYFRAME_DESIGN_DRAFT.md
02-analysis/
  ANALYSIS_WORKSPACE.md
  inspector/ANALYSIS_INSPECTOR.md
03-results/
  RESULTS_WORKSPACE.md
04-domain/
  timeline/TIMELINE_ARCHITECTURE.md
  analysis-data/ANALYSIS_DATA_MODEL.md
  ai/AI_ANALYSIS_CONTRACT.md
  shot-structure/SHOT_STRUCTURE_CONTRACT.md
  evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md
  template/TEMPLATE_CONTRACT.md
05-runtime/
  OPERATIONAL_ARCHITECTURE.md
audit/
  FINAL_ARCHITECTURE_AUDIT.md
  FINAL_CONCEPT_REGISTRY.md
  FINAL_SOURCE_OF_TRUTH_MATRIX.md
  ...
implementation/
  IMPLEMENTATION_BOUNDARY.md
  MIGRATION_PLAN.md
90-implementation/
  IMPLEMENTATION_MAP.md
99-archive/
  ORIGINAL_INPUT_INDEX.md
  original-input/...
  
  
plans/
  AisenLens_MASTER_DEVELOPMENT_PLAN.md
  AisenLens_Agent_Execution_Plans_Reviewed_Optimized/...
  
	
```

## 产品主链

```text
Media
  ↓
Detection Candidate
  ↓
Boundary Review
  ↓
Official Shot
  ↓
Analysis Record
  ↓
Confirmed Analysis
  ↓
Results Dataset
  ↓
Export / Share / Creative Transformation
```

## Authority Chain

```text
素材准备          逐镜分析             成果应用
Shot Authority → Analysis Authority → Consumption Authority
```

- **Shot Authority**：只在素材准备中建立/修正正式 Shot 与 Boundary。
- **Analysis Authority**：逐镜分析消费正式 Shot，生产 Canonical Analysis Data；不直接修改 Shot。
- **Consumption Authority**：成果应用消费已确认分析数据，不反向成为分析事实来源。

## Source of Truth

| 问题 | 唯一权威文档 |
| --- | --- |
| 三大 Workspace、全局导航、IA、跨工作区数据流 | `00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md` |
| Native Studio 桌面体验、颜色/材质/token、Panel、direct manipulation、motion、Preference、可访问性、视觉回归 | `00-global/WORKSPACE_DESIGN_SYSTEM.md` |
| 导入、自动切分、Boundary Review、正式 Shot 形成 | `01-preparation/PREPARATION_WORKSPACE.md` |
| 逐镜分析编排、选择/播放/研究范围、跨工作区纠错 | `02-analysis/ANALYSIS_WORKSPACE.md` |
| Inspector UI、Field UI、AI Review UI、Evidence UI | `02-analysis/inspector/ANALYSIS_INSPECTOR.md` |
| 数据表、导出分享、创作转化 | `03-results/RESULTS_WORKSPACE.md` |
| 时间坐标、结构层级、Track、Marker、LOD、Timeline 渲染契约 | `04-domain/timeline/TIMELINE_ARCHITECTURE.md` |
| AnalysisRecord、Candidate、状态、stale、数据传播 | `04-domain/analysis-data/ANALYSIS_DATA_MODEL.md` |
| AI Candidate 生命周期、ContextManifest、Provider 边界、accept transaction | `04-domain/ai/AI_ANALYSIS_CONTRACT.md` |
| Official Shot / Boundary / revision / split / merge 权责 | `04-domain/shot-structure/SHOT_STRUCTURE_CONTRACT.md` |
| Provenance、EvidenceRef、Evidence Policy | `04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md` |
| Template/Profile、UI Layout、Prompt/Context、Export Mapping 边界 | `04-domain/template/TEMPLATE_CONTRACT.md` |
| IndexedDB/Worker/AI Provider/导入导出/安全/可观测/发布运行时约束 | `05-runtime/OPERATIONAL_ARCHITECTURE.md` |

## 文档状态

统一使用：

- `draft`：探索中，不作为实施依据。
- `target-design`：目标设计，尚不代表当前代码已实现。
- `approved`：已批准，可作为实施输入。
- `implementing`：正在落地。
- `implemented`：已由代码与验收证据实现。
- `archived`：仅供追溯。

**重要：`target-design` 不等于当前实现事实。** 实施前仍应以仓库当前 `AGENTS.md`、`docs/architecture/PROJECT_ARCHITECTURE.md`、`docs/product/DOCUMENTATION_STATUS.md` 与代码为基线核对。

## 维护规则

1. 共享数据结构只在 `04-domain` 定义，工作区文档只描述如何消费/编辑。
2. Global 只定义 Workspace 边界，不重复 Inspector、Timeline 或 Results 的细节。
3. 任何 Shot 结构变更都先经过 Shot Authority；Analysis 只接收 revision 并产生 stale/review 影响。
4. AI Candidate 与正式 Analysis Record 永远分离，必须经过显式审核才能成为正式值。
5. Canonical persistence、异步任务、外部输入与 AI Provider 必须遵守 Runtime Architecture 的 revision / validation / recovery 边界。
6. 当前 frozen persistence baseline 为 IndexedDB v19；Timeline/Results 是派生 read model，Shot/Analysis 不得重新双写；v18→v19 development-reset 仅是正式用户数据产生前的一次性例外。
7. 原始输入保存在 `99-archive/original-input/`，仅用于追溯，不作为新的实施 Source of Truth。
8. UI/UX 只以 `WORKSPACE_DESIGN_SYSTEM.md` 当前版本为正式设计依据；2026-09-18 的 V2 Native Studio 已显式 supersede 旧 Calm/Cinematic/Violet 设计，旧视觉只在 Git/Archive 历史中追溯，不形成视觉兼容要求。


## 内容守恒规则（本轮新增硬约束）

- 除重复内容确需合并外，不得为了简化、统一风格或缩短篇幅而删除原始信息。
- `MOVE / SPLIT / MERGE / REWRITE / REFERENCE ONLY` 必须保持信息可追溯；语义被移动后，旧位置应给出引用或在 CHANGELOG 中给出去向。
- 所有用户提供的原始材料完整保存在 `99-archive/original-input/`；Archive 只用于追溯，不参与正式 Source of Truth。
- 默认对既有正式文档采取“原文保留 + Authority 注记 + 新增治理契约”的方式；当用户明确批准 Source of Truth 换代时，可以整体 supersede 旧设计，但必须在 CHANGELOG 记录替代关系并保留 Git/Archive 可追溯性。
