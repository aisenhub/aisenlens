> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# AisenLens 架构优化 — Agent 分阶段执行计划包

本计划包把 `AisenLens_Architecture_Reviewed_Optimized_2026-09-17` 中的正式架构、运行时约束、迁移计划和 Master Development Plan 转换成可直接交给本地 coding agent 的阶段化执行指令。

## 先做什么

1. 将本目录放入目标仓库，建议目录：`docs/plans/aisenlens-architecture-optimization/`。
2. 打开 [`plan-inputs.md`](plan-inputs.md)，填写已知输入；未知项允许由执行 agent 在 Phase 01 从 Git/仓库事实自动核实。
3. 执行 agent **先读** [`agent-handoff.md`](agent-handoff.md)，再按 [`00-master-execution-plan.md`](00-master-execution-plan.md) 的顺序推进。
4. 执行状态只写入 [`verification-record.md`](verification-record.md)，不要把阶段计划改成“已完成”日志。
5. 每一阶段结束前，必须核对 [`architecture-traceability.md`](architecture-traceability.md) 对应该阶段的架构章节。

## 文件结构

- `00-master-execution-plan.md`：总执行计划、阶段图、并行规则、统一契约、全局 DoD。
- `01`–`11`：各阶段可执行计划。
- `architecture-traceability.md`：正式架构章节 → 阶段的覆盖追踪表。
- `agent-handoff.md`：可直接复制给执行 agent 的入口提示词和交接规则。
- `verification-record.md`：后续实施阶段填写的唯一事实记录模板；当前全部为未开始/未验证。
- `plan-inputs.md`：项目路径、模块、架构根目录、本次范围/排除项等输入。

## 本计划的关键原则

- 先核实代码，后实施；Phase 01 不允许跳过。
- 先冻结 Authority / Data / Revision / Persistence / Task / Error / Trust contracts，再让多个 agent 开工。
- 不引入微服务、分布式事件总线、任意插件系统等架构包明确不需要的复杂度。
- 不用清库、丢字段、双事实源或静默覆盖解决迁移问题。
- 每阶段代码完成 + 必要验证通过 + commit 已成功 push，才允许标记“已交付”。

## 2026-09-17 复审增强说明

本目录已再次对照正式架构文档、`AisenLens_MASTER_DEVELOPMENT_PLAN_2026-09-17.md` 与原 01–11 阶段计划进行覆盖审核。复审结论：原计划的 Authority/迁移主线正确，但部分细节仅由 `architecture-traceability.md` 隐式兜底，阶段正文对 Preparation UX、Inspector、Timeline、Results Export/Creative、Runtime failure/rollout/capacity 等要求不够显式。

本版已把这些要求直接补入对应阶段，并新增 `PLAN_COVERAGE_REVIEW_2026-09-17.md`。后续执行时，阶段正文中的“完整覆盖清单”属于硬 scope；仍必须回读 traceability 对应的正式架构原文，不能用本计划摘要替代 Source of Truth。
