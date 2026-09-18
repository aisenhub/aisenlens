# AI DEVELOPMENT GUIDE

未来 Coding Agent 在修改前应按最小集合读取：

| Task | Must read first |
| --- | --- |
| Shot / Boundary / split / merge | `04-domain/shot-structure/SHOT_STRUCTURE_CONTRACT.md`, `audit/COMMAND_EVENT_MAP.md`, repository current shot code |
| Timeline | Shot Contract + `04-domain/timeline/TIMELINE_ARCHITECTURE.md` + `audit/STATE_OWNERSHIP.md` |
| Analysis data | `04-domain/analysis-data/ANALYSIS_DATA_MODEL.md` + Evidence contract |
| Inspector | Analysis Data + Evidence + `02-analysis/inspector/ANALYSIS_INSPECTOR.md` |
| Template | Analysis Data + `04-domain/template/TEMPLATE_CONTRACT.md` + current `features/template` |
| Results / Export | Analysis Data eligibility + Results Workspace + Template ExportMapping |
| AI | `04-domain/ai/AI_ANALYSIS_CONTRACT.md` + Analysis Data + Evidence/Provenance + Template Prompt/Context boundaries |

## Conflict precedence

1. Current repository facts define CURRENT only.
2. `04-domain/*` defines TARGET domain contracts.
3. Workspace docs define orchestration/UX and must not override domain contracts.
4. UI/Design System defines rendering and interaction only.
5. `99-archive/` never wins a current conflict; it is evidence/provenance only.
6. AI Candidate / ContextManifest / accept transaction 以 `04-domain/ai/AI_ANALYSIS_CONTRACT.md` 为正式领域契约。

## Mandatory rules

- 不在 feature 内重新定义共享领域模型。
- 不因 UI 需要改变正式数据语义。
- 不让 AI 直接写正式 Shot/Analysis。
- v19 之后不通过删除用户项目数据解决 schema 冲突；v18→v19 development-reset 是正式用户数据产生前、仅 Phase 03 使用的一次性冻结例外。
- 修改 Source of Truth 时同步更新 Concept Registry、SoT Matrix 和 Decision Log。
