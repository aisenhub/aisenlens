# IMPLEMENTATION BOUNDARY

CURRENT paths are based on repository verification; proposed responsibilities do not imply code already implements them.

| Module | Owns | Can Read | Can Mutate | Depends On | Must Not Depend On | Migration Notes |
| --- | --- | --- | --- | --- | --- | --- |
| features/media | Media UI/domain adapters | project/media services | media data through service | project repository, browser media APIs | analysis UI internals | keep media identity authoritative |
| features/auto-shot | Detection task + candidates | media/config | candidate/task only | scene-engine, workers | formal Shot direct writes | confirm through Shot command |
| features/shot | Shot domain types/adapters | media/project | official Shot through authority | project repository | template UI, results | remove analysisFields only after migration |
| features/shot-calibration + scene-calibration | Preparation correction UI/application | Shot/domain commands | official structure via commands | shot | analysis record direct writes | target Preparation workspace integration |
| features/timeline | Timeline application/view adapters | Shot/analysis/marker contracts | viewport/selection; domain commands through ports | shot, media, analysis | direct IndexedDB canonical writes | split domain/application/view internally if needed |
| features/analysis | Analysis application/domain types + inspector integration | Shot read model, template, evidence | AnalysisRecord/Candidate via analysis commands | template, project services | Shot boundary direct mutation | PROPOSED independent Analysis repository |
| features/template | Profile/template contract implementation | stable field definitions | profile/versioned config | analysis | formal AnalysisRecord values | extend existing profile model, do not replace it |
| features/export | Export/derived artifact generation | Results dataset | export artifacts | analysis query/media | formal analysis mutation | worker may render only |
| features/project | Repository/persistence boundary | domain records | versioned persistence | IndexedDB | UI-specific semantics | migration owner; quota/corruption/storage health; backup/restore integrity; revision conflict boundary |
| packages/scene-engine | detection engine | normalized frames/config | boundary evidence/candidates | none from React | project/React/Zustand | existing independent ABI |


## Cross-cutting runtime boundary

所有 module 还必须遵守 `../05-runtime/OPERATIONAL_ARCHITECTURE.md`：

- Worker/provider/export 长任务具有 taskId、取消、失败和 stale-result discard；
- canonical writes 在 repository transaction 成功后才对 UI 宣称已保存；
- import/provider response 先 schema/size/type validation，再进入 Application/Domain；
- 外部 provider 不得直接调用 formal repository mutation；
- 日志默认不记录媒体内容、分析正文或完整 prompt/context。
