# DUPLICATE AUDIT

| Concept | Locations | Assessment | Recommended Owner | Resolution |
| --- | --- | --- | --- | --- |
| Template definition | ANALYSIS_WORKSPACE / ANALYSIS_INSPECTOR / ANALYSIS_DATA_MODEL | 语义重复但层次不同；本轮不删除原文，新增 Authority 注记 | 04-domain/template/TEMPLATE_CONTRACT.md | 旧位置保留为 usage/boundary，禁止作为第二 SoT |
| Shot mutation rules | PREPARATION / ANALYSIS / TIMELINE | 部分重复 | SHOT_STRUCTURE_CONTRACT.md | workspace/timeline 只描述调用与 UI |
| stale review | ANALYSIS_WORKSPACE / INSPECTOR / ANALYSIS_DATA_MODEL | 重复状态说明 | ANALYSIS_DATA_MODEL.md | workspace/inspector 只描述表现与流程 |
| Evidence UI vs model | INSPECTOR / EVIDENCE_PROVENANCE_CONTRACT | 不同抽象层，不是真重复 | EVIDENCE_PROVENANCE_CONTRACT.md(model) | Inspector 保留 UI 说明 |
| Timeline state | ANALYSIS_WORKSPACE / TIMELINE_ARCHITECTURE | Workspace orchestration vs domain/view contract | TIMELINE_ARCHITECTURE.md | 明确 state ownership |
| Results eligibility | RESULTS_WORKSPACE / ANALYSIS_DATA_MODEL | 消费规则 vs 数据资格 | ANALYSIS_DATA_MODEL.md | Results 引用 eligibility |

## Content-preservation handling

本轮没有通过删段落来“消除重复”。对仍有历史/语境价值的重复说明采用 Authority 注记与引用治理；只有未来明确确认文本完全同义且无独立语境时才允许合并正文。
