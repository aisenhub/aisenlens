---
title: "AisenLens Analysis Data Model"
doc_type: domain-contract
status: target-design
version: 1.1
last_reviewed: 2026-09-18
workspace:
  - analysis
  - results
scope:
  - webapp
  - domain
depends_on:
  - SHOT_STRUCTURE_CONTRACT
  - EVIDENCE_PROVENANCE_CONTRACT
source_of_truth_for:
  - analysis-field-definition
  - analysis-record
  - analysis-candidate
  - analysis-status-model
  - stale-propagation
  - results-data-eligibility
implementation_areas:
  - apps/webapp/src/features/analysis/types.ts
  - apps/webapp/src/features/analysis/services
  - apps/webapp/src/features/project
---

# AisenLens Analysis Data Model

本文从原 Analysis Inspector 方案中抽取**不属于 UI 的正式数据契约**。Inspector、Timeline、Results 都只能消费本契约，不应各自维护另一套 Analysis 数据定义。原章节编号保留用于追溯。

> **边界注记（2026-09-17）**：以下原始章节完整保留，用于规定 Analysis Data 与 Template 的分离关系。Template 本体、Profile、UILayout、Prompt/Context/ExportMapping 的定义归 `../template/TEMPLATE_CONTRACT.md`；本文件继续唯一拥有 `AnalysisFieldDefinition / AnalysisRecord / AnalysisCandidate / stale`。

## Phase 03 Frozen Baseline — 2026-09-18

从 Phase 03 起，本文件不再描述“未来可能的 Analysis 拆分”，而冻结为 Phase 04–09 必须复用的正式数据边界。

### Canonical ownership

```text
Project
├─ structureRevision
├─ analysisRevision
├─ ShotRecord[]                  ← Shot Authority
├─ ShotGroupRecord[]             ← Structure Authority
├─ AnalysisRecord[]              ← confirmed/stale formal analysis
├─ AnalysisCandidate[]           ← pending/accepted/rejected/stale/superseded/expired proposals
├─ AnalysisEvidenceRecord[]      ← first-class evidence bindings
└─ AnalysisContextManifest[]     ← reproducible AI/context input snapshot
```

`ShotRecord` **不再拥有** `analysisFields / description / notes`。逐镜描述与分析笔记若作为正式研究数据存在，必须通过稳定 `fieldId` 进入 `AnalysisRecord`。UI 可以用 `ShotAnalysisView` 等 read adapter 聚合显示，但不得把该投影重新持久化为 Shot 字段。

### Frozen AnalysisRecord shape

```ts
interface AnalysisRecord {
  id: string
  projectId: string
  subject: { kind: "shot" | "scene" | "sequence" | "section" | "film"; id: string }
  fieldId: string
  entry: AnalysisFieldEntry
  status: "confirmed" | "stale"
  staleReason: string | null
  provenance: AnalysisProvenance
  evidenceRefs: string[]
  structureRevision: number
  createdAt: string
  updatedAt: string
  revision: number
}
```

正式值只有 `AnalysisRecord`。Template、Timeline、Results、AI adapter、Export preset 都只能引用或消费该记录，不能复制出新的正式值集合。

### Frozen Candidate dependency contract

Candidate 的依赖版本必须同时冻结结构与分析版本：

```ts
interface AnalysisDependencyRevision {
  structureRevision: number
  analysisRevision: number
}
```

Provider/Worker 返回结果只有在依赖版本仍匹配时才能继续进入 review。`accept` 必须通过 repository transaction：校验 Candidate revision + dependency revision → 写入/更新 `AnalysisRecord` → Candidate 标记 accepted → 推进 `analysisRevision`。任何 provider response、React component 或 Timeline adapter 都不得绕过该事务直接写正式值。

### Structure → Analysis invalidation

Shot / ShotGroup 结构变更推进 `structureRevision`。对不能机械证明仍成立的语义记录：

- `AnalysisRecord` → `stale`
- pending `AnalysisCandidate` → `stale`
- 与 stale record/candidate 绑定的 Evidence → `stale`
- Results/Export 默认排除 stale
- Timeline 可以显示 stale 状态，但不得把它重新“确认”
- 后续 AI 必须生成新的 ContextManifest / Candidate，而不是复用旧依赖

结构变化与语义重新确认是两个不同命令；禁止在 Shot split/merge/boundary move 时静默生成新的 confirmed semantic value。

### Persistence baseline

IndexedDB v19 为第一版冻结 canonical baseline。`analysis-records`、`analysis-candidates`、`analysis-evidence`、`analysis-context-manifests` 分 store；Timeline/Results 不建立 canonical store。v18 及以前只属于冻结前开发期数据，允许一次性 development reset；从 v19 起恢复正式 versioned non-destructive migration discipline。

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

  dependencyRevision: {
    structureRevision: number
    analysisRevision: number
  }
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

# 104. 冻结数据原则

- Analysis Record 是正式工作值；AI Candidate 与其分离。
- Field ID 稳定，Template 只控制可见性/组织方式，不定义数据库 Schema。
- Shot/结构 revision 变化后，不能自动证明仍然成立的语义数据进入 `stale` / needs-review，而不是静默覆盖。
- Timeline、Inspector、Results 不建立 Analysis Record 副本。
- Results 默认只把满足输出资格的正式数据作为正式成果。
