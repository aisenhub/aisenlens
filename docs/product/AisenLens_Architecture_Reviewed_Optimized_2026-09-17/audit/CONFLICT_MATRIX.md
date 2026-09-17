# CONFLICT MATRIX

| Concept | Location A/B | Type | Severity | Recommended Owner | Resolution | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Official Shot mutation | Analysis/Timeline 可能出现结构编辑入口 | Authority | P0 | Shot Structure Contract | 所有正式 Shot 变更只由 Shot Authority command；Analysis 走 correction flow | resolved |
| ShotRecord contains analysisFields in CURRENT code | Shot type vs target Analysis Authority | Persistence/ownership | P0 | Analysis Data Model | 迁移到独立 Analysis storage；迁移前禁止删除旧字段数据 | open implementation, design resolved |
| AI output vs formal fact | AI UI / Analysis | Authority/lifecycle | P0 | Analysis Data Model | AI only creates Candidate; explicit accept creates/updates record | resolved design |
| Template as万能 JSON | Analysis/Inspector/Results | Responsibility | P1 | Template Contract | 拆为 Profile/Layout/Renderer/Prompt/Context/ExportMapping | resolved design |
| stale vs candidate status | Analysis/Inspector | Lifecycle | P1 | Analysis Data Model | separate record qualification from candidate review state | resolved design |
| Scene/Sequence/Section mutation | Analysis vs Timeline | Authority | P1 | Timeline contract + Analysis structure commands | Timeline owns invariants; Analysis invokes commands | resolved by boundary |
| Workspace/UI state in domain | Timeline/Analysis stores | State ownership | P1 | STATE_OWNERSHIP | viewport/hover/selection/playback remain workspace/UI | resolved design |
| Result table editing formal facts | Results | Workspace authority | P1 | Results Workspace | default read-only; edits navigate to Analysis or explicit analysis command | resolved design |
| Original archive as source | Archive references | Documentation | P3 | README/Index | Archive never formal SoT | resolved |
