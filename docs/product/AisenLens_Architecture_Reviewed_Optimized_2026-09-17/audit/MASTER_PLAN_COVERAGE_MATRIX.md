# MASTER PLAN COVERAGE MATRIX

本矩阵是 2026-09-17 全包复审后的“架构 -> 总计划”覆盖检查。`Covered` 表示已有明确 Phase/DoD；`Strengthened` 表示原计划有零散要求，本轮补为明确执行项；`Gap Closed` 表示本轮新增后首次形成闭环。

| Architecture area | Authority / document | Master plan coverage | Status | Review note |
| --- | --- | --- | --- | --- |
| Global IA / Workspace shell | `00-global/GLOBAL_WORKSPACE_ARCHITECTURE.md` | Phase 1 | Covered | 边界清晰 |
| Design System / a11y | `00-global/WORKSPACE_DESIGN_SYSTEM.md` | Phase 1 + all Phase gates | Covered | 横切主线正确 |
| Preparation / Official Shot | `01-preparation/*`, Shot Contract | Phase 2 | Covered | Authority 单一 |
| Analysis data / candidate / stale | Analysis Data Model | Phase 3-5 | Covered | 迁移依赖合理 |
| Evidence / provenance | Evidence Contract | Phase 3/5 | Covered | UI 与语义分离合理 |
| Template/Profile | Template Contract | Phase 3/5/7/8 | Covered | 避免万能 Template |
| Timeline domain/application/view | Timeline Architecture | Phase 6 | Covered | 性能与 state ownership 较完整 |
| Results / export / creative | Results Workspace | Phase 7 | Covered | 保持 Derived consumer |
| AI Candidate / Context | Analysis/Template/Timeline contracts | Phase 8 | Covered | AI 不为 SoT |
| Persistence migration / revision | Migration Plan / Timeline | Phase 0/3/9 | Strengthened | 补 quota/corruption/multi-tab/race |
| Backup / restore integrity | Timeline + Runtime Architecture | Phase 9 | Strengthened | 从“有备份”提升为完整性校验 |
| Worker lifecycle / cancellation | Runtime Architecture | Phase 0/9 | Gap Closed | 原文仅零散提 Worker，无统一 lifecycle |
| Security / import trust boundary | Runtime Architecture | Phase 0/9 | Gap Closed | 原包缺少系统性安全契约 |
| AI outbound privacy / secret boundary | Runtime Architecture | Phase 8/9 | Gap Closed | 补最小上下文、密钥与不可信响应 |
| Observability / diagnostics | Runtime Architecture | Phase 9 | Gap Closed | 默认本地且不记录用户内容 |
| CI / release / rollback | Runtime Architecture | Phase 9/10 | Gap Closed | 增加 race/cancel/corrupt fixtures gates |
| Feature rollout | Runtime Architecture | Phase 9/10 | Gap Closed | 仅高风险路径，禁止双事实模型 |
| Capacity budgets | Runtime Architecture + Timeline | Phase 9 | Strengthened | 阈值由真实基准冻结 |
| Documentation governance | audit/* | Phase 10 | Covered | 保持 Archive 非权威 |

## Conclusion

复审前，总计划对**功能、领域、UI/UX、迁移**覆盖度高，但不能称为覆盖“全部架构”：运行时可靠性和工程治理存在明显空白。加入 `05-runtime/OPERATIONAL_ARCHITECTURE.md` 并把相应 gates 写入 Phase 0/8/9/10 后，计划具备完整的产品架构 + 领域架构 + 运行时架构执行闭环。
