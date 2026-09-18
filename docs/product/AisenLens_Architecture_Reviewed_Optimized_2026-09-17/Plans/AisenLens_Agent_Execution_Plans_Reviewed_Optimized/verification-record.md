> **用途**：本文件是 AisenLens 分阶段执行的动态事实记录。代码现状以执行时本地仓库为准；目标行为以 `AisenLens_Architecture_Reviewed_Optimized_2026-09-17` 架构包及总计划为准。
> **本阶段边界**：Phase 01 只冻结仓库事实、调用链、验证能力和后续差异；不改产品代码、不安装依赖、不部署。

# Verification Record — 实施进度与验证记录

## 1. 项目与基线

- 核对日期：2026-09-18
- 仓库根目录：`E:\Projects\Aisenlens`
- 产品范围：`apps/webapp`（产品 renderer）与 `apps/webhome`（公开内容站）；desktop/mobile 仅核对其指向，不纳入本阶段产品改造。
- 架构包：`docs/product/AisenLens_Architecture_Reviewed_Optimized_2026-09-17`
- 阶段计划包：`docs/product/AisenLens_Architecture_Reviewed_Optimized_2026-09-17/Plans/AisenLens_Agent_Execution_Plans_Reviewed_Optimized`
- GitHub 仓库：`aisenhub/aisenlens`
- Git remote：`https://github.com/aisenhub/aisenlens.git`（fetch/push）
- 开始工作分支：`main`
- 起始 commit：`7fa9a0b4d3604284c0278bce6490afc88294835c`
- 起始 commit：`2026-09-17T17:54:56+08:00 docs: adopt reviewed architecture package`
- 初始工作区：干净，`main...origin/main`
- 已有用户修改及归属：开始核查时未发现未提交修改；核查期间另发现一组非本阶段计划文件变更，未纳入本阶段提交，继续保留在工作区。
- package manager / runtime：`pnpm 11.24.0`（Corepack），`Node v24.19.0`；仓库 packageManager 与 lockfile 均存在。
- 工作区：Windows / PowerShell；依赖已存在，本阶段未安装软件或依赖。
- CI：未发现 `.github` 目录或 CI workflow；只能核对本地 package scripts。
- 已知 baseline failure：浏览器 Workflow E2E harness 引用不存在的 `apps/web`；真实产品目录为 `apps/webapp`。详见 §6。

### 1.1 已核实命令登记

| ID | 用途 | 真实命令 | 来源 | 基线结果 |
|---|---|---|---|---|
| CMD-BUILD | web build | `corepack pnpm run build:web` | 根 `package.json` | 命令存在；未单独运行；`verify:web` 已分别完成 webhome/webapp build，退出码 0 |
| CMD-TYPECHECK | typecheck | `corepack pnpm run verify:web` | 根 `package.json`、`scripts/verify-web*.mjs` | 通过；含 webhome 与 webapp typecheck |
| CMD-LINT | lint | `corepack pnpm run verify:web` | 根 `package.json`、`scripts/verify-web*.mjs` | 通过；含 webhome 与 webapp lint，`--max-warnings=0` |
| CMD-UNIT | unit/contract | `corepack pnpm run verify:web` | `scripts/verify-webapp.mjs` | 通过；editor history、auto-shot、scene calibration、video boundary、workflow 等现有单测/契约测试通过 |
| CMD-INTEGRATION | workflow integration | `corepack pnpm run verify:web` | `scripts/verify-webapp.mjs` | 通过；其中 `test:workflow` 11 tests passed |
| CMD-E2E-UI | workflow browser E2E | `corepack pnpm run test:workflow-browser` | 根 `package.json`、`tests/features/workflow/workflow-end-to-end.browser.test.js` | 失败，退出码 1；harness 的 `apps/web` 路径已失效，且触发 Node native assertion |
| CMD-E2E-WASM | browser/worker smoke | `$env:AISENLENS_ONLY_WASM_SMOKE='1'; corepack pnpm --filter @aisenlens/webapp run test:auto-shot-baseline` | `apps/webapp/package.json`、`apps/webapp/test/auto-shot-baseline.browser.test.js` | 通过，退出码 0；Chrome 152，WASM baseline `READY` |
| CMD-DOCS | docs structural check | `git diff --check` | Git | 通过；仓库没有独立 docs lint/link script 或 CI 可供核对 |

构建期间保留的非阻断警告：Node `MODULE_TYPELESS_PACKAGE_JSON` / `DEP0190` 弃用提示；webapp Vite 将 WASM bundle 对 `node:module` 的引用 externalize 以适配浏览器。未因警告弱化检查。

### 1.2 Affected code map

| Architecture area | 当前真实文件/目录 | 主要入口/调用链 | 当前状态 | 后续落点 |
|---|---|---|---|---|
| Project repository / IndexedDB | `apps/webapp/src/features/project/services/projectRepository.ts`; `features/project/types.ts` | `openDatabase` → `readProjectEditorState` / `saveProjectEditorState` / `applyCalibrationDraft` | 部分实现 | DB v18、项目事务、fault injector 已存在；typed runtime error、migration、quota、跨 tab 协作待 Phase 02/10 |
| Media/import | `features/project/services/mediaService.ts`; `features/project/components/ProjectMediaGate.tsx`; `features/media/` | picker → fingerprint/metadata → handle/blob → project update | 部分实现 | FSA/input picker、relink、missing/permission 状态存在；当前依赖扩展/MIME/native/Mediabunny，无 magic 校验 |
| Auto-shot/Worker | `features/auto-shot/autoShotTaskService.ts`; `hooks/useAutoShotTask.ts`; `workers/scene-engine.worker.ts`; `packages/scene-engine/` | Worker/WASM → task service → `auto-shot-runs` candidates | 部分实现 | pause/resume/cancel/interrupted 与进程内 late guard 存在；缺 queued/succeeded 统一模型、dependency revision、跨 tab |
| Shot/Calibration | `features/shot/`; `features/shot-calibration/`; `EditorWorkspace.tsx` | draft command/revision → explicit apply → shots store | 部分实现 | CalibrationDraft v3 与原子 apply 存在；普通 move/split/merge 仍在 EditorWorkspace 本地直接改数组，正式 Shot command authority 待 Phase 04 |
| Analysis | `features/analysis/`; `features/editor/hooks/useEditorPersistence.ts`; `features/shot/types.ts` | inspector command → `shotDims` → `ShotRecord.analysisFields` → save/reload | 与目标冲突 | research range/context/evidence 有 revision；AnalysisRecord 独立持久化尚未落地，待 Phase 05 |
| Template/Profile | `features/template/` | `templateService` → `resolveAnalysisProfile` → UI/overlay/export | 部分实现 | profile v2、field validation、surface settings 存在；Layout/Renderer/Prompt/Context/ExportMapping 子契约尚未拆出 |
| Timeline | `features/timeline/`; `EditorWorkspace.tsx` | local viewport/track preference + selection/playback | 部分实现 | viewport 与 preference 已有；domain/application/view 分层和 command 写入未形成，待 Phase 07 |
| Results/Export | `features/export/`; `features/group/services/groupExportService.ts` | Editor local state → report/video export worker | 部分实现 | CSV/HTML/XLSX/PDF、video worker/cancel 存在；无独立 Results derived query/registry，待 Phase 08 |
| AI/provider | `features/analysis/ai/` | `AICandidate` evaluation/accept pure functions | 未实现 | 只有候选类型与校验；未发现 provider adapter、Context Builder、网络调用或 feature-flag boundary，待 Phase 09/10 |
| Backup/Restore | `features/project/services/projectBackupService.ts`; `projectRecoveryService.ts` | ZIP v3 parse/validate → remap → atomic save；snapshot restore | 部分实现 | CRC、大小/路径限制、项目快照存在；无旧版本迁移、完整 manifest digest、quota/corruption quarantine |
| Tests/Fixtures | `apps/webapp/test/`; `tests/features/`; `packages/scene-engine/test/` | Node tests、CDP browser harness、WASM/media fixtures | 部分实现 | fault/pressure/lifecycle fixture 较多；browser harness 路径失效，quota/old-schema/provider malformed fixture 缺失 |

## 2. 阶段状态总表

状态允许：`未开始 / 进行中 / 已阻塞 / 验证失败 / 验收通过待推送 / 已交付`。

| Phase | 名称 | 状态 | 已完成 | 剩余/依赖 | 代码 commit | Push/远程链接 |
|---|---|---|---|---|---|---|
| 01 | Repository Verification | 已交付 | 基线、命令、代码地图、9 条调用链、UI/runtime/fixture 差异及失败已冻结 | 修复失效 browser harness 后复测；产品迁移不属于本阶段 | `2a7921cc34282b476090af6786298213fdd35a50` | 已推送 |
| 02 | Contract & Runtime Baseline | 未开始 | 无 | Phase 01；先处理 browser harness 基线问题并冻结 typed contract/runtime gap | 未产生 | 未推送 |
| 03 | Global Shell & Design System | 未开始 | 无 | 01/02 | 未产生 | 未推送 |
| 04 | Preparation & Shot Authority | 未开始 | 无 | 02/03 | 未产生 | 未推送 |
| 05 | Analysis Data/Evidence/Template | 未开始 | 无 | 02/04 | 未产生 | 未推送 |
| 06 | Analysis Workspace & Inspector | 未开始 | 无 | 03/05 | 未产生 | 未推送 |
| 07 | Timeline | 未开始 | 无 | 04/05/06 | 未产生 | 未推送 |
| 08 | Results/Export/Creative | 未开始 | 无 | 05/07 | 未产生 | 未推送 |
| 09 | AI Candidate/Context | 未开始 | 无 | 05/07/08 | 未产生 | 未推送 |
| 10 | Hardening/Release Gate | 未开始 | 无 | 04–09 | 未产生 | 未推送 |
| 11 | Governance/Closeout | 未开始 | 无 | 01–10 | 未产生 | 未推送 |

## 2.1 Architecture Coverage Evidence

这里的 `implemented` 表示“Phase 01 的核对与证据记录已完成”，不表示目标产品迁移已经完成。

| Phase | 正式来源/章节范围 | 状态 | 代码/配置证据 | 测试/浏览器证据 | Deferred/Non-goal 决议与原因 | Traceability |
|---|---|---|---|---|---|---|
| 01 | `90-implementation/IMPLEMENTATION_MAP.md` | implemented | 已将推荐阶段、最小出口与真实 feature 路径映射到本记录 §1.2 | `verify:web` 0 | 产品迁移不属于 Phase 01 | 已核对 |
| 01 | `implementation/IMPLEMENTATION_BOUNDARY.md` | implemented | 已核对 UI → feature/app → infra 方向；发现实际持久化集中在 feature repository | `verify:web-boundaries` 0 | runtime contract 实施留 Phase 02 | 已核对 |
| 01 | `implementation/AI_DEVELOPMENT_GUIDE.md` | implemented | 已核对 source precedence、禁止 direct AI canonical write；当前无 provider 实现 | AI contract tests 在 webapp gate 中通过 | AI provider/context deferred to Phase 09/10 | 已核对 |
| 01 | `audit/FINAL_SOURCE_OF_TRUTH_MATRIX.md` | implemented | Official Shot、Analysis、Evidence、Template、Timeline、Results 的 owner 与当前路径已记录 | workflow/scene-calibration tests pass | owner 迁移由对应功能阶段完成 | 已核对 |
| 01 | `audit/ARCHITECTURE_REVIEW_2026-09-17.md` | implemented | 已核对 review 的 P0/P1、runtime completeness、phase order | web baseline pass；UI E2E harness failure retained | cloud/telemetry 等仍为明确 non-goal | 已核对 |
| 01 | `audit/MASTER_PLAN_COVERAGE_MATRIX.md` | implemented | 总计划范围逐项对照，并把未闭合 runtime/fixture gap 写入 §5/§6 | `verify:web` pass；browser split result recorded | 后续阶段按矩阵继续关闭 | 已核对 |
| 01 | `audit/CURRENT_REPOSITORY_BASELINE.md` | implemented | 已用 2026-09-18 实际 SHA、仓库路径、DB/Shot/Template 事实更新基线 | 命令及 browser evidence in §4 | 当前/目标差异保留，不提前迁移 | 已核对 |
| 01 | `audit/CONCEPT_REGISTRY.md` + `FINAL_CONCEPT_REGISTRY.md` | implemented | Candidate、Official Shot、Analysis、Evidence、Scene/Sequence/Section 非别名关系已核对 | 相关 workflow/contract tests pass | 结构域改造留 Phase 04/05/07 | 已核对 |
| 01 | `audit/SOURCE_OF_TRUTH_MATRIX.md` | implemented | 已对照实际 `ShotRecord`、research stores、template store、local editor state | save/reload 与 contract tests pass | 独立 Analysis authority deferred | 已核对 |
| 01 | `audit/CONFLICT_AUDIT.md` + `CONFLICT_MATRIX.md` | implemented | 已记录 workflow 六阶段 vs 目标三 workspace、Shot/Analysis coupling、test path drift | browser failure retained as baseline failure | 不以兼容层掩盖结构冲突 | 已核对 |
| 01 | `audit/FINAL_ARCHITECTURE_AUDIT.md` | implemented | R-01（仓库未完整核对）已通过本阶段 map/chain/fixture 核查关闭；其余风险仍开放 | §4–§6 | R-02/R-03 留对应后续阶段 | 已核对 |
| 01 | `ARCHITECTURE_INDEX.md` + `README.md` | implemented | 目录、Authority Chain、Source of Truth、维护规则已对照本记录 | `verify:web` pass | 文档治理最终收口留 Phase 11 | 已核对 |
| 01 | `Plans/AisenLens_MASTER_DEVELOPMENT_PLAN_2026-09-17.md` | implemented | Phase 0/1–10 的先后依赖与阶段门已对照；当前执行的是 repository verification | `verify:web`、WASM browser smoke | 后续阶段不提前宣称完成 | 已核对 |

## 3. Phase 01 — Repository Verification

- 开始日期：2026-09-18
- 结束日期：2026-09-18
- 实施 agent：Codex
- 基线 SHA：`7fa9a0b4d3604284c0278bce6490afc88294835c`
- 实际修改文件及职责：
  - `Plans/.../verification-record.md`：写入本阶段唯一动态事实记录、调用链、差异、验证、fixture 与交接信息。
  - `Plans/.../architecture-traceability.md`：把 Phase 01 映射章节标记为已核对；未把后续阶段标记为完成。
  - `audit/CURRENT_REPOSITORY_BASELINE.md`：同步当前仓库 SHA、核查范围与已确认事实，避免基线文档继续引用旧 SHA。
- 产品代码修改：无。
- 新增依赖/软件：无。
- 实现的系统行为：无；本阶段冻结事实，不改变运行时行为。
- 冻结/复用的跨阶段事实：
  - 产品 renderer 是 `apps/webapp`，公开站是 `apps/webhome`；不存在 `apps/web` 产品目录。
  - IndexedDB 名称 `aisenlens-projects`、版本 18；项目编辑主事务覆盖 project/shots/groups/markers/template/research stores。
  - 时间范围主路径使用整数帧半开区间；media frame service 同时保留 presentation timestamp 处理 VFR。
  - `ShotRecord.analysisFields` 仍是当前事实，Analysis 独立 authority 是待迁移目标。
  - CalibrationDraft schema v3 有 draft revision/expected project timestamp；普通编辑结构变更仍未统一走 domain command。
  - Auto-shot Candidate 先落 `auto-shot-runs`，校准草稿显式 apply 后才写 shots；AI 目前只有纯类型/判定函数。
- 与原计划偏差：计划要求的仓库真实核查已完成；计划列出的 browser baseline 可执行性未完全满足，因为现有 Workflow browser harness 指向旧目录。
- 偏差原因/影响：仓库从旧 `apps/web` 布局迁移到 `apps/webapp` 后测试 harness 未同步，导致 workflow/overview/analysis 等共用 harness 的浏览器验证不能作为当前通过证据；不影响已通过的本地 gate 与 webapp 自包含 WASM smoke。
- 尚未完成：产品 contract/runtime/Shot Authority/Analysis migration/三 workspace UI/Results derived query/AI provider 等全部留给后续阶段；Phase 01 不实现。
- 明确未验证：完整 Workflow UI E2E、依赖旧 harness 的 overview/analysis/calibration browser suites、quota/private mode/corrupt DB/old schema migration、真实 provider malformed response、CI/发布/回滚。

### 3.1 九条真实调用链

| # | 调用链 | 当前入口与落点 | 核对结论 |
|---:|---|---|---|
| 1 | import media → persistence | `ProjectMediaGate` → `mediaService.selectLocalVideo/inspectLocalVideo` → fingerprint/metadata → media handle/blob → `projectRepository.updateProject` | 能关联/重连/标记 missing；更新路径未统一 expected revision，文件真实性检查非 magic-level |
| 2 | auto split → Candidate → user confirm → Official Shot | Scene Engine worker/client → `autoShotTaskService` → `auto-shot-runs.candidates` → `prepareDetectionCalibration`/`applyCalibrationCommand` → `EditorWorkspace.applyCalibrationDraftToEditor` → `applyCalibrationDraft` → `shots` | 显式校准 apply 作为正式写入门；尚无独立 Shot Authority command module，`applyAutoShotCandidates` 主要是纯转换器 |
| 3 | boundary move/split/merge → revision/downstream | Calibration draft command 会检查/增加 `draft.revision`；Editor 普通 boundary/split/merge handler 直接改本地 arrays，再经 autosave | 校准草稿路径有 revision；普通结构编辑无统一 command/revision，groups 只做 reconcile |
| 4 | analysis field edit → save/reload | `ContextInspector`/`AnalysisFieldEntryInput` → `handleAnalysisFieldCommand` → `shotDims` → `useEditorPersistence` → `ShotRecord.analysisFields`; reload 反向映射；research 独立 store 有 per-record revision | 保存事务原子且有 dirty/save 状态；数据 owner 仍与 Shot 聚合耦合 |
| 5 | template/profile → UI/render/export | `templateService.loadOrCreate` → `resolveAnalysisProfile` → inspector/table/focus；`resolveContentOverlay` → video export；`reportExportService`/xlsx → report | profile v2 与校验可复用；子契约未拆分，export 仍消费 Shot 上的 analysisFields |
| 6 | timeline selection/playback/viewport → Inspector/Player | `ProjectSessionProvider`/Zustand 保存 selection/playback；`EditorWorkspace` 连接 `AnalysisTimeline`、VideoViewer、Inspector；`useTimelineViewport` 保存本地 zoom/scroll | 交互联动存在；viewport 与 track preferences 是 view/localStorage，不是 domain；无正式 Timeline domain/application/view contract |
| 7 | Results query → export | 未发现独立 Results query/workspace；`EditorWorkspace` 由本地 shots/shotDims/groups/research 组装 `ReportExportInput`，直接调用 report/video export | CSV/HTML/XLSX/PDF/video 可用；没有统一 derived dataset/query registry |
| 8 | Worker/AI → result → canonical/candidate | worker/client result → task service adapter → Candidate task record；`AICandidate` 仅经 `candidateDecision` 校验/accept 回调 command | auto-shot 候选边界存在；AI provider/context/network 不存在，不能写 canonical |
| 9 | backup/restore/import → schema migration | ZIP parser 限制 store-only/CRC/路径/大小 → v3 manifest validate → new project/id remap → screenshots/domain save；recovery snapshot restore | 当前备份可导入/恢复；只接受 v3，没有旧 backup migration；DB `onupgradeneeded` 仅按缺失 store 创建，无 oldVersion migration pipeline |

### 3.2 Architecture target → path → state → phase → verification

| Architecture target | 当前 path | 状态 | 后续 phase | Phase 01 verification |
|---|---|---|---|---|
| Official Shot single authority | `EditorWorkspace.applyCalibrationDraftToEditor`; `projectRepository.applyCalibrationDraft` | 部分实现 | 04 | §3.1 #2/#3 |
| Analysis fact separated from Shot | `features/shot/types.ts`; `useEditorPersistence.ts` | 与目标冲突 | 05/10 | §3.1 #4 |
| AI Candidate ≠ canonical value | `features/analysis/ai/types.ts`; `candidateDecision.ts` | 部分实现 | 09 | §1.2 / §3.1 #8 |
| Evidence/Provenance | `analysis/types.ts`; calibration detection metadata | 部分实现 | 05/06 | §3.1 #2/#4 |
| Template sub-contracts | `features/template/types.ts`; `resolveAnalysisProfile.ts` | 部分实现 | 05/06/08/09 | §3.1 #5 |
| Timeline domain/application/view | `features/timeline/`; `EditorWorkspace.tsx` | 部分实现 | 07 | §3.1 #6 |
| Results derived query | no dedicated path; export reads Editor state | 未实现 | 08 | §3.1 #7 |
| Local-first canonical persistence | `projectRepository.ts` | 部分实现 | 02/10 | §1.2 / §5 |
| Typed runtime error/recovery model | `requestResult`/`transactionResult` generic `Error` | 未实现 | 02/10 | §5 |
| Quota/corruption/multi-tab safety | recovery/backup/revision checks, no persistence/quarantine/channel | 部分实现 | 02/10 | §5/§6 |
| Worker lifecycle and late-result safety | auto-shot task state + hook revision ref | 部分实现 | 02/04/07/08/09/10 | §1.1 CMD-E2E-WASM / §6 |
| Import/provider trust boundary | backup validation; media extension/MIME/native; no provider | 部分实现 | 02/09/10 | §5/§6 |
| Three stable workspaces | `WorkflowSidebar` + `workflowStages.ts` six stages | 与目标冲突 | 03 | §5 UI baseline |
| Design tokens/surface hierarchy | `index.css`; `SurfaceCard`; `Button`/`Dialog`/`Tooltip` | 部分实现且有漂移 | 03 | §5 UI baseline |
| R-01 repository verification | 本记录 §1–§6 | 已关闭 | 01 | command/path/call-chain/fixture evidence |

## 4. 验证记录

| 日期 | Phase | 被验证代码 SHA | 环境/fixture | 实际命令或浏览器操作 | Exit code | 结果摘要 | 失败/修复/复测 | 日志/截图位置 |
|---|---|---|---|---|---:|---|---|---|
| 2026-09-18 | 01 | `7fa9a0b4d3604284c0278bce6490afc88294835c` | Windows、Node 24.19.0、pnpm 11.24.0；webhome/webapp source | `corepack pnpm run verify:web` | 0 | webhome typecheck/lint/build/prerender；webapp typecheck/lint/11 embedded test groups/build；web boundaries 均通过 | 保留非阻断 warning：Node module/deprecation、Vite WASM externalize | 无持久日志；终端输出 |
| 2026-09-18 | 01 | `7fa9a0b4d3604284c0278bce6490afc88294835c` | Chrome 152.0.7977.83；isolated profile；`test/scene-engine-module.worker.ts` | `$env:AISENLENS_ONLY_WASM_SMOKE='1'; corepack pnpm --filter @aisenlens/webapp run test:auto-shot-baseline` | 0 | browser worker/WASM probe `status=ready`、backend `wasm-baseline`；测试 1 pass | 仅 WASM smoke；未宣称完整媒体/应用流程 | `test-results/scene-engine-module-probe.json`（ignored generated report） |
| 2026-09-18 | 01 | `7fa9a0b4d3604284c0278bce6490afc88294835c` | Chrome/Edge CDP harness；empty project intended | `corepack pnpm run test:workflow-browser` | 1 | Workflow E2E 未执行到应用断言；测试引用不存在的 `apps/web` | 未修复，Phase 01 只记录；Phase 02/10 需修 harness 后复测 | 终端输出；`tests/features/workflow/workflow-end-to-end.browser.test.js` |
| 2026-09-18 | 01 | `7fa9a0b4d3604284c0278bce6490afc88294835c` | repository files; no mutation | `git status --short --branch`; `git remote -v`; branch/SHA/log; `git diff --check` | 0 | 起始树干净、remote/branch/SHA 已冻结；diff check 通过 | 无 | 终端输出 |

### 4.1 UI baseline

- Workspace shell：`ProjectWorkspaceShell` 为全屏 flex；desktop `WorkflowSidebar` 宽 `w-40`，mobile 使用顶部横向导航；`EditorPage` 组合 `ProjectMediaGate → ProjectSessionProvider/Runtime → shell → EditorWorkspace`。
- Current IA：`workflowStages.ts` 定义 `prepare / calibrate / overview / analyze / learn / create` 六阶段；与目标三稳定 workspace（Preparation / Analysis / Results）存在明确漂移。
- Existing states：media loading/opening、empty、not-found、missing/relink、needs-permission、error；auto-shot running/paused/completed/failed/cancelled/interrupted；calibration idle/saving/saved/error/conflict；editor saved/unsaved/saving/error；research loading/saving/error；video export progress/cancel/error。
- Surface/focus：`Dialog` 使用 Base UI primitive，具备 portal/backdrop/关闭与 primitive focus 管理；`ModalShell` 自绘 `role=dialog` 与关闭按钮，未见统一 focus trap/restore 证据；`DropdownMenu`/`Tooltip` 使用 Base UI；未发现 Command Palette 实现。
- Tooltip/keyboard：全局 `TooltipProvider` 默认 delay 0，许多控件仍用 native `title`；`useEditorShortcuts` 已覆盖播放/帧步进/保存等快捷键，命令体系尚未统一到目标 Command。
- Preference/responsive：theme 与 timeline track preference 写 localStorage；editor CSS 有 ≤1100/≤640 断点和 panel collapse；未形成统一 view preference/panel state contract。
- Visual drift：`index.css` 当前 dark 背景近黑、accent `#3b82f6`、大量 `rounded-2xl` `SurfaceCard`；目标设计要求 cool gray/purple、surface hierarchy、减少 card/border/heavy shadow。
- Screenshot/E2E capability：已有 CDP harness 与 ignored JSON test-results；现有 browser tests 未调用 `Page.captureScreenshot`，本阶段没有伪造截图或新增截图机制。UI workflow E2E 因旧路径失败；WASM smoke 不是 UI 流程证据。

### 4.2 Runtime / trust / delivery baseline

- Persistence：IndexedDB v18 stores 已存在；`saveProjectEditorState`/`applyCalibrationDraft` 使用 readwrite transaction，并在成功完成后更新 UI；fault injector 可覆盖 project/shots/groups/markers/template/task/draft/research 写点。缺 typed error code、quota handling、persist request、corruption quarantine、完整 oldVersion migration。
- Recovery/eviction：recovery snapshot 每 30s、最多 3 个；`navigator.storage.estimate()` 只读 usage/quota；无 `navigator.storage.persist()`、LRU/size budget/eviction strategy。
- Concurrency：full editor save/apply 有 `expectedUpdatedAt`；research range/context 和 calibration draft 有 revision；template 初始化处理并行创建竞态；未发现 `BroadcastChannel`、Web Locks 或统一 cross-tab change notification；`updateProjectAtomically` 也无 expected revision。
- Task lifecycle：Auto-shot 有进程内 single active guard、progress persistence、pause checkpoint、cancel、reload running→interrupted 与 hook request revision guard；状态命名仍是 `running/paused/completed/failed/cancelled/interrupted`，缺统一 `queued/succeeded` 与 dependency revision/late-result persistence。
- Trust boundary：backup ZIP store-only、512 MB backup/16 MB manifest 上限、CRC/path/duplicate/resource reference 校验；仅接受 backup v3；media 通过 extension/MIME/native metadata/Mediabunny，不做 magic bytes；当前无 AI provider boundary。
- Export/privacy：CSV/HTML escaping、filename illegal character sanitization、video settings validation、worker cancel 存在；无 structured diagnostics/performance marks/telemetry privacy contract；`AppErrorBoundary` 仍向 console 输出 error/component stack；未发现 Markdown/rich-text HTML injection path。
- Feature flags/CI：未发现独立 feature flag registry；`advancedDetectionEnabled` 是 UI local state。未发现 `.github` CI；本地 `verify:web` 是当前可执行 gate。

### 4.3 Runtime/trust/fixture/capacity handoff

| 领域 | 现有证据 | 缺口/后续处理 |
|---|---|---|
| old schema migration | annotation storage compatibility；DB v18 store creation | 无完整 old DB/backup migration fixture；Phase 02/10 |
| corrupt/too-new backup | ZIP signature/CRC/path/size checks；v3 mismatch reject | 无 nested schema quarantine、manifest-wide digest、older-version migration；Phase 10 |
| multi-tab race | expectedUpdatedAt、draft/research revision、template concurrent init | 无 BroadcastChannel/Locks；现有 browser race tests 共用失效 harness；Phase 02/10 |
| late worker | hook `revisionRef`、service active task guard | 无持久 dependency revision；Phase 02/10 |
| cancel/crash | auto-shot task state/service tests；video worker cancel protocol | app-level crash/reload browser flow 未完成；Phase 10 |
| large timeline/table | source pressure fixtures: 1000 boundaries、1000/3000 shots | overview browser harness 仍引用 `apps/web`，未在当前代码布局复测；Phase 07/10 |
| missing/relink | ProjectMediaGate missing/relink/permission states；fingerprint match | 无 file magic/size budget；Phase 02/10 |
| quota/transaction failure | repository fault injector + rollback verification source | 无真实 quota/private-mode fixture；Phase 02/10 |
| malformed/oversized provider response | 当前无 provider implementation | Phase 09/10 创建 provider trust fixture 后再验收 |

## 5. GitHub 交付记录

| Phase | Commit SHA | Branch | Commit 说明 | Push 是否成功 | 远程是否包含 | GitHub 链接 | 备注 |
|---|---|---|---|---|---|---|---|
| 01 | `2a7921cc34282b476090af6786298213fdd35a50` | `codex/phase-01-repository-verification` | `docs(phase-01): freeze repository verification baseline` | 是 | 是（`git ls-remote` 已核对） | [GitHub branch](https://github.com/aisenhub/aisenlens/tree/codex/phase-01-repository-verification) | 本阶段记录已按计划提交并推送；本次后续提交仅补齐交付证据，不 amend |

## 6. 关键失败 / 阻塞日志

| 时间 | Phase | 问题 | 证据 | 影响范围 | 推荐/实际处理 | 状态 |
|---|---|---|---|---|---|---|
| 2026-09-18 | 01 | Workflow browser E2E harness 使用不存在的 `apps/web` | `tests/features/workflow/workflow-end-to-end.browser.test.js` 与 `tests/features/shot-calibration/calibration-browser-harness.js`；`Test-Path apps/web` 为 false，`Test-Path apps/webapp` 为 true；命令 exit 1 | Workflow/overview/analysis/calibration 共用该 harness 的 browser 验证 | 本阶段不改测试/产品代码；Phase 02/10 将 harness 入口改为现行 `apps/webapp` 后重新运行完整 UI 基线 | 已记录，未修复 |
| 2026-09-18 | 01 | 当前正式 baseline 文档旧 SHA | `audit/CURRENT_REPOSITORY_BASELINE.md` 原记录 `e08e0cc…`，实际起始 SHA 为 `7fa9a0b4…` | 可能误导后续 agent | 本阶段同步 baseline 文档并在本记录保留起始/最终 SHA 区分 | 已处理 |
| 2026-09-18 | 01 | 无独立 docs lint/link gate、无 CI workflow | 未发现 `.github`；根 package scripts 无 docs lint/link | 文档链接/格式不能获得自动 gate 证据 | 使用 `git diff --check`，并由 Phase 11 governance 补正式 gate | 开放风险 |

## 7. 阶段交接与用户决定

- 下一阶段从哪里开始：Phase 02 `Contract & Runtime Baseline`；先把本记录的真实边界转成 typed contract/runtime baseline，再决定最小迁移顺序。
- Phase 02 必须先解决：修复/验证 browser harness 的 `apps/web` 旧路径；保留 `apps/webapp` 为唯一产品入口，不创建重复 `apps/web` 目录。
- 可直接复用：`projectRepository.readProjectEditorState/saveProjectEditorState/applyCalibrationDraft`；CalibrationDraft v3 与 `applyCalibrationCommand`；auto-shot task lifecycle/repository；template validation/profile resolver；CDP harness 的隔离 profile/fixture 机制（修正入口后）；现有 fault/pressure/lifecycle fixtures。
- 不应重复实施：IndexedDB v18 store 创建、project editor 原子保存、recovery snapshot、auto-shot pause/cancel 基础状态、template v2 validation、report escaping。
- 当前未提交修改及归属：本阶段记录文档已交付；产品代码无修改。工作区仍有未纳入本阶段的计划文件变更，已按路径排除且保留。
- 需要用户决定的事项：无。按阶段计划执行专用分支、提交和远程推送；不部署、不改生产/第三方设置。
