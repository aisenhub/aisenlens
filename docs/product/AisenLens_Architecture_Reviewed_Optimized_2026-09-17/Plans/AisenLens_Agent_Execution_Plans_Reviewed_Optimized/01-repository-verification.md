> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 01 — 真实仓库核实、调用链与基线冻结

## 目标与前置条件

这是唯一允许在“尚不了解代码”状态下开始的阶段。目标是把后续所有阶段需要的路径、命令、调用链和真实现状冻结成可复核事实。**本阶段不做产品功能改造**；除计划/记录文档外，不应修改产品代码。

## 必读

1. 仓库根 `AGENTS.md` 及作用域内嵌套 `AGENTS.md`。
2. Reviewed/Optimized 架构包：`README`、`ARCHITECTURE_INDEX`、`audit/CURRENT_REPOSITORY_BASELINE`、`audit/FINAL_CONCEPT_REGISTRY`、`audit/FINAL_SOURCE_OF_TRUTH_MATRIX`、`audit/AUTHORITY_MAP`、`audit/STATE_OWNERSHIP`、`audit/COMMAND_EVENT_MAP`、`audit/DECISION_LOG`、`audit/DEPENDENCY_GRAPH`、`audit/FINAL_ARCHITECTURE_AUDIT`、`audit/MASTER_PLAN_COVERAGE_MATRIX`、`implementation/IMPLEMENTATION_BOUNDARY`、`implementation/MIGRATION_PLAN`、`implementation/AI_DEVELOPMENT_GUIDE`、`05-runtime/OPERATIONAL_ARCHITECTURE`、Master Plan。
3. 本计划：`plan-inputs.md`、`00-master-execution-plan.md`、`verification-record.md`。

## 必须核实的代码事实

### A. 仓库与工具链
- Git root、remote、默认/当前分支、起始 commit、工作区已有修改及归属。
- package manager、workspace 工具、Node/运行时版本来源。
- 根/`apps/webapp` 的 build/typecheck/lint/unit/integration/e2e/dev 脚本和 CI workflow。
- 不安装缺失依赖；若当前环境无法运行，记录“未验证 + 原因”。

### B. 模块与真实路径
定位并记录：app/router、workspace shell、design system/components、project repository/IndexedDB schema、media、auto-shot/worker、shot/shot-calibration/scene-calibration、analysis、template、timeline、results/export、AI/provider（如有）、backup/import/export、tests/fixtures。

### C. 核心调用链（至少逐条追踪）
1. 导入媒体 → project/media persistence。
2. 自动切分 → Candidate → 用户确认 → Official Shot write。
3. Shot boundary move/split/merge → revision → 下游影响。
4. Analysis field 编辑 → save → reload。
5. Template/Profile 切换 → UI/render/export mapping。
6. Timeline selection/playback/viewport → Inspector/Player。
7. Results query → export。
8. Worker/AI（如存在）→ result → canonical/candidate write。
9. backup/restore/import（如存在）→ schema migration。

## 产出

只更新计划记录，不改产品逻辑：

- 在 `verification-record.md` 填写基线、命令登记、真实 affected file map、调用链、已知 baseline failure。
- 对每个架构目标标记：`已实现且核实 / 部分实现 / 未实现 / 与目标冲突 / 待验证`。
- 记录可复用能力、重复实现、旧路径、禁止直接复用的错误路径。
- 建 UI/交互基线：已有页面、关键空态/错误态/保存态；若仓库已有截图机制，记录其真实用法，不临时造工具。

## 差异处理

- CURRENT 以代码为准；TARGET 以正式架构为准。
- 文档说“已完成”但代码/测试未证实 → 记为未验证。
- 若发现架构前提不可实现或有数据丢失风险：记录证据/影响/推荐处理；仅阻塞依赖它的下游阶段。

## 测试与可观察结果

本阶段只执行**仓库已有且无需安装新依赖**的只读/基线命令。至少记录 Git 命令退出结果；代码命令必须来自真实 scripts/AGENTS/CI。不得写“测试通过”而没有实际命令和退出码。

## 完成门槛

- 后续阶段不再依赖“猜测路径/猜测命令”。
- 所有直接影响模块有真实文件/调用链证据。
- 已有用户改动已标明所有权，后续 agent 不会覆盖。
- Phase 02 需要冻结的 unresolved contracts 有清单。

## 本阶段补强后的完整核实清单

除上面的代码事实外，Phase 01 还必须把后续架构优化所依赖的“真实能力/真实缺口”一次性摸清：

### D. UI/UX 与交互基线
- 记录三 Workspace、Drawer/Sheet、Inspector、Modal、Popover/Context Menu/Command Palette 的真实层级与 focus/close/restore 行为。
- 盘点现有 token：surface、dark/light、accent/semantic、typography、spacing、radius、border、shadow、motion/easing、focus ring。
- 建立核心组件状态矩阵：default/hover/pressed/focused/selected/disabled/loading/error/dirty/saved；确认 Selection 与 Playback 是否已有独立语义。
- 记录 responsive/panel collapse、keyboard shortcut、tooltip、view preference/density/workspace mode 的现状；有截图/e2e/Story 能力则记录真实命令和产物位置。
- 标出页面私有颜色/圆角/阴影、Card/Modal 过度使用、深层页面跳转等设计系统漂移点，供 Phase 04 收敛。

### E. Runtime / trust / delivery 基线
- 核实 IndexedDB storage persistence、quota/eviction/private mode/transaction abort/corruption 的现有处理路径；不要只记录 schema happy path。
- 核实 multi-tab、autosave、Worker/async late result 的 revision/lock/channel/task token 现状。
- 盘点 detection/thumbnail/waveform/export/AI 等长任务的 task state、cancel、retry、并发/内存限制和 crash 行为。
- 盘点 import/project/template/media/provider response 的 validation/sanitization；确认文件类型是否只依赖扩展名、Markdown/rich text 是否安全渲染、是否存在导入脚本/任意 renderer 执行面。
- 盘点 export adapter/preset、文件名与文本规范化、失败时是否会误改 canonical 状态。
- 盘点 diagnostics/performance marks/support bundle/telemetry；明确是否会记录媒体、分析正文、完整 prompt/context。
- 盘点 feature flag 机制及 owner/default/removal 习惯；确认是否存在 flag 驱动的双事实模型。
- 盘点 CI/release/dependency-security audit 的真实命令与 workflow，不臆造缺失脚本。

### F. Fixture / capacity 基线
至少确认能否构造或复用：旧 schema migration、corrupt/超版本 backup/import、multi-tab revision race、late worker result、cancel/crash、large timeline、large Results table、media missing/relink、quota/transaction failure、provider malformed/oversize response。无法构造时记录缺口和 Phase 02/10 的建立任务。

## 阶段完整性出口

Phase 01 除原完成门槛外，还必须：

- 对 `architecture-traceability.md` 映射到 Phase 01 的每份正式来源完成“当前实现状态”核对，不能只核对文件是否存在；
- 将 Accepted Risk R-01（仓库未逐文件全量审阅）转化为真实 affected-file map，并明确哪些仍待后续阶段重新核实；
- 输出“架构目标 → 当前代码路径 → 当前状态 → 计划 Phase → 验证方式”的可复核映射；
- 把 UI 基线、runtime/trust 基线、fixture/capacity 基线写进 `verification-record.md`，作为 Phase 02/03/10 的输入。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
