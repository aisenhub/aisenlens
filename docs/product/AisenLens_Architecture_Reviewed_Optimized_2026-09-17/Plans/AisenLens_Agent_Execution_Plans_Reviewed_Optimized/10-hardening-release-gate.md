> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 10 — Reliability / Security / Migration / Performance / A11y / Release Gate

## 目标

把前述功能从“能用”提升为“数据不会因失败/race/corruption 静默损坏，且真实主流程可发布”。本阶段不是重写功能，而是系统性验证与修复。

## 必读

`OPERATIONAL_ARCHITECTURE.md`、Migration Plan、Master Plan Phase 9、Design System a11y/performance、所有前阶段 verification records。

## 1. Migration & data integrity

- Shot→Analysis 解耦老数据 fixtures；Template/Profile 迁移；Scene/Sequence/Section 持久化。
- schema migration 幂等/中断恢复；不依赖 destructive downgrade。
- backup/restore 覆盖 Media refs/Shot/Analysis/Evidence/Profile/必要结构；完整性和版本校验；corrupt/超版本拒绝且不污染现有项目。

## 2. Persistence race/recovery

- quota unavailable / transaction abort / corruption fixtures；UI 不显示假 saved。
- multi-tab：同项目旧 revision write 被拒绝；浏览器协调机制只能辅助，repository expected revision 是 correctness gate。
- crash/interruption：已 commit 与未 commit 边界明确；可导出诊断/备份/只读恢复。

## 3. Worker/task lifecycle

- cancel、crash、retry、resource budget、late result stale discard。
- thumbnail/waveform/detection/export/AI（适用者）统一 task semantics，不各自造一套。

## 4. Security/trust

- project/template import schema+size+version validation。
- Markdown/rich text 安全渲染，不执行导入脚本/函数。
- provider response validation、secret boundary、最小 context。
- diagnostics 默认不含用户媒体/分析正文/完整 prompt/context。

## 5. 性能

按 Phase 02 的固定 fixture/环境实际测试 Structure Navigator、Timeline tracks/zoom/playback、thumbnail/waveform、Inspector groups、Results table、Candidate list。记录 build mode、浏览器、硬件/环境、fixture 规模和判据；只比较真实结果，不编造普适指标。

## 6. UI/Accessibility

Dark/Light、Focus、keyboard-first、tooltip、semantic text、responsive/panel collapse、empty/loading/error/stale/local media issue；真实浏览器完成导入→切分→复核→分析→纠错→返回→导出。

## 7. Release gate（不部署）

实际运行 Phase 01 登记的 build/typecheck/lint/tests；migration/backup/race/cancel/corrupt/provider fixtures；export reproducibility；Timeline perf。构建产物应具备可回滚发布条件，但本任务不创建 Release/不部署。

## 失败处理

任何 P0 data integrity/race/security 失败都阻止“验收通过待推送/已交付”。保留失败记录和修复/复测，不把历史失败抹掉。

## 完成门槛

所有本期高风险场景有实际命令或浏览器复现记录；相关代码变化后完成复测；无已知静默数据丢失/覆盖路径。

## Runtime Architecture / Release Gate 补强清单

### Storage / persistence failure surface
- 在 quota/transaction abort/corruption 之外，显式测试或验证 browser storage persistence unavailable、private/incognito 限制、eviction 风险；cache 丢失可重建，canonical data 不得自动重置。
- autosave/multi-tab/old snapshot/old async task 都以 expected revision/project editRevision 为 correctness gate；BroadcastChannel/Web Locks 只能辅助协调。
- restore 前做 version/schema/reference/range/identity/manifest/checksum（按实际格式）完整性；restore failure 保持现有项目不变。

### Task/resource hardening
- Detection/thumbnail/waveform/export/AI-related preprocessing 的 queued/running/succeeded/failed/cancelled、cancel/crash/retry、stale discard、bounded concurrency、memory budget 使用同一语义。
- 大媒体下记录 worker queue length、thumbnail/waveform cache upper bound、peak decode/export memory；没有基准证据不增加并发/缓存层。

### Security / export safety
- 文件类型识别不能只依赖扩展名；导入 label/note/template/Markdown/rich text 安全渲染；拒绝脚本、函数、任意 renderer 定义。
- Export 只走受控 preset/adapter；filename/text/rich-text 规范化/转义；Export failure 不修改 canonical Analysis/Shot。
- 运行现有工具链支持的 dependency/security audit，并把结果写 verification record；没有工具时记录未验证，不能虚构“无漏洞”。

### Observability / diagnostics
- 验证 diagnostics 默认只含 error code/subsystem/operation/duration/taskId/schema/revision 等；关键 performance marks 覆盖 timeline render、decoder queue、worker、DB transaction、export。
- support bundle 只有用户显式触发，先脱敏；默认不得含媒体、分析正文、完整 prompt/context。
- remote telemetry 若现有系统存在，核实 consent/retention/redaction/sampling；若不存在，不在本阶段顺手引入。

### Feature rollout / rollback
- 对高风险 migration、新 Timeline renderer、provider change、batch conversion 等已有/新增 flag 做审计：typed、owner、default、removal criteria；禁止 flag 形成长期双写/双 schema/双 domain semantics。
- release build 可回滚，但数据 migration 必须向前兼容旧数据读取；禁止把应用回滚建立在破坏性 schema downgrade 上。

### Capacity budget
固定环境/fixture 至少记录：project open/reopen、large timeline pan/zoom/playback、thumbnail/waveform cache、worker queue、peak decode/export memory、Inspector large groups、Results large table、Candidate list、migration duration、backup/restore duration。阈值以真实目标媒体规模冻结，不编造跨设备数字。

## 最终 Release Gate 补强

发布前清单增加：critical workspace interaction smoke、dependency/security audit（现有工具可执行范围）、feature-flag owner/removal 审查、diagnostics privacy 审查、export filename/rich-text safety、storage unavailable/eviction 风险验证、capacity budget 记录。任何 P0 data-integrity/security/race 失败继续阻断验收。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
