# 文档归档

> 归档日期：2026-09-14

本目录保存已经完成、被新方案替代或只用于追溯过程的资料。归档文档可以帮助理解历史
决策和验证证据，但不构成当前实现要求；当前事实以 [`docs/README.md`](../README.md)
及其分类下的规范文档为准。

当前规范入口：[`architecture/PROJECT_ARCHITECTURE.md`](../architecture/PROJECT_ARCHITECTURE.md)、
[`development/DEVELOPMENT_GUIDE.md`](../development/DEVELOPMENT_GUIDE.md)、
[`development/DEVELOPMENT_TODO.md`](../development/DEVELOPMENT_TODO.md)、
[`operations/OPERATIONS.md`](../operations/OPERATIONS.md)、
[`seo/SEO_DISCOVERABILITY_PLAN.md`](../seo/SEO_DISCOVERABILITY_PLAN.md) 和
[`product/DOCUMENTATION_STATUS.md`](../product/DOCUMENTATION_STATUS.md)。

## 目录

- `plans/`：功能改造计划、阶段计划、handoff 和历史 verification record。
- `chaifen/`：WebHome/WebApp 拆分执行包、阶段 prompt、验收矩阵和切换 runbook。
- `lensflow/`：旧的产品调研、流程规划、UI wireframe 和设计提案。
- `audits/`：带日期的代码审计快照。
- `optimization/`：已完成或被新工程路线取代的全项目优化计划。
- `auto-shot/`：自动分镜的历史实施计划。

## 规则

1. 归档内容保留原始上下文，不把历史“计划中/未提交/待验证”机械改写成当前状态。
2. 新任务不得直接把归档计划当作执行指令；先核对 `AGENTS.md` 和当前规范文档。
3. 若历史资料中的结论仍然有效，将结论提炼到当前规范文档，并在必要处留下归档来源链接。
4. 新建过程性计划优先放在任务分支或临时工作区；阶段结束后提炼结论并归档，避免 `docs/` 根目录持续堆积一次性文件。
