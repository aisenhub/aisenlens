---
title: "AisenLens Template Contract"
doc_type: domain-contract
status: target-design
version: 1.0
last_reviewed: 2026-09-17
workspace:
  - analysis
  - results
scope:
  - webapp
  - domain
  - configuration
depends_on:
  - ANALYSIS_DATA_MODEL
  - EVIDENCE_PROVENANCE_CONTRACT
source_of_truth_for:
  - template-definition
  - analysis-profile
  - template-field-usage
  - ui-layout-definition
  - renderer-definition
  - prompt-definition
  - context-definition
  - export-mapping
implementation_areas:
  - apps/webapp/src/features/template
  - apps/webapp/src/features/analysis
  - apps/webapp/src/features/export
---

# AisenLens Template Contract

## Purpose

本文件把散落在 Analysis Workspace、Inspector、Analysis Data Model 和 Results 中的 Template 职责收敛为单一权威边界。原文中的 Template 说明继续保留，用于工作流和 UI 语境；发生定义冲突时，以本文件为 Template 领域 Source of Truth。

## Core separation

Template 不是 Analysis Fact，也不是数据库 Schema 的替代物。Template 负责“如何组织、呈现、采集和建议分析”，而稳定业务语义与正式分析值分别由 `AnalysisFieldDefinition` 与 `AnalysisRecord` 所属契约拥有。

```text
Stable field semantics            -> Analysis Data Model
Template/profile composition      -> Template Contract
Inspector renderer behavior       -> Analysis Inspector
AI prompt/context execution       -> AI/Application layer using Template definitions
Export formatting/mapping         -> Template export mapping + Results consumer
Formal analysis facts             -> Analysis Record
```

## Canonical concepts

### TemplateDefinition / AnalysisProfile

一个可版本化、可持久化的分析配置集合。它引用稳定 `fieldId`，定义字段组合、顺序、分组、表面呈现策略与交互策略；不得复制正式分析值。

### AnalysisSchema

这里的 Schema 指分析字段语义集合，而不是 UI 表单 JSON。稳定字段 ID、value type、允许值及证据要求由 Analysis Data Model 拥有；Template 只能引用或快照经版本化的定义。

### UILayoutDefinition

只描述 Section、顺序、密度、可见性与 Surface 选择。它不能改变字段的业务含义。

### RendererDefinition

定义 `field kind -> renderer` 或 surface renderer preference。Renderer 不能成为字段语义来源，也不能直接写跨域正式数据。

### PromptDefinition

定义 AI 请求的任务说明、输出约束与可使用字段。Prompt 的版本必须进入 AI Candidate provenance；Prompt 本身不得把 AI 输出直接升级为正式 Analysis Record。

### ContextDefinition

定义 Context Builder 可以读取哪些正式数据、Evidence 和邻接结构。Context 是输入选择规则，不是新的持久化事实副本。

### ExportMapping

定义字段到表格列、报告区块或外部格式的映射。它只消费符合 Results eligibility 的数据。

## Persistence

- Template/Profile：稳定持久化并版本化。
- UI 临时展开/选择状态：不属于 Template，留在 Workspace/UI state。
- PromptDefinition / ContextDefinition：若会影响可追溯 AI 输出，必须版本化；纯运行期编排可留在 Application 层。
- RendererDefinition：通常是代码/注册表配置；只有用户可配置部分才进入持久化 Profile。
- ExportMapping：可作为 Template/Profile 的独立可版本化附属配置，不得与 AnalysisRecord 混存。

## Invariants

1. Template 切换不得删除既有 AnalysisRecord。
2. Template 不拥有正式分析值。
3. Template 不直接生成 Timeline Track；它只能推荐显示偏好或引用 TrackDefinition。
4. Renderer/UI 配置不得反向改变字段业务语义。
5. Prompt/Context 产生的是 Candidate；Candidate 经过显式采用后才可形成正式值。
6. ExportMapping 不得绕过 Results 的 confirmed/stale eligibility 规则。
7. 一个稳定字段必须使用稳定 `fieldId`；显示名变化不得隐式创建新字段。

## Current vs Target

### CURRENT（仓库 2026-09-17 核对）

当前 `apps/webapp/src/features/template/types.ts` 已存在 `FieldDefinitionSnapshot`、`ProjectAnalysisProfileSnapshot`、`AnalysisProfileFieldUsage`、Surface/Widget/Density 等类型，并由 Shot 数据直接引用 `AnalysisFieldEntry`。当前实现更接近“Project Analysis Profile + field snapshot”，尚未等同于本文完整的 Prompt/Context/ExportMapping 拆分。

### TARGET

沿用现有 Profile/Field Snapshot，而不是另造第二套 Template 模型；逐步将 UI layout、AI prompt/context 与 export mapping 从万能 Template 概念中拆出明确子契约。

## Consumers

- Analysis Workspace：选择/应用 Profile，并展示其字段组合。
- Analysis Inspector：按 Profile 选择 Renderer 与布局，但不拥有 Template 语义。
- AI Application：读取 Prompt/Context 定义生成 Candidate。
- Results：读取 ExportMapping 和可见字段配置，但不写回 Analysis Fact。
