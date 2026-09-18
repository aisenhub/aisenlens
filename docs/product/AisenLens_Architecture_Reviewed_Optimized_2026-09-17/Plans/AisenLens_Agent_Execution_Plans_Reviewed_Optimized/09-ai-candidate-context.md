> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 09 — AI Candidate + Context Builder + 智能工作流

## 目标

在不改变正式 Authority 的前提下接入 AI：最小必要 Context → Provider Adapter → 校验 → Analysis/Structure Candidate → Review → 显式 Accept/Reject → Provenance。

## 必读

`04-domain/ai/AI_ANALYSIS_CONTRACT.md`（首要 AI Source of Truth）、Analysis Data、Evidence、Template Prompt/Context、Timeline AI suggestion、Runtime provider/privacy gate、Design System AI UI rule。

## 实施步骤

1. 盘点现有 AI/provider/BYOK/server API；没有真实 provider 能力时只实现目标范围内已需要的 adapter contract 和可测试 fake adapter，不做假 UI 成功态。
2. Context Builder 按 Shot/Scene/Story 等任务生成最小必要输入；记录 ContextDefinition/PromptDefinition version、dependency revisions、evidence refs。
3. Provider secret 边界：server-owned secret 不进前端 bundle；BYOK 与项目 canonical data 分离，并遵循项目现有安全存储能力。
4. Response 作为不可信输入解析：schema/type/size/enum/range 校验，失败只生成 provider/validation error。
5. 只创建 Candidate/structure suggestion；禁止 provider 直接调 formal repository mutation。
6. Candidate lifecycle：pending/accepted/rejected/stale/superseded/expired 等与 Record 独立；dependency revision 改变后 accept 前必须 stale/失效/复核。
7. Review：已有人工/正式值时并排呈现冲突；不默认全量接受；observation 与 interpretation 区分。
8. Accept 使用 Analysis command 并写 provenance；Reject 不污染 formal value。
9. AI Ask 结果不是正式 Analysis；需要进入正式值仍走 Candidate/Accept。
10. 网络失败/timeout/rate limit/cancel 不改 canonical data；支持可理解 retry。

## 隐私与日志

UI 能说明发送范围；默认 diagnostics 不保存完整 prompt/context/媒体/分析正文。若现有系统已远程 telemetry，按用户同意/retention/redaction 现状核实，不在本阶段擅自扩大采集。

## 测试

malformed/oversize response、timeout/rate limit、cancel/late result、dependency revision stale、已有正式值冲突、accept provenance、reject、AI Ask 非正式、secret bundle scan（使用仓库已有工具/构建输出验证）。

## 完成门槛

不存在 provider→formal repository 直接路径；所有 accepted AI 值可追溯；旧 revision Candidate 不能被静默接受。

## AI 工作流完整覆盖清单

### Context / provenance / privacy
- Shot/Scene/Story（以及架构已批准的 structure task）分别定义最小 Context 读取范围；ContextDefinition/PromptDefinition 使用稳定版本并生成 context manifest/等价记录，绑定 dependency revisions 与 evidence refs。
- 在发送媒体片段、对白、用户分析文本等前，UI 能说明发送范围；最小化输入，不因“方便”上传整个项目。
- Provider response 的文本/Markdown 同样走安全渲染/转义，不把模型输出当可信 HTML/renderer/config。

### Candidate / review
- Analysis Candidate 与 structure suggestion 保持各自合法 target/command；共同遵守独立 lifecycle 与 dependency stale gate，不共享 formal record status。UI 只使用 Native Studio 的低频 Intelligence Signal（icon/thin edge/generating indicator）识别 AI 来源，不建立独立 AI theme。
- stale Data Review 与 AI Review 在 UI/计数/流程上分开；AI 多字段建议逐项 review，不默认 bulk accept。
- Observation 与 Interpretation 分开；不展示或持久化长推理链作为产品要求。
- Accept 前再次核对 target/dependency revision；Accept 通过正式 Analysis/Shot-structure command 并写完整 provenance；Reject/timeout/rate-limit/cancel/validation failure 均不改 canonical facts。
- AI Ask/解释结果默认是临时/派生输出；只有显式转为 Candidate 并 Accept 后才进入正式 Analysis。Generating / cancel / retry 使用局部 background-task UI，不能用全屏 loading 或长动画冻结工作台。

### Provider / secret / rollout readiness
- server-owned secret 不进入前端 bundle；BYOK 与项目 canonical data 分离并记录风险/清除方式（以真实平台能力为准）。
- 对 malformed/oversize/unknown enum/out-of-range/partial response 采用 typed validation error；网络重试仅用于安全可重试路径。
- Provider adapter 与 UI/Analysis repository 解耦，便于 Phase 10 用 feature flag/rollback 做高风险 provider 变更而不形成第二事实模型。

## 完整性验收

除原测试外，覆盖：发送范围提示、最小 context、context/prompt version provenance、multi-field per-item review、Data Review 与 AI Review 并存、unsafe rich-text response、accept 前 revision 二次校验、BYOK/secret bundle scan、Ask→Candidate→Accept 的正式化路径。Template Prompt/Context、Timeline structure suggestion、Analysis Candidate 三方 traceability 均有证据。

## Phase 03 继承的冻结前置条件

- AI 正式数据入口已经冻结为 AnalysisCandidate + AnalysisContextManifest；provider/Context Builder 不得直接写 AnalysisRecord 或 Shot。
- Context Manifest 必须绑定 subject、structureRevision + analysisRevision dependency、PromptDefinition/ContextDefinition version、evidence refs、included field ids 与 media ranges；Candidate 通过 contextManifestId 关联发送上下文。
- Candidate accept 必须走 Phase 03 revision-gated Analysis Authority；依赖 revision 变化后按 stale/expired/review 处理，不能以 provider 成功响应替代正式 accept。
- Backup/Recovery v4 已覆盖 Candidate/ContextManifest 及其交叉引用，Phase 09 provider 接入不得引入第二套 AI history/context persistence。

## Frozen AI Contract 实施约束

- Phase 09 **实现** Phase 03 已冻结的 AI contract，不重新设计 Candidate/ContextManifest/Accept 数据模型；若 provider 需要额外字段，先证明其属于 adapter/runtime metadata，而不是创建 AI-private canonical truth。
- `AnalysisContextManifest` 是一次真实发送上下文的不可变 trace snapshot；Context Builder 每次运行创建新 manifest，不覆盖旧 manifest 来“更新历史”。
- Analysis suggestion 与 structure suggestion 必须分别走合法 Authority：Analysis Candidate accept → Analysis Authority；Structure Candidate accept → Phase 05 Shot command。Provider adapter 永远不能直接调用两类 formal write。
- PromptDefinition/ContextDefinition 是版本化规则，ContextManifest 是本次执行快照；两者必须同时可追溯，不能只存最终 prompt 文本或 provider payload。
- Candidate 在 provider 返回后和 accept 前均检查 `structureRevision + analysisRevision` dependency；旧结果只能 stale/expired/review，不得以“请求成功”覆盖当前事实。
- Backup/Recovery 已定义 Candidate/ContextManifest canonical boundary；Phase 09 若增加 provider run/task metadata，必须明确哪些属于可重建 runtime log、哪些真正需要持久化，禁止顺手引入第二套 AI history store。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
