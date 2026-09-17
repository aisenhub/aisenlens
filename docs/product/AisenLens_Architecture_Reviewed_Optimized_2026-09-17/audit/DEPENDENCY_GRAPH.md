# DEPENDENCY GRAPH

## Allowed direction

```text
Domain contracts
  ↑
Application commands / services
  ↑
Workspace orchestration
  ↑
UI / Inspector / Timeline View / Results views

Infrastructure (IndexedDB, Worker, media decoder, AI provider)
  implements ports owned by Domain/Application; it does not reverse-own domain semantics.
```

## Cross-domain dependencies

```text
Media/Time
  └─> Shot Structure
       ├─> Timeline structure adapters
       └─> Analysis Data
             ├─> Evidence/Provenance
             └─> Results Dataset -> Export/Creative
Template/Profile ─> Analysis UI/Application, AI Application, Results Mapping
AI Application ─> AnalysisCandidate (never -> confirmed record directly)
```

## Forbidden dependencies

- Domain → React / Workspace / Zustand UI store / Inspector.
- Results → Analysis UI internals.
- Analysis Workspace → Preparation UI internals; correction via navigation/application contract.
- Timeline View → direct IndexedDB writes of Shot structure.
- AI provider → formal Shot or Analysis repository mutation.
- Formal docs → `99-archive/` as normative dependency.

## Cycle audit

设计层未保留已知强循环。Template 与 Analysis 采用单向分工：Field semantic definitions 属于 Analysis Data；Template 引用 fieldId 并定义 usage/presentation；AnalysisRecord 不依赖 UI layout。


## Runtime boundary additions (2026-09-17 review)

```text
Application / Domain ports
  ↑ implemented by
IndexedDB / Worker / Media decoder / AI provider / Import-Export adapters
```

- Async worker/provider results must carry or validate dependency revision before producing a command/candidate.
- Infrastructure errors propagate upward as typed failures; Infrastructure must not repair semantic data by itself.
- Browser coordination mechanisms such as BroadcastChannel/Web Locks may coordinate concurrent tabs, but correctness remains owned by repository revision checks.
- Detailed runtime constraints are authoritative in `../05-runtime/OPERATIONAL_ARCHITECTURE.md`.
