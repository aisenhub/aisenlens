# @aisenlens/scene-engine

原生 AisenShot 场景检测引擎的唯一 workspace 包。当前已完成 Phase 1–5、Phase 6.2–6.5、Phase 7.1–7.5、Phase 8.1–8.5 和 Phase 9 全部任务，并完成 dev/production preview 环境 module Worker/WASM、真实 H.264 媒体 Worker smoke、内存复用验收、独立 SIMD 产物 parity 与 SIMD 微基准。Phase 10–11 的 Web 任务服务、结果适配、IndexedDB 升级和编辑器 Hook 接线在仓库 Web 层完成；真实视频产品 UI 全流程仍需单独回归。

## 边界

- 只接受 `FrameView`、配置和值类型，不依赖 React、浏览器 DOM、Supabase 或项目数据库。
- 后续 C++ 核心通过稳定 C ABI/WASM 供 Web Worker 使用；项目帧映射、任务持久化和 UI 状态留在 Web 适配层。
- 输入帧的像素格式、visible rect、色彩字段、微秒时间和 presentation index 遵守 [`docs/AISENSHOT_SCENE_ENGINE_PHASE_0_BASELINE.md`](/E:/Projects/Aisenlens/docs/AISENSHOT_SCENE_ENGINE_PHASE_0_BASELINE.md) 与架构文档。

## 工具链预检（2026-08-27）

| 工具 | 结果 |
| --- | --- |
| Node.js | `v24.19.0` |
| pnpm | `11.24.0` |
| pnpm store | `D:\APP\Base\pnpm-store\v11` |
| CMake | `4.4.2`，便携版 `D:\APP\Base\cmake-4.4.2\cmake-4.4.2-windows-x86_64\bin` |
| CTest | `4.4.2`，随 CMake 便携版提供 |
| C++ 编译器 | LLVM-MinGW Clang `22.1.8`，`D:\APP\Base\llvm-mingw-20260616-ucrt-x86_64\llvm-mingw-20260616-ucrt-x86_64\bin` |
| Emscripten | emsdk 6.0.8，`D:\APP\Base\emsdk`，已安装并激活；`emcc`、`emcmake` 已通过迁移后的 smoke build 验证 |

工具已安装到用户级目录，并已写入用户 PATH；新开的终端会自动生效。当前验证使用 `MinGW Makefiles` 生成器和 `clang++`，执行：

```text
corepack pnpm --filter @aisenlens/scene-engine configure:native
corepack pnpm --filter @aisenlens/scene-engine build:native
corepack pnpm --filter @aisenlens/scene-engine test:native
```

## Phase 2 数值规则

- 输入先按 visible rect 保持宽高比缩放到 `analysis_width × analysis_height` 内，使用像素中心的确定性最近邻坐标映射。
- I420/NV12 依据帧携带的 matrix 与 full/limited range 做整数定点 YUV 转 RGB；RGBX/RGBA 按 RGB 顺序读取。
- Luma、Hue、Saturation 均量化到 0..255；相邻分析帧逐像素计算平均绝对差，Hue 使用环形最短距离。
- Content score 使用 0..10000 定点值，按配置权重归一化；阈值相等时触发，首帧只建立状态不触发。
- 原始帧不缓存，只保留下一帧所需的量化分析表面；阈值和事件时间使用整数比较与微秒时间戳。
- 这些规则借鉴 PySceneDetect 的 Content 思路，但不承诺与其默认阈值或像素实现数值等价。

## 当前状态

Phase 1–5、Phase 6.2–6.5、Phase 7.1–7.5、Phase 8.1–8.5 和 Phase 9 已完成。native Debug、Release、sanitizer Debug、Emscripten baseline/SIMD WASM、TypeScript strict/contract tests、Worker fake-runtime lifecycle tests、Chrome 152 下 H.264/NV12 顺序解码 smoke、fixture 双轮确定性、真实媒体 Worker 的 pause/resume/cancel/error、200 帧 WASM 内存复用、production build 资源产物检查及 `/aisenlens/` 非根路径 preview smoke 均已通过；不得把 native 包当作 Web 运行时依赖。Web 任务服务和 IndexedDB 迁移已接入，产品 UI 的真实视频回归仍是单独验收项。

Adaptive 使用 `adaptive_window_width` 的 look-ahead 窗口，事件时间固定为窗口中心帧；详细规则见 [`docs/AISENSHOT_SCENE_ENGINE_PHASE_3_ADAPTIVE.md`](/E:/Projects/Aisenlens/docs/AISENSHOT_SCENE_ENGINE_PHASE_3_ADAPTIVE.md)。Threshold/Fade、事件解析、最短镜头过滤和 checkpoint 规则见 [`docs/AISENSHOT_SCENE_ENGINE_PHASE_4_THRESHOLD.md`](/E:/Projects/Aisenlens/docs/AISENSHOT_SCENE_ENGINE_PHASE_4_THRESHOLD.md)。

## C ABI

`cpp/include/aisenshot/scene_engine_abi.h` 是稳定边界：只使用固定宽度整数、显式 version 和 opaque `asen_engine_t*` 句柄，不暴露 C++/STL。调用方拥有输入帧和 checkpoint 缓冲区；引擎只在调用期间读取帧数据，事件由调用方提供输出结构接收。checkpoint 支持先查询所需长度再写入调用方缓冲区，导入失败不会改变现有句柄状态。

Phase 5 的接口与验证记录见 [`docs/AISENSHOT_SCENE_ENGINE_PHASE_5_ABI.md`](/E:/Projects/Aisenlens/docs/AISENSHOT_SCENE_ENGINE_PHASE_5_ABI.md)。

## Baseline WASM

使用固定 emsdk 6.0.8 构建 baseline 模块：

```text
corepack pnpm --filter @aisenlens/scene-engine configure:wasm
corepack pnpm --filter @aisenlens/scene-engine build:wasm
```

生成物位于已忽略的 `dist/wasm/scene-engine.js` 与 `dist/wasm/scene-engine.wasm`。模块使用 `SceneEngineModule` 工厂、固定 64 MiB 线性内存、无 memory growth、无 SIMD/pthreads，并只导出稳定 C ABI、`_malloc/_free` 以及 runtime `HEAPU8` 视图；Node ABI smoke 已确认 `asen_abi_version() === 1`。

SIMD 产物单独构建：

```text
corepack pnpm scene-engine:configure:wasm:simd
corepack pnpm scene-engine:build:wasm:simd
corepack pnpm scene-engine:test:simd
```

产物位于 `dist/wasm-simd/scene-engine-simd.js/.wasm`，与 baseline 共用 C ABI。Worker 在初始化时只探测一次 SIMD 能力；支持时使用 SIMD，缺失或实例化失败时仅在初始化阶段回退到 baseline。初始化完成后 backend 固定，不会在任务运行中切换。当前固定机器的共享帧指标微基准显示约 6.6%–7.6% 加速，但仍应结合真实素材持续观察。

## Web Worker 打包检查

在已生成 WASM 产物的前提下，可执行 `corepack pnpm scene-engine:verify:web-build`。该检查会在独立的 `test-results/scene-engine-web-build/` 目录中运行 Vite production build，确认 Worker chunk 和 hashed WASM asset 都能生成，不改变常规 Web 构建输出。

随后可执行 `corepack pnpm scene-engine:verify:web-preview`，它会把该 production 输出以 `/aisenlens/` 非根路径提供给 Chrome 152，加载真实 H.264 smoke 素材并验证 Worker/WASM 的 `READY → STARTED → PROGRESS → CHECKPOINT` 链路。该命令只生成本地 `test-results/` 验证产物，不会把测试视频打入产品包。

若需要检查 WASM 内存复用，可在浏览器基线命令前设置 `AISENLENS_RUN_SYNTHETIC_MEMORY_SMOKE=1`；它会在 Worker 中连续处理 200 个合成帧并确认只 reserve 一次、线性内存不增长。

若需要记录两个 backend 的共享帧指标回归信号，可执行 `corepack pnpm scene-engine:benchmark:simd`；报告写入 `test-results/scene-engine-backend-benchmark.json`，不作为固定性能 SLA。
