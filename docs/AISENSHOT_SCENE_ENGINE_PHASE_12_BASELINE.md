# AisenLens 自动分镜 Phase 12 删除前基线

日期：2026-08-29（Phase 12 开始前最终重建）

> 状态：Task 12.1 删除前基线已重建。用户明确批准将人工质量标注延期至 Phase 12，
> 因此本基线证明技术链路、产品生命周期和旧路径生产引用状态，不把当前候选结果当作质量真值，
> 也不据此晋升任何 production preset。

## 已通过矩阵

| 范围 | 验证 |
| --- | --- |
| native | CMake Debug 构建与 CTest 通过 |
| WASM | Emscripten baseline 与 SIMD 产物构建通过 |
| TypeScript/contract | Scene Engine typecheck、contract 29/29、SIMD parity 通过 |
| Worker | H.264 顺序解码、暂停恢复、取消、错误处理通过 |
| Web | production build、`/aisenlens/` 非根路径 preview smoke 通过；`test02.mov`（1429 帧/9 边界）与 `test03.mov`（359 帧/3 边界）均完整完成 |
| 数据库 | IndexedDB version 12 → 14 链式升级，旧自动分镜清理且项目数据保留通过 |
| 旧路径审计 | `EditorWorkspace` 无旧 service/repository 生产调用；旧 service 仅剩待删除文件与历史基线测试引用 |

## 尚未关闭的验收项

- 人工质量标注与 search/holdout 评分：按用户决定延期至 Phase 12.3B/12.3C；在完成前不得宣称 preset 可用于 production。
- 具体“缺失媒体项目 → 重新选择文件”的原生文件选择器交互证据仍需在 Edge 中补做。
- 旧 Canvas/seek 基线服务和旧 record 类型将在本基线提交后按 Task 12.2 删除；删除后不得恢复兼容双轨。

## 复现入口

```text
corepack pnpm scene-engine:verify:core
corepack pnpm scene-engine:verify:web-build
corepack pnpm scene-engine:verify:web-preview
$env:AISENLENS_SCENE_FIXTURE='apps/web/test/test02.mov'; corepack pnpm scene-engine:verify:web-preview
$env:AISENLENS_SCENE_FIXTURE='apps/web/test/test03.mov'; corepack pnpm scene-engine:verify:web-preview
$env:AISENLENS_SCENE_FIXTURE=$null
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm build
$env:AISENLENS_RUN_MEDIA_LIFECYCLE_SMOKE='1'; corepack pnpm --filter @aisenlens/web test:auto-shot-baseline
$env:AISENLENS_RUN_PROJECT_REPOSITORY_MIGRATION_SMOKE='1'; corepack pnpm --filter @aisenlens/web test:auto-shot-baseline
```

Desktop、Android、iOS 不属于当前 Web 验收范围。
