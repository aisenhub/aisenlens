# AisenShot Scene Engine 开发实施计划

> 状态：待按阶段执行
>
> 日期：2026-08-25
>
> 依据：已审核通过的 `docs/AISENSHOT_SCENE_ENGINE_PLAN.md`
>
> 范围：分镜算法核心、C ABI、WASM/Worker 运行时、WebCodecs 解码适配及 AisenLens 自动分镜接入
>
> 不包含：关键帧提取、Histogram Detector、Hash Detector、UI 改版及其他视频分析能力

本文把既定架构拆成可独立开发、测试和验收的执行阶段。文中的阶段细分只用于降低单次改动范围，不改变以下已确定路线：单一 `@aisenlens/scene-engine` workspace 包、C++ 核心、稳定 C ABI、Emscripten/WASM、专用 Worker、Mediabunny + WebCodecs 顺序解码、微秒时间权威、baseline/SIMD 双产物，以及由 Web 适配层完成项目帧映射。

## 一、总体实施路线

### 1.1 开发顺序

```text
工具链与原生 C++ 最小骨架
  -> 共享图像预处理与 Content Detector
  -> Adaptive Detector
  -> Threshold/Fade + 过滤/融合 + checkpoint
  -> 稳定 C ABI
  -> Emscripten baseline WASM + TypeScript 封装
  -> Worker 最小纵向链路
  -> Mediabunny/WebCodecs 真实视频链路
  -> WASM SIMD
  -> AisenLens 业务适配与持久化
  -> React 最小接入
  -> 整体验收、旧实现删除、参数标定
```

实施原则是“先算法和原生测试，再跨 ABI，再浏览器运行时，最后业务与 React”。每个 Phase 必须单独通过本阶段验证，失败时不得以进入下一阶段来掩盖问题。

### 1.2 最小可运行版本定义

- **工程最小可运行版本（Phase 1）**：原生 C++ 引擎可以创建、顺序接收合成帧、flush、reset 和销毁；尚不检测切点，稳定输出零事件。
- **算法最小可用版本（Phase 2）**：Content Detector 在原生测试中可稳定检测合成硬切，尚不接 WASM 或 UI。
- **浏览器最小可用版本（Phase 8）**：真实短视频可在 Worker 中经 WebCodecs 解码并由 baseline WASM 输出镜头边界，主线程不接收像素帧。
- **产品最小可用版本（Phase 11）**：现有自动分镜入口使用新引擎完成运行、暂停/继续、结果审阅和显式应用。

### 1.3 当前结构冲突与影响

以下问题不改变架构，但必须在相应阶段解决：

| 已确认问题 | 实施影响 | 处理阶段 |
| --- | --- | --- |
| `packages/scene-engine/` 尚不存在，`packages/` 当前为空 | 必须先创建独立 workspace 包，不能直接在 Web feature 中写算法 | Phase 1 |
| 当前环境未发现 CMake、原生 C++ 编译器、CTest 或 Emscripten | Phase 1/6 开始前必须完成工具链预检；安装工具需单独获得执行环境许可 | Phase 1、Phase 6 |
| 仓库没有通用 C++/TypeScript 单测框架 | 原生侧先使用 CTest + 无外部依赖的轻量测试可执行文件；TS 侧复用 Node `node:test`，不为此引入大型测试框架 | Phase 1、Phase 6 |
| 根 `build` 当前只构建 `@aisenlens/web` | Engine 必须有独立 configure/build/test 脚本；接入前再把必要检查纳入总体验收 | Phase 1、Phase 12 |
| 根 `package.json` 声明 pnpm 11.21.0，`.mise.toml` 固定 pnpm 10.34.3 | 会影响锁文件与 CI 可复现性；开始依赖变更前必须确定仓库唯一 pnpm 版本并记录，不在算法实现中绕过 | Phase 1 前置检查 |
| 当前 `AutoShotRunRecord` 使用整数帧、`confidence` 和旧 `cuts` 结构 | 不能直接承载新引擎微秒时间、`score/threshold/evidence`、版本、配置 hash 和 checkpoint | Phase 10、Phase 11 |
| `EditorWorkspace.tsx` 约 3640 行并直接管理检测、暂停、应用逻辑 | React 接入必须通过 hook/service 做局部替换；不得把 Worker/WASM 状态继续写进该组件 | Phase 11 |
| IndexedDB 已有 `auto-shot-runs` store，且 `projectId` 唯一 | 无需为相同职责新建第二个 store；切换时必须使旧派生记录失效并删除，不能把旧记录当作新 checkpoint，也不保留长期兼容读取 | Phase 11 |
| Desktop/Mobile 复用 Web renderer | Worker 与 WASM URL 不能假定站点根路径；必须验证 Vite Web、Electron 打包相对资源和 Capacitor 资源上下文 | Phase 8、Phase 12 |

若执行中发现新的结构冲突，当前 Phase 只记录“事实、影响、阻断的验收项”，暂停受影响任务并请求评审；不得借机修改既定核心技术路线。

## 二、分阶段实施计划

### Phase 1：原生 C++ 工程骨架与最小生命周期

**目标**

建立独立可编译、可测试的 Scene Engine 包和最小 C++ 生命周期。此阶段不实现任何检测算法，处理合法合成帧时输出零事件。

**具体任务**

1. 预检并记录 CMake、CTest、C++ 编译器、Node 和 pnpm 版本，先解决 pnpm 版本声明冲突。
2. 创建 `@aisenlens/scene-engine` workspace 包，不引入 React、Zustand、浏览器 API 或 OpenCV。
3. 建立 CMake 静态核心库、测试可执行文件和 CTest 注册。
4. 按既定架构落地 `FrameView`、`SceneEvent`、`EngineConfig`、`ISceneDetector` 与 `SceneEngine` 基础类型。
5. 实现 create/process/flush/reset/destroy 语义、帧布局校验、`presentation_index` 顺序校验和 `timestamp_us` 单调不减校验。
6. 创建确定性的合成帧工厂和轻量测试入口；测试不得依赖 Release 模式会失效的标准 `assert`。
7. 为根 workspace 增加显式 native configure/build/test 命令，并在包 README 记录先决条件和命令。

**涉及文件/目录**

创建：

- `packages/scene-engine/package.json`
- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/README.md`
- `packages/scene-engine/cpp/include/aisenshot/frame_view.h`
- `packages/scene-engine/cpp/include/aisenshot/scene_event.h`
- `packages/scene-engine/cpp/include/aisenshot/config.h`
- `packages/scene-engine/cpp/include/aisenshot/detector.h`
- `packages/scene-engine/cpp/include/aisenshot/scene_engine.h`
- `packages/scene-engine/cpp/src/core/scene_engine.cpp`
- `packages/scene-engine/cpp/src/core/detector_pipeline.cpp`
- `packages/scene-engine/cpp/tests/test_main.cpp`
- `packages/scene-engine/cpp/tests/test_support.h`
- `packages/scene-engine/cpp/tests/synthetic_frame_factory.h`
- `packages/scene-engine/cpp/tests/synthetic_frame_factory.cpp`
- `packages/scene-engine/cpp/tests/scene_engine_lifecycle_test.cpp`

修改：

- `package.json`：增加 `scene-engine:configure:native`、`scene-engine:build:native`、`scene-engine:test:native` 等显式脚本。
- `.mise.toml`：仅在确认仓库统一 pnpm/CMake 管理方式后修改；不得猜测或写入未经验证的工具条目。

删除：无。

**前置条件**

- 已审核架构文档是类型和生命周期语义的唯一依据。
- 可用支持 C++17 的编译器、CMake 和 CTest。
- 若环境缺工具，先报告准确缺项；只有获得许可后才安装。

**完成标准**

- package 被 pnpm workspace 正确识别。
- Debug/Release 均可构建核心库与测试可执行文件。
- 合法的 I420/NV12/RGBA 合成帧可顺序处理并返回零事件。
- 非法 plane/stride、倒退时间戳、倒退 presentation index、重复 flush 等行为有明确且经过测试的结果。
- reset 后同一输入序列可再次处理，结果完全一致。
- 包不依赖 React、WebCodecs、Mediabunny、OpenCV、Python 或项目业务类型。

**测试/验证方式**

```powershell
cmake -S packages/scene-engine -B packages/scene-engine/build/native -DBUILD_TESTING=ON
cmake --build packages/scene-engine/build/native --config Release
ctest --test-dir packages/scene-engine/build/native -C Release --output-on-failure
pnpm.cmd build
git diff --check
```

还需用 `rg` 确认包内不存在 `react`、`zustand`、`ShotRecord`、`indexedDB`、`VideoFrame` 和 `mediabunny` 导入。

**可能的风险**

- Windows 单配置/多配置生成器的 `--config Release` 行为不同，脚本必须兼容实际生成器。
- 过早扩张公共 C++ 类型会形成 ABI 负担；Phase 1 只固化已批准的最小字段。
- 工具链版本未统一会导致本地通过、CI 或其他 Agent 无法复现。

### Phase 2：共享帧指标与 Content Detector

**目标**

先建立测试，再实现一次下采样、一次共享指标计算和固定阈值硬切检测，形成算法最小可用版本。

**具体任务**

1. 先补充相同帧、纯亮度变化、色相变化、纯色硬切、权重组合和阈值边界测试。
2. 固化 I420/NV12/RGBA 到统一分析表面的数值规则、舍入方式、有效尺寸和 stride 处理。
3. 实现保持宽高比的下采样、YUV/RGBA 读取、HSV/亮度指标和相邻帧差异；单帧只遍历一次生成共享指标。
4. 实现 Content Detector 的分量权重、`score`、阈值判定和事件 evidence。
5. 将 detector pipeline 接入 SceneEngine，但默认只启用一种 hard-cut detector。
6. 用无版权、程序生成的合成帧序列固定 golden 预期；记录与 PySceneDetect 思路的对应关系和数值差异，不复制 Python 框架。

**涉及文件/目录**

创建：

- `packages/scene-engine/cpp/src/image/downscale.h`
- `packages/scene-engine/cpp/src/image/downscale.cpp`
- `packages/scene-engine/cpp/src/image/yuv_to_hsv.h`
- `packages/scene-engine/cpp/src/image/yuv_to_hsv.cpp`
- `packages/scene-engine/cpp/src/image/frame_metrics.h`
- `packages/scene-engine/cpp/src/image/frame_metrics.cpp`
- `packages/scene-engine/cpp/src/detectors/content_detector.h`
- `packages/scene-engine/cpp/src/detectors/content_detector.cpp`
- `packages/scene-engine/cpp/tests/frame_metrics_test.cpp`
- `packages/scene-engine/cpp/tests/content_detector_test.cpp`

修改：

- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/cpp/include/aisenshot/config.h`
- `packages/scene-engine/cpp/include/aisenshot/scene_event.h`
- `packages/scene-engine/cpp/src/core/scene_engine.cpp`
- `packages/scene-engine/cpp/src/core/detector_pipeline.cpp`
- `packages/scene-engine/cpp/tests/synthetic_frame_factory.*`
- `packages/scene-engine/README.md`

删除：无。

**前置条件**

- Phase 1 全部通过。
- Content 配置字段、分量公式和事件字段已按批准文档转写为测试用例。

**完成标准**

- 相同帧 score 为确定值，阈值两侧行为明确。
- 三种输入格式在定义容差内产生一致指标和边界。
- Content 事件使用微秒时间与 `score`，不使用 `confidence` 命名原始差异。
- 内存占用只与当前原始帧、分析帧和前帧指标相关，不随视频长度增长。
- 原生测试覆盖首帧、末帧、stride padding、奇数尺寸和权重为零。

**测试/验证方式**

- 运行 Phase 1 的 native build/CTest 命令。
- Debug 构建开启编译器可用的 AddressSanitizer/UndefinedBehaviorSanitizer，并运行相同测试。
- 对同一合成序列连续运行两次，逐字段比较事件顺序、时间戳、score、threshold 和 evidence。

**可能的风险**

- 自研 YUV/HSV 数值与 OpenCV/PySceneDetect 不完全相同，阈值必须后续重新标定，不能宣称默认值等价。
- 奇数尺寸、色度平面 stride 和色彩范围处理错误会导致平台差异。
- 若 Content 在 detector 内再次遍历像素，会破坏 Adaptive 复用指标的既定边界。

### Phase 3：Adaptive Detector

**目标**

在不重复像素计算的前提下，用 Content score 滚动窗口实现 Adaptive Detector，并验证 look-ahead 和尾部 flush。

**具体任务**

1. 先建立局部高峰、持续快速运动、邻域均值为零、最小 Content score、窗口延迟和尾部 flush 测试。
2. 实现前后窗口、adaptive ratio、最小 Content score 保护和目标事件真实时间戳。
3. 通过 `lookahead_frames()` 暴露延迟，不允许调用方把当前输入帧误当作事件帧。
4. 在配置校验中保证 Content 与 Adaptive 作为默认 hard-cut 模式二选一；共享指标层保持唯一。

**涉及文件/目录**

创建：

- `packages/scene-engine/cpp/src/detectors/adaptive_detector.h`
- `packages/scene-engine/cpp/src/detectors/adaptive_detector.cpp`
- `packages/scene-engine/cpp/tests/adaptive_detector_test.cpp`

修改：

- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/cpp/include/aisenshot/config.h`
- `packages/scene-engine/cpp/include/aisenshot/detector.h`
- `packages/scene-engine/cpp/src/core/detector_pipeline.cpp`
- `packages/scene-engine/cpp/tests/synthetic_frame_factory.*`
- `packages/scene-engine/README.md`

删除：无。

**前置条件**

- Phase 2 Content score 已稳定，并有确定性测试。

**完成标准**

- Adaptive 直接消费共享 Content score，不读取原始像素。
- 高运动连续片段的误报抑制用例通过，孤立明显切点仍可检出。
- 所有延迟事件携带目标帧自身的 timestamp/presentation index。
- flush 前后没有重复事件，短于完整窗口的视频有明确结果。

**测试/验证方式**

- 运行完整 native CTest，不只运行 Adaptive 测试。
- 用相同指标序列分别单次运行、分批 process 后 flush，结果逐字段一致。
- 使用计数测试桩验证每帧共享指标只计算一次。

**可能的风险**

- 窗口索引偏移会产生稳定但错误的一帧或多帧偏差。
- 尾部窗口不足时若行为未固定，会使 checkpoint/恢复结果与连续运行不一致。

### Phase 4：Threshold/Fade、事件融合、最短镜头与 checkpoint

**目标**

完成本阶段全部检测器能力和核心状态管理：Threshold/Fade、最短镜头过滤、事件融合、flush 以及确定性 checkpoint。

**具体任务**

1. 先建立 floor/ceiling 穿越、完整淡出淡入、仅淡出、仅淡入、fade bias 三位置和结尾未闭合 fade 测试。
2. 实现 Threshold/Fade 状态机；其可与选定的 Content 或 Adaptive hard-cut detector 并行。
3. 实现 `MinSceneFilter` 的 minimum duration、merge/suppress 和闪白/闪黑抑制。
4. 实现 `EventResolver` 的稳定排序、去重、同转场多来源聚合和 hard-cut/fade 重叠决策；保留原始 evidence。
5. 实现 checkpoint 核心序列化/恢复：版本、schema、config hash、最后提交时间、前帧指标、Adaptive 窗口、Fade 状态、过滤状态及已提交边界摘要。
6. 验证连续运行与任意安全帧边界暂停/恢复完全一致。

**涉及文件/目录**

创建：

- `packages/scene-engine/cpp/src/detectors/threshold_detector.h`
- `packages/scene-engine/cpp/src/detectors/threshold_detector.cpp`
- `packages/scene-engine/cpp/src/core/min_scene_filter.h`
- `packages/scene-engine/cpp/src/core/min_scene_filter.cpp`
- `packages/scene-engine/cpp/src/core/event_resolver.h`
- `packages/scene-engine/cpp/src/core/event_resolver.cpp`
- `packages/scene-engine/cpp/src/core/checkpoint.h`
- `packages/scene-engine/cpp/src/core/checkpoint.cpp`
- `packages/scene-engine/cpp/tests/threshold_detector_test.cpp`
- `packages/scene-engine/cpp/tests/min_scene_filter_test.cpp`
- `packages/scene-engine/cpp/tests/event_resolver_test.cpp`
- `packages/scene-engine/cpp/tests/checkpoint_test.cpp`

修改：

- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/cpp/include/aisenshot/config.h`
- `packages/scene-engine/cpp/include/aisenshot/scene_event.h`
- `packages/scene-engine/cpp/include/aisenshot/scene_engine.h`
- `packages/scene-engine/cpp/src/core/scene_engine.cpp`
- `packages/scene-engine/cpp/src/core/detector_pipeline.cpp`
- `packages/scene-engine/README.md`

删除：无。

**前置条件**

- Phase 2、3 全部 native 测试稳定。
- 事件优先级、fade 区间半开/闭合语义和最短镜头微秒语义沿用批准文档。

**完成标准**

- Content、Adaptive 可独立选择；Threshold/Fade 可按配置并行开启。
- 同一输入与配置的事件顺序确定，事件源和 evidence 不丢失。
- 最短镜头使用微秒比较，不依赖平均帧率。
- checkpoint 对 config hash、schema 和主版本不匹配返回明确错误。
- 在多个安全帧位置暂停/恢复的最终结果与一次连续运行完全相同。

**测试/验证方式**

- 完整 native CTest + sanitizer。
- 对合成序列进行每个可暂停位置的参数化 checkpoint 测试。
- 对同一时间多事件、fade 内 hard-cut、连续闪白和 VFR 时间戳建立 golden 结果。

**可能的风险**

- Fade 与 hard-cut 的融合若只做简单去重，会丢失转场语义或产生双边界。
- checkpoint 遗漏一个滚动状态就会造成恢复后边界漂移。
- 序列化格式一旦进入持久化即需版本管理，不能序列化 STL 内存布局。

### Phase 5：稳定 C ABI 与原生 ABI 一致性

**目标**

在不接 Emscripten 的情况下先完成版本化、句柄式 C ABI，并证明 ABI 调用结果与直接 C++ 调用一致。

**具体任务**

1. 实现已批准的 `asen_abi_version/create/reserve_frame/process_frame/read_events/flush/export_checkpoint/import_checkpoint/destroy`。
2. ABI 结构仅使用固定宽度标量、offset 和 length；不跨边界传 STL、异常或裸字符串。
3. 将异常统一转换为 `asen_status` 和稳定错误码，规定句柄与缓冲区所有权。
4. 批量读取事件，禁止逐帧逐字段导出函数。
5. 用同一合成输入对比 C++ API 与 C ABI 的事件和 checkpoint。

**涉及文件/目录**

创建：

- `packages/scene-engine/wasm/scene_engine_abi.h`
- `packages/scene-engine/wasm/scene_engine_abi.cpp`
- `packages/scene-engine/cpp/tests/scene_engine_abi_test.cpp`

修改：

- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/cpp/include/aisenshot/scene_engine.h`
- `packages/scene-engine/README.md`

删除：无。

**前置条件**

- Phase 4 核心结果和 checkpoint 已稳定。

**完成标准**

- C 编译单元可独立包含 ABI header。
- 每个 ABI 入口覆盖 null、无效句柄、错误容量、错误帧布局和重复销毁等失败路径。
- C++ API 与 C ABI 对相同输入产生逐字段一致的结果。
- sanitizer 下无越界、泄漏或异常穿越 ABI。

**测试/验证方式**

- native CTest 中同时运行 C++ 与 C ABI 测试。
- 增加一个纯 C smoke target 验证 header 的 C 兼容性。
- 用小容量事件缓冲多次读取，验证无丢失、无重复和顺序稳定。

**可能的风险**

- 结构体对齐和 enum 大小在编译器间不同；必须用固定宽度类型和静态尺寸断言。
- ABI 与 C++ public API 同时演进会产生重复语义；ABI 只做机械边界，不承载业务友好模型。

### Phase 6：Emscripten baseline WASM 与 TypeScript 低层封装

**目标**

把已验证的 C ABI 编译为 baseline WASM，建立无 React 的 TypeScript 类型、配置、错误和结果规范化层，并完成 native/WASM 一致性测试。

**具体任务**

1. 选择并固定一个已验证可构建的 Emscripten/emsdk 精确版本，记录安装与激活方式。
2. 增加 Emscripten CMake 选项和 baseline 构建脚本，导出且只导出稳定 C ABI。
3. 建立 TypeScript 公共数据类型、配置校验、错误码映射和结果规范化。
4. 实现低层 `wasmRuntime`：实例化、ABI 版本检查、HEAP 视图刷新、句柄释放和事件批量读取。
5. 使用预分配 frame buffer；任务处理期间禁止因逐帧分配触发 memory growth。
6. 在 Node/WASM 测试中重放与 native 相同的合成序列并逐字段比较结果。

**涉及文件/目录**

创建：

- `packages/scene-engine/cmake/EmscriptenOptions.cmake`
- `packages/scene-engine/tsconfig.json`
- `packages/scene-engine/src/index.ts`
- `packages/scene-engine/src/api/types.ts`
- `packages/scene-engine/src/api/config.ts`
- `packages/scene-engine/src/api/errors.ts`
- `packages/scene-engine/src/result/normalizeResult.ts`
- `packages/scene-engine/src/worker/wasmRuntime.ts`
- `packages/scene-engine/test/abi-parity.test.ts`
- `packages/scene-engine/test/support/syntheticFrames.ts`

修改：

- `packages/scene-engine/package.json`
- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/README.md`
- `package.json`
- `pnpm-lock.yaml`：仅由统一版本的 pnpm 根据实际包依赖生成，禁止手工编辑。

生成但不提交：

- `packages/scene-engine/dist/wasm/scene-engine.wasm`
- Emscripten glue、TypeScript 编译输出和 sourcemap。

删除：无。

**前置条件**

- Phase 5 通过。
- 可用并已固定的 Emscripten 工具链。
- pnpm 版本冲突已经解决。

**完成标准**

- baseline WASM 可在 Node 测试环境实例化，ABI 版本校验生效。
- TS public API 不暴露 Emscripten Module、HEAP 指针或 C ABI 结构。
- native 与 WASM 的边界、类型、时间戳、score 和 checkpoint 一致。
- TypeScript strict 检查通过；package 仍无 React/Zustand/项目类型依赖。

**测试/验证方式**

```powershell
pnpm.cmd scene-engine:build:wasm
pnpm.cmd scene-engine:test:wasm
pnpm.cmd --filter @aisenlens/scene-engine build
pnpm.cmd build
git diff --check
```

**可能的风险**

- Emscripten glue 的模块格式或资源定位方式不适合 Vite Worker，需在本阶段发现，不能留到 React 接入。
- WASM memory growth 会使缓存的 `Uint8Array` 失效，runtime 必须在 buffer 变化时刷新视图。
- native/WASM 浮点差异必须用批准的指标容差；边界时间戳和事件顺序必须完全一致。

### Phase 7：Worker 协议、客户端与合成帧纵向链路

**目标**

在接真实视频解码前完成专用 Worker 状态机、类型安全客户端、取消/暂停协议和资源释放，并用测试帧源跑通主线程到 WASM 的最小纵向链路。

**具体任务**

1. 定义并穷尽检查 `INIT/START/PAUSE/CANCEL/DISPOSE` 及反向消息协议。
2. 实现一次只运行一个重型任务的 Worker 状态机。
3. 实现 `SceneEngineClient`，封装 jobId、回调、AbortSignal、错误和 dispose。
4. 实现帧缓冲池，首版只使用单个复用 buffer。
5. 用仅存在于测试目录的合成帧源注入 Worker runtime；不得把测试帧协议暴露为公共生产 API。
6. 验证 pause 仅在安全帧边界返回 checkpoint，cancel 不生成 checkpoint。

**涉及文件/目录**

创建：

- `packages/scene-engine/src/client/SceneEngineClient.ts`
- `packages/scene-engine/src/worker/protocol.ts`
- `packages/scene-engine/src/worker/scene-engine.worker.ts`
- `packages/scene-engine/src/worker/frameBufferPool.ts`
- `packages/scene-engine/test/worker-protocol.test.ts`
- `packages/scene-engine/test/support/fakeWorker.ts`
- `packages/scene-engine/test/support/syntheticFrameSource.ts`

修改：

- `packages/scene-engine/src/index.ts`
- `packages/scene-engine/src/worker/wasmRuntime.ts`
- `packages/scene-engine/package.json`
- `packages/scene-engine/README.md`
- `package.json`

删除：无。

**前置条件**

- Phase 6 baseline WASM 与 TS 低层封装通过。

**完成标准**

- Worker 状态转换与协议错误均有测试。
- 每个终态都释放 WASM 句柄、缓冲与监听器。
- progress 仅包含标量和新增边界，不包含像素或整批历史结果。
- 合成帧任务可完成、暂停/恢复、取消和失败；恢复结果与连续运行一致。

**测试/验证方式**

- Node `node:test` 验证协议、FakeWorker 客户端和状态机。
- 浏览器 smoke test 验证实际 module Worker 能加载 baseline WASM。
- 检查消息 payload，确认没有 `VideoFrame`、ImageData 或像素数组发回主线程。

**可能的风险**

- Worker 消息竞态会让旧 job 的进度污染新 job，所有消息必须带 jobId 并校验当前任务。
- pause/cancel 若在帧处理中强行打断，会产生不可恢复状态；只在定义好的帧边界响应。

### Phase 8：Mediabunny/WebCodecs 真实视频链路

**目标**

实现真实 Blob/File 到 Scene Engine 的浏览器本地链路，使短视频可在 Worker 中顺序解码、直接写入 WASM 预分配内存并返回镜头边界。

**具体任务**

1. 用 Mediabunny `VideoSampleSink.samples()` 实现顺序解封装/解码，不做逐时间点随机 seek。
2. 读取实际 coded/visible 尺寸、timestamp、duration、rotation 和格式能力。
3. 优先协商 I420，其次 NV12/RGBA；使用 `VideoSample.copyTo()` 直接写入 `WebAssembly.Memory` 对应 view。
4. 已知视频尺寸后一次 reserve；每帧处理后立即 `VideoSample.close()`。
5. 实现稳定错误码：不支持编码、初始化失败、解码失败、无视频轨、损坏文件和取消。
6. 增加无版权短视频 fixtures 及浏览器集成测试，覆盖 H.264/MP4、VP9/WebM、VFR、旋转、无音轨和错误文件。
7. 验证 Vite 构建后的 Worker/WASM 相对 URL；同时做 Electron 与 Capacitor 资源定位 smoke test。

**涉及文件/目录**

创建：

- `packages/scene-engine/src/worker/mediaDecoder.ts`
- `packages/scene-engine/test/browser-integration.test.ts`
- `packages/scene-engine/test/fixtures/README.md`
- `packages/scene-engine/test/fixtures/manifest.json`
- 经许可生成或纳入的最小无版权视频 fixtures。

修改：

- `packages/scene-engine/src/worker/scene-engine.worker.ts`
- `packages/scene-engine/src/worker/frameBufferPool.ts`
- `packages/scene-engine/src/worker/wasmRuntime.ts`
- `packages/scene-engine/src/api/errors.ts`
- `packages/scene-engine/package.json`
- `packages/scene-engine/README.md`
- `package.json`
- `pnpm-lock.yaml`
- `apps/web/vite.config.ts`：仅在真实构建证明需要 Worker/WASM 资源配置时做最小修改。

删除：无。

**前置条件**

- Phase 7 Worker 状态机通过。
- 已确认 fixtures 的来源、许可、尺寸和预期边界。

**完成标准**

- 真实短视频可在 Worker 中完成 baseline 检测。
- 主线程不进行像素读取、不接收帧数据；不存在 Canvas/ImageData 中转。
- 每个分析帧最多一次必要的 WebCodecs 到 WASM 显式像素复制。
- 不支持的媒体返回 capability/error，不回退到旧 Canvas seek 检测。
- 长序列测试的内存不随解码帧数线性增长。

**测试/验证方式**

- 使用仓库现有浏览器测试方式启动构建产物，逐个运行 fixture。
- 在 Worker 中记录 decode/copy/process 峰值计数，测试后确认 `opened samples == closed samples`。
- 对同一素材连续运行两次，比较 config hash、engine version、边界顺序和时间戳。
- 构建 Web、Desktop；Mobile 至少执行资源同步与启动 smoke 验证。

**可能的风险**

- WebCodecs 支持受浏览器、系统解码器和编码参数影响；错误应显式暴露，不增加架构外降级路径。
- `copyTo()` 的布局、stride 和格式支持存在浏览器差异，必须以返回 layout 为准。
- 打包后 WASM URL 与开发服务器不同，是桌面/移动壳复用时的主要集成风险。

### Phase 9：WASM SIMD 构建、探测与一致性

**目标**

在 baseline 正确性稳定后增加同 ABI 的 SIMD 产物和一次性能力探测，不改变算法语义。

**具体任务**

1. 增加 `-msimd128` 构建选项，输出 `scene-engine-simd.wasm`。
2. 使用小模块 `WebAssembly.validate()` 进行能力探测，任务开始后固定 backend。
3. 优先 SIMD 化像素绝对差、亮度累加、下采样和 HSV 分量差，不改 detector 决策代码。
4. 建立 baseline/SIMD golden 一致性和性能分段测试。
5. 若 SIMD 无收益或结果超容差，baseline 仍为正确性基准并阻止 SIMD 默认启用。

**涉及文件/目录**

创建：

- `packages/scene-engine/wasm/feature_probe.ts`
- `packages/scene-engine/test/simd-parity.test.ts`
- `packages/scene-engine/test/performance-smoke.test.ts`

修改：

- `packages/scene-engine/cmake/EmscriptenOptions.cmake`
- `packages/scene-engine/CMakeLists.txt`
- `packages/scene-engine/src/worker/wasmRuntime.ts`
- `packages/scene-engine/src/worker/scene-engine.worker.ts`
- `packages/scene-engine/package.json`
- `packages/scene-engine/README.md`
- `package.json`

生成但不提交：

- `packages/scene-engine/dist/wasm/scene-engine-simd.wasm`

删除：无。

**前置条件**

- Phase 8 baseline 真实视频链路通过并已有性能基线。

**完成标准**

- 不支持 SIMD 的环境自动选择 baseline，支持环境只在初始化时选择一次。
- 两个产物使用同一 C ABI 和 TS public API。
- 镜头边界、事件类型和顺序完全一致；浮点 evidence 在批准容差内。
- 性能报告分离 decode、copy、preprocess 和 detect，不以总耗时掩盖退化。

**测试/验证方式**

- 对全部合成和真实 fixtures 分别强制 baseline/SIMD 并比较结果。
- 在固定机器、浏览器、冷/热启动条件下记录耗时和峰值内存。
- 模拟 SIMD probe false 和 SIMD 实例化失败，确认错误处理符合既定策略。

**可能的风险**

- 浮点累计顺序变化可能造成阈值附近事件分歧；应先修复数值确定性，不能放宽边界一致性。
- 同时维护两套手写算法会漂移；SIMD 只优化共享预处理，不复制 detector 逻辑。

### Phase 10：AisenLens 业务适配层与持久化边界

**目标**

在不修改 React 的前提下建立 auto-shot feature 对 Scene Engine 的唯一业务入口、结果适配器和可注入持久化边界。

**具体任务**

1. 定义仅属于 AisenLens 的任务、候选镜头和状态类型；Engine 类型仍从包 public API 导入。
2. 实现 `sceneResultAdapter`，集中完成 timestampUs 到项目整数帧、排序、去重及 `[startFrame, endFrame)` 构造。
3. 实现 `autoShotTaskService`，负责媒体指纹、配置冻结、engine version/config hash、进度、暂停/继续和结果状态。
4. 通过窄接口注入 run repository；本阶段用内存 fake 测试，不并行写入现有旧 `auto-shot-runs` 记录。
5. 将 `@aisenlens/scene-engine` 声明为 Web workspace 依赖并验证 production build。

**涉及文件/目录**

创建：

- `apps/web/src/features/auto-shot/types.ts`
- `apps/web/src/features/auto-shot/services/autoShotTaskService.ts`
- `apps/web/src/features/auto-shot/services/sceneResultAdapter.ts`
- `apps/web/src/features/auto-shot/services/autoShotTaskService.test.ts` 或项目现有测试约定下的等价测试文件。
- `apps/web/src/features/auto-shot/services/sceneResultAdapter.test.ts` 或等价测试文件。

修改：

- `apps/web/package.json`
- `pnpm-lock.yaml`
- 必要的 Web feature 测试脚本。

删除：无。

明确不修改：

- `apps/web/src/features/editor/components/EditorWorkspace.tsx`
- `apps/web/src/features/auto-shot/services/autoShotService.ts`
- `apps/web/src/features/project/types.ts`
- `apps/web/src/features/project/services/projectRepository.ts`

**前置条件**

- Phase 9 public client 已稳定；若 SIMD 延期，至少 Phase 8 baseline 必须通过且延期经过明确评审。

**完成标准**

- task service 不导入 React，result adapter 不导入 Worker/WASM/Mediabunny。
- 所有时间映射只在 result adapter 完成，Engine 原始微秒证据被保留。
- VFR、边界靠近 0/结尾、重复边界和最短末段有测试。
- 本阶段没有出现新旧持久化 record 并存写入。

**测试/验证方式**

- 运行 feature service/adapter 单测和 Web TypeScript build。
- 用 Fake SceneEngineClient 验证进度、暂停、恢复、取消、失败和完成。
- 用 `rg` 确认 React 组件没有新增 Worker、WASM 或 Mediabunny 导入。

**可能的风险**

- 固定帧率换算不能准确表示 VFR；适配器必须使用项目既定帧语义并保留 engine timestamp 作为证据。
- 此阶段新服务尚未被 UI 使用，必须避免为了“临时可用”增加双写或旧格式兼容层。

### Phase 11：React 最小接入与持久化原子切换

**目标**

用 hook/service 局部替换 `EditorWorkspace` 中的旧运行控制，并在同一次受控变更中把自动分镜持久化切换到新记录结构。

**具体任务**

1. 实现 `useAutoShotTask`，管理订阅、AbortSignal、组件卸载和 task service 生命周期。
2. 用 hook 返回的状态和命令替换 `EditorWorkspace` 当前直接调用 `runAutoShotDetection`、AbortController、暂停/继续和应用逻辑。
3. 替换 `AutoShotRunRecord` 为新 engine 任务记录：微秒进度、结果/evidence、engine version、config hash、checkpoint 和错误码。
4. 修改 project repository 只读写新结构；升级 IndexedDB schema 时清空并重建或显式清空旧 `auto-shot-runs` 派生记录，不能尝试恢复旧 checkpoint。
5. 保留现有用户流程和视觉表现：开始、进度、暂停/继续、失败、重扫、审阅、显式应用。
6. 应用候选仍通过现有 shot/editor 领域命令一次性执行，不允许 Worker 直接写项目数据。

**涉及文件/目录**

创建：

- `apps/web/src/features/auto-shot/hooks/useAutoShotTask.ts`
- 对应 hook/浏览器集成测试文件。

修改：

- `apps/web/src/features/editor/components/EditorWorkspace.tsx`
- `apps/web/src/features/project/types.ts`
- `apps/web/src/features/project/services/projectRepository.ts`
- `apps/web/src/features/auto-shot/services/autoShotTaskService.ts`
- 相关 project repository、editor browser 测试。

删除：本阶段先不删除旧服务文件；删除在 Phase 12 验收通过后执行。

**前置条件**

- Phase 10 service/adapter 测试和 Web build 通过。
- 已确认 `auto-shot-runs` 是可重新生成的派生数据，清理旧记录不会删除用户镜头或注释。

**完成标准**

- React 只调用 hook，不导入 Worker、WASM、Mediabunny 或 C ABI。
- 页面卸载、切换项目和重启任务不会遗留 Worker 或旧任务消息。
- 旧 run 记录被确定性清除，不能被识别为可恢复的新任务。
- 现有自动分镜 UI 行为不改版；新结果仍需用户显式应用。
- Desktop/Mobile 使用同一 Web 接入，不出现平台专属业务分支。

**测试/验证方式**

- Web build + 现有项目生命周期/browser 测试。
- 浏览器端覆盖开始、暂停、刷新、继续、取消、重扫、失败、完成、应用和撤销。
- 使用预置旧 DB 版本升级，确认只清理旧 auto-shot run，项目、镜头、截图和注释保持不变。
- 检查主线程 performance trace，确认无像素处理和长任务回归。

**可能的风险**

- `EditorWorkspace.tsx` 体积大，局部替换容易误触无关编辑器状态；改动必须限制在 import、auto-shot state/handler 和现有控制区域。
- DB 版本升级若 store 范围写错可能影响用户数据；升级测试必须验证所有非 auto-shot stores 的数量和关键记录。

### Phase 12：整体验收、旧路径删除与标定

**目标**

完成新链路验收后删除旧 Canvas/seek 算法和旧字段，建立持续回归与性能/准确率基线；不保留长期双轨或静默降级。

**具体任务**

1. 运行 native、ABI、baseline、SIMD、Worker、真实视频、Web、Desktop/Mobile 全矩阵测试。
2. 验证产品路径已无旧服务调用后删除旧 Canvas/seek detector。
3. 删除旧 `confidence`、`cursorFrame`、`durationFrames`、旧 `cuts` 等已无引用字段与测试 fixture。
4. 在固定标注小集上记录 Content/Adaptive/Threshold 初始 Precision、Recall、F1、边界误差和 fade 命中。
5. 分离记录 decode/copy/preprocess/detect 耗时与峰值内存，建立可重复基线。
6. 更新根 README/架构文档状态和许可证 NOTICE；只记录实际采用或引用的算法来源。
7. 把 Engine 必要检查纳入 CI/总体验收脚本，但保持 Web 日常脚本职责清楚。

**涉及文件/目录**

创建：

- `packages/scene-engine/NOTICE`
- `packages/scene-engine/test/evaluation/README.md`
- `packages/scene-engine/test/evaluation/` 下的本地数据输入约定、评分脚本和非数据集本体配置。
- 必要的 CI workflow 或现有 CI 配置中的 Scene Engine job。

修改：

- `package.json`
- `packages/scene-engine/package.json`
- `packages/scene-engine/README.md`
- `README.md`
- `docs/AISENSHOT_SCENE_ENGINE_PLAN.md`：只更新实施状态和已验证参数，不重写架构。
- 受旧类型删除影响的 Web 测试与 import。

删除：

- `apps/web/src/features/auto-shot/services/autoShotService.ts`
- 仅服务旧 Canvas/seek 路径且经 `rg` 证明无引用的测试、helper 和字段。
- 旧自动分镜 record fixture；不删除用户项目、镜头、注释或其他媒体能力。

**前置条件**

- Phase 11 产品链路通过，且已明确批准切换。
- `rg`、构建和浏览器测试证明旧服务无生产调用。

**完成标准**

- 仓库只有一个生产自动分镜检测路径。
- native、WASM baseline/SIMD 与浏览器结果在规定容差内一致。
- 准确率、边界误差、耗时和内存都有注明机器/浏览器/配置的基线。
- 无 Histogram、Hash、关键帧提取占位实现、配置或 UI。
- 所有许可证和参考来源记录完整。

**测试/验证方式**

```powershell
pnpm.cmd scene-engine:test:native
pnpm.cmd scene-engine:test:wasm
pnpm.cmd --filter @aisenlens/scene-engine test
pnpm.cmd build
pnpm.cmd run build:desktop
git diff --check
```

另需运行项目现有浏览器回归、Mobile sync/smoke、标注小集评分及长视频内存测试。删除旧文件后再次使用 `rg` 搜索 `runAutoShotDetection`、Canvas 像素读取和旧 record 字段，结果应为零生产引用。

**可能的风险**

- 过早删除旧路径会失去可工作的产品入口，因此删除只能发生在新链路验收之后；验收后又不得长期保留双轨。
- 参数标定若混用不同色彩规则、数据集或容差，指标不可比较；每次调整必须记录 engine version、config、数据集和前后指标。
- 公共测试视频的许可可能限制入库，数据集本体不得进入产品构建产物。

## 三、实施顺序

以下顺序是强制依赖顺序，不允许并行跨越尚未通过的核心验收门：

| 顺序 | Phase | 主要产物 | 进入下一阶段的门槛 |
| --- | --- | --- | --- |
| 1 | Phase 1 | 原生 C++ 最小生命周期、CMake/CTest | native lifecycle 全通过 |
| 2 | Phase 2 | 共享指标、Content Detector | Content golden + sanitizer 通过 |
| 3 | Phase 3 | Adaptive Detector | look-ahead/flush/运动抑制通过 |
| 4 | Phase 4 | Threshold/Fade、过滤、融合、checkpoint | 三类 detector 与恢复确定性通过 |
| 5 | Phase 5 | 稳定 C ABI | C++/C ABI 逐字段一致 |
| 6 | Phase 6 | baseline WASM、TS 低层 API | native/WASM 一致、TS build 通过 |
| 7 | Phase 7 | Worker/Client 合成帧链路 | 状态机、暂停/取消、资源释放通过 |
| 8 | Phase 8 | WebCodecs 真实视频链路 | 真实视频 Worker 检测与内存门槛通过 |
| 9 | Phase 9 | SIMD 产物与探测 | baseline/SIMD 一致性通过 |
| 10 | Phase 10 | Web 业务 service/adapter | 无 React 的业务单测和 Web build 通过 |
| 11 | Phase 11 | React 接入、持久化切换 | 产品全流程和 DB 升级回归通过 |
| 12 | Phase 12 | 单路径收敛、标定、持续回归 | 全矩阵验收通过 |

与已批准架构文档的阶段映射如下，便于追踪而不改变原方案：

| 架构方案阶段 | 本实施计划阶段 |
| --- | --- |
| 规格与基准 | Phase 1 的契约落地，Phase 2-4 的 golden，Phase 12 的正式评估 |
| C++ Content Core | Phase 1-2 |
| Adaptive + Threshold/Fade | Phase 3-4 |
| WASM ABI 与 Worker | Phase 5-9 |
| AisenLens 业务接入 | Phase 10-11 |
| 标定与优化 | Phase 12 |
| Later Histogram/Hash | 不在本计划实施范围 |

C++、CMake、Emscripten/WASM、TypeScript、React 的明确先后关系为：

```text
CMake/CTest 骨架
  -> C++ 核心及原生测试
  -> C ABI 原生测试
  -> Emscripten baseline 编译
  -> TypeScript 低层封装及 WASM parity
  -> Worker/Client
  -> WebCodecs
  -> SIMD
  -> Web feature service/adapter
  -> React hook/UI 接入
  -> 旧路径删除
```

## 四、各阶段可执行任务单

本节可按 Phase 原样交给编程 Agent。一个 Agent 一次只执行一个 Phase；当前 Phase 验收门未通过前，不得提前实现下一 Phase，也不得把未验证项目写成“已完成”。

### 4.1 Agent 通用执行约定

每个 Phase 的执行 Agent 必须遵守以下顺序：

1. 读取根 `AGENTS.md`、批准架构文档和本实施计划，确认当前领取的 Phase。
2. 检查工作树，识别并保护非本任务改动；不得回退其他 Agent 或用户的文件。
3. 核验上一 Phase 的交付物和验收命令。上一阶段未通过时，只报告阻断，不跨阶段补做未经授权的内容。
4. 开始 Phase 时立即把对应“阶段状态”从 `[ ] 未开始` 更新为 `[-] 进行中`，再开始执行任务。
5. 按任务编号顺序执行。开始一个 Task 前先把该 Task 标题前的 `[ ]` 更新为 `[-]`；同一 Phase 同一时间最多一个 Task 可以处于 `[-]`。
6. 涉及算法、状态机或时间映射时，先增加失败测试，再实现到测试通过。
7. 只有完成 Task 的全部操作且“完成检查”通过后，才能立即把该 Task 的 `[-]` 更新为 `[x]`；不得等到 Phase 结束时一次性补写所有状态。
8. 如果任务因工具、测试、权限或结构冲突无法完成，把状态更新为 `[!]`，在任务下追加简短的 `阻塞原因` 和已验证事实；不得把它标成 `[x]`，也不得继续执行后续 Task。
9. 只创建、修改或删除本 Phase 文件表及任务单明确允许的文件。发现结构冲突时先报告事实与影响，不擅自改变架构。
10. 所有 Task 为 `[x]` 后，运行本 Phase 的专项测试、此前全部回归测试、受影响应用构建和 `git diff --check`。只有验收门全部通过，才能把“阶段状态”从 `[-]` 更新为 `[x] 已完成`。
11. 如果所有 Task 已完成但 Phase 验收门失败，阶段状态必须保持 `[-]` 或更新为 `[!]`，并记录失败项；不得开始下一 Phase。
12. 最终交接报告必须列出：完成任务编号、实际文件变更、实际执行命令及结果、未执行验证及原因、已知风险、下一 Phase 是否满足前置条件。

状态标记只允许使用以下四种值：

| 标记 | 含义 | 更新条件 |
| --- | --- | --- |
| `[ ]` | 未开始 | 尚未执行该 Phase/Task |
| `[-]` | 进行中 | 当前正在执行，且尚未通过全部完成检查 |
| `[x]` | 已完成 | Task 完成检查已通过，或 Phase 验收门已通过 |
| `[!]` | 已阻塞 | 无法继续，已在对应位置记录阻塞原因和验证事实 |

状态更新本身属于执行任务的一部分，必须与实际进度同步提交到本文件。禁止预先批量勾选、未运行验证就勾选、由后续 Agent 猜测补填，或在发现回归后继续保留错误的 `[x]`。如果已完成任务后来被当前改动破坏，应将其恢复为 `[-]` 或 `[!]`，直到回归重新通过。

通用禁止项：不得实现关键帧提取、Histogram、Hash；不得引入 Python/OpenCV 运行时；不得把 C++/WASM/Worker 细节暴露到 React；不得为旧自动分镜保留长期兼容、双写或静默降级路径。

建议每次向编程 Agent 下发以下单阶段指令，并将 `N` 替换为实际阶段号：

```text
请执行 docs/AISENSHOT_SCENE_ENGINE_IMPLEMENTATION_PLAN.md 中的 Phase N。
严格按“四、各阶段可执行任务单”的 Task N.1 -> N.x 顺序执行，
同时遵守“二、分阶段实施计划”中 Phase N 的文件范围、前置条件和验收方式。
只执行 Phase N，不提前实现 Phase N+1；先核验 Phase N-1 验收门。
完成后运行本阶段全部验证，并按通用执行约定输出交接报告。
```

### 4.2 Phase 1 任务单：原生 C++ 工程骨架与最小生命周期

**阶段状态**：`[ ] 未开始`

#### [ ] Task 1.1：工作区与工具链预检

**输入**：仓库根目录、批准架构文档、本实施计划。
**操作**：

1. 读取根 `AGENTS.md`、`package.json`、`pnpm-workspace.yaml`、`.mise.toml`、`.gitignore`。
2. 执行只读版本检查：`node --version`、`pnpm.cmd --version`、`cmake --version`、`ctest --version` 和实际 C++ 编译器版本。
3. 确认 `packages/*` 已被 workspace 包含。
4. 报告缺失工具和 pnpm 10.34.3/11.21.0 冲突；未经许可不得安装系统工具。
5. 确认工作树已有用户改动并记录，禁止回退 `AGENTS.md`、参考索引和架构文档。

**交付物**：预检记录写入 `packages/scene-engine/README.md` 的 Prerequisites；若因工具缺失不能验证，明确标记 Phase 1 尚未完成。
**禁止**：修改业务文件、下载 PySceneDetect/OpenCV、开始 Emscripten 安装。

#### [ ] Task 1.2：创建 workspace 包元数据

**操作**：

1. 创建 `packages/scene-engine/package.json`，名称固定为 `@aisenlens/scene-engine`，标记 `private`，不声明 React 依赖。
2. 只加入 native configure/build/test 所需脚本；产物目录统一为 `packages/scene-engine/build/native`。
3. 在根 `package.json` 添加对应代理脚本，不改变现有 `dev/build/preview` 含义。
4. 检查根 `.gitignore` 已忽略 `build/`；已有规则足够时不修改。

**完成检查**：`pnpm.cmd --filter @aisenlens/scene-engine exec node -p "process.cwd()"` 能定位包目录。
**禁止**：增加 npm 运行时依赖、创建第二个 scene engine 包、改 Web package。

#### [ ] Task 1.3：建立 CMake/CTest 最小工程

**操作**：

1. 创建单一顶层 `packages/scene-engine/CMakeLists.txt`。
2. 设置经当前编译器验证的最低 CMake 版本和 C++17，关闭编译器扩展。
3. 创建 `aisenshot_scene_engine_core` 静态库 target；public include 仅暴露 `cpp/include`。
4. 使用 `include(CTest)`；`BUILD_TESTING=ON` 时创建单个初始测试 executable 并注册到 CTest。
5. 对 MSVC/GCC/Clang 设置合理 warning；本阶段 warning 不得通过全局禁用解决。
6. Debug sanitizer 使用显式 option，只在编译器支持时开启。

**完成检查**：空算法核心能在 Debug 与 Release 配置完成 configure/build/test。
**禁止**：加入 Emscripten flags、SIMD、OpenCV、FetchContent 或第三方测试框架。

#### [ ] Task 1.4：落地基础值类型

**操作**：

1. `frame_view.h` 定义 `PixelFormat`、`PlaneView`、`FrameView`，包含实际 stride、coded size、presentation index、`timestamp_us`、`duration_us`。
2. `scene_event.h` 定义现阶段需要的稳定事件值类型；允许零事件，不预造 Histogram/Hash/关键帧事件。
3. `config.h` 只定义引擎生命周期和已批准 detector 选择所需的基础配置；具体 detector 参数留给对应 Phase 落地。
4. `detector.h` 定义 `ISceneDetector` 的 `id/lookahead_frames/reset/process/flush` 生命周期。
5. 所有公共 header 不包含浏览器、React、项目数据库或 Emscripten 头文件。

**完成检查**：每个 public header 均能被最小 C++ translation unit 单独 include 并编译。
**禁止**：暴露 STL 对象给未来 C ABI、加入项目 frame/ShotRecord 类型、实现未来能力占位类。

#### [ ] Task 1.5：实现最小 SceneEngine 生命周期

**操作**：

1. 实现 `SceneEngine` 构造/销毁、`process`、`flush`、`reset`。
2. `process` 校验受支持 PixelFormat、plane 数量、非空数据、width/height、stride、duration、presentation index 与 timestamp 单调性。
3. `detector_pipeline.cpp` 提供空 pipeline；合法帧处理成功但不产生事件。
4. flush 结束任务并返回零事件；flush 后 process 必须有明确错误，reset 后恢复初始状态。
5. 禁止持有输入原始帧指针到 `process` 返回之后。

**完成检查**：同一 engine reset 前后处理同一输入，状态和零事件输出一致。
**禁止**：在此任务中计算亮度、HSV、直方图或任何切点。

#### [ ] Task 1.6：先写测试用例并补齐实现

**操作**：

1. 创建不会被 `NDEBUG` 禁用的轻量 `EXPECT_*`/失败计数测试工具和统一 `test_main.cpp`。
2. 创建 synthetic frame factory，能生成带 padding stride 的 I420/NV12/RGBA 小帧，且内存所有权由 fixture 保持。
3. 至少覆盖：create/destroy、空序列 flush、单帧、多帧、reset、flush 后 process、倒退 timestamp、倒退 presentation index、非法 stride、空 plane、零尺寸、负 duration（若类型允许）及重复 flush。
4. 对每个失败分支检查稳定错误类别，不只检查“抛出了错误”。
5. 在 Release 和 sanitizer Debug 下运行同一组测试。

**完成检查**：CTest 输出具体失败用例名；所有用例通过且无 sanitizer 报告。
**禁止**：使用真实视频、Canvas、WebCodecs 或需要网络下载的 fixture。

#### [ ] Task 1.7：文档与边界审计

**操作**：

1. 在包 README 记录模块边界、支持的构建命令、输入生命周期、时间戳顺序要求和“当前零 detector”状态。
2. 记录实际验证过的 OS、编译器、CMake 和 pnpm 版本，不写未经验证的环境承诺。
3. 用 `rg` 审计禁止依赖和禁止业务类型。
4. 运行 native 全套测试、Web build 与 `git diff --check`。
5. 输出 Phase 1 交接报告：创建/修改文件、命令结果、已知限制、Phase 2 输入条件。

**最终交付物**：

- 可独立构建的 `@aisenlens/scene-engine` 原生骨架。
- 可重复运行的 CTest 生命周期测试。
- 确定性合成帧工厂。
- 明确的工具链与边界文档。

**Phase 1 验收门**：上述交付物全部存在，native Release、sanitizer Debug、Web build 和 diff check 全部通过。任一项未验证时，状态只能是“Phase 1 未完成”，不得开始 Phase 2。

### 4.3 Phase 2 任务单：共享帧指标与 Content Detector

**阶段状态**：`[ ] 未开始`

#### [ ] Task 2.1：核验 Phase 1 并冻结 Content 测试契约

**输入**：Phase 1 原生核心、合成帧工厂、批准架构中的 Content 公式与事件语义。

**操作**：

1. 运行 Phase 1 的 Release CTest 和可用 sanitizer 测试，确认零 detector 生命周期仍通过。
2. 把 Content 输入、输出、权重、阈值比较规则、首帧行为和微秒事件时间写成测试用例清单。
3. 明确数值规范：分析尺寸、保持宽高比方式、整数/浮点中间值、HSV 范围、舍入方式、YUV range 假设和阈值相等时的判定。
4. 先创建 `frame_metrics_test.cpp` 与 `content_detector_test.cpp`，让新增核心断言在实现前失败。
5. 用 synthetic frame factory 准备相同帧、纯亮度变化、纯色硬切、色相变化、stride padding、奇数尺寸和三种 PixelFormat 用例。

**完成检查**：测试名称能逐项表达契约，失败原因来自尚未实现的 metrics/Content，而不是 fixture 或构建错误。

**禁止**：接入 Adaptive/Threshold、复制 PySceneDetect Python 结构、为了匹配默认阈值而隐式改变颜色规则。

#### [ ] Task 2.2：实现统一像素读取与下采样

**操作**：

1. 创建 `downscale.*` 和 `yuv_to_hsv.*`，分别负责坐标映射/采样及确定性的颜色分量转换。
2. 对 I420、NV12、RGBA 使用 `FrameView` 中实际 plane、stride 和有效尺寸，不假定紧密排列。
3. 下采样保持宽高比，分析缓冲只在尺寸变化时重新分配；不得保存原始输入帧指针。
4. 为全黑、全白、主色、奇数宽高、padding stride 和格式等价增加精确或容差断言。
5. 在 Debug sanitizer 下运行 frame metrics 前置测试，修复所有越界与未定义行为。

**完成检查**：三种格式表达同一合成图像时，亮度/HSV 分量在文档规定容差内一致；内存不随处理帧数增长。

**禁止**：引入 OpenCV/libyuv、Canvas 规则、平台特定 SIMD、第二套格式专属 detector。

#### [ ] Task 2.3：实现 SharedFrameMetrics

**操作**：

1. 创建 `frame_metrics.*`，一次遍历分析表面产生 `mean_luma`、Content 所需分量差和加权前基础指标。
2. 明确首帧没有前帧差异的结果，不产生硬切事件。
3. 只保留下一帧计算所需的紧凑分析状态，禁止缓存历史原始帧。
4. 增加计数测试桩或可观察测试，证明每个输入帧只构建一次共享指标。
5. 固定指标字段顺序和浮点容差，连续运行两次逐字段比较。

**完成检查**：`frame_metrics_test.cpp` 全部通过，重复运行结果确定，Phase 1 生命周期测试无回归。

**禁止**：在 metrics 层判断切点、发出 SceneEvent 或持有 detector 配置。

#### [ ] Task 2.4：实现 Content Detector 并接入 pipeline

**操作**：

1. 创建 `content_detector.*`，只消费 `SharedFrameMetrics`，实现分量权重、总 `score`、阈值判断和 reset/flush。
2. 事件携带真实 `timestamp_us`、presentation index、detector source、`score`、`threshold` 和分量 evidence。
3. 在 `config.h` 增加本 Phase 所需 Content 配置及严格校验；不加入其他 detector 的虚假默认实现。
4. 在 `detector_pipeline.cpp` 注册 Content，使 SceneEngine 可配置启用/禁用它；禁用时保持 Phase 1 零事件行为。
5. 补齐阈值下方、相等、上方，权重为零、无效权重和 reset 后重复运行测试。

**完成检查**：合成硬切按预期只输出一个确定事件；相同帧和阈值以下不误报；事件不使用 `confidence` 命名原始 score。

**禁止**：同时默认启用 Content 与 Adaptive、在 detector 内重新遍历像素、把项目帧号写入事件。

#### [ ] Task 2.5：建立 Content golden 与阶段回归

**操作**：

1. 将程序生成的合成序列及预期指标/事件固化为测试，不提交来源不明的视频。
2. 在 README 记录 AisenShot 的颜色/下采样数值规则，以及“参考 PySceneDetect 思路但阈值不保证数值等价”。
3. 运行完整 native Release、Debug sanitizer、所有 Phase 1-2 CTest 和 Web build。
4. 用 `rg` 确认 Content 只读取共享 metrics，包内没有 React/WebCodecs/OpenCV/Python 依赖。
5. 输出 Phase 2 交接报告，列出 golden 输入、预期边界和实际数值容差。

**最终交付物**：共享预处理、Content Detector、Content 配置、合成 golden 和原生回归测试。

**Phase 2 验收门**：Content golden、三种格式容差、确定性、sanitizer 和既有回归全部通过；未通过时不得开始 Adaptive。

### 4.4 Phase 3 任务单：Adaptive Detector

**阶段状态**：`[ ] 未开始`

#### [ ] Task 3.1：先建立 Adaptive 行为测试

**输入**：Phase 2 稳定的 Content score 序列与共享 metrics。

**操作**：

1. 运行 Phase 2 全部测试并固定一组合成 Content score 序列。
2. 先创建 `adaptive_detector_test.cpp`，覆盖孤立高峰、持续高运动、邻域均值为零、最小 Content score、前后窗口不足、look-ahead 和末尾 flush。
3. 明确窗口是否包含目标帧、目标帧索引与事件发布时间的关系，测试一帧边界偏移。
4. 增加分批 process、一次性 process、flush 和 reset 的等价性测试。

**完成检查**：新增测试在 Adaptive 未实现时按预期失败，且所有期望时间戳均明确指向目标帧而非当前处理帧。

**禁止**：用真实视频肉眼判断替代窗口测试、在测试中容忍未解释的一帧偏移。

#### [ ] Task 3.2：实现 Adaptive 滚动窗口

**操作**：

1. 创建 `adaptive_detector.*`，只存放窗口所需 Content score、时间点和 presentation index。
2. 实现 adaptive ratio、邻域均值保护、最小 Content score 与窗口边界处理。
3. `lookahead_frames()` 返回真实未来窗口需求；事件使用目标帧自身 TimePoint。
4. `flush()` 对尾部不足窗口执行已测试的确定性策略，且不重复已提交事件。
5. `reset()` 清空全部窗口和延迟事件状态。

**完成检查**：孤立硬切检出、持续运动误报抑制、尾部 flush 和 reset 用例全部通过。

**禁止**：读取 FrameView 像素、重算 HSV/Content score、按平均帧率计算窗口时间。

#### [ ] Task 3.3：接入配置与 detector pipeline

**操作**：

1. 在 `config.h` 增加 Adaptive 所需参数及窗口/阈值合法性校验。
2. 修改 pipeline，使 hard-cut 模式明确选择 Content 或 Adaptive；拒绝模糊的“双默认 detector”配置。
3. 确保选择 Adaptive 时仍只生成一次共享 Content metrics。
4. 为配置序列化顺序和默认 preset 增加测试，为后续 config hash 保持确定字段顺序。
5. 验证切换 detector、reset engine、重新运行不会残留前一个 detector 状态。

**完成检查**：Content-only 与 Adaptive-only 都可独立运行；非法组合返回稳定配置错误。

**禁止**：删除 Content、让两个 hard-cut 结果未经 resolver 直接混合、提前实现 Fade。

#### [ ] Task 3.4：确定性与阶段交接

**操作**：

1. 对每个合成序列重复运行 Content-only 和 Adaptive-only，逐字段比较事件。
2. 用计数测试证明 Adaptive 没有增加像素遍历次数。
3. 运行完整 native Release、sanitizer、Phase 1-3 CTest、Web build 和 diff check。
4. README 记录 look-ahead、flush 和目标事件时间语义。
5. 输出 Phase 3 交接报告，单独列出已验证的一帧偏移用例。

**最终交付物**：Adaptive Detector、配置与窗口测试、Content/Adaptive 模式选择。

**Phase 3 验收门**：look-ahead、持续运动抑制、尾部 flush、单次 metrics 和全量回归全部通过。

### 4.5 Phase 4 任务单：Threshold/Fade、融合、过滤与 checkpoint

**阶段状态**：`[ ] 未开始`

#### [ ] Task 4.1：先建立 Threshold/Fade 状态机测试

**输入**：Phase 2 `mean_luma` 指标、批准的 fade 区间和 bias 语义。

**操作**：

1. 创建 `threshold_detector_test.cpp`，先覆盖 floor/ceiling、向下/向上穿越、完整淡出淡入、仅淡出、仅淡入和未闭合结尾。
2. 对 fade bias 的起点、中点、终点分别写精确时间戳断言。
3. 覆盖 VFR 时间戳、重复亮度、短黑帧/白帧和 reset。
4. 明确 fade interval、建议切点和 source evidence 的字段预期。

**完成检查**：状态转换与 flush 的每个分支都由失败测试表达，测试不依赖 Content/Adaptive 事件。

**禁止**：把 fade 简化成普通 Content hard cut、使用项目帧率推算持续时间。

#### [ ] Task 4.2：实现 Threshold/Fade Detector

**操作**：

1. 创建 `threshold_detector.*`，只消费 `mean_luma` 和 TimePoint。
2. 实现 threshold 穿越、淡出/淡入配对、fade range、bias 切点和尾部 flush。
3. 在配置中增加 Threshold/Fade 参数及 floor/ceiling/bias 合法性检查。
4. 允许它与当前选定的一个 hard-cut detector 并行，不改变 hard-cut 选择规则。
5. 保留原始 transition interval 与 evidence，不能只输出一个失去上下文的切点。

**完成检查**：Task 4.1 全部通过，Threshold-only 和 hard-cut + Threshold 两种 pipeline 均可运行。

**禁止**：在 Threshold 内读取像素、丢弃 fade interval、提前做业务镜头创建。

#### [ ] Task 4.3：先测试并实现 MinSceneFilter

**操作**：

1. 创建 `min_scene_filter_test.cpp`，覆盖最短镜头边界、恰好等于阈值、连续闪白/闪黑、merge 与 suppress。
2. 创建 `min_scene_filter.*`，以微秒比较相邻候选，不读取平均帧率。
3. 明确被 merge/suppress 事件的 evidence 保留规则并写入测试。
4. 覆盖开头、结尾、重复时间戳和 flush 后最后一段。

**完成检查**：过滤前后事件都有确定预期，最短镜头判断不使用 frame count。

**禁止**：跨 detector 做最终融合、静默删除所有被抑制事件证据。

#### [ ] Task 4.4：先测试并实现 EventResolver

**操作**：

1. 创建 `event_resolver_test.cpp`，覆盖同时间多 source、重复 hard cut、fade 区间内 hard cut、确定排序和输入顺序扰动。
2. 创建 `event_resolver.*`，实现排序、去重、同转场来源聚合及既定重叠决策。
3. 确保输出顺序与 detector 注册顺序无关，source/evidence 聚合顺序固定。
4. 对同一输入事件的所有排列运行测试，输出必须一致。

**完成检查**：resolver golden 逐字段一致，不通过简单“保留第一个”丢失来源。

**禁止**：转换为 AisenLens `ShotRecord`、在 resolver 中做 UI 置信度文案映射。

#### [ ] Task 4.5：实现版本化 checkpoint

**操作**：

1. 先创建 `checkpoint_test.cpp`，对多个安全帧边界比较连续运行与暂停/恢复结果。
2. 创建 `checkpoint.*`，使用显式字段序列化 schema，不序列化 STL 内存布局或裸指针。
3. 纳入 ABI/schema/engine version、config hash 输入、最后提交 TimePoint、前帧 metrics、Adaptive 窗口、Fade 状态、filter/resolver 状态和已提交摘要。
4. 对截断、损坏、错误 schema、错误 engine major 和错误 config hash 返回稳定错误。
5. 导入失败不得部分修改现有 engine；导入成功后不得重复提交 checkpoint 前的边界。

**完成检查**：在每个测试暂停点，恢复后的最终事件与连续运行逐字段完全一致。

**禁止**：写 IndexedDB、包含媒体 Blob、允许旧/未知 schema 猜测恢复。

#### [ ] Task 4.6：完整核心验收

**操作**：

1. 把 Threshold、filter、resolver、checkpoint 接入 SceneEngine 的 process/flush/reset 生命周期。
2. 运行 Content-only、Adaptive-only、各自 + Threshold/Fade 的配置矩阵。
3. 运行完整 native Release、sanitizer、全部 CTest 和确定性重放。
4. README 记录 detector 组合、事件融合、checkpoint 兼容规则。
5. 输出 Phase 4 交接报告，附连续/恢复 parity 结果。

**最终交付物**：三类 detector、最短镜头过滤、事件融合、版本化 checkpoint 及完整原生测试。

**Phase 4 验收门**：所有 detector 可按批准组合运行，VFR/flush/融合/checkpoint 确定性和 sanitizer 全部通过。

### 4.6 Phase 5 任务单：稳定 C ABI 与原生 ABI 一致性

**阶段状态**：`[ ] 未开始`

#### [ ] Task 5.1：冻结并编译检查 C ABI header

**输入**：Phase 4 已稳定的 C++ API、事件和 checkpoint 语义。

**操作**：

1. 创建 `scene_engine_abi.h`，只定义固定宽度整数、浮点、offset、length、versioned struct 和 opaque handle。
2. 声明批准的 ABI 函数及稳定 `asen_status`/错误码，不暴露 C++ namespace、STL、异常或模板。
3. 为所有 ABI struct 增加 size/alignment 静态断言和显式 ABI version。
4. 创建纯 C smoke translation unit，证明 header 可由 C 编译器独立包含。
5. 文档化输入/输出缓冲区所有权、句柄有效期和函数调用顺序。

**完成检查**：C 与 C++ 编译 target 均通过；ABI header 不包含任何 C++ 专属类型。

**禁止**：使用 Embind、把 JSON 字符串作为逐帧边界、直接导出 C++ class。

#### [ ] Task 5.2：实现句柄、配置与帧缓冲 ABI

**操作**：

1. 在 `scene_engine_abi.cpp` 实现句柄表或明确的 opaque handle 管理。
2. 实现 `asen_create/destroy`、版本检查和配置转换，所有异常在边界内捕获。
3. 实现 `asen_reserve_frame`，返回未来 WASM 可直接写入的稳定 layout/offset 语义。
4. 实现 `asen_process_frame`，从已保留缓冲构造 FrameView，不额外复制整帧。
5. 覆盖 null、无效/已销毁句柄、错误布局、错误调用顺序和重复销毁。

**完成检查**：失败路径返回稳定 status，不崩溃、不泄漏、不让异常穿越 ABI。

**禁止**：让调用方持有 C++ 指针、每帧重新创建 engine、在 ABI 内读取视频文件。

#### [ ] Task 5.3：实现事件批量读取与 checkpoint ABI

**操作**：

1. 实现 `asen_read_events` 的容量查询/批量读取/剩余事件规则。
2. 实现 `asen_flush`，保证所有延迟事件可被后续批量读取。
3. 实现 checkpoint 导出长度查询、调用方缓冲写入和 import 校验。
4. 对小容量分多批读取、零容量、容量不足、重复读取和错误 checkpoint 建立测试。
5. 保证事件 evidence 的 ABI 表达不依赖变长 C++ 对象；需要变长数据时使用明确 offset/length 批次布局。

**完成检查**：多批读取不丢失、不重复且排序稳定；checkpoint C ABI 恢复与 C++ API 一致。

**禁止**：为每个事件字段创建单独导出函数、返回内部 vector 指针。

#### [ ] Task 5.4：建立 C++/C ABI parity

**操作**：

1. 创建 `scene_engine_abi_test.cpp`，同一合成输入分别通过 C++ API 与 C ABI 执行。
2. 对 Content、Adaptive、Threshold/Fade 组合逐字段比较事件。
3. 比较连续运行、分批读取和 checkpoint 恢复结果。
4. 在 MSVC 及可用的另一编译器配置中验证 struct 尺寸；无法验证的平台在交接报告中明确列出。
5. 运行 sanitizer、完整 native CTest、Web build 和 diff check。

**最终交付物**：可由 C/C++ 调用的版本化 ABI、所有权文档和 parity 测试。

**Phase 5 验收门**：纯 C header smoke、所有 ABI 错误路径、C++/C ABI 事件与 checkpoint parity 全部通过。

### 4.7 Phase 6 任务单：Emscripten baseline WASM 与 TypeScript 低层封装

**阶段状态**：`[ ] 未开始`

#### [ ] Task 6.1：预检并固定 Emscripten 工具链

**输入**：Phase 5 C ABI、当前 CMake 与 workspace 工具版本。

**操作**：

1. 运行 Phase 5 全量测试，确认 native ABI 基准稳定。
2. 只读检查 `emcc --version`、`emcmake --version` 和现有 emsdk；缺失时报告并按用户许可安装。
3. 选择一个在当前 Node/Vite/Windows 环境实际完成 smoke build 的精确 Emscripten 版本。
4. 在 README 和可复现工具配置中记录版本与激活命令；不覆盖 Node/pnpm 的既有决定。
5. 记录 baseline 产物格式、模块格式、导出函数和预期资源目录。

**完成检查**：一个最小 C ABI smoke module 可由固定工具链编译并由当前 Node 实例化。

**禁止**：使用浮动 `latest`、安装后不记录版本、开始 SIMD/pthreads、引入 Embind。

#### [ ] Task 6.2：建立 baseline WASM CMake target

**操作**：

1. 创建 `EmscriptenOptions.cmake`，把 Emscripten 专属选项与 native target 分离。
2. 从同一 C++ core 和 `scene_engine_abi.cpp` 构建 baseline 产物，只导出批准 C ABI 和必要 runtime 支持。
3. 设置 module 环境、内存初始/最大值、异常策略和文件名；本阶段禁用 SIMD 与 pthreads。
4. 在 package/root scripts 增加可重复的 configure/build 命令，清晰区分 native 与 wasm build 目录。
5. 确保生成物进入已忽略的 `dist/build`，不把本机绝对路径写入产物或源码。

**完成检查**：干净目录下可用一条文档化命令生成 baseline WASM，native build 不受 Emscripten flags 污染。

**禁止**：提交临时 build 目录、把 WASM 二进制手工复制进 Web public、改变根 `build` 的现有含义。

#### [ ] Task 6.3：定义 TypeScript 公共契约

**操作**：

1. 创建 `api/types.ts`、`config.ts`、`errors.ts` 和 `result/normalizeResult.ts`。
2. 把 EngineConfig、SceneEvent/Boundary、progress/result、checkpoint envelope 和稳定错误码表达为 strict TypeScript 类型。
3. 保持时间字段为整数微秒；原始 detector 值命名为 `score/threshold/evidence`。
4. 配置校验与 C++ 规则逐项对应，并为默认值、非法 detector 组合和未知字段策略增加 Node 测试。
5. `index.ts` 只导出业务无关公共 API，不导出 Emscripten Module、HEAP、指针、Mediabunny 或 Worker 内部协议。

**完成检查**：TypeScript strict build 通过，公共类型中没有 React、AisenLens 项目帧或 `ShotRecord`。

**禁止**：在 TS 侧重新实现 detector、把 `confidence` 用作 raw score、公开 C ABI struct 作为调用 API。

#### [ ] Task 6.4：实现 wasmRuntime

**操作**：

1. 实现 module 实例化、ABI version 校验、create/destroy、frame reserve、process、event drain、flush 和 checkpoint 映射。
2. 缓存 `WebAssembly.Memory` 视图，只在 `memory.buffer` 改变时重建。
3. reserve 后返回可写 plane views，避免 TS 中间帧数组；所有句柄在 success/error/dispose 路径释放。
4. 把 `asen_status` 映射为稳定 TS error，不暴露底层异常文本作为唯一判定依据。
5. 为错误 ABI、实例化失败、无效配置、内存视图刷新和重复 dispose 增加测试。

**完成检查**：合成帧可经 TS runtime 写入预分配 WASM memory 并得到规范化事件。

**禁止**：在 runtime 中解码媒体、创建 Worker、逐事件字段调用 C 函数。

#### [ ] Task 6.5：建立 native/WASM ABI parity

**操作**：

1. 创建 `abi-parity.test.ts` 和 TS synthetic frame helper，使用与 C++ golden 等价的数据。
2. 覆盖 Content、Adaptive、Threshold/Fade、flush、多批事件读取和 checkpoint 恢复。
3. 对时间戳、事件类型、顺序和边界要求完全一致；浮点 evidence 使用已批准容差。
4. 重复运行并检查 config hash/engine version/结果确定性。
5. 运行 native CTest、WASM Node tests、package build、Web build 和 diff check。

**最终交付物**：固定 Emscripten baseline 构建、低层 TS 契约/runtime 和 native/WASM parity。

**Phase 6 验收门**：干净构建、ABI 版本校验、native/WASM 全矩阵 parity、strict TS 和既有回归全部通过。

### 4.8 Phase 7 任务单：Worker 协议、客户端与合成帧纵向链路

**阶段状态**：`[ ] 未开始`

#### [ ] Task 7.1：先定义并测试 Worker 协议

**输入**：Phase 6 public types、wasmRuntime 和批准 Worker 状态图。

**操作**：

1. 创建 `protocol.ts`，定义带 discriminant 和 jobId 的双向消息 union。
2. 明确 INIT、START、PAUSE、CANCEL、DISPOSE 及 READY/STARTED/PROGRESS/CHECKPOINT/COMPLETED/CANCELLED/ERROR payload。
3. 创建 `worker-protocol.test.ts`，覆盖每个合法状态转换、非法顺序、旧 job 消息和终态后消息。
4. 规定 progress 节流、增量边界、错误码和 checkpoint 的传输边界。
5. 使用穷尽 `never` 检查确保新增消息无法被静默忽略。

**完成检查**：协议测试可在 Worker 实现前运行并准确失败；payload 不包含项目实体或像素帧。

**禁止**：在协议中传 React state、IndexedDB record、Mediabunny 类型或逐帧图像。

#### [ ] Task 7.2：实现 SceneEngineClient

**操作**：

1. 创建 `SceneEngineClient.ts`，负责 Worker 创建、初始化等待、jobId 分配和单任务约束。
2. 封装 progress/result/error 回调、AbortSignal、pause、cancel、resume 所需 checkpoint 和 dispose。
3. 忽略或记录非当前 jobId 消息，不能让旧任务污染新任务。
4. 所有 pending promise 在 ERROR/CANCELLED/dispose/Worker 崩溃时确定性结束。
5. 使用 fake Worker 覆盖正常、错误、并发 start、取消竞态、重复 dispose 和 listener 清理。

**完成检查**：客户端测试无悬挂 promise/监听器，公共导出只暴露业务无关任务 API。

**禁止**：让 React 组件直接 new Worker、在 client 内做媒体解码或项目持久化。

#### [ ] Task 7.3：实现 Worker 状态机与资源生命周期

**操作**：

1. 创建 `scene-engine.worker.ts`，按 `idle -> initializing -> decoding -> flushing -> terminal` 实现状态机。
2. 当前仅接测试帧源，不接真实 Blob/Mediabunny。
3. pause 只在完成当前帧并 drain 安全事件后导出 checkpoint；cancel 不导出 checkpoint。
4. 在 completed/cancelled/error/dispose 都释放 runtime 句柄、帧源和消息状态。
5. 对错误 runtime、process 异常、flush 异常和 Worker dispose 编写测试。

**完成检查**：合成任务的完成、暂停/恢复、取消和失败均到达唯一终态。

**禁止**：抢占 C++ 正在处理的帧、同时运行多个重型任务、吞掉 Worker 顶层错误。

#### [ ] Task 7.4：实现单缓冲池和测试帧源

**操作**：

1. 创建 `frameBufferPool.ts`，首版只管理一个 reserve 后复用的 WASM frame buffer。
2. 在测试目录创建 synthetic frame source，逐帧把 plane 数据写入 runtime 返回的 views。
3. 验证相同尺寸不重新 reserve，尺寸/布局变化按明确策略处理。
4. 增加内存 view 失效、任务切换、异常中止和重复归还测试。
5. 测试 helper 不进入 `src/index.ts` 公共导出。

**完成检查**：长合成序列的 buffer 数量恒定，Worker 主线程消息不含像素数据。

**禁止**：提前实现环形/双缓冲、把合成帧生产接口当成产品 API。

#### [ ] Task 7.5：实际 module Worker smoke 与交接

**操作**：

1. 在真实浏览器环境加载 module Worker 和 baseline WASM，跑一个短合成序列。
2. 验证 Vite dev/build 两种资源加载路径、INIT ready 和 dispose。
3. 检查消息记录，确认 progress 节流且没有像素传回主线程。
4. 运行 native、WASM parity、Worker tests、package/Web build 和 diff check。
5. README 记录客户端生命周期、并发限制和 pause/cancel 区别。

**最终交付物**：稳定 Worker 协议、SceneEngineClient、Worker 状态机、单缓冲和合成纵向测试。

**Phase 7 验收门**：协议穷尽、全部终态资源释放、暂停/恢复 parity、浏览器 module Worker smoke 全部通过。

### 4.9 Phase 8 任务单：Mediabunny/WebCodecs 真实视频链路

**阶段状态**：`[ ] 未开始`

#### [ ] Task 8.1：建立媒体 fixture 与能力测试矩阵

**输入**：Phase 7 Worker 链路、现有 Mediabunny 版本、批准的格式优先级。

**操作**：

1. 核实现有项目对 Mediabunny 的使用方式和当前浏览器测试启动方式，只读取模块相关文件。
2. 创建 fixture manifest，记录容器、codec、尺寸、帧率/VFR、旋转、音轨、许可和预期边界。
3. 准备最小无版权 H.264/MP4、VP9/WebM、VFR、旋转、无音轨、损坏文件和无视频轨 fixture；不能入库时记录本地生成命令与 checksum。
4. 先创建 browser integration tests，覆盖 capability、错误码和每个 fixture 的完成条件。
5. 明确当前目标浏览器/桌面/移动壳的 WebCodecs 能力矩阵。

**完成检查**：每个测试素材可追溯、尺寸受控、预期边界明确；缺失平台能力以稳定 capability 结果表达。

**禁止**：提交来源不明视频、把公开评测数据集纳入产品包、增加 Canvas seek fallback。

#### [ ] Task 8.2：实现 mediaDecoder 顺序解码

**操作**：

1. 创建 `mediaDecoder.ts`，用 Mediabunny 打开 Blob/File、选择视频轨并使用 `VideoSampleSink.samples()` 顺序迭代。
2. 读取 timestamp/duration/coded/visible dimensions/rotation 和实际 sample layout。
3. 实现明确的初始化、迭代、关闭和错误映射；每个成功取得的 sample 必须在所有路径 close。
4. 支持 pause/resume 需要的解码重建信息，但不在本任务内写 IndexedDB。
5. 覆盖空视频、无轨、不支持 codec、解码错误、取消和 iterator 异常。

**完成检查**：fixture 可顺序枚举且 presentation timestamp 单调提交；opened sample 与 closed sample 计数一致。

**禁止**：逐时间点 `getSample()` 随机 seek、把 VideoSample 发给主线程、在 decoder 中判定场景。

#### [ ] Task 8.3：实现直接写入 WASM frame buffer

**操作**：

1. 已知首帧布局后调用 runtime reserve，并创建 WebAssembly.Memory-backed plane views。
2. 优先请求 I420，其次 NV12/RGBA；以 `copyTo()` 返回/要求的真实 layout 和 stride 为准。
3. 直接把 sample 像素复制进 WASM views，不创建 Canvas、ImageData 或完整 JS 中间像素数组。
4. 将 timestamp/duration/presentation index 与 plane layout 提交给 C ABI。
5. 任务期间检测 memory growth/view 失效；正常配置下不得逐帧增长内存或重新 reserve。

**完成检查**：每帧最多一次必要像素复制，主线程没有帧对象，三种协商格式的测试均进入相同 C++ FrameView。

**禁止**：宣称硬件 surface 到 WASM 物理零复制、使用 `getImageData()`、把 RGBA Canvas 当静默降级。

#### [ ] Task 8.4：接入 Worker 任务、暂停与错误

**操作**：

1. 用真实 `mediaDecoder` 替换生产 Worker 中的测试帧源；测试帧源仍只留在 test support。
2. START 接受批准的 Blob/config/checkpoint，冻结媒体指纹相关输入但不写项目存储。
3. progress 使用 processedUs/durationUs/decodedFrames/新增边界并节流。
4. pause 在安全帧边界返回 core checkpoint 和解码恢复位置；cancel 关闭 iterator/sample/runtime。
5. 映射 `UNSUPPORTED_CODEC/WASM_INIT_FAILED/DECODE_FAILED/INVALID_CHECKPOINT/CANCELLED` 等稳定错误。

**完成检查**：真实短视频可完成、暂停/恢复、取消和错误退出，所有路径资源计数归零。

**禁止**：Worker 访问 IndexedDB 业务模型、直接创建 ShotRecord、错误时调用旧 detector。

#### [ ] Task 8.5：浏览器、内存与打包资源验收

**操作**：

1. 对 manifest 全部 fixtures 连续运行两次，比较时间戳、顺序、engine version 和 config hash。
2. 运行长序列/重复短片测试，记录峰值 WASM memory、JS heap 和 sample 生命周期，确认不随帧数线性增长。
3. 验证 Vite dev 与 production Web build 的 Worker/WASM URL。
4. 构建 Electron 并从打包相对资源加载；Capacitor 至少 sync 并验证资源 URL smoke。
5. 运行 native/WASM/Worker/browser/Web/Desktop 回归和 diff check，记录未覆盖平台。

**最终交付物**：真实媒体 decoder、WebCodecs 到 WASM 直接写入链路、浏览器 fixtures 和跨壳资源验证。

**Phase 8 验收门**：真实视频检测、一次必要复制、无主线程像素、sample 全释放、内存有界和打包资源 smoke 全部通过。

### 4.10 Phase 9 任务单：WASM SIMD 构建、探测与一致性

**阶段状态**：`[ ] 未开始`

#### [ ] Task 9.1：建立 SIMD 独立构建产物

**输入**：Phase 8 baseline 正确性与性能基线。

**操作**：

1. 保持 baseline target 不变，增加使用 `-msimd128` 的 SIMD target。
2. 输出 `scene-engine-simd.wasm`，确保导出函数、ABI version、内存和 module 格式与 baseline 一致。
3. 增加独立 build script，支持强制只构建 baseline 或 SIMD。
4. 对两个产物生成尺寸/checksum 记录，禁止资源名覆盖。
5. 在不支持 SIMD 的环境确认 baseline 构建与加载完全不依赖 SIMD 文件。

**完成检查**：两个 WASM 可分别实例化并通过 ABI smoke，公共 TS API 无变化。

**禁止**：删除 baseline、启用 pthreads、改变 detector 公式以追求 SIMD 速度。

#### [ ] Task 9.2：实现能力探测和后端选择

**操作**：

1. 创建 `feature_probe.ts`，用最小合法 SIMD module 调用 `WebAssembly.validate()`。
2. runtime 初始化时只探测一次，选择 backend 后整个 job 固定。
3. 支持测试强制 baseline/SIMD，生产 API 只暴露实际 backend capability/result。
4. 覆盖 probe false、SIMD 文件缺失、实例化失败和 dispose/re-init。
5. 对批准的失败策略写测试，不得在运行中悄悄切换导致结果混合。

**完成检查**：支持环境选择 SIMD，不支持环境稳定选择 baseline；结果标记实际 backend。

**禁止**：按帧探测、把 probe 逻辑放入 React、吞掉无法解释的 SIMD 初始化错误。

#### [ ] Task 9.3：在共享预处理层增加 SIMD 优化

**操作**：

1. 先用 Phase 8 profile 确认像素绝对差、亮度累计、下采样或 HSV 分量差中的实际热点。
2. 只对已证明热点增加 SIMD 实现，保留同一标量 reference 路径。
3. detector、resolver、filter、checkpoint 继续共用同一逻辑。
4. 处理非向量宽度尾部、未对齐内存、奇数尺寸和小帧。
5. 每个优化点先跑单元 parity，再跑全事件 parity。

**完成检查**：所有像素/指标测试在 baseline/SIMD 容差内，通过 sanitizer 或 Emscripten 可用的内存检查。

**禁止**：复制一套 SIMD detector、移除标量基准、在没有 profile 证据时全面重写。

#### [ ] Task 9.4：建立 parity 与性能门槛

**操作**：

1. 创建 `simd-parity.test.ts`，对全部合成和真实 fixtures 强制运行两个 backend。
2. 镜头边界、类型、顺序、config hash 完全一致；指标只允许批准容差。
3. 创建 performance smoke，分开记录 decode/copy/preprocess/detect，不以总耗时作为唯一判断。
4. 在固定机器/浏览器记录冷启动、热运行、峰值内存和产物体积。
5. 若边界不一致或性能无收益，保持 SIMD 非默认并把 Phase 9 标记未通过，不修改 baseline 语义迁就 SIMD。

**完成检查**：parity 全通过，性能报告可复现且明确实际提升/退化。

#### [ ] Task 9.5：全量回归与交接

**操作**：

1. 运行 native、C ABI、baseline、SIMD、Worker、浏览器、Web/Desktop build 和 diff check。
2. 在 README 记录探测、强制测试方式、两个产物及正确性基准。
3. 确认 package public API 不要求调用方理解两个文件的内部加载细节。
4. 输出 Phase 9 交接报告，附 parity 表和性能环境。

**最终交付物**：同 ABI SIMD 产物、能力探测、共享预处理优化和 baseline/SIMD 回归。

**Phase 9 验收门**：能力选择、所有 fixture parity、性能记录、baseline 回归和跨壳加载全部通过。

### 4.11 Phase 10 任务单：AisenLens 业务适配层与持久化边界

**阶段状态**：`[ ] 未开始`

#### [ ] Task 10.1：核验 Web feature 边界并定义业务类型

**输入**：Phase 9 `@aisenlens/scene-engine` public API、现有 auto-shot/project/timeline 类型。

**操作**：

1. 运行 Phase 9 回归和 Web build，确认 Engine package 可由 workspace 消费。
2. 只读取 auto-shot、project、shot、timeline 中与自动分镜结果应用直接相关的文件。
3. 创建 `features/auto-shot/types.ts`，定义 task status、候选镜头、Engine 证据引用和 repository 窄接口。
4. 保持 Engine 原始结果与 AisenLens 候选结果为不同类型；业务类型可以引用 engine version/config hash/checkpoint，但不能复刻 C ABI。
5. 为任务状态的合法转换写类型/单元测试。

**完成检查**：业务类型不导入 React、Worker internal、WASM runtime 或 Mediabunny；Engine 类型只从 package `index.ts` 导入。

**禁止**：修改 `EditorWorkspace`、改 IndexedDB schema、把现有旧 record 扩展成双轨 union。

#### [ ] Task 10.2：测试先行实现 sceneResultAdapter

**操作**：

1. 先创建 adapter 测试，覆盖 0/结尾边界、VFR timestamp、重复/乱序边界、fade 区间、最短末段和舍入临界点。
2. 实现 `sceneResultAdapter.ts`，集中完成 timestampUs 到项目整数帧的唯一映射。
3. 生成排序、去重、合法 `[startFrame, endFrame)` 的候选镜头；不得直接写项目。
4. 保留 source、score、threshold、evidence、engine version 和 config hash，不能把 score 改名为概率 confidence。
5. 使用项目现有时间/帧工具时先验证语义；不合适时只在 adapter 内实现必要纯转换并测试。

**完成检查**：同一 EngineResult 与项目参数重复适配结果确定；所有候选区间连续、非负且不超项目末尾。

**禁止**：在多个组件散落 timestamp 转换、使用平均帧率参与 Engine 决策、创建 ShotRecord 副作用。

#### [ ] Task 10.3：测试先行实现 autoShotTaskService

**操作**：

1. 定义可注入 `SceneEngineClient` factory、run repository 和 clock/id 依赖，便于无浏览器业务测试。
2. 先用 fake client/repository 写 running、progress、pause、resume、cancel、failed、completed 和 restart 测试。
3. 实现 `autoShotTaskService.ts`，冻结媒体指纹、config、engine version 和 config hash。
4. 把 Worker checkpoint/result 转成业务 task record，但不在本阶段连接现有 IndexedDB store。
5. 保证旧 job progress 被拒绝、终态不可继续写入、cancel 不保存 checkpoint、pause 只保存完整 checkpoint。

**完成检查**：服务状态机测试全部通过，没有 React 生命周期或组件 state 依赖。

**禁止**：导入 `EditorWorkspace`、直接访问 window/indexedDB、并行写旧/new auto-shot record。

#### [ ] Task 10.4：连接 workspace 依赖和测试脚本

**操作**：

1. 在 `apps/web/package.json` 声明 `@aisenlens/scene-engine` workspace 依赖，使用仓库统一 pnpm 更新 lockfile。
2. 按 Web 现有 `node:test`/浏览器测试约定注册 service/adapter tests；确需新测试工具时先说明依赖理由并获得许可。
3. 验证 Vite 能解析 package public entry、Worker 和 WASM 资源，但不让 UI 启动任务。
4. 运行 Web strict build、Engine 全量回归和依赖边界 `rg`。
5. 检查生产 bundle 中不存在测试 synthetic source。

**完成检查**：Web 可构建且 service/adapter 单测通过，现有产品行为完全未改变。

**禁止**：在本阶段切换 UI、修改 project repository、创建临时双写 feature flag。

#### [ ] Task 10.5：阶段审计与交接

**操作**：

1. 用 `rg` 确认 React 组件没有新增 Worker/WASM/Mediabunny import。
2. 确认旧 `autoShotService.ts`、旧 `AutoShotRunRecord` 和现有 UI 本阶段未修改。
3. 运行 Engine tests、Web feature tests、Web build 和 diff check。
4. 输出 Phase 10 交接报告，列出 Phase 11 需要原子修改的 UI/record/repository 接点。

**最终交付物**：AisenLens auto-shot 类型、结果适配器、任务服务、fake 驱动测试和 workspace 消费配置。

**Phase 10 验收门**：无 React 的 adapter/service 全状态测试、时间映射测试、Web build 与边界审计全部通过。

### 4.12 Phase 11 任务单：React 最小接入与持久化原子切换

**阶段状态**：`[ ] 未开始`

#### [ ] Task 11.1：建立持久化升级回归夹具

**输入**：Phase 10 task record、现有 IndexedDB `auto-shot-runs` store 和 DATABASE_VERSION 12。

**操作**：

1. 先读取 `projectRepository.ts` 的完整 upgrade 逻辑和 repository tests，不假定只修改 interface 即可。
2. 创建旧数据库 fixture：至少包含项目、媒体、镜头、截图/注释及旧 AutoShotRunRecord。
3. 先写升级测试：升级后旧 auto-shot run 不可恢复，非 auto-shot 数据逐项保持。
4. 设计新 task record 的单一 store 读写 schema；若复用 store，则升级事务只清理/重建该派生数据，不创建长期第二 store。
5. 明确媒体指纹、engine major、config hash 不匹配时的失效行为。

**完成检查**：测试在 repository 尚未修改时准确暴露旧记录问题，且能检测误删其他 store 数据。

**禁止**：读取旧 cuts 并转换为新 checkpoint、双写两个 schema、清空整个数据库。

#### [ ] Task 11.2：原子切换 project 类型与 repository

**操作**：

1. 用 Phase 10 新 task record 替换 `project/types.ts` 中旧 `AutoShotRunRecord` 字段。
2. 修改 repository 的 get/save/delete 签名与校验，只接受新 engine task record。
3. 提升 DB version 并实现精确 upgrade：旧 `auto-shot-runs` 派生记录失效/清除，新结构从空状态开始。
4. 增加新 record round-trip、projectId 唯一、媒体指纹/config/engine 失效和删除测试。
5. 保证 upgrade 事务失败时数据库不会处于部分迁移状态。

**完成检查**：旧 fixture 升级、新 record CRUD、非 auto-shot 数据保留测试全部通过。

**禁止**：保留旧字段 optional 兼容、通过 `as` 绕过 schema、删除用户镜头/项目/注释数据。

#### [ ] Task 11.3：实现 useAutoShotTask

**操作**：

1. 创建 `useAutoShotTask.ts`，组合 task service 与 repository，暴露现有 UI 需要的状态和命令。
2. 管理挂载/卸载、项目切换、媒体切换、订阅清理、AbortSignal、Worker dispose 和 stale job 防护。
3. pause 持久化 checkpoint，resume 先校验媒体指纹/config/engine；restart 删除旧 task 后启动新任务。
4. completed 只产生可审阅候选，apply 是单独命令；hook 不直接修改 shot 数据。
5. 用 hook 测试覆盖卸载、快速切项目、重复开始、暂停刷新、恢复、取消、失败和完成。

**完成检查**：每个生命周期路径只有一个活跃 client，卸载后没有 state update 或 Worker 遗留。

**禁止**：让组件直接访问 Worker、把大结果存入 Zustand、在 hook 中做像素处理。

#### [ ] Task 11.4：局部替换 EditorWorkspace 自动分镜控制

**操作**：

1. 只修改 `EditorWorkspace.tsx` 的相关 import、auto-shot state/ref、start/pause/restart/apply handler 和现有控制区绑定。
2. 删除组件内对 `runAutoShotDetection`、旧 AbortController 和旧 record 字段的直接依赖。
3. 使用 hook 提供的 progress/candidate/error/status，保持现有按钮、文案、布局和审阅流程不改版。
4. apply 通过现有 shot/editor 领域命令一次性创建镜头，并保持可撤销语义。
5. 对 running、paused、completed、failed 的 UI 条件逐项回归。

**完成检查**：`EditorWorkspace` 不导入 Worker/WASM/Mediabunny；用户操作路径与原 UI 一致。

**禁止**：顺手拆分整个 3640 行组件、修改设计、让 Worker 直接写 project/shot repository。

#### [ ] Task 11.5：产品全流程与跨平台回归

**操作**：

1. 浏览器运行开始、进度、暂停、刷新、继续、取消、重扫、失败、完成、审阅、应用和撤销。
2. 切换项目/媒体时检查旧 job 消息、Worker 和 checkpoint 清理。
3. 用旧 DB fixture 做真实升级，核对项目、镜头、截图和注释数量/关键字段。
4. 运行 Web build、项目生命周期 browser tests、Engine 全量测试、Desktop build 和 Mobile sync/smoke。
5. 检查 performance trace，主线程不得出现像素读取或 detector 长任务。

**完成检查**：产品路径全部使用新 Engine，旧 service 文件虽尚存在但无生产调用。

#### [ ] Task 11.6：阶段审计与切换交接

**操作**：

1. 用 `rg` 列出 `autoShotService.ts`、旧字段和 Canvas/seek detector 的所有剩余引用。
2. 区分待 Phase 12 删除的纯旧路径与仍被其他媒体功能使用的 Canvas/helper，禁止扩大删除范围。
3. 确认没有 feature flag、fallback、双写或旧 checkpoint 兼容读取。
4. 输出 Phase 11 交接报告，给出 Phase 12 可删除文件/符号的证据清单。

**最终交付物**：新 task persistence、DB 升级、React hook、EditorWorkspace 最小接入和产品回归证据。

**Phase 11 验收门**：DB 原子升级、全生命周期、显式应用/撤销、主线程边界及 Web/Desktop/Mobile smoke 全部通过；否则不得删除旧文件。

### 4.13 Phase 12 任务单：整体验收、旧路径删除与标定

**阶段状态**：`[ ] 未开始`

#### [ ] Task 12.1：建立删除前验收基线

**输入**：Phase 11 生产新链路、旧路径引用证据清单。

**操作**：

1. 在删除前再次运行 native、C ABI、baseline/SIMD、Worker、browser、Web、Desktop/Mobile 和 DB 升级矩阵。
2. 保存实际命令、机器/浏览器、关键结果和失败项；任何产品关键项失败则停止删除。
3. 用 `rg` 和构建依赖图证明 `runAutoShotDetection`/旧 record/旧 Canvas detector 没有生产调用。
4. 确认 `auto-shot-runs` 仅包含新 schema 或已被清理。

**完成检查**：存在可审计的“新链路已接管、旧路径无生产引用”证据。

**禁止**：凭人工点击一次就删除旧实现、跳过 Desktop/Mobile 资源验证。

#### [ ] Task 12.2：删除旧自动分镜实现与字段

**操作**：

1. 删除 `apps/web/src/features/auto-shot/services/autoShotService.ts`。
2. 删除仅服务该旧算法、经引用审计确认无其他消费者的 helper、tests 和 fixtures。
3. 删除旧 `confidence/cursorFrame/durationFrames/cuts` 类型、分支和 UI 映射残留。
4. 清理无效 imports、scripts 和文档，不删除通用 Canvas/视频能力。
5. 删除后立即运行 Web type/build 和相关 tests，若发现真实消费者则分析所有权，不恢复兼容双轨。

**完成检查**：`rg` 对旧 service、旧字段和自动分镜 Canvas/getImageData 路径没有生产引用。

**禁止**：删除项目/镜头/缩略图等仍在使用的通用服务、保留隐藏 fallback、加入临时兼容 adapter。

#### [ ] Task 12.3：建立准确率评估输入与评分

**操作**：

1. 创建 evaluation README、标注格式和只接受本地路径的评分脚本；不提交受限数据集本体。
2. 固定一个自有人工标注小集，记录 checksum、engine version、配置和 hard-cut/fade 容差。
3. 输出 hard-cut Precision/Recall/F1、matched boundary 平均/p95 偏移及 fade 建议点落区间结果。
4. 分别运行 Content preset、Adaptive preset 和各自 + Threshold/Fade，不同时默认启用两个 hard-cut detector。
5. 参数调整必须保存调整前后指标；没有证据不得更改默认阈值。

**完成检查**：相同本地数据和配置重复评分结果一致，报告能追溯到 Engine 版本。

**禁止**：用“切得更多”代替准确率、把 PySceneDetect 默认阈值宣称为等价、将数据集加入产品 bundle。

#### [ ] Task 12.4：建立性能与内存基线

**操作**：

1. 在记录的基准机器/浏览器上分别测 decode、copy、preprocess、detect、total 和峰值内存。
2. 对 baseline/SIMD、短片/长片、Content/Adaptive + Fade 记录相同指标。
3. 验证内存复杂度只与原始缓冲、分析缓冲和 detector window 相关，不随时长线性增长。
4. 记录 UI 主线程响应和 progress 节流情况。
5. 只基于 profile 提出后续优化项；本 Phase 不引入双缓冲/pthreads 等新架构。

**完成检查**：性能报告注明硬件、OS、浏览器、素材、配置、冷/热条件和产物版本。

**禁止**：用不可复现绝对数字作为上线承诺、为性能提前改变算法语义。

#### [ ] Task 12.5：许可证、文档与持续检查

**操作**：

1. 创建/更新 `NOTICE`，记录实际采用的第三方许可和算法参考；未复制 PySceneDetect 代码时也明确独立实现边界。
2. 更新 Scene Engine README 的构建、测试、公共 API、支持格式、限制和故障码。
3. 只更新架构文档的实施状态和已验证参数，不重新设计架构。
4. 把 native/WASM/package/browser 必要测试加入现有 CI 或根验收脚本，避免改变日常 Web `build` 的职责边界。
5. 检查生成 WASM、fixtures 和评估数据的发布包含关系，产品包不得携带测试数据集。

**完成检查**：新环境可按 README 构建/测试，许可证与实际依赖一致，CI 能捕获核心回归。

#### [ ] Task 12.6：最终全矩阵验收

**操作**：

1. 从干净 build 目录执行 native Release/sanitizer、C ABI、baseline、SIMD、Worker、浏览器 fixtures、DB 升级和产品全流程。
2. 执行 Web/desktop build、Mobile sync/smoke 和 `git diff --check`。
3. 用 `rg` 确认没有旧生产 detector、双轨、Histogram/Hash/关键帧占位实现。
4. 确认公开 package 不依赖 React/Zustand/project types，React 不导入 Worker/WASM/Mediabunny。
5. 输出最终报告：版本、通过矩阵、准确率、边界误差、性能、内存、已知平台限制和未进入本阶段的未来能力。

**最终交付物**：单一生产 Scene Engine 链路、旧路径删除、准确率/性能基线、许可证与持续回归。

**Phase 12 验收门**：全矩阵通过、旧路径零引用、数据与依赖边界正确、指标可复现；满足后本实施计划才可标记完成。

## 五、风险与注意事项

1. **工具链是当前首个阻断项。** 仓库尚未具备 CMake/Emscripten 固定版本；没有实际编译器验证时不能声称阶段完成，也不能用只写代码代替构建。
2. **时间权威不得回退到帧号。** C++/WASM 全程使用微秒；只有 `sceneResultAdapter` 能转为 AisenLens 项目帧，VFR 尤其不能用平均帧率参与 detector 决策。
3. **WebCodecs 到 WASM 不是物理零复制。** 可实现的目标是 `copyTo()` 一次必要复制直接进入预分配 WASM memory，禁止再经 Canvas、ImageData 或 JS 中间数组。
4. **恢复确定性是核心验收项。** Adaptive look-ahead、Fade 状态和过滤器状态都必须进入 checkpoint；连续运行与暂停/恢复结果不一致时不得接 UI。
5. **旧数据不能伪装成新 checkpoint。** 切换时清理 `auto-shot-runs` 中的旧派生记录，不实现旧结构兼容读取、双写或静默回退；清理范围必须经过数据库升级测试，不能影响项目和镜头数据。
6. **旧路径删除有严格时点。** Phase 11 先接入并验收，Phase 12 才删除旧 Canvas/seek 服务；验收后又不得长期保留两套生产检测器。
7. **浏览器/桌面/移动的资源 URL 必须实测。** 开发服务器成功不代表 Electron/Capacitor 打包成功，Worker 和两个 WASM 产物必须使用 Vite 可解析的相对资源方式。
8. **阈值不能直接宣称与 PySceneDetect 等价。** 色彩转换、下采样和像素格式不同会改变 score；默认值只作为起点，正式值必须由固定数据集和 Precision/Recall/F1 记录支持。
9. **SIMD 只能在 baseline 正确后加入。** SIMD 与 baseline 必须共享 ABI、测试和 detector 逻辑；边界结果不一致时以 baseline 为准并阻止 SIMD 上线。
10. **严格控制范围。** 本计划不创建关键帧、Histogram、Hash 的空实现、公共配置或 UI 入口；未来扩展只依赖既有版本化 capability/result envelope，不在本轮提前设计功能。
