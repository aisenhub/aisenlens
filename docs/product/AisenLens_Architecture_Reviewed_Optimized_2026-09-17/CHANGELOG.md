# CHANGELOG

## 2026-09-18 — Native Studio UI / UX Redesign

### Superseded
- `WORKSPACE_DESIGN_SYSTEM.md` v1 `Calm Professional Workspace / Cinematic Editorial`、Primary Violet、旧 Surface/Spacing/Motion/Density 与相关视觉原则不再作为实施依据。
- 旧设计只保留在 Git/Archive 历史中，不形成视觉向后兼容要求。

### New Source of Truth
- `WORKSPACE_DESIGN_SYSTEM.md` v2 定义 **AisenLens Native Studio / Native Desktop Workbench**：Graphite + Frost + Signal Blue、Studio Glass functional chrome、桌面式 Window/Panel geometry、resize/collapse/layout memory、direct manipulation、source-anchored overlay、keyboard/pointer parity、motion、performance experience、UI preference ownership 与 visual regression gate。
- Phase 04–11 执行计划同步为 Native Studio 消费/验收规则；Preparation 中旧视觉建议改为引用新的全局 Design System。

### Implementation Boundary
- 当前 `index.css` 的 `--app-*`、legacy blue、`--ai`、timeline 私有 palette、Arial Narrow、arbitrary z-index 等被明确列为 Phase 04 migration input，而不是目标设计。
- V2 不要求安装新字体；继续利用仓库已有 Geist，并使用系统中文 fallback。

## 2026-09-18 — Phase 03 Canonical Data Architecture Freeze

### Frozen
- IndexedDB canonical baseline upgraded to v19; v1–v18 are explicitly pre-freeze development data and v18→v19 uses a one-time development reset.
- Shot authority no longer persists Analysis fields/description/notes; Shot owns structure, screenshots, revision, structureRevision and lineage.
- AnalysisRecord, AnalysisCandidate, AnalysisEvidenceRecord and AnalysisContextManifest are independent canonical entities/stores.
- Project structureRevision and analysisRevision define cross-domain dependency versions; structural mutation propagates stale state atomically.
- Timeline and Results are derived read models and may not become second canonical data stores.
- Backup v4 / Recovery boundaries include canonical Analysis/Candidate/Evidence/ContextManifest with reference remapping.

### Added
- `04-domain/ai/AI_ANALYSIS_CONTRACT.md` as the AI Candidate / ContextManifest / provider trust / accept transaction Source of Truth.

### Updated
- Analysis Data, Evidence, Template, Shot Structure, Timeline, Results, Runtime, project architecture and governance/index documents aligned to the v19 frozen baseline.
- From v19 onward, schema evolution returns to versioned non-destructive migration discipline; the development reset is not a precedent for later user-data migrations.


## 2026-09-17 — Refined Architecture Package

### Preservation
- 完整保留解压后的既有正式设计正文。
- 将用户提供的 `design.7z` 与任务 Prompt 一并保存到 `99-archive/original-input/task-input/`。
- 原 `99-archive/original_input/` 仅规范化命名为 `original-input/`，内容不删减。

### Added
- `04-domain/template/TEMPLATE_CONTRACT.md`
- `ARCHITECTURE_INDEX.md`
- `audit/` 下 Concept/Authority/SoT/Duplicate/Conflict/Workspace/State/Command/Dependency/Current baseline/Decision/Final audit 全套治理文档。
- `implementation/IMPLEMENTATION_BOUNDARY.md`、`MIGRATION_PLAN.md`、`AI_DEVELOPMENT_GUIDE.md`。

### Modified without deleting original content
- `README.md`：加入 Template SoT、审计/实施目录与内容守恒规则。
- `ANALYSIS_WORKSPACE.md`：Template 章节前加入 Authority 注记；原章节保留。
- `ANALYSIS_INSPECTOR.md`：Template 章节前加入 Authority 注记；原章节保留。
- `ANALYSIS_DATA_MODEL.md`：Template/Schema 分离章节前加入边界注记；原章节保留。
- 正式文档中 `original_input/` 链接统一为规范后的 `original-input/`。

### Merged / de-duplicated semantically
- Template 定义不再由多个文档同时宣称权威；统一由 Template Contract 拥有。旧文本未删除，降级为 Workspace/UI usage guidance。
- Audit documents 不复制完整领域定义，只登记 Owner、冲突和引用。


## 2026-09-17 — Architecture Review / Runtime Completeness Pass

### Fixed
- `audit/STATE_OWNERSHIP.md`: canonical domain entities `Persistent?` corrected from `No` to `Yes`.

### Added
- `05-runtime/OPERATIONAL_ARCHITECTURE.md`: persistence durability, quota/corruption, multi-tab revision, Worker lifecycle, input/AI trust boundaries, observability, CI/release and rollout rules.
- `audit/MASTER_PLAN_COVERAGE_MATRIX.md`: architecture-to-plan coverage matrix.
- `audit/ARCHITECTURE_REVIEW_2026-09-17.md`: review summary and optimization decisions.

### Strengthened
- Master Development Plan now explicitly covers runtime reliability/security gates and end-to-end failure scenarios.
- Migration Plan and Implementation Boundary now include storage health, task lifecycle, external validation and delivery hardening.
- README / Architecture Index / Final Audit / Dependency Graph updated to register the runtime Source of Truth.
