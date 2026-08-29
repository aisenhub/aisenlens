# AisenLens 自动分镜 Phase 12 删除前基线

日期：2026-08-29（Phase 12 开始基线，12.6C/12.6D 已追加）

> 状态：Task 12.1 删除前基线已重建，Task 12.2、12.3A、12.6A、12.6B、12.6C、12.6D 已完成。用户明确批准将人工质量标注延期至 Phase 12，
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
| 旧路径审计 | `EditorWorkspace` 无旧 service/repository 生产调用；旧 Canvas/seek service、旧 record、旧基线验证入口已删除 |

| Phase 12 控制面 | research catalog 5 个预设、detail/transition/min-duration/advanced resolver、Zustand 设置隔离、研究控制面板与任务快照冻结已接入；面板明确显示“待标定” |

## 尚未关闭的验收项

- 人工质量标注与 search/holdout 评分：按用户决定延期至 Phase 12.3B/12.3C；在完成前不得宣称 preset 可用于 production。
- 具体“缺失媒体项目 → 重新选择文件”的原生文件选择器交互证据仍需在 Edge 中补做。
- production catalog 仍为空，不得显示或宣称生产默认预设。

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
