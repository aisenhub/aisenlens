> **用途**：本文件用于指导 Phase 03 执行；实际代码、测试与 Git 事实以同目录 `verification-record.md` 和当前仓库为准。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 03 — Analysis Data / Evidence / Template 与跨阶段 Canonical Data Freeze

## 目标

把 Phase 03 升级为 Phase 04–09 的数据架构冻结阶段：建立 v19 首版 canonical schema，把 Analysis Fact 从 Shot aggregate 中物理分离，并同时冻结 Shot、Analysis、Evidence、Template、Timeline read model、Results dataset、AI Candidate/Context Manifest、Backup/Recovery 等后续阶段共同依赖的数据边界。当前没有正式用户项目数据，因此 v1–v18 只视为冻结前开发期数据，不承担 legacy project compatibility。
## 必读

`ANALYSIS_DATA_MODEL.md`、`EVIDENCE_PROVENANCE_CONTRACT.md`、`TEMPLATE_CONTRACT.md`、Shot Contract、Migration Plan、Runtime Architecture。

## 数据冻结与迁移步骤（必须按序）

1. **冻结正式模型**：先定义 v19 下 Project、Shot、ShotGroup、AnalysisRecord、AnalysisCandidate、Evidence、Context Manifest、Template/Profile 的 canonical ownership、identity、revision 与引用关系。
2. **冻结后续阶段边界**：在 Phase 04–09 开始前，明确 Timeline 只使用派生 read model、Results 只使用 derived dataset、AI 只产生 Candidate + Context Manifest、Backup/Recovery 必须覆盖全部 canonical facts；后续阶段不得再新增第二套事实模型。
3. **建立新 schema**：IndexedDB 升为 v19；Shot store 只保存结构/revision/lineage，AnalysisRecord/Candidate/Evidence/ContextManifest 使用独立 stores。
4. **开发期 reset**：v1–v18 明确定义为冻结前开发数据。v18→v19 使用显式 `development-reset`，不建立兼容读、双读或长期 legacy adapter；该 reset 规则只适用于尚无正式用户数据的当前开发期。
5. **停止旧写**：所有新代码停止把正式 Analysis 写入 `ShotRecord.analysisFields` / description / notes；Editor 可以保留派生 view DTO，但 persistence 只能写 canonical Shot + Analysis Authority。
6. **统一 revision / stale propagation**：Shot/Group 结构 mutation 推进 `structureRevision`；正式 Analysis mutation 推进 `analysisRevision`；受结构影响的 Record/Candidate/Evidence 必须 deterministic remap 或 stale，不静默改 semantic value。
7. **冻结恢复边界**：Backup v4、Recovery snapshot 和 project delete 全部覆盖新 stores；导入/恢复必须验证版本、引用完整性和 ID remap。
8. **从 v19 起恢复正式 migration discipline**：未来已冻结/用户数据的 schema evolution 必须 versioned、可验证、可回滚/abort、不得静默丢失；`development-reset` 不得继续作为常规迁移策略。
## stale / remap / revalidation

为 Move/Split/Merge/identity/scene association/structure revision 明确规则矩阵：可保持、deterministic remap、stale、reanalyze、semantic revalidation。Structural Remap 与 Semantic Revalidation 必须分离。

## Evidence / Provenance

- EvidenceRef 可重定位，绑定 record/candidate revision；
- source/model/prompt/context definition version/time/user confirmation 可追溯；
- evidence policy（none/optional/recommended/required）按架构执行；required 不应阻止早期记录，但影响 completion/eligibility。

## Template 子契约

复用现有 Profile/FieldDefinitionSnapshot；把职责拆为 TemplateDefinition/AnalysisProfile、UILayout、Renderer、Prompt、Context、ExportMapping。字段语义/fieldId 属 Analysis Data；切 Template 不删已有分析值。

## UI 状态最低交付

即使本阶段以数据为主，也要有真实可观察状态：Human/AI/Algorithm/Derived、confirmed/stale/candidate/conflict/unknown/NA、save 状态、Evidence chip、Template 切换影响提示。

## 旧路径退出

- 禁止 Analysis UI 继续把正式值直接塞回 Shot aggregate。
- 禁止 Template layout/prompt/export mapping 重新定义字段语义。
- Candidate 不得通过“status=confirmed”捷径变成 Record。

## 测试

至少覆盖：v19 schema/version 与 v18→v19 development-reset contract；canonical Shot 不包含 Analysis 字段；Analysis Record/Candidate/Evidence/ContextManifest 独立 persistence；unknown/NA/source 语义；Template switch 不删已有 Analysis；Shot/Group 结构变化的 stale/remap；Candidate 未 accept 不进入 eligible query；revision conflict/save failure；Timeline/Results 只从 canonical facts 派生；Backup v4 引用 remap 与实际 archive encode/decode round-trip；Recovery restore 新 stores；静态扫描证明新持久化代码不再写 `ShotRecord.analysisFields`。

## 完成门槛

v19 成为 Phase 04–09 唯一数据基线；Analysis Fact 有唯一 repository/port；canonical Shot 与 Analysis 物理解耦；Timeline/Results/AI/Backup 的跨阶段数据边界已经冻结；v1–v18 开发数据 reset 规则明确；从 v19 起的正式 migration discipline 明确；stale/revision/backup/recovery 规则均有自动测试。
## Analysis Data / Evidence / Template 完整契约清单

### Field / Record / Candidate
- `AnalysisFieldDefinition`（或现有等价类型）必须表达稳定 `fieldId`、scope、value type/options/unit、evidence policy 与 `aiSuggestable/timelineVisualizable/exportable` 等 capability；显示名变化不得创建新字段。
- Template field usage 只描述 visible/order/group/label override/required/AI participation/default expansion 等“如何使用字段”，不拥有字段语义。
- AnalysisRecord 至少能绑定 Shot/Scene/Sequence/Section/Film 等真实 subject，拥有正式 value、confirmed/stale 语义、provenance、evidence refs、revision/时间；不要用一个通用 status 混 Candidate/Record/Revision。
- AnalysisCandidate 与 Record 物理/逻辑分离，具备 pending/accepted/rejected/stale（若代码扩展 superseded/expired，必须保持语义独立）、observation/interpretation、evidence/context manifest、provider/model/prompt version、dependency revision。
- 来源至少区分 User / Algorithm / Derived / Imported / AI Candidate / AI→User Confirmed / Remapped；禁止一个模糊 Confidence 混合算法、AI、人工和导入来源。

### Results eligibility 与传播
- Results 默认只消费 confirmed + eligible 数据；pending Candidate、stale、unsaved draft 默认不作为正式成果。
- stale 可在高级/复核场景展示，但必须显式标记；Candidate 不能成为普通成果正式列。
- AnalysisRecord 变化后统一触发 revision/invalidation：Inspector、Timeline adapter、Results query、AI Context 依赖按同一事实更新，不复制出 Inspector Data / Timeline Data / Export Data 三份。
- Shot 结构变化时，AnalysisRecord、Candidate、Scene Summary/Derived、Context Manifest 等按依赖进入 remap/stale/needs-review；不能静默继续宣称有效。

### Evidence / Provenance
- Evidence 至少支持 frame/range/shot/dialogue/marker/statistic/audio-range 等可重定位引用；截图/缩略图只是 cache/visual representation，不能成为唯一 Evidence。
- Evidence policy 的 none/optional/recommended/required 必须进入 field validation/eligibility；`required` 允许早期记录，但在“正式研究结论/发布/严谨导出/完成检查”等冻结点产生明确缺失状态。
- Provenance 保存来源演进；AI accepted、imported/remapped 等不得被压缩成单一 confidence 数字。

### Template persistence / invariants
- 延续现有 Profile/FieldDefinitionSnapshot，逐步拆 UILayout/Renderer/Prompt/Context/ExportMapping，不另造第二套 Template 模型。
- Template/Profile 持久化并版本化；纯 UI 展开/选择状态不属于 Template canonical persistence。
- 影响 AI 可追溯性的 PromptDefinition/ContextDefinition 必须版本化；Renderer 通常属于代码 registry，只有用户可配置部分进入 Profile；ExportMapping 独立版本化且不得混入 AnalysisRecord。
- Template 不直接生成 Timeline Track；只可建议 preference 或引用 TrackDefinition。
- ExportMapping 必须服从 Results confirmed/stale eligibility，不能绕过正式数据资格。

## Schema Freeze 与验证补强

- 不再为 v1–v18 构造 legacy compatibility fixture；这些版本只验证 `development-reset` 触发条件、upgrade transaction rollback/abort 与 v19 新 store 创建结果。
- v19 fixture 必须覆盖不同 subject、unknown/NA、不同来源、evidence/provenance、Template hidden field、Candidate/Context Manifest 与异常引用校验。
- 旧写停用后，增加静态搜索/测试证明没有新持久化代码继续写 `ShotRecord.analysisFields` 或等价 aggregate；允许 UI/overlay 使用从 AnalysisRecord 派生的同名 DTO。
- backup/restore 必须包含独立 AnalysisRecord/Candidate/Evidence/ContextManifest/Profile/version；restore 后 stable fieldId、subject 与交叉引用完整。
- Timeline/Results adapter 必须证明其只读 canonical Shot/Analysis facts，不创建第二 persistence owner。
- Traceability 中 Analysis Data、Evidence、Template 以及被 Phase 03 提前冻结的数据边界都要有执行 evidence；不能把 Results eligibility、AI context dependency、structure propagation 等基础契约推给 Phase 08/09 才设计。
## 2026-09-18 Phase 03 实施冻结

- IndexedDB schema **v19** 是本架构包下第一版冻结的 canonical Analysis 数据模型：shots 只保存结构字段；正式分析分别进入 analysis-records、analysis-candidates、analysis-evidence、analysis-context-manifests。
- ProjectRecord 统一携带单调 structureRevision 与 analysisRevision；StoredShotRecord 携带 revision / structureRevision / lineage，不再持久化 analysisFields / description / notes。Editor/Export 若仍使用同名字段，只能是从 AnalysisRecord 派生的 view/DTO。
- AnalysisRepositoryPort 已冻结 record/candidate/evidence/context-manifest 的读取与正式 mutation boundary；Candidate accept 经 revision gate 生成/更新正式 Record，pending/stale Candidate 不直接成为正式事实。
- Shot/Group 结构变化会在 repository transaction 内推进 structureRevision，并通过统一 reconcile 使受影响的 Record/Candidate/Evidence stale；结构 mutation 不直接重写 semantic value。
- AnalysisContextManifest 已绑定 subject、dependency revisions、Prompt/Context definition version、evidence refs、included fields 与 media ranges；Phase 09 必须消费此契约，不再另建 AI 私有 context truth。
- ContextManifest 是不可变的上下文快照；当 structureRevision 或 analysisRevision 变化时，统一通过 `getAnalysisContextManifestStaleReason` 判定 stale，不静默把旧快照当作当前上下文。
- Backup format **v4** 已包含 AnalysisRecord/Candidate/Evidence/ContextManifest，并在恢复时重映射 Project/Shot/Group/Evidence/Candidate/Manifest 交叉引用；Recovery snapshot 同样包含四类 Analysis 数据。
- Template 已冻结 PromptDefinition、ContextDefinition、TemplateExportMapping typed boundary；其完整 profile 持久化/UI/provider wiring 仍按 Phase 06/08/09 实施，不把“类型已存在”误报为后续阶段完成。
- Timeline 与 Results 在本阶段只建立跨阶段 read contract：buildTimelineReadModel、buildResultsDataset 都从 Shot/Analysis canonical facts 派生且不拥有第二份事实；完整 Timeline/Results 功能仍分别属于 Phase 07/08。
- v18→v19 使用明确的 **development-reset** cutoff，仅针对本项目冻结前的开发期 IndexedDB 数据；它不是通用生产数据迁移策略。v19 之后的已冻结/用户数据演进必须回到 versioned、可验证、非静默丢失的迁移规则。
- 本阶段自动化证据必须至少包含：v19 migration contract、Analysis lifecycle/stale/eligibility、Timeline/Results derived contract、Backup v4 reference remap + archive round-trip、Shot calibration fixture 回归、Overview/Sound/pressure browser 回归、webapp typecheck/lint/build、仓库 `verify:web` 与 `verify:phase-03`。

## 2026-09-18 阶段状态标记

- 按用户决定，Phase 03 的实现与定向验证暂标记为**阶段完成**，停止继续追跑最终组合压力门禁，转入后续阶段问题开发。
- 已完成并有证据：v19 canonical stores、Shot/Analysis 解耦、revision/stale propagation、Context Manifest、Backup v4 remap/archive、Timeline/Results derived read contract、Analysis/响应式/consumer/Overview/Sound/Calibration browser 回归，以及 `verify:web` 与 Phase 03 Node contracts。
- 保留未闭环项：`verify:phase-03` 的完整组合执行在前序浏览器套件完成后进入 1000/3000 pressure 场景并达到 120 秒超时；该用例单独运行通过。本项不降低断言、不记为已通过，留作后续 Phase 10/发布门统一复跑。
- `synthetic.webm` 的 CFR/VFR 精确帧 timing 仍是既定的 Phase 05/10 风险；它不影响本阶段 canonical data freeze 的完成标记。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
