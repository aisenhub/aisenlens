# MIGRATION PLAN

原则：Phase 03 先冻结新 Source of Truth，再让后续 Phase 只依赖新模型。由于当前没有需要保留的正式用户项目数据，v18→v19 允许一次显式 development-reset；从 v19 起，任何正式 schema evolution 都必须使用 versioned migration，禁止通过清库或丢弃 canonical data 解决兼容问题。

| Priority | Goal | Affected Domain | Affected Docs | Affected Code | Risk | Dependency | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | 收敛 Shot Authority 并禁止非命令写入 | Shot | Shot Contract, Workspace docs | shot, auto-shot, calibration, timeline | 正式结构分叉 | command boundary | 所有正式结构变更可追踪且 revision 一致 |
| P0 | 将 Analysis Fact 从 ShotRecord.analysisFields 解耦 | Analysis/Persistence | Analysis Data, Implementation Boundary | shot/types, project repository, analysis | 新结构继续被旧双写污染 | v19 frozen baseline | 新写入不再产生 ShotRecord.analysisFields；v18 开发数据按明确 reset 策略退出 |
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

## Phase 03 冻结（2026-09-18）

- canonical IndexedDB schema 冻结为 **v19**；AnalysisRecord/Candidate/Evidence/ContextManifest 分 store，Shot 不再持久化 Analysis 字段。
- v18 及以前仅被定义为本仓库冻结前的开发期数据，v18→v19 采用显式 development-reset。该例外不得推广到已冻结或用户数据；从 v19 起，任何 schema evolution 必须提供 versioned migration、rollback/abort 证据与 backup/restore 验证。
- Structure migration 与 semantic revalidation 分离：Shot/Group 改动推进 structureRevision，Analysis reconcile 只做 deterministic remap/stale，不静默创造新 semantic value。
- Backup v4 是 v19 的可移植边界，包含 Analysis/Evidence/Candidate/ContextManifest 并验证交叉引用重映射与 ZIP archive round-trip。
- Timeline/Results 当前只有 derived read contract，不拥有迁移后的第二份 canonical dataset；AI 后续只能从 Candidate + ContextManifest 继续演进。
