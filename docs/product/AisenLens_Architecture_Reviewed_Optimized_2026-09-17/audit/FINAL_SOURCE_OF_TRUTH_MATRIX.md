# FINAL SOURCE OF TRUTH MATRIX

| Concept/Scope | Source Document | Mutation API/Owner | Consumers | Migration Action |
| --- | --- | --- | --- | --- |
| Official Shot / Boundary | 04-domain/shot-structure/SHOT_STRUCTURE_CONTRACT.md | Shot Authority / explicit structural commands | Preparation | P0 conflict resolved by single authority |
| Frame/Range/Timeline structure | 04-domain/timeline/TIMELINE_ARCHITECTURE.md | timeline/structure commands subject to Shot Contract | Preparation + Analysis | Shot time authority defers to Shot Contract |
| AnalysisRecord / Candidate / stale | 04-domain/analysis-data/ANALYSIS_DATA_MODEL.md | analysis commands | Analysis / Results | single data model |
| Evidence / Provenance | 04-domain/evidence-provenance/EVIDENCE_PROVENANCE_CONTRACT.md | through owning analysis/candidate command | Analysis / Results | single shared contract |
| Template/Profile + subdefinitions | 04-domain/template/TEMPLATE_CONTRACT.md | template/profile service | Analysis / Results / AI | new explicit SoT; old sections retained as usage notes |
| Workspace boundaries / global IA | 00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md | navigation/workflow application | all | global does not redefine domain |
| Preparation workflow | 01-preparation/PREPARATION_WORKSPACE.md | workspace orchestration | Preparation | does not own Analysis fact |
| Analysis workflow | 02-analysis/ANALYSIS_WORKSPACE.md | workspace orchestration | Analysis | does not own Shot boundary |
| Inspector UI / renderer | 02-analysis/inspector/ANALYSIS_INSPECTOR.md | UI/application | Analysis | does not own Analysis data semantics |
| Results table/export/creative flow | 03-results/RESULTS_WORKSPACE.md | results application | Results | formal data eligibility remains Analysis Data Model |
| Visual design system | 00-global/WORKSPACE_DESIGN_SYSTEM.md | UI layer | all workspaces | not product domain |

## Enforcement rule

其他文档可以解释、展示、编排、消费，但不得重新发明上述概念。保留的旧说明若与 SoT 冲突，必须被视为语境说明而不是第二定义。
