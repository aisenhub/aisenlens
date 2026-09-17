> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 02 — 跨阶段契约冻结与 Runtime/Persistence Baseline

## 目标

在任何大规模功能改造前，冻结唯一的数据、revision、transaction、task/error、trust 和恢复边界。此阶段允许必要的最小 contract/repository 基础改动与测试，但不扩展业务 UI。

## 前置条件与必读

- Phase 01 已核实 affected files 和真实测试命令。
- 必读：Shot Contract、Analysis Data Model、Evidence Contract、Template Contract、Timeline Architecture、Runtime Architecture、State Ownership、Command/Event Map、Dependency Graph、Migration Plan。

## 早期必须验证的技术问题（Spike）

### V1 — Scene/Sequence/Section 持久化模型
- **问题**：真实代码已有何种 identity/range/membership？目标不能产生第二 Authority。
- **方法**：追踪 types/schema/repository/read models/Timeline consumers；用最小 fixture 验证 round-trip。
- **成功**：能明确 stable identity、层级/成员关系、revision 与 Shot 变化后的重整规则。
- **失败处理**：冻结为单一结构模型设计决议，阻塞 Phase 07 对这些层级的编辑；不阻塞 Shot/Analysis 基础。

### V2 — IndexedDB schema/version/migration
- **问题**：当前 schema 如何升级、事务失败如何传播、backup 是否版本化。
- **方法**：读取真实 schema/migration 代码和已有测试；构造非破坏 migration fixture。
- **成功**：写出 versioned migration + rollback/recovery 策略，不要求 destructive downgrade。
- **失败处理**：Phase 05 数据迁移不得开始。

### V3 — 多标签页与异步 late result
- **问题**：是否已有 revision/lock/channel 协调；正确性不能只靠 UI。
- **方法**：核实 repository write 条件与 task result application 点。
- **成功**：expected revision 是最终正确性门，BroadcastChannel/Web Locks 仅可辅助。
- **失败处理**：先补 repository compare-and-write / typed conflict，再继续下游。

## 必须冻结的统一契约

1. **Revision Contract**：哪些实体有 revision、何时递增、command 输入 expected revision、冲突返回类型。
2. **Repository Transaction Contract**：成功后才更新 saved 状态；abort/quota/corruption 的 typed failure 与恢复动作。
3. **Task Lifecycle**：taskId、dependency revision、cancel、crash/fail、complete、stale discard；Worker/AI/export 共用语义。
4. **Typed Error Taxonomy**：可重试、需用户修复、revision conflict、storage unavailable/corrupt、validation rejected、provider failure 等。
5. **Import Trust Contract**：schema/version/type/size validation 发生在 canonical write 之前。
6. **Secret/Provider Contract**：server-owned secret 不进前端 bundle；BYOK 独立保存策略按项目现状决定并文档化。
7. **Diagnostics Contract**：默认只记录结构化错误/耗时/版本/revision，不记录媒体正文/分析正文/完整 prompt-context。
8. **Capacity Benchmark Method**：定义测试 fixture 规模、浏览器/机器/构建模式和可接受判据；不预设虚假的跨设备数字。

## 建议修改/新增职责

真实文件名由 Phase 01 决定。优先扩展已有 project repository/runtime types/test fixtures；只有现有结构无法承载时才新增集中 contract 文件。禁止每个 feature 自建 error/task/revision enum。

## 正常/失败/恢复状态

- save pending → transaction committed → saved；失败保持 dirty/unsaved 并给恢复动作。
- revision conflict → 保留本地编辑上下文，要求 reload/rebase/retry 策略，不覆盖远端/新 revision。
- quota/corruption → 不清库；进入只读/备份/诊断/恢复路径。
- cancel → task 不再应用结果；late callback 仍需 revision/task token 验证。

## 测试

使用 Phase 01 的真实 unit/integration 命令，新增/扩展最小 fixture：transaction abort、expected revision mismatch、cancel + late result、malformed import、corrupt record/backup（若边界已存在）。所有命令和退出码写入 verification record。

## 阶段交付

- 冻结的 contract 决议与代码落点。
- 下游可复用的 typed types/ports/tests。
- unresolved spike 及明确阻塞对象。

## 本阶段补强后的统一 Runtime Contract 清单

Phase 02 不只冻结 revision/error 的类型名，还要冻结下面的行为语义；真实字段名仍以 Phase 01 核实的代码为准。

### Persistence / backup
- canonical entity 明确 `schemaVersion/migrationVersion` 或等价版本边界；migration failure 保持旧数据可恢复，不清库。
- backup/restore 在写入 canonical repository 前验证版本、引用、range、identity 与必要 manifest/checksum；corrupt/超版本包拒绝且不污染现有项目。
- 明确 `quota / transaction abort / persistence unavailable / private mode / storage eviction / canonical corruption / cache corruption` 的区别；cache 可重建，canonical corruption 进入只读/修复/导出诊断/备份恢复。
- autosave 只应用当前 command chain；旧 snapshot/旧标签页/旧 task 的写入必须经过 expected revision correctness gate。

### Task lifecycle
- 统一状态至少覆盖 `queued / running / succeeded / failed / cancelled`；禁止各 feature 自建互不兼容的状态机。
- task envelope 除 `taskId + dependencyRevision` 外，还需冻结 cancel token/结果应用点、crash/failure、stale discard、bounded concurrency/memory budget、retry eligibility（仅幂等或明确可重试步骤）。
- Worker crash、cancel、timeout 或 provider/export failure 均不得直接改变 canonical facts。

### Trust / render / export
- import/project/template/provider response：schema + version + type + size validation 在 canonical write 前完成；媒体/文件类型不能只信扩展名。
- 外部 label/note/template/rich text/Markdown 统一安全渲染/转义；禁止执行导入脚本、函数或任意 renderer 定义。
- Export 只通过受控 preset/adapter；文件名、文本、富文本输出做规范化/转义；Export failure 不改变 Analysis/Shot canonical 状态。
- Provider/BYOK/secret、最小 context、发送范围说明由统一 contract 约束，Phase 09 只消费该 contract。

### Diagnostics / performance / rollout
- 冻结 machine-readable diagnostic schema：error code/subsystem/operation/duration/taskId/schemaVersion/revision；默认不记录媒体、分析正文、完整 prompt/context。
- 预留 timeline render、decoder queue、worker duration、DB transaction、export duration 等 performance marks；support bundle 必须先脱敏且由用户显式触发。
- 冻结 capacity 测试维度：project open/reopen、timeline pan/zoom、thumbnail/waveform cache upper bound、worker queue、peak decode/export memory、Results large-table、migration/backup duration。
- 若仓库已有 feature flag，冻结 typed flag 规则：owner、default、removal criteria；flag 只能切路径，不能形成第二套 domain semantics/canonical schema。
- 把真实 CI/release gate 能力登记为 contract 消费者：build/typecheck/lint、domain invariant、migration、import corruption、race、worker cancel/crash、backup/restore、critical workspace smoke、performance、dependency/security audit。

## 额外 Spike 与测试

- **V4 — Backup/restore integrity**：证明损坏/超版本/引用断裂的备份不会污染现有项目；若当前没有 backup 边界，冻结 Phase 10 的最小可实施接口与 fixture。
- **V5 — Export safety**：定位所有导出入口，验证失败不会改变 canonical analysis；如存在 filename/rich-text 直通，Phase 08/10 必须整改。
- **V6 — Feature rollout**：若已有 flags，检查是否存在双写/双 schema；若没有，不为低风险功能新建 flag 框架，只为明确高风险路径保留最小机制。

## 阶段完整性出口

- `OPERATIONAL_ARCHITECTURE.md` 的 1–11 节均有代码落点、测试设计或明确下游 Phase，不得只覆盖 persistence/worker 的一部分。
- Accepted Risk R-02（Scene/Sequence/Section schema）在此形成单一模型决议或明确阻塞；R-03 中 Prompt/Context/ExportMapping 的边界已冻结到 Phase 05/08/09 的可实施 contract。
- 下游不得再各自定义 revision/task/error/trust/diagnostic/feature-flag 语义。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
