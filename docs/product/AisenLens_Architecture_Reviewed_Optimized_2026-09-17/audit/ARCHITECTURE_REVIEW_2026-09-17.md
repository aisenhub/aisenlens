# ARCHITECTURE REVIEW — 2026-09-17

## Overall assessment

架构主干合理，尤其是 Authority / Source of Truth / Candidate vs Formal Fact / Timeline state separation。继续按 local-first modular monolith 推进是合适的，当前阶段**不需要**微服务、分布式事件总线或复杂插件系统。

## Findings fixed in this package

### P0 documentation correctness

- 修复 `STATE_OWNERSHIP.md` 中 canonical domain entities 的 `Persistent? = No` 矛盾，改为 `Yes`。

### P1 architecture completeness

- 新增 `05-runtime/OPERATIONAL_ARCHITECTURE.md`，覆盖 IndexedDB durability、quota/corruption、多标签页 revision、Worker lifecycle、AI trust boundary、import/export validation、observability、CI/release/rollback、feature rollout 与 capacity budgets。
- 将这些要求映射到 Master Development Plan，避免“架构有要求但计划无执行阶段”。

### P1 implementation governance

- `features/project` 明确拥有 schema migration、backup/restore integrity 与 storage health 边界。
- Worker/AI/export 均不能直接污染 canonical data；所有异步结果必须验证 dependency revision。

## Accepted / deferred items

- Scene/Sequence/Section 最终 schema 仍需在实施前冻结；不建议现在再增加一套结构模型。
- 远程 telemetry、多用户协作、云同步、微服务不是当前架构缺陷；它们属于未来需求触发项。
- Archive 内原始文件和嵌套 `design.7z` 保持原样，仅用于追溯；本轮已抽查其内容与当前正式包关系，未将 Archive 重新提升为权威。

## Recommended implementation order

保持现有 Phase 主顺序，但 Phase 0 先冻结 runtime contracts；Phase 2-8 各功能按统一 repository/task/error 规则实现；Phase 9 再做全量 migration/race/corruption/performance/release hardening。这样比到最后补可靠性更低风险。
