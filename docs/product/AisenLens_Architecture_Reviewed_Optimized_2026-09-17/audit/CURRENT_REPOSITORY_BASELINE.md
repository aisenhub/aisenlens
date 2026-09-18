# Current Repository Baseline

核对时间：2026-09-18。仓库：`aisenhub/aisenlens`，默认分支 `main`；本阶段读取到的产品代码基线 SHA 为 `7fa9a0b4d3604284c0278bce6490afc88294835c`。

## Verified CURRENT facts

- `apps/webapp` 是产品 renderer；`apps/webhome` 是公开内容站；仓库不存在 `apps/web` 产品目录。
- 根 package manager 为 pnpm 11.24.0（Corepack），运行时为 Node v24.19.0；workspace 为 `apps/*` 与 `packages/*`。
- `apps/webapp/src` 当前包含 `app / components / config / constants / features / hooks / lib / pages / services / types` 等分层；实际项目/IndexedDB repository 位于 `features/project/services/projectRepository.ts`，不是顶层 `src/services`。
- 当前 feature 至少包括 `analysis`, `annotation`, `auto-shot`, `editor`, `export`, `group`, `media`, `overview`, `project`, `scene-calibration`, `shot-calibration`, `shot`, `template`, `timeline`, `video`, `workflow` 等。
- IndexedDB 数据库名为 `aisenlens-projects`、版本 18，包含 project/media/shots/template/annotation/derived/auto-shot/calibration/group/recovery/research stores；`onupgradeneeded` 当前按缺失 store 创建，没有按 `oldVersion` 分支的完整迁移 pipeline。
- `features/shot/types.ts` 的 `ShotRecord` 当前使用整数 `startFrame/endFrame`，状态为 `draft | confirmed`，并直接持有 `analysisFields`。
- `features/template/types.ts` 当前已存在 Project Analysis Profile、FieldDefinitionSnapshot、Surface settings 与 schema v2 validation。
- `features/auto-shot/` 当前有 Worker/WASM task、候选结果、暂停 checkpoint、取消与 reload 后 interrupted 处理；候选经 CalibrationDraft v3 显式 apply 后写入 shots。
- `features/editor/session/` 当前有按 project 隔离的 Zustand session state，保存 selection/playback/research UI 状态；editor persistence 仍集中在 `EditorWorkspace` + feature repository。
- `docs/architecture/PROJECT_ARCHITECTURE.md` 明确 IndexedDB 为当前持久化边界，时间范围以整数帧半开区间 `[startFrame, endFrame)` 表达，并规定自动分镜 Candidate 经用户显式确认后才能更新正式 Shot。

## Important CURRENT/TARGET gaps

- 当前 `ShotRecord.analysisFields` 表明正式 Shot 聚合仍直接携带分析字段，这与目标设计中“Shot Structure Authority 与 Analysis Authority 分离”存在实现耦合。目标迁移应先建立兼容读路径与独立 Analysis Repository，再移除 Shot 聚合中的分析字段；不得清空或丢弃用户数据。
- 当前工作流代码仍定义六个 stage：`prepare / calibrate / overview / analyze / learn / create`，与目标三稳定 workspace 存在 IA 漂移。
- 当前 repository 已有局部 transaction/revision/fault-injection 能力，但尚未形成统一 typed runtime error、quota/corruption strategy、cross-tab coordination、完整旧 schema migration 或独立 Results derived query。
- 当前测试树中的若干 browser harness 仍引用不存在的 `apps/web`；后续修复应指向 `apps/webapp`，不得创建重复产品目录。

## Verification scope

本阶段核对了仓库入口、remote/branch/SHA/status、package scripts、`apps/webapp/src` 分层与 feature 路径、IndexedDB repository、media/auto-shot/calibration/analysis/template/timeline/results/backup/worker、9 条主要调用链、UI baseline、runtime/trust/delivery 与 fixture/capacity 能力；实际命令与未验证范围记录于同包 `Plans/AisenLens_Agent_Execution_Plans_Reviewed_Optimized/verification-record.md`。该文件是阶段动态记录，后续实现阶段仍须在相关代码变更后复测。
