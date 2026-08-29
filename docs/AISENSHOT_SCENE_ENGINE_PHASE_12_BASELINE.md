# AisenLens 自动分镜 Phase 12 删除前基线

日期：2026-08-28

> 状态：准备性历史快照，不代表 Task 12.1 或 Phase 12 已完成。Phase 11 第二轮审计将改变
> media identity、config hash、task/review 与 shot provenance 契约；Phase 11 验收门关闭后
> 必须在最终 schema 和代码上完整重跑并更新本文件，不能直接复用下列通过项。

## 已通过矩阵

| 范围 | 验证 |
| --- | --- |
| native | CMake Debug 构建与 CTest 通过 |
| WASM | Emscripten baseline 与 SIMD 产物构建通过 |
| TypeScript/contract | Scene Engine typecheck、contract 25/25、SIMD parity 通过 |
| Worker | H.264 顺序解码、暂停恢复、取消、错误处理通过 |
| Web | production build、`/aisenlens/` 非根路径 preview smoke 通过 |
| 数据库 | IndexedDB version 12 → 13 升级，旧自动分镜清理且项目数据保留通过 |
| 旧路径审计 | `EditorWorkspace` 无旧 service/repository 生产调用 |

## 尚未关闭的验收项

- 强媒体身份、canonical config/hash、刷新后的 `interrupted` 语义、应用领域命令与正式镜头 provenance。
- 真实视频上传后的产品 UI 全流程（开始、暂停、刷新、继续、取消、重扫、审阅、应用、撤销）。
- 新引擎相对 Phase 0 JS 基线的准确率评分；当前已登记的合成 WebM 仅适合旧 JS 基线，Worker 明确记录 VP9 能力限制。
- 完整产品矩阵通过前，不删除旧 Canvas/seek 基线服务和旧 record 类型。

## 复现入口

```text
corepack pnpm scene-engine:verify:core
corepack pnpm scene-engine:verify:web-build
corepack pnpm scene-engine:verify:web-preview
$env:AISENLENS_RUN_MEDIA_LIFECYCLE_SMOKE='1'; corepack pnpm --filter @aisenlens/web test:auto-shot-baseline
$env:AISENLENS_RUN_PROJECT_REPOSITORY_MIGRATION_SMOKE='1'; corepack pnpm --filter @aisenlens/web test:auto-shot-baseline
```

Desktop、Android、iOS 不属于当前 Web 验收范围。
