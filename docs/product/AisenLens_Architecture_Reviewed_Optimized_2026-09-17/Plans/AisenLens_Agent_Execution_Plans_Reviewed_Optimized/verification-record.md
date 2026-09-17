> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# Verification Record — 实施进度与验证记录

> **当前状态：计划阶段模板。所有实施/测试/Git 结果均未执行。不得预填通过结果、commit SHA 或推送成功。**

## 1. 项目与基线

- 本次目标：AisenLens Reviewed/Optimized 架构的分阶段落地。
- 实施范围：见 `plan-inputs.md` 与 `00-master-execution-plan.md`。
- GitHub 仓库：未验证
- Git remote：未验证
- 工作分支：未开始
- 起始 commit：未验证
- 初始工作区状态：未验证
- 已有用户修改及归属：未验证
- package manager / runtime：未验证
- 运行环境：未验证
- 已知 baseline failure：未验证

### 1.1 已核实命令登记（Phase 01 填写）

| ID | 用途 | 真实命令 | 来源（package.json/AGENTS/CI等） | 基线结果 |
|---|---|---|---|---|
| CMD-BUILD | build | 未验证 | 未验证 | 未验证 |
| CMD-TYPECHECK | typecheck | 未验证 | 未验证 | 未验证 |
| CMD-LINT | lint | 未验证 | 未验证 | 未验证 |
| CMD-UNIT | unit | 未验证 | 未验证 | 未验证 |
| CMD-INTEGRATION | integration | 未验证 | 未验证 | 未验证 |
| CMD-E2E | browser/e2e | 未验证 | 未验证 | 未验证 |
| CMD-DOCS | docs lint/link | 未验证 | 未验证 | 未验证 |

### 1.2 Affected code map（Phase 01 填写）

| Architecture area | 当前真实文件/目录 | 主要入口/调用链 | 当前状态 | 备注 |
|---|---|---|---|---|
| Project repository / IndexedDB | 未验证 | 未验证 | 未验证 | |
| Media/import | 未验证 | 未验证 | 未验证 | |
| Auto-shot/Worker | 未验证 | 未验证 | 未验证 | |
| Shot/Calibration | 未验证 | 未验证 | 未验证 | |
| Analysis | 未验证 | 未验证 | 未验证 | |
| Template/Profile | 未验证 | 未验证 | 未验证 | |
| Timeline | 未验证 | 未验证 | 未验证 | |
| Results/Export | 未验证 | 未验证 | 未验证 | |
| AI/provider | 未验证 | 未验证 | 未验证 | |
| Backup/Restore | 未验证 | 未验证 | 未验证 | |
| Tests/Fixtures | 未验证 | 未验证 | 未验证 | |

## 2. 阶段状态总表

状态只允许：`未开始 / 进行中 / 已阻塞 / 验证失败 / 验收通过待推送 / 已交付`。

| Phase | 名称 | 状态 | 已完成 | 剩余/依赖 | 代码 commit | Push/远程链接 |
|---|---|---|---|---|---|---|
| 01 | Repository Verification | 未开始 | 无 | 无 | 未产生 | 未推送 |
| 02 | Contract & Runtime Baseline | 未开始 | 无 | Phase 01 | 未产生 | 未推送 |
| 03 | Global Shell & Design System | 未开始 | 无 | 01/02 | 未产生 | 未推送 |
| 04 | Preparation & Shot Authority | 未开始 | 无 | 02/03 | 未产生 | 未推送 |
| 05 | Analysis Data/Evidence/Template | 未开始 | 无 | 02/04 | 未产生 | 未推送 |
| 06 | Analysis Workspace & Inspector | 未开始 | 无 | 03/05 | 未产生 | 未推送 |
| 07 | Timeline | 未开始 | 无 | 04/05/06 | 未产生 | 未推送 |
| 08 | Results/Export/Creative | 未开始 | 无 | 05/07 | 未产生 | 未推送 |
| 09 | AI Candidate/Context | 未开始 | 无 | 05/07/08 | 未产生 | 未推送 |
| 10 | Hardening/Release Gate | 未开始 | 无 | 04–09 | 未产生 | 未推送 |
| 11 | Governance/Closeout | 未开始 | 无 | 01–10 | 未产生 | 未推送 |

> **“已交付”条件**：实施完成 + 必要验收实际通过 + 相关必要 commit 成功 push 且远程确认包含 SHA。

## 2.1 Architecture Coverage Evidence（每阶段结束必填）

状态只允许：`implemented / explicit non-goal / approved deferred / not-applicable / failed`。每份正式来源至少一行；若同一来源有多个独立未完成章节，应拆行记录。

| Phase | 正式来源/章节范围 | 状态 | 代码/配置证据 | 测试/浏览器证据 | Deferred/Non-goal 决议与原因 | Traceability 行已更新 |
|---|---|---|---|---|---|---|
| 未执行 | - | - | - | - | - | 未开始 |

硬规则：
- `implemented` 必须能定位真实代码和验证证据；只有代码 diff、没有验证，不能算完整覆盖。
- `approved deferred` 必须写明依赖/影响/后续落点；不得用“时间不够”替代技术/产品决议。
- 原文中状态、错误恢复、键盘/a11y、迁移、安全、性能等横切要求同样需要 evidence，不能只验证 happy path。
- 阶段“已交付”前，当前 Phase 的 traceability 映射不得残留无解释的“未开始”。

## 3. 每阶段实施记录模板

### Phase XX — [名称]

- 开始日期：未开始
- 结束日期：未开始
- 实施 agent：未记录
- 基线 SHA：未验证
- 实际修改文件及职责：未开始
- 实现的用户/系统行为：未开始
- 冻结/复用的数据模型、接口、跨阶段契约：未开始
- 与原计划偏差：无（未开始）
- 偏差原因/影响：无（未开始）
- 新增依赖及必要性：无（未开始；未经计划不得默认新增）
- 尚未完成：全部未开始
- 明确未验证：全部未验证
- Traceability 核对：未开始

#### 阶段交接
- 下一阶段从哪里开始：未开始
- 必须先解决的问题：未验证
- 可直接复用的接口/能力：未验证
- 不应重复实施的已完成工作：无
- 当前未提交修改及归属：未验证
- 需要用户决定的事项：未验证；若无则实施时明确写“无”

## 4. 验证记录模板

| 日期 | Phase | 被验证代码 SHA | 环境/fixture | 实际命令或浏览器操作 | Exit code | 结果摘要 | 失败/修复/复测 | 日志/截图位置 |
|---|---|---|---|---|---:|---|---|---|
| 未执行 | - | - | 未验证 | 未执行 | - | 未验证 | - | - |

### 规则

- 不用“测试通过”代替实际命令和退出码。
- 浏览器验证写清操作序列、viewport/theme、测试素材/fixture。
- persistence：记录保存失败、revision conflict、过期状态、恢复。
- migration：记录输入版本、内容保留对比、失败/恢复。
- 并发：记录标签页/任务时序和最终 revision。
- 性能：记录 build mode、浏览器、环境、fixture 规模、指标/可操作判据。
- 相关代码在验证后改变时，必须复测或明确原结果不再覆盖。
- 失败记录保留；修复后新增复测，不把失败直接改写成“从未失败”。

## 5. GitHub 交付记录模板

| Phase | Commit SHA | Branch | Commit 说明 | Push 是否成功 | 远程是否包含 | GitHub 链接 | 备注 |
|---|---|---|---|---|---|---|---|
| 未执行 | - | 未验证 | - | 未推送 | 未验证 | - | - |

说明：阶段代码可先 commit/push，再单独提交 verification record 写入最终 SHA；不要为了“commit 记录自己的 SHA”反复 amend。

## 6. 关键失败 / 阻塞日志

| 时间 | Phase | 问题 | 证据 | 影响范围 | 推荐/实际处理 | 状态 |
|---|---|---|---|---|---|---|
| 未发生 | - | - | - | - | - | 未开始 |

## 7. 需要用户决定的事项

当前计划阶段：**无已确认需要用户决定的事项**。执行时如果只有“无法合理推断且会改变实施结果”的问题才新增；普通实现细节由 agent 按已定架构和真实代码决定并记录。
