> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 执行输入

> 用户可在放入本地仓库后直接编辑本文件。执行 agent 在 Phase 01 必须以 Git 和代码事实补全未知项。

| 输入 | 值 | 执行规则 |
|---|---|---|
| 项目路径 | `[项目绝对路径；未填则从当前工作目录向上定位 Git root]` | 必须核实，禁止猜测 |
| 目标模块 | `AisenLens webapp / 本次架构优化涉及的直接模块` | Phase 01 根据 affected code map 收敛 |
| 架构文档根目录 | `[Reviewed/Optimized 架构包在本地的路径]` | 若本计划与架构包同仓，记录实际相对路径 |
| 补充讨论结论 | `无；如有请追加` | 只补充文档未记录的决定 |
| 本次范围 | `Reviewed/Optimized 架构包中 Master Plan P0–P3 及 architecture-traceability 映射的全部本期项` | 若用户另行缩减，以用户明确范围优先 |
| 暂不实施 | `远程 telemetry、多用户协作、云同步、微服务、复杂插件系统、未批准的 Keyframe 设计、Release/部署本身` | 架构文档明确 deferred/non-goal；不要顺手实现 |
| 计划保存目录 | `docs/plans/aisenlens-architecture-optimization/` | 可按仓库规范调整 |
| 工作分支 | `[未指定；按 AGENTS.md/仓库规范创建专用分支]` | 所有阶段沿用同一任务分支，除非仓库规范另有规定 |
| Git remote | `[Phase 01 核实]` | push 前必须核实 |

## 不能提前填写的事实

以下内容必须由 Phase 01 从本地仓库核实后写入 `verification-record.md`：

- 当前 commit、工作区是否已有用户修改；
- 精确文件路径与真实调用链；
- package manager、build/typecheck/lint/test/e2e 命令；
- IndexedDB schema/version 与 repository 入口；
- Worker/AI/export 现有实现；
- Scene/Sequence/Section 当前代码模型；
- 当前浏览器测试、性能基准和 CI gate；
- GitHub 远程、分支规范与可用权限。
