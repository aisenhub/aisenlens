# AisenShot Phase 8 媒体链路交接记录

日期：2026-08-27  
状态：Task 8.1–8.5 已完成，Phase 8 验收门通过。

## 已确认的 fixture 与能力矩阵

- `apps/web/test/test.mov` 作为当前 H.264/MP4 顺序解码 smoke 素材，Chrome 152 下为 AVC、1920×1080、NV12、8-bit、BT.709、无旋转、1 条音轨；素材不进入产品包。
- `apps/web/test/fixtures/auto-shot/manifest.example.json` 保留合成 VP9/WebM fixture 的来源、SHA-256、尺寸、时间基和标注；Chrome 当前对该 fixture 的 `VideoSampleSink` 解码失败会记录为明确错误，不作为生产成功路径。
- 目标 Web 能力由 `auto-shot-capability.verification.ts` 记录：`VideoDecoder`、`VideoFrame`、`OffscreenCanvas`、cross-origin isolation 和每个 sample 的格式/色彩/复制结果。
- 禁止通过逐时间点 `getSample()`、旧 `<video>` seek 或主线程 Canvas 读取来补能力缺口。

## Task 8.2 实现边界

`packages/scene-engine/src/worker/mediaDecoder.ts` 负责：

- 使用 `Input` + `VideoSampleSink.samples()` 顺序迭代，不做随机 seek。
- 映射 timestamp/duration、coded/visible 尺寸、rotation、像素格式、8-bit 限制、色彩矩阵/primaries/transfer/full range 和实际 plane layout。
- 对 `format=null`、高 bit-depth/不支持格式、缺失色彩 metadata 和打开/解码异常统一抛出稳定 `DECODE_FAILED`。
- 通过 `timestampUs + timestampOrdinal` 跳过已提交样本；当前为保证重复 PTS ordinal 的绝对确定性从流首部重放，关键帧 warm-up 优化留在 Task 8.4。
- 每个成功取得的 `VideoSample` 都在 `finally` 中 `close()`；decoder stats 用于浏览器 smoke 的 opened/closed 对账。

## 验证记录

- `corepack pnpm --filter @aisenlens/scene-engine typecheck` 通过。
- `corepack pnpm --filter @aisenlens/scene-engine test:contract` 通过（18/18）。
- `corepack pnpm --filter @aisenlens/web build` 通过。
- `corepack pnpm --filter @aisenlens/web test:auto-shot-baseline` 通过；Chrome 152 实际顺序解码 12 个 NV12 帧，timestamp 单调，openedSamples=closedSamples=12，主线程未接收 `VideoSample`。
- 结果写入 `test-results/auto-shot-media-decoder.json`，该目录为本地验证产物，不提交到仓库。
- module Worker dev smoke 已验证启动期消息缓存、显式 WASM 二进制加载和 `READY → START → COMPLETED`；Chrome 152 两帧合成任务输出 1 个 hard-cut。production build/preview 及 `/aisenlens/` 非根路径 smoke 已通过，实际 Worker/WASM 资源请求均命中 hashed asset。
- Worker 现在在首个可解码 sample 确定格式后预留固定 WASM frame buffer；真实媒体 source 将 source-owned target 转发给 decoder，避免重复 JS→WASM copy。
- Chrome 152 生命周期 smoke 已验证真实媒体 `pause → CHECKPOINT → resume → COMPLETED`、`cancel → CANCELLED` 和损坏 Blob → `ERROR`；source/runtime 在终态释放。
- `corepack pnpm scene-engine:verify:web-build` 已通过：独立 production 输出同时包含 Worker chunk 与 hashed `.wasm` asset；`corepack pnpm scene-engine:verify:web-preview` 已在 `/aisenlens/` 非根路径实际执行 Worker/WASM smoke。
- 可选合成内存 smoke（`AISENLENS_RUN_SYNTHETIC_MEMORY_SMOKE=1`）在 Chrome 152 中连续处理 200 帧，单次 reserve，WASM 内存保持 `67108864` 字节；浏览器 baseline 同时记录 JS heap 峰值约 22.8–24.1 MB。报告写入本地 `test-results/scene-engine-memory-synthetic-probe.json`。

## 下一步

1. 进入 Phase 9 SIMD 构建、探测与 parity；Desktop/Android 仍不属于本轮验收。
