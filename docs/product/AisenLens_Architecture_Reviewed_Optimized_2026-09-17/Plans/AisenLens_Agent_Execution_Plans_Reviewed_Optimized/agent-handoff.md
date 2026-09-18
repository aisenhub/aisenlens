> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# Agent Handoff — 执行入口与交接说明

## 可直接复制给执行 agent 的完整提示词

```text
你现在负责在本地 AisenLens 仓库执行“架构优化分阶段计划”。

执行入口：docs/plans/aisenlens-architecture-optimization/（若实际目录不同，以当前计划目录为准）。

先读顺序：
1) 本目录 plan-inputs.md
2) 本目录 verification-record.md
3) 仓库根及作用域内 AGENTS.md
4) 本目录 00-master-execution-plan.md
5) 当前阶段计划
6) architecture-traceability.md 中映射到当前阶段的正式架构原文
7) 上一阶段 verification-record.md 的交接与实际 Git 状态

硬规则：
- 当前实现事实只认实际代码/Git/实际命令，不把旧文档“已完成”当证据。
- 目标行为沿用 2026-09-17 Reviewed/Optimized 架构；不要重新发散设计。
- 未核实的文件、接口、脚本、测试命令必须先查证；不得编造。
- Phase 01 必须先完成；Phase 02 的跨阶段契约冻结后才可并行功能阶段。
- 不引入微服务、分布式总线、任意插件系统或无必要新依赖。
- 不清库、不丢字段、不做长期双写、不维护第二事实源。
- Official Shot 只有 Shot Authority command 可正式修改。
- Analysis Fact 与 Candidate 分离；AI/provider 只能先产 Candidate/建议。
- Timeline viewport/hover/zoom 等 view state 不进入 domain canonical persistence。
- canonical write 只有 repository transaction 成功后才能显示 saved。
- Worker/AI/export 结果必须核对 task/dependency revision；旧结果不得覆盖新事实。
- import/provider response 是不可信输入，先校验再进入 Application/Domain。
- 默认日志/诊断不记录用户媒体、分析正文或完整 prompt/context。

执行方式：
A. 每阶段开始：核对 Git root、remote、工作分支、HEAD、工作区已有修改；与 verification-record 对齐。
B. 阅读真实代码，确认当前阶段计划中的 affected files；如路径与计划不同，记录差异，不机械创建计划中假设的文件。
C. 按依赖顺序实施；优先复用现有能力；不借机重构无关代码。
D. 实际运行该阶段必要验证，并在 verification-record 记录日期、代码 SHA、环境、命令、退出码、结果、失败/复测。
E. 浏览器/UI 阶段必须做真实浏览器操作；性能必须记录固定 fixture/环境，不编造指标。
F. 阶段完成前核对 architecture-traceability 对应章节，确认每条要求有实现/明确 deferred/不适用证据。
G. 检查 diff；不提交密钥、env、用户媒体、缓存或无关改动。
H. 创建含阶段编号和实际变更的 commit；允许多个有意义 commit。必要验证通过后 push 到已确定的 GitHub 远程分支，并确认远程包含 SHA。
I. 更新 verification-record。代码写完但未验证，或 commit 未 push，都不能标“已交付”。
J. push 失败时保留本地成果并记录原因；解决并成功 push 后才进入下一阶段。

Git 权限：本提示词已授权每阶段正常 commit + push；无需重复询问。禁止 force push、重写历史、合并主分支、建 Release、部署。缺 remote/权限时报告具体阻塞。

冲突处理：
- 若实际代码与目标架构有实质冲突/数据丢失风险/不可实现前提：记录证据和影响，给推荐处理，继续不依赖部分；只有无法合理推断且会改变实施结果时再向用户提问。
- 若 verification-record 与 Git/代码不一致：先查清并修正记录，不能盲目续做。

现在先判断当前应执行的最早未交付阶段；不要跳阶段。执行前先核实该阶段所有前置条件。
```

## 复审后新增执行硬规则

- 当前阶段文件中的“完整覆盖清单/补强清单”是硬 scope，不是可选建议。
- `architecture-traceability.md` 的章节映射是完整范围索引：阶段结束必须逐行形成 evidence；不得用“阶段摘要已覆盖”代替原文核对。
- 如果阶段计划与正式架构原文细节不同：Authority/Source of Truth 按正式架构与 audit 决议；阶段计划用于安排执行顺序，不自行覆盖领域契约。
- 横切 runtime/a11y/security/performance 要在功能 Phase 就按统一 contract 实现，Phase 10 只做系统性 hardening/复验，不允许把已知正确性问题留到最后。

## 阶段依赖与停止边界

- 01→02 必须串行。
- 03 Analysis migration 先于 05 Shot Authority。
- 03 是 06/08/09 的核心依赖。
- 07 依赖 03/05/06 的共享状态/structure read models。
- 10 在功能阶段基本完成后统一 harden。
- 若 Phase 02 persistence migration 设计失败：停止 Phase 03 migration；可继续不依赖它的 Shell 工作。
- 若发现可能丢用户数据：立即停止相关写路径改造，保留证据并修正迁移方案。

## 多 agent 协作与文件所有权

只有在共享契约冻结后才并行。每个 agent 在 verification record 登记自己负责的目录/文件；共享 contract/repository/schema 文件由**集成负责人**独占或串行修改。集成负责人负责：

- 解决跨 agent contract 冲突；
- 确保无两个 agent 各自创建 task/error/revision/template field 语义；
- 统一跑集成测试和 traceability；
- 合并前检查禁止依赖和重复 Authority。

建议并行边界：Shell UI vs Shot domain tests；Inspector renderer vs Timeline View；Results UI vs AI provider adapter。Repository schema、Analysis model、Shot commands、shared state contracts 不并行无协调修改。

## 接手任务核对清单

1. `git status --short --branch`；确认是否有未提交修改及其归属。
2. `git rev-parse HEAD`；与 verification record 最新阶段 SHA 对比。
3. `git remote -v`；确认远程未变化。
4. 检查远程分支是否含已记录 push SHA。
5. 阅读最近一次失败/阻塞/偏差记录。
6. 打开当前阶段计划和 traceability 原文；重新核实 affected files。
7. 仅在上述一致后继续。

`agent-handoff.md` 是稳定规则，不作为进度日志；所有动态事实写 `verification-record.md`。
