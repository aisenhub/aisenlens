# Current Repository Baseline

核对时间：2026-09-17。仓库：`aisenhub/aisenlens`，默认分支 `main`；本轮读取到的树 SHA 为 `e08e0cc38b121078ddece7ae4395db21f9bc6e20`。

## Verified CURRENT facts

- `apps/webapp` 是产品 renderer；`apps/webhome` 是公开内容站。
- `apps/webapp/src` 当前包含 `app / components / features / pages / services(or service-oriented modules in architecture) / types` 等分层。
- 当前 feature 至少包括 `analysis`, `annotation`, `auto-shot`, `export`, `group`, `media`, `overview`, `project`, `scene-calibration`, `shot-calibration`, `shot`, `template` 等。
- `features/shot/types.ts` 的 `ShotRecord` 当前使用整数 `startFrame/endFrame`，状态为 `draft | confirmed`，并直接持有 `analysisFields`。
- `features/template/types.ts` 当前已存在 Project Analysis Profile / FieldDefinitionSnapshot / Surface settings 等模型。
- `docs/architecture/PROJECT_ARCHITECTURE.md` 明确 IndexedDB 为当前持久化边界，时间范围以整数帧半开区间 `[startFrame, endFrame)` 表达，并规定自动分镜 Candidate 经用户显式确认后才能更新正式 Shot。

## Important CURRENT/TARGET gap

当前 `ShotRecord.analysisFields` 表明正式 Shot 聚合仍直接携带分析字段，这与目标设计中“Shot Structure Authority 与 Analysis Authority 分离”存在实现耦合。目标迁移应先建立兼容读路径与独立 Analysis Repository，再移除 Shot 聚合中的分析字段；不得清空或丢弃用户数据。

## Verification scope

本轮验证了仓库入口、当前架构文档、`apps/webapp/src` 顶层、feature 目录、Shot 类型和 Template 类型。没有声称逐行审阅整个仓库，因此未直接核对的实现细节在本包中均标记为 PROPOSED 或需实施阶段再次验证。
