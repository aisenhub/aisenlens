---
title: "AisenLens Design Implementation Map"
doc_type: implementation-map
status: target-design
version: 1.0
last_reviewed: 2026-09-17
scope:
  - repository-docs
  - webapp
depends_on:
  - design/README
---

# AisenLens 设计 → 代码实施映射

本表是**实施导航**，不是当前实现完成声明。每次开始改动前，应重新对照仓库当前代码与 `docs/architecture/PROJECT_ARCHITECTURE.md`。

| 设计域 | 主要设计文档 | 现有/预期代码落点 |
| --- | --- | --- |
| 全局 Shell / Workspace 导航 | `00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md` | `apps/webapp/src/app`, `apps/webapp/src/pages`, `features/workflow` |
| Design System | `00-global/WORKSPACE_DESIGN_SYSTEM.md` | `apps/webapp/src/index.css`, `components/`, `components/ui/` |
| 素材准备 | `01-preparation/PREPARATION_WORKSPACE.md` | `features/media`, `auto-shot`, `shot-calibration`, `scene-calibration`, `shot` |
| 逐镜分析工作台 | `02-analysis/ANALYSIS_WORKSPACE.md` | `features/analysis`, `annotation`, `template`, `group`, `workflow` |
| Inspector | `02-analysis/inspector/ANALYSIS_INSPECTOR.md` | `features/analysis/components`, `hooks` |
| Timeline | `04-domain/timeline/TIMELINE_ARCHITECTURE.md` | `features/timeline`, `shot`, `video`, `analysis` |
| Analysis Data | `04-domain/analysis-data/ANALYSIS_DATA_MODEL.md` | `features/analysis/types.ts`, `services`, project persistence boundary |
| Evidence / Provenance | `04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md` | `features/analysis/types.ts`, `services` |
| Results | `03-results/RESULTS_WORKSPACE.md` | `features/export`, `analysis`, future results-specific feature modules |

## 推荐实施顺序

```text
Phase 0  文档/类型契约冻结
   ↓
Phase 1  Analysis Data Model + Evidence/Provenance
   ↓
Phase 2  Global Shell + Design Tokens
   ↓
Phase 3  素材准备：Official Shot Authority 收敛
   ↓
Phase 4  Analysis Workspace + Inspector
   ↓
Phase 5  Timeline 结构/Track/LOD 接线
   ↓
Phase 6  Results Workspace：Table / Export / Creative
   ↓
Phase 7  AI Candidate / Review / Context Builder 增强
```

## 每个 Phase 的最小出口条件

- 设计 Source of Truth 无重复定义。
- 类型/持久化变化有明确版本策略。
- 不绕过现有 service/repository 边界直接写 IndexedDB。
- 不改变 Shot Authority 与 Analysis Authority 的责任链。
- 对正式数据写入有撤销/恢复或等价安全措施。
- Web build/typecheck/lint 与目标功能 smoke 通过后，才把相应文档状态提升为 `implemented`。
