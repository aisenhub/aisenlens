> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 05 — Analysis Data / Evidence / Template 与无损持久化迁移

## 目标

把 Analysis Fact 从 `ShotRecord.analysisFields` 等旧耦合中无损分离；落地稳定 field identity、Candidate、stale/remap、Evidence/Provenance 和 Template 子契约。

## 必读

`ANALYSIS_DATA_MODEL.md`、`EVIDENCE_PROVENANCE_CONTRACT.md`、`TEMPLATE_CONTRACT.md`、Shot Contract、Migration Plan、Runtime Architecture。

## 迁移步骤（必须按序）

1. **盘点**：从真实旧模型枚举 value / unknown / NA / source / revision / evidence / template 相关字段与异常形态。
2. **兼容读**：建立 Analysis Repository/port 的兼容读取；老项目不迁移也能完整读取。
3. **新模型**：FieldDefinition/stable fieldId、AnalysisRecord、AnalysisCandidate、独立 source/provenance/revision/eligibility/stale 语义。
4. **迁移函数**：versioned + idempotent；用户值、unknown、NA 等逐项保留。迁移前后做 fixture diff。
5. **新写入**：Analysis 编辑/Accept 只写 Analysis Authority；旧字段停止新写。
6. **双读核验（不是双事实写）**：在受控迁移/测试中比较旧读与新读结果；发现差异即阻断移除。
7. **移除物理耦合**：确认旧数据可读/可迁移/可 backup restore 后，才删除旧 `analysisFields` 等耦合。

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

至少覆盖老 fixture→新 repository 的无损 round trip、unknown/NA/source 保留、迁移幂等、backup/restore、Template switch 不丢值、stale/remap rules、Candidate 未 accept 不进入 eligible query、revision conflict/save failure。

## 完成门槛

Analysis Fact 已有唯一 repository/port；新写不再依赖 Shot aggregate；旧数据经核实无损；Template 责任分离；stale 规则可自动测试。

## Analysis Data / Evidence / Template 完整契约清单

### Field / Record / Candidate
- `AnalysisFieldDefinition`（或现有等价类型）必须表达稳定 `fieldId`、scope、value type/options/unit、evidence policy 与 `aiSuggestable/timelineVisualizable/exportable` 等 capability；显示名变化不得创建新字段。
- Template field usage 只描述 visible/order/group/label override/required/AI participation/default expansion 等“如何使用字段”，不拥有字段语义。
- AnalysisRecord 至少能绑定 Shot/Scene/Sequence/Section/Film 等真实 subject，拥有正式 value、confirmed/stale 语义、provenance、evidence refs、revision/时间；不要用一个通用 status 混 Candidate/Record/Revision。
- AnalysisCandidate 与 Record 物理/逻辑分离，具备 pending/accepted/rejected/stale（若代码扩展 superseded/expired，必须保持语义独立）、observation/interpretation、evidence/context manifest、provider/model/prompt version、dependency revision。
- 来源至少区分 User / Algorithm / Derived / Imported / AI Candidate / AI→User Confirmed / Remapped-Migrated；禁止一个模糊 Confidence 混合算法、AI、人工和导入来源。

### Results eligibility 与传播
- Results 默认只消费 confirmed + eligible 数据；pending Candidate、stale、unsaved draft 默认不作为正式成果。
- stale 可在高级/复核场景展示，但必须显式标记；Candidate 不能成为普通成果正式列。
- AnalysisRecord 变化后统一触发 revision/invalidation：Inspector、Timeline adapter、Results query、AI Context 依赖按同一事实更新，不复制出 Inspector Data / Timeline Data / Export Data 三份。
- Shot 结构变化时，AnalysisRecord、Candidate、Scene Summary/Derived、Context Manifest 等按依赖进入 remap/stale/needs-review；不能静默继续宣称有效。

### Evidence / Provenance
- Evidence 至少支持 frame/range/shot/dialogue/marker/statistic/audio-range 等可重定位引用；截图/缩略图只是 cache/visual representation，不能成为唯一 Evidence。
- Evidence policy 的 none/optional/recommended/required 必须进入 field validation/eligibility；`required` 允许早期记录，但在“正式研究结论/发布/严谨导出/完成检查”等冻结点产生明确缺失状态。
- Provenance 保存来源演进；AI accepted、migrated/remapped 等不得被压缩成单一 confidence 数字。

### Template persistence / invariants
- 延续现有 Profile/FieldDefinitionSnapshot，逐步拆 UILayout/Renderer/Prompt/Context/ExportMapping，不另造第二套 Template 模型。
- Template/Profile 持久化并版本化；纯 UI 展开/选择状态不属于 Template canonical persistence。
- 影响 AI 可追溯性的 PromptDefinition/ContextDefinition 必须版本化；Renderer 通常属于代码 registry，只有用户可配置部分进入 Profile；ExportMapping 独立版本化且不得混入 AnalysisRecord。
- Template 不直接生成 Timeline Track；只可建议 preference 或引用 TrackDefinition。
- ExportMapping 必须服从 Results confirmed/stale eligibility，不能绕过正式数据资格。

## 迁移与验证补强

- 迁移 fixture 必须包含不同 subject、unknown/NA、不同来源、evidence/provenance、Template hidden field、旧异常数据；迁移前后以字段级 diff 证明无损。
- 旧写停用后，增加静态搜索/测试证明没有新代码继续写 `ShotRecord.analysisFields` 或等价 aggregate。
- backup/restore 必须包含独立 Analysis/Evidence/Profile/version；restore 后 stable fieldId 与引用完整。
- Traceability 中 Analysis Data、Evidence、Template 的全部章节都要有执行 evidence；不能把 Results eligibility / propagation 等章节推给 Phase 08 而在数据层不实现契约。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
