# MIGRATION PLAN

原则：先建立新 Source of Truth 与兼容读取，再迁移数据，最后移除旧耦合；任何阶段都不得通过清库或丢弃字段解决兼容问题。

| Priority | Goal | Affected Domain | Affected Docs | Affected Code | Risk | Dependency | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | 收敛 Shot Authority 并禁止非命令写入 | Shot | Shot Contract, Workspace docs | shot, auto-shot, calibration, timeline | 正式结构分叉 | command boundary | 所有正式结构变更可追踪且 revision 一致 |
| P0 | 将 Analysis Fact 从 ShotRecord.analysisFields 解耦 | Analysis/Persistence | Analysis Data, Implementation Boundary | shot/types, project repository, analysis | 数据迁移丢失 | versioned repository migration | 迁移前后字段值/unknown/NA 完整一致；旧数据可读 |
| P0 | AI Candidate 与正式值物理/逻辑分离 | Analysis/AI | Analysis Data, Evidence | analysis, future AI | 静默覆盖 | independent candidate lifecycle | 未经 accept 的 Candidate 不进入正式导出 |
| P1 | 落地 Template 子契约 | Template | Template Contract | template, analysis, export | 万能 JSON 再膨胀 | stable field IDs | Profile/Layout/Prompt/Context/ExportMapping 责任清晰 |
| P1 | 统一 stale/remap 规则 | Analysis/Shot | Analysis Data, Shot Contract | analysis, shot commands | 错误保留旧结论 | structure revision | split/merge/move 都产生可预测 review impact |
| P1 | Timeline 分离 domain/application/view state | Timeline | Timeline Architecture, State Ownership | timeline | UI 反向拥有 domain | Shot/Analysis read models | viewport/hover 不进入 domain persistence |
| P2 | Results 建立统一 derived dataset/query | Results | Results Workspace | export/results modules | 重复聚合逻辑 | Analysis eligibility | 表/导出/创作读取同一 query contract |
| P3 | 持续文档 lint/manifest/source mapping | Docs | all audit docs | CI/docs tooling | 文档漂移 | none | dead-link=0; duplicate authority=0 |
| P0 | 冻结 persistence runtime contract | Persistence | Runtime Architecture | project repository | quota/corruption/race 导致数据丢失 | schema/revision baseline | quota/abort/revision mismatch 均有可恢复路径 |
| P1 | 统一 Worker/task lifecycle | Runtime | Runtime Architecture | workers, auto-shot, media, export | 旧任务覆盖新数据/资源泄漏 | taskId + dependency revision | cancel/crash/stale result tests 通过 |
| P1 | 建立 import/AI provider trust boundary | Security/AI | Runtime Architecture | import, analysis AI adapter | 不可信输入进入正式数据/密钥泄露 | validation + provider adapter | malformed input 被拒绝；provider 只能生成 Candidate |
| P2 | 建立隐私友好 diagnostics / performance marks | Runtime | Runtime Architecture | cross-cutting | 难以定位失败或日志泄露内容 | typed error model | support data 不含默认用户内容；关键耗时可定位 |
| P2 | CI/release hardening 与 rollback gate | Delivery | Runtime Architecture | CI/build/release | migration/race 回归进入发布 | automated gates | migration/backup/race/cancel/performance gate 通过 |

