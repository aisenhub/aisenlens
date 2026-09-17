# AisenLens 架构审计、文档拆分、边界治理与最终交付任务

你现在担任 AisenLens 项目的：

- 首席软件架构师
- 产品架构师
- Domain Architect
- 前端架构师
- 数据架构师
- AI 功能架构师
- 技术文档治理负责人

项目仓库：

https://github.com/aisenhub/aisenlens

我会同时提供一份 AisenLens 优化设计方案压缩包。

你的任务不是简单总结这些文档。

你需要：

> 对整个优化方案进行系统性架构审计，识别所有领域、Authority、Source of Truth、数据模型、状态、生命周期、Workspace 边界、重复定义、冲突定义和循环依赖，然后在审计结果基础上真正重新拆分和整理这些设计文档，形成一套可以直接指导后续 AI 和开发人员实施的最终设计包。

最终必须输出一个新的 ZIP 压缩文件。

---

# 0. 总执行规则

这是一个连续任务。

从开始执行到最终生成 ZIP：

不要中途停止。

不要每完成一步就询问我是否继续。

不要让我手工复制、移动或修改文件。

不要只输出建议。

你必须实际完成：

读取

分析

建立模型

审计

拆分

重构

修改文档

建立索引

重新检查

最终打包

整个流程。

只有当确实存在无法读取的文件、损坏文件或工具能力限制时，才记录限制。

普通架构判断不要反复向我询问。

在存在多个合理方案时：

选择你认为架构长期维护成本最低、职责最清楚、Source of Truth 最稳定的方案。

但必须把关键架构决策记录下来。

---

# 1. 最重要的原则

整个任务必须遵循：

> 一个核心概念只能存在一个权威定义。

其他地方可以：

引用它

解释如何使用它

展示它

操作它

消费它

但不要重新定义它。

必须明确区分：

## Domain Definition

定义：

数据是什么

规则是什么

生命周期是什么

谁拥有它

谁可以修改它

## Workspace Design

定义：

用户如何使用领域能力

工作台如何组织

流程如何进行

## UI / Design System

定义：

视觉

交互

布局

组件状态

## Application Layer

定义：

如何组织 Domain Command

如何协调多个 Domain

如何执行 Workflow

## Implementation

定义：

代码放在哪里

Module Boundary

依赖方向

迁移顺序

不要让这些层次互相混在一起。

---

# 2. 不要以“文件”为第一思考单位

最重要的要求：

不要先问：

“这个文件应该放哪个文件夹？”

而应该先问：

“这个 Concept 到底属于谁？”

必须先识别：

Concept

Entity

Value Object

State

Lifecycle

Authority

Command

Event

Source of Truth

Dependency

然后才决定文档如何拆分。

文件目录只是最后结果。

---

# 3. 第一阶段：扫描全部输入

首先：

解压我提供的设计包。

递归读取所有：

.md

.txt

.json

yaml

yml

以及其他可读设计文档。

不要只读取文件标题。

要完整理解每份主要文档。

同时检查：

文件名

目录结构

相对链接

内部引用

重复章节

废弃文件名

空文件

Draft

历史设计

跨文件引用。

同时检查 AisenLens 当前 GitHub 仓库。

重点阅读：

AGENTS.md

README

docs/

docs/architecture/

docs/product/

docs/development/

features 相关文档

以及：

apps/webapp/src

packages

与本次设计相关的代码结构。

如果可以访问仓库：

必须检查当前实际代码。

如果无法访问：

明确标记：

CODE_REPOSITORY_UNVERIFIED

不要伪装成已经验证。

---

# 4. 建立 Current State 与 Target State

不要把未来设计和当前代码混成一件事。

所有判断必须区分：

CURRENT

当前仓库真实存在。

TARGET

优化设计想实现。

PROPOSED

你本次审计后提出的新建议。

如果设计文档写了某个能力，

但代码没有实现，

必须标记：

TARGET ONLY

不要描述为：

“系统当前已经……”

---

# 5. 第二阶段：建立 Concept Registry

在修改任何文档之前，

先建立：

CONCEPT_REGISTRY.md

这里记录整个 AisenLens 的核心概念。

至少检查：

Project

Media

MediaSource

FrameIndex

MediaTime

PTS

Range

Shot

Shot Boundary

Boundary Candidate

Detection Candidate

Official Shot

Scene

Sequence

Section

Timeline

Track

Marker

Annotation

Analysis

Analysis Field

FieldDefinition

AnalysisRecord

AnalysisCandidate

Evidence

EvidenceRef

Provenance

Revision

Stale

Confirmed

Template

Prompt

Renderer

AI Suggestion

Context

Context Builder

Result Dataset

Export

Creative Transformation

Playback Position

Selection

Viewport

Workspace State

Undo / Redo

Command

History

如果发现其他关键 Concept：

自行加入。

每个 Concept 至少记录：

Concept Name

Aliases

Definition

Current Definition Locations

Current Owner

Proposed Owner

Authority

Mutable By

Readable By

Persistence

Lifecycle

Upstream

Downstream

Related Commands

Related Events

Conflict Status

Notes

---

# 6. 同义概念检查

不要只通过名称找重复。

必须检查：

不同名字是不是同一个 Concept。

例如：

Shot Range

Shot Boundary

Clip Range

Frame Range

可能存在语义重叠。

Analysis Result

Analysis Record

Confirmed Analysis

Result Record

也可能描述同一类数据。

对于这种情况：

建立 Alias。

不要因为名字不同就遗漏冲突。

---

# 7. 第三阶段：建立 Authority Map

创建：

AUTHORITY_MAP.md

这是整个架构最重要的结果之一。

至少明确：

Media Authority

Shot Structure Authority

Analysis Authority

Results Authority

Template Authority

Evidence Authority

Timeline Authority

Workspace Authority

AI Authority

必须回答：

谁创建？

谁修改？

谁确认？

谁删除？

谁只能读取？

谁负责持久化？

谁负责版本？

谁负责 stale？

---

# 8. Official Shot 必须特别审计

明确回答：

Official Shot 谁拥有？

Shot Boundary 谁拥有？

Detection Candidate 是什么？

Boundary Review 的输出是什么？

Timeline 能否直接修改 Official Shot？

Preparation 能否直接修改？

Analysis 能否直接修改？

Results 能否修改？

如果 Analysis 发现 Shot Boundary 错误：

正确流程是什么？

必须形成明确规则。

理想情况下类似：

Media
↓
Detection Candidate
↓
Boundary Review
↓
Shot Structure Authority
↓
Official Shot
↓
Analysis
↓
Confirmed Analysis
↓
Results

但不要机械接受这个模型。

必须根据实际设计判断。

---

# 9. 第四阶段：Source of Truth 审计

建立：

SOURCE_OF_TRUTH_MATRIX.md

格式至少包括：

Concept

Current Definitions

Conflict

Recommended Owner

Source Document

Mutation API

Consumers

Migration Action

重点检查：

Official Shot

Frame Range

Scene

Sequence

Section

Marker

AnalysisRecord

AnalysisCandidate

Evidence

Provenance

Template

Result Dataset

AI Candidate

Stale

Revision

Timeline Track

Workspace State

如果多个地方都拥有同一事实：

标记：

SOURCE_OF_TRUTH_CONFLICT

Severity 至少 P1。

涉及正式数据一致性：

P0。

---

# 10. 第五阶段：重复审计

创建：

DUPLICATE_AUDIT.md

不要只找相同文本。

需要找：

语义重复

模型重复

状态重复

职责重复

Command 重复

Lifecycle 重复

Interface 重复

Authority 重复

重点检查：

Shot

Boundary

Range

Timeline

AnalysisRecord

AnalysisCandidate

Evidence

Template

Marker

Scene

AI State

Workspace State

Results Dataset

每项输出：

出现位置

是否真正重复

是否只是不同抽象层

推荐 Owner

保留位置

删除位置

引用方式

---

# 11. 第六阶段：矛盾审计

创建：

CONFLICT_AUDIT.md

寻找：

## 数据模型矛盾

例如：

frame

time

PTS

startFrame/endFrame

startTime/endTime

inclusive

exclusive

half-open range

是否混用。

## Authority 矛盾

多个模块同时修改同一个正式实体。

## 生命周期矛盾

例如：

pending

accepted

confirmed

draft

stale

rejected

是否属于：

同一个 State Machine

还是不同实体。

## Workspace 矛盾

Preparation

Analysis

Results

职责是否倒流。

## Domain / UI 矛盾

UI Tab、Panel、Renderer 是否反向决定 Domain Model。

## Persistence 矛盾

IndexedDB

Zustand

Cache

Workspace State

Domain State

是否职责混淆。

## AI 矛盾

AI 是否直接覆盖正式数据。

## Template 矛盾

Template 是否同时承担：

Schema

UI

Prompt

Renderer

Export

Context

多种职责。

---

# 12. Conflict Matrix

建立：

CONFLICT_MATRIX.md

格式：

Concept

Location A

Location B

Conflict Type

Description

Severity

Recommended Owner

Resolution

Severity：

P0：

会导致正式数据错误、Source of Truth 冲突或不可逆架构问题。

P1：

会导致模块职责、Authority、生命周期明显混乱。

P2：

会导致重复开发、维护困难。

P3：

文档表达、命名、引用或结构问题。

---

# 13. 第七阶段：Workspace Boundary 审计

分别检查：

Preparation Workspace

Analysis Workspace

Results Workspace

为每个 Workspace 明确：

Purpose

Inputs

Outputs

Owns

Can Mutate

Read Only

Forbidden Responsibilities

Entry Condition

Exit Condition

Failure / Correction Flow

Upstream

Downstream

---

# 14. Preparation Workspace

特别确认：

Preparation 是否只负责形成：

Reliable Official Shot Structure。

检查：

Import

Media preparation

Shot Detection

Detection Candidate

Boundary Review

Calibration

Key Frame

Structure confirmation

哪些属于 Preparation。

不要让 Preparation 产生正式 Analysis 数据。

---

# 15. Analysis Workspace

明确：

Analysis 输入什么？

输出什么？

Official Shot 是否只读？

分析错误和结构错误如何区分？

如果用户发现 Shot 错：

是否应该进入 Preparation Correction Flow？

Analysis Workspace 是否可以：

直接改 Shot？

直接改 Scene？

直接修改 Timeline Structure？

必须定义。

---

# 16. Results Workspace

明确：

Results 是否产生新的 Analysis Fact。

还是：

只消费正式 Analysis 数据。

检查：

Data Table

Filter

Aggregate

Export

Share

Creative Transformation

哪些属于：

结果消费能力。

哪些会产生：

新的 Domain Data。

如果 Creative Transformation 会产生新的数据：

明确它属于：

Derived Artifact

还是正式 Analysis Data。

---

# 17. 第八阶段：Timeline 专项审计

必须判断：

Timeline 是：

Analysis Workspace UI Component

还是：

Cross-Workspace Domain Infrastructure

还是：

两者结合。

把 Timeline 内容拆成：

Timeline Domain

Timeline Application

Timeline View

Timeline Workspace Integration

重点分类：

FrameIndex

Media Time

PTS

VFR Mapping

Range

Boundary

Structure

Track

Marker

Command

History

Revision

Viewport

Zoom

Selection

Hover

Playhead

Renderer

明确哪些属于 Domain。

明确哪些绝对不能进入 Domain。

---

# 18. 时间系统统一

必须检查：

AisenLens 时间系统是否统一。

重点确认：

FrameIndex

Timestamp

MediaTime

PTS

Duration

startFrame

endFrame

区间规则。

如果采用：

[startFrame, endFrame)

必须让核心设计保持一致。

如果当前文档存在其他表示：

建立转换边界。

不要让浮点秒数成为正式 Shot Structure 的唯一事实源，除非你有明确架构理由。

---

# 19. 第九阶段：Analysis Domain / Inspector 专项审计

必须区分：

Analysis Domain

Analysis Application

Analysis Inspector

Renderer

AI Review

不要把 Inspector 当成 Analysis Domain。

重点检查：

FieldDefinition

AnalysisRecord

AnalysisCandidate

EvidenceRef

Provenance

Revision

stale

confirmed

OutputCapability

哪些属于 Analysis Domain。

以下可能属于 Inspector/UI：

Panel

Section

Renderer

Field Editor

Popover

Layout

Keyboard Interaction

但需要根据实际设计判断。

原则：

> Inspector 编辑 Analysis Data，但 Inspector 不是 Analysis Data 的存在原因。

---

# 20. Analysis 状态机

建立明确状态流。

必须解释：

AI Candidate

Draft

Confirmed

Rejected

Stale

Reanalyzing

Superseded

这些状态：

哪些属于 AnalysisCandidate？

哪些属于 AnalysisRecord？

哪些属于 Revision？

不要用一个 status enum 承担多个实体生命周期。

---

# 21. Shot 改动与 Analysis Stale

必须形成明确规则：

当 Official Shot 的：

Boundary

Identity

Scene association

Sequence

Structure Revision

发生变化时：

哪些 Analysis 数据：

保持有效

需要 stale

需要 remap

需要重新分析

需要用户确认

不得只写：

“根据情况处理”。

必须建立明确规则或规则框架。

---

# 22. 第十阶段：Evidence / Provenance 专项审计

检查：

Evidence

EvidenceRef

Provenance

Source

AI Model

Prompt

Timestamp

Revision

User Confirmation

之间关系。

回答：

Evidence 是否独立 Domain？

还是 Analysis 的 Value Object？

Provenance 属于：

Record

Candidate

Evidence

还是 Revision？

必须避免多个层次都复制相同 provenance。

---

# 23. 第十一阶段：Template 专项审计

拆解当前 Template 的职责。

至少区分：

TemplateDefinition

AnalysisSchema

FieldDefinition

UILayoutDefinition

RendererDefinition

PromptDefinition

ContextDefinition

ExportMapping

不要让 Template 成为万能 JSON。

如果当前设计混合：

重新设计边界。

必须说明：

哪些应该稳定持久化

哪些是 UI 配置

哪些属于 AI

哪些属于 Export

哪些属于 Domain。

---

# 24. 第十二阶段：AI Boundary 审计

AI 永远不能隐式成为正式 Source of Truth。

建立明确数据流：

AI Input

AI Context

AI Output

Analysis Candidate

Evidence

User Review

Confirmation

Official Analysis Record

Revision

Stale

Reanalysis

明确：

AI 可以做什么。

AI 不允许做什么。

哪些 Command 需要用户确认。

哪些自动行为允许系统执行。

---

# 25. 第十三阶段：State Ownership 审计

建立：

STATE_OWNERSHIP.md

将 State 分成：

Domain State

Persistent State

Application State

Workspace State

UI State

Derived State

Cache

Temporary Interaction State

检查这些内容是否放错地方：

selectedShotId

currentFrame

playbackPosition

viewport

zoom

panelWidth

hover

dragging

openPopover

activeTab

这些通常不是 Domain State。

同时检查：

Shot

AnalysisRecord

Evidence

Template

是否错误地仅存在于 UI Store。

---

# 26. 第十四阶段：Command / Event 审计

识别系统的重要 Command：

ConfirmShotBoundary

SplitShot

MergeShot

MoveBoundary

ConfirmAnalysis

AcceptCandidate

RejectCandidate

MarkAnalysisStale

ApplyTemplate

CreateMarker

等等。

不要机械使用这些名字。

以实际设计为准。

建立：

COMMAND_EVENT_MAP.md

记录：

Command

Owner

Input

Precondition

Mutation

Event

Undoable

Persistence

Side Effect

AI Allowed

User Confirmation Required

---

# 27. 第十五阶段：Dependency Graph

建立：

DEPENDENCY_GRAPH.md

必须形成清晰的依赖方向。

至少从这些层面分析：

Domain

Application

Workspace

UI

Infrastructure

AI

Persistence

避免：

Domain → React

Domain → Workspace

Domain → Zustand UI Store

Domain → Inspector

Results → Analysis UI

Analysis → Preparation UI

等等。

如果存在循环：

明确标记。

---

# 28. 第十六阶段：重新定义最终文档 Source of Truth

完成前面所有分析后，

设计最终文档体系。

目标不是文件越多越好。

目标是：

每个关键概念都能回答：

定义在哪里？

谁拥有？

谁能修改？

谁能读取？

生命周期在哪里定义？

其他文档在哪里引用？

---

# 29. 推荐文档层级原则

优先考虑类似：

00-global

01-preparation

02-analysis

03-results

04-domain

90-implementation

99-archive

但不要因为输入已经使用这个结构就机械保留。

如果审计发现更合理结构：

允许调整。

---

# 30. Global 层

Global 应主要负责：

产品整体阶段

Workspace Navigation

Cross Workspace Flow

Global Interaction Principles

Workspace Relationship

不要在 Global 中重新定义：

AnalysisRecord

Shot

Timeline Range

Evidence

等 Domain 模型。

---

# 31. Domain 层

考虑是否需要独立：

Shot Structure Contract

Timeline Contract

Analysis Data Model

Evidence / Provenance Contract

Template Contract

但注意：

不要过度拆分。

只有满足以下条件的概念才值得独立 Source of Truth：

多 Workspace 使用

多模块依赖

生命周期复杂

数据一致性重要

未来高概率发生冲突。

---

# 32. Workspace 层

Preparation

Analysis

Results

主要写：

如何使用领域能力

页面组成

用户流程

工作状态

交互

错误恢复

Workspace-level orchestration。

不要重复定义 Domain Model。

---

# 33. Design System

Design System 只负责：

视觉语言

颜色

Typography

Spacing

Surface

Interaction States

Components

Motion

Accessibility

Keyboard conventions

不要成为产品领域文档。

---

# 34. Implementation 层

Implementation 文档负责：

代码模块映射

Migration Plan

Development Order

Feature Boundary

Package Boundary

Testing Boundary

Dependency Rules

不负责重新发明领域模型。

---

# 35. 第十七阶段：实际拆分和修改文件

现在不要只写建议。

真正开始处理文件。

原则：

保留原始输入文件到：

99-archive/original-input/

不要覆盖。

在正式目录中：

创建新的、经过治理的文档。

对于每份旧文档：

逐章节判断：

KEEP

MOVE

SPLIT

MERGE

REWRITE

REFERENCE ONLY

ARCHIVE

---

# 36. 拆分要求

如果一份文档同时包含：

Workspace

Domain

Data Model

UI

Implementation

必须拆。

例如：

Analysis Inspector 文档中：

Inspector Layout

Field Renderer

Interaction

可以继续保留在 Inspector。

但：

AnalysisRecord

AnalysisCandidate

Evidence

Provenance

Stale Lifecycle

如果属于 Analysis Domain，

必须移到 Analysis Data Model。

Inspector 原位置改为引用。

不要在两个地方保留完整定义。

---

# 37. 引用治理

所有拆分后文档必须：

更新相对链接。

清理旧文件名。

清理不存在的引用。

清理例如：

xxx(2).md

但实际文件叫：

xxx.md

这样的错误。

不得保留死链接。

---

# 38. Frontmatter

正式文档建议统一增加 metadata。

至少包含：

title

doc_type

status

version

last_reviewed

scope

depends_on

source_of_truth_for

implementation_areas

如果字段不适合某文档：

可以省略。

状态统一使用：

draft

target-design

approved

implementing

implemented

archived

不要把 target-design 写成 implemented。

---

# 39. 文档内部结构

核心架构文档尽量采用：

Purpose

Scope

Non-goals

Authority

Data Model

Lifecycle

Commands

Events

Dependencies

Consumers

Invariants

Failure Handling

Implementation Mapping

Open Questions

不要所有文档都强制完全相同，

但关键 Domain 文档必须明确：

Invariants。

---

# 40. Invariants

为关键 Domain 建立不可违反规则。

例如可能包括：

Official Shot 的时间范围必须合法。

Shot Structure 必须来自唯一 Authority。

Confirmed Analysis 不得被 AI 静默覆盖。

Stale 数据不得默认作为正式输出。

Results 不得反向修改 Analysis Fact。

Timeline View 不拥有正式结构。

具体规则根据审计结果制定。

---

# 41. 第十八阶段：映射当前代码

设计完成以后，

对照：

apps/webapp/src

以及其他相关 packages。

生成：

IMPLEMENTATION_BOUNDARY.md

推荐每个模块负责什么。

格式：

Module

Owns

Can Read

Can Mutate

Depends On

Must Not Depend On

Migration Notes

重点检查：

features/preparation

features/analysis

features/timeline

features/template

features/export

features/shot

features/media

等等。

如果当前代码不存在某目录：

不要假装存在。

可以标记：

PROPOSED MODULE。

---

# 42. 不要求立即重写生产代码

这次任务的重点是：

优化设计包本身。

除非为了验证架构需要分析代码，

否则不要大规模修改生产源码。

最终 ZIP 默认主要包含：

优化后的设计和架构文档。

如果你确实修改代码：

必须单独记录。

---

# 43. 第十九阶段：重新执行第二轮审计

完成文档重构以后：

不要立即打包。

重新对新的文档体系进行一次完整审计。

检查：

是否仍然存在重复定义。

是否仍然存在 Source of Truth Conflict。

是否出现新的死链接。

是否出现循环依赖。

是否有文档职责不清。

是否仍然有 Workspace 定义 Domain。

是否仍然有 UI 定义数据模型。

是否有 Archive 被正式文档错误依赖。

是否存在孤立文档。

是否存在没有 Owner 的 Concept。

是否存在一个 Concept 多个 Owner。

---

# 44. 第二轮 Concept Registry 校验

重新根据最终文档生成：

FINAL_CONCEPT_REGISTRY.md

并验证：

每个重要 Concept：

恰好一个 Owner。

如果存在多个 Owner：

继续修改。

不要直接打包。

---

# 45. 第二轮 Source of Truth 校验

重新生成：

FINAL_SOURCE_OF_TRUTH_MATRIX.md

如果发现：

P0

或未解决 P1

原则上继续重构。

如果某项 P1 确实无法消除：

记录：

ACCEPTED_ARCHITECTURE_RISK

并解释原因。

---

# 46. 文档质量检查

检查所有正式文档：

标题正确

文件名正确

UTF-8

Markdown 可读

目录正确

链接有效

无明显残缺

无错误旧文件引用

无无意义空文档

无重复完整定义

无“TODO someday”式关键架构空洞。

---

# 47. 空文件处理

如果原始输入中存在空文件：

不要凭空伪造已经确认的设计。

可以：

保留到 Archive。

或者创建 Draft。

但必须标记：

draft

并说明：

原始文件为空。

不要把 AI 自己想出的内容描述成用户已经批准的方案。

---

# 48. 第二十阶段：建立最终索引

最终包必须包含：

README.md

该 README 是整个设计包唯一入口。

README 至少解释：

这个包是什么。

如何阅读。

文档层级。

三个 Workspace。

核心 Domain。

Source of Truth 原则。

推荐阅读顺序。

Current / Target / Proposed 的区别。

如何用于后续 AI 开发。

---

# 49. 建立 ARCHITECTURE_INDEX.md

索引：

所有正式设计文档。

每份：

Purpose

Owner

Status

Upstream

Downstream

Source of Truth For

避免未来 AI 不知道应该读哪份文档。

---

# 50. 建立 AI_DEVELOPMENT_GUIDE.md

这是专门给未来 AI Coding Agent 使用的。

告诉 AI：

修改 Shot 前读什么。

修改 Timeline 前读什么。

修改 Analysis 前读什么。

修改 Inspector 前读什么。

修改 Template 前读什么。

修改 Results / Export 前读什么。

发生文档冲突时：

以哪个 Source of Truth 为准。

要求未来 AI：

不要在 feature 内重新定义共享领域模型。

---

# 51. 建立 DECISION_LOG.md

记录本次重构过程中主要架构决策。

每项至少：

Decision

Reason

Alternatives

Impact

Related Documents

重点记录：

Timeline 定位。

Official Shot Authority。

Analysis Authority。

Inspector 定位。

Template 边界。

Evidence 边界。

Results Authority。

---

# 52. 建立 MIGRATION_PLAN.md

给后续开发人员一个执行顺序。

不要一次全部重写。

按：

P0

P1

P2

P3

排序。

每项包含：

Goal

Affected Domain

Affected Docs

Affected Code

Risk

Dependency

Acceptance Criteria

---

# 53. Acceptance Criteria

最终设计至少满足：

一个核心 Concept 只有一个 Source of Truth。

一个正式实体只有一个 Authority。

Workspace 不拥有不属于自己的 Domain。

AI 不直接成为正式数据 Source of Truth。

Timeline View 和 Timeline Domain 有清楚边界。

Inspector 与 Analysis Domain 分离。

Template 职责不再无限膨胀。

Results 与 Analysis 边界明确。

正式文档之间无已知死链接。

Archive 不是正式 Source of Truth。

Current 和 Target 不混淆。

---

# 54. 最终输出报告

最终生成：

FINAL_ARCHITECTURE_AUDIT.md

内容至少包括：

Executive Summary

Current Architecture

Target Architecture

Concept Registry Summary

Authority Map

Source of Truth Summary

Major Duplicates

Major Conflicts

Workspace Boundaries

Timeline Decision

Analysis / Inspector Decision

Evidence Decision

Template Decision

AI Boundary

State Ownership

Dependency Rules

Final Documentation Architecture

Implementation Boundary

Migration Priorities

Remaining Risks

---

# 55. 最终目录

最终包至少建议包含：

README.md

docs/

audit/

implementation/

99-archive/

具体目录由最终审计决定。

不要为了符合示例而制造无意义目录。

---

# 56. Manifest

生成：

MANIFEST.json

包含至少：

package_name

generated_at

architecture_version

files

每个文件：

path

size

SHA-256

status

doc_type

---

# 57. CHANGELOG

生成：

CHANGELOG.md

记录：

原始文件

发生了什么变化

哪些被拆分

哪些被移动

哪些被归档

哪些新建

哪些只是引用

让人可以追溯：

旧设计 → 新设计。

---

# 58. 不删除原始资料

最终压缩包必须包含：

99-archive/original-input/

保存用户提供的原始文档。

如果体积合理：

完整保存。

不要只保存摘要。

---

# 59. 最终 ZIP 打包要求

所有工作完成后，

将最终成果打包成：

AisenLens_Architecture_Refined_Package_YYYY-MM-DD.zip

例如：

AisenLens_Architecture_Refined_Package_2026-09-17.zip

ZIP 根目录中应该直接看到：

README.md

docs/

audit/

implementation/

99-archive/

MANIFEST.json

CHANGELOG.md

不要出现无意义的多层：

xxx.zip
  /tmp
    /output
      /final
        /docs

这样的目录。

---

# 60. 打包前验证

打包前必须验证：

ZIP 可以正常打开。

所有正式文件存在。

README 存在。

MANIFEST 存在。

Archive 存在。

没有临时文件。

没有系统垃圾文件。

没有构建缓存。

没有 node_modules。

没有 .DS_Store。

没有重复 ZIP 嵌套。

---

# 61. 最终交付要求

任务最后不能只给我文字报告。

必须实际生成新的 ZIP 文件。

最后回复我：

1. 最终架构发生的核心变化摘要。
2. P0 / P1 问题解决情况。
3. 仍存在的 Accepted Risks。
4. 最终文件数量。
5. 最终 ZIP 文件的可下载链接。

最重要：

> 只有真正生成了新的 ZIP 压缩文件，任务才算完成。

不要最后告诉我：

“你可以自己压缩这些文件。”

不要让我手工执行打包命令。

不要只给目录树。

不要只给 Markdown。

必须实际输出压缩文件。

---

# 62. 最终工作原则

整个过程中始终问自己：

对于系统中的任何一个重要 Concept，

未来开发人员或 AI 能否在 30 秒内回答：

它是什么？

谁拥有它？

谁能修改？

谁只能读取？

状态机在哪里？

Source of Truth 文档是哪一份？

代码应该在哪里实现？

哪些模块禁止重新定义？

如果不能：

继续重构。

最终目标不是：

“文档看起来更整齐。”

最终目标是：

> 建立一套能够约束未来 AisenLens 开发、减少 AI 重复造模型、避免跨模块数据冲突，并可以长期演进的架构契约体系。

现在开始执行。

不要只给计划。

从解压、读取、扫描开始，一直执行到最终 ZIP 文件生成完成。