# CHANGELOG

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
