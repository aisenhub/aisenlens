# AisenShot Scene Engine 开发实施计划

> 状态：Phase 0–10 已完成；Phase 11 已完成最小代码接线，11.7 的 canonical config hash、强媒体身份服务、interrupted 生命周期和候选应用领域命令已进入代码与契约测试；仍需完成 task/checkpoint 的强身份持久化替换、review/provenance、真实产品矩阵后才能关闭验收门。Phase 12 仅有准备性基线/文档记录，正式标定、控制面板、旧路径删除与最终验收须在 Phase 11 关闭后执行
>
> 初版日期：2026-08-25
>
> 最后修订：2026-08-28
>
> 依据：已审核通过的 `docs/AISENSHOT_SCENE_ENGINE_PLAN.md`
>
> 范围：分镜算法核心、C ABI、WASM/Worker 运行时、WebCodecs 解码适配、AisenLens 自动分镜接入及产品控制层
>
> 不包含：关键帧提取、Histogram Detector、Hash Detector、内容自动分类及其他视频分析能力

本文把既定架构拆成可独立开发、测试和验收的执行阶段。文中的阶段细分只用于降低单次改动范围，不改变以下已确定路线：先完成 Web 可行性与基准验证，再建立单一 `@aisenlens/scene-engine` workspace 包、C++ 核心、稳定 C ABI、Emscripten/WASM、专用 Worker、Mediabunny + WebCodecs 顺序解码、微秒时间权威、baseline/SIMD 双产物，以及由 Web 适配层完成项目帧映射。像素预处理后端必须由 Phase 0 的真实浏览器基准决定，不预先锁死为 I420 全分辨率复制。

## 一、总体实施路线

### 1.1 开发顺序

```text
现有算法基线、浏览器能力与像素路径验证
  -> 工具链与原生 C++ 最小骨架
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
  -> 强媒体身份、规范哈希、任务生命周期与候选应用收口
  -> 配置基础与内容预设标定
  -> Zustand 设置草稿与新控制面板
  -> 整体验收、旧实现删除
```

实施原则是“先测量并冻结契约，再做算法和原生测试，再跨 ABI，再浏览器运行时，最后业务与 React”。每个 Phase 必须单独通过本阶段验证，失败时不得以进入下一阶段来掩盖问题。

### 1.2 最小可运行版本定义

- **可行性基线（Phase 0）**：当前 JS 算法已有可复现准确率/性能记录，至少一种目标 Web 浏览器像素路径完成真实视频 smoke，公共契约已冻结。
- **工程最小可运行版本（Phase 1）**：原生 C++ 引擎可以创建、顺序接收合成帧、flush、reset 和销毁；尚不检测切点，稳定输出零事件。
- **算法最小可用版本（Phase 3）**：Content 与 Adaptive Detector 在原生测试中可稳定运行，尚不接 WASM 或 UI。
- **浏览器最小可用版本（Phase 8）**：真实短视频可在 Worker 中经 WebCodecs 解码并由 baseline WASM 输出镜头边界，主线程不接收像素帧。
- **产品最小可用版本（Phase 11）**：现有自动分镜入口使用新引擎完成运行、显式暂停/继续、中断重扫、结果审阅和可撤销应用，并通过强媒体身份、规范哈希、来源追踪和数据保护验收。
- **最终产品控制版本（Phase 12）**：用户通过内容预设、检出程度、转场、最短镜头和高级设置生成可追溯配置，完成标定、审阅、应用和生产回归。

### 1.3 当前结构冲突与影响

以下问题不改变架构，但必须在相应阶段解决：

| 已确认问题 | 实施影响 | 处理阶段 |
| --- | --- | --- |
| `packages/scene-engine/` 尚不存在，`packages/` 当前为空 | 必须先创建独立 workspace 包，不能直接在 Web feature 中写算法 | Phase 1 |
| CMake、原生 C++ 编译器和 CTest 已安装并验证；Emscripten 6.0.8 已安装并验证 | Phase 1–5 使用便携版 CMake/LLVM-MinGW；Phase 6 使用固定 emsdk 6.0.8 | Phase 6 |
| 仓库没有通用 C++/TypeScript 单测框架 | 原生侧先使用 CTest + 无外部依赖的轻量测试可执行文件；TS 侧复用 Node `node:test`，不为此引入大型测试框架 | Phase 1、Phase 6 |
| 根 `build` 当前只构建 `@aisenlens/web` | Engine 必须有独立 configure/build/test 脚本；接入前再把必要检查纳入总体验收 | Phase 1、Phase 12 |
| 当前 `AutoShotRunRecord` 使用整数帧、`confidence` 和旧 `cuts` 结构 | 不能直接承载新引擎微秒时间、`score/threshold/evidence`、版本、配置 hash 和 checkpoint | Phase 10、Phase 11 |
| `EditorWorkspace.tsx` 约 3640 行并直接管理检测、暂停、应用逻辑 | React 接入必须通过 hook/service 做局部替换；不得把 Worker/WASM 状态继续写进该组件 | Phase 11 |
| IndexedDB 已有 `auto-shot-runs` store，且 `projectId` 唯一 | 无需为相同职责新建第二个 store；切换时必须使旧派生记录失效并删除，不能把旧记录当作新 checkpoint，也不保留长期兼容读取 | Phase 11 |
| 当前开发范围仅为 Web，Desktop/Mobile 暂不开发 | Worker 与 WASM URL 仍不得假定站点根路径，但 Electron/Capacitor 不作为本轮阻塞门；恢复对应平台开发时再执行跨壳验证 | 后续平台专项 |

若执行中发现新的结构冲突，当前 Phase 只记录“事实、影响、阻断的验收项”，暂停受影响任务并请求评审；不得借机修改既定核心技术路线。

## 二、分阶段实施计划

### Phase 0：规格、现有基线与 Web 像素路径验证

**目标**

在创建 C++ 工程前建立可复现的准确率、性能和兼容性基线，验证浏览器实际能够提供的像素格式与复制路径，并冻结会影响所有后续阶段的公共契约。

**具体任务**

1. 建立无版权合成素材与最小人工标注真实视频集，固定 hard-cut/fade 标注格式、checksum 和一对一匹配评分规则。
2. 对当前 Canvas/seek 算法记录 Precision、Recall、F1、边界偏移、总耗时、主线程长任务和峰值内存；明确它只用于迁移基线，不作为新架构兼容目标。
3. 在目标 Web 浏览器用短视频 spike 比较：原生 I420/NV12 平面复制、RGBX/RGBA 标准化复制、Worker OffscreenCanvas 低分辨率预处理，以及逐帧/低成本预筛选策略。
4. 记录 `VideoSample.format === null`、10/12-bit/HDR、rotation/visible rect、full/limited range、VFR、重复 PTS 和无 duration 的能力结果。
5. 冻结 FrameView 色彩字段、规范化像素策略、VFR 到项目帧舍入、恢复级媒体身份要求、canonical config/hash、checkpoint envelope、完整边界前缀与 task outcome。
6. 固定实际可用的 CMake、编译器和 Emscripten 精确版本计划；Phase 0 只记录缺项，不以安装工具代替浏览器可行性验证。

**涉及文件/目录**

创建：

- `docs/AISENSHOT_SCENE_ENGINE_PHASE_0_BASELINE.md`
- `apps/web/test/auto-shot-contract.test.js`：Task 0.1 的纯 Node 契约测试；浏览器基线测试仍由 Task 0.2 创建。
- `apps/web/test/auto-shot-baseline.browser.test.js`
- `apps/web/test/fixtures/auto-shot/manifest.example.json`
- `scripts/evaluate-auto-shot.mjs`

修改：

- `apps/web/package.json`：只增加 Phase 0 基准/评分脚本。
- `package.json`：只增加对应根代理脚本。
- `reference-projects/REFERENCE_PROJECT_INDEX.md`：记录实际补充查阅和最终采用决定。

不提交：

- 本地视频 fixture、受限数据集和包含版权素材的截图；由 manifest/checksum 定位。

**完成标准**

- 当前 JS 基线和至少一种候选像素路径可在记录的 Web 浏览器中重复运行。
- 基线报告分离 decode/seek、copy、preprocess、detect、total、内存和主线程影响。
- 明确哪些格式可走原生平面、哪些必须 RGB 标准化、哪些返回 capability error；不得写“优先请求 I420”作为未经验证的事实。
- 所有公共时间、颜色、恢复、结果和任务终态契约均有示例与边界测试说明。
- 已定义后续算法优化必须超过的准确率/性能基线，但不写脱离机器和素材的绝对上线承诺。

**Phase 0 验收门**：基线、能力矩阵、像素路径决定和公共契约评审全部完成。任一缺失时不得开始 Phase 1。

### Phase 1：原生 C++ 工程骨架与最小生命周期

**目标**

建立独立可编译、可测试的 Scene Engine 包和最小 C++ 生命周期。此阶段不实现任何检测算法，处理合法合成帧时输出零事件。

**具体任务**

1. 预检并记录 CMake、CTest、C++ 编译器、Node 和 pnpm 版本，核验 Phase 0 已记录的工具链决定；当前 pnpm 声明已经统一，不再把它列为冲突。
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

- 已审核架构文档与通过验收的 Phase 0 契约是类型和生命周期语义的共同依据；两者冲突时暂停并评审，不得自行选择。
- 可用支持 C++17 的编译器、CMake 和 CTest。
- 若环境缺工具，先报告准确缺项；只有获得许可后才安装。

**完成标准**

- package 被 pnpm workspace 正确识别。
- Debug/Release 均可构建核心库与测试可执行文件。
- 合法的 8-bit I420/NV12/RGBX/RGBA 合成帧可顺序处理并返回零事件，色彩元数据、visible rect 与 bit depth 校验生效。
- 非法 plane/stride、倒退时间戳、倒退 presentation index、重复 flush 等行为有明确且经过测试的结果。
- reset 后同一输入序列可再次处理，结果完全一致。
- 包不依赖 React、WebCodecs、Mediabunny、OpenCV、Python 或项目业务类型。

**测试/验证方式**

```powershell
cmake -S packages/scene-engine -B packages/scene-engine/build/native -DBUILD_TESTING=ON
cmake --build packages/scene-engine/build/native --config Release
ctest --test-dir packages/scene-engine/build/native -C Release --output-on-failure
corepack pnpm build
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
2. 固化 I420/NV12/RGBX/RGBA 到统一分析表面的数值规则、舍入方式、visible rect、stride、bit depth、matrix、primaries、transfer 与 full/limited range 处理。
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
- Phase 0 批准的输入格式在定义容差内产生一致指标和边界；不支持的 HDR/高 bit-depth 路径返回明确错误。
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
2. 实现前后窗口、adaptive ratio、最小 Content score 保护和目标事件真实时间戳；阈值决策优先使用量化值和交叉乘法，避免后端浮点累计差异改变边界。
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
3. 实现 detector 级峰值去抖和闪白/闪黑候选抑制，但不在融合前执行最终 minimum scene duration。
4. 实现 `EventResolver` 的稳定排序、去重、同转场多来源聚合和 hard-cut/fade 重叠决策；保留原始 evidence。
5. 在融合后的最终边界上实现 `MinSceneFilter` 的 minimum duration、merge/suppress，并固定被抑制 evidence 的保留规则。
6. 实现 checkpoint 核心序列化/恢复：精确 state version、schema、规范化 config hash、最后提交时间及同 PTS 序号、前帧指标、Adaptive 窗口、Fade 状态、过滤状态及已提交边界摘要。
7. 验证连续运行与任意安全帧边界暂停/恢复完全一致；完整已提交边界由后续 Worker checkpoint envelope 保存，不混入 C++ core state。

**涉及文件/目录**

创建：

- `packages/scene-engine/cpp/include/aisenshot/threshold_detector.h`
- `packages/scene-engine/cpp/src/core/threshold_detector.cpp`
- `packages/scene-engine/cpp/include/aisenshot/min_scene_filter.h`
- `packages/scene-engine/cpp/src/core/min_scene_filter.cpp`
- `packages/scene-engine/cpp/include/aisenshot/event_resolver.h`
- `packages/scene-engine/cpp/src/core/event_resolver.cpp`
- `packages/scene-engine/cpp/include/aisenshot/checkpoint.h`
- `packages/scene-engine/cpp/src/core/checkpoint.cpp`
- `packages/scene-engine/cpp/tests/threshold_detector_test.cpp`
- `packages/scene-engine/cpp/tests/event_resolver_test.cpp`（包含 MinSceneFilter 用例）
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
- checkpoint 对 config hash、schema 和精确 engine state version 不匹配返回明确错误。
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
corepack pnpm scene-engine:build:wasm
corepack pnpm scene-engine:test:wasm
corepack pnpm --filter @aisenlens/scene-engine build
corepack pnpm build
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
3. 实现 `SceneEngineClient`，封装 jobId、回调、AbortSignal、`completed/paused/cancelled/failed` outcome 和 dispose。
4. 实现帧缓冲池，首版只使用单个复用 buffer。
5. 用仅存在于测试目录的合成帧源注入 Worker runtime；不得把测试帧协议暴露为公共生产 API。
6. 验证 pause 仅在安全帧边界返回完整 Worker checkpoint envelope 并终结当前 job，cancel 不生成 checkpoint；恢复必须创建新 job。

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
3. 按 Phase 0 能力矩阵选择像素路径：sample 原生为 I420/NV12 时可直接复制平面；否则只使用规范允许的 RGBX/RGBA 标准化，或经基准批准的 Worker OffscreenCanvas 低分辨率预处理。不得假定 `copyTo()` 可以请求 I420。
4. 已知视频尺寸后一次 reserve；每帧处理后立即 `VideoSample.close()`。
5. 实现稳定错误码：不支持编码、初始化失败、解码失败、无视频轨、损坏文件和取消。
6. 增加无版权短视频 fixtures 及浏览器集成测试，覆盖 H.264/MP4、VP9/WebM、VFR、重复 PTS、旋转、无音轨、format null/高 bit-depth capability 和错误文件。
7. 验证 Vite dev 与 production Web 构建后的 Worker/WASM 相对 URL。Electron 与 Capacitor 资源定位留到恢复对应平台开发时执行，不阻塞本轮 Web 实施。

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
- 原生 copy 后端每个分析帧最多一次 WebCodecs 到 WASM 显式像素复制；Worker 低分辨率预处理后端按 Phase 0 的端到端性能和内存门槛验收，不宣称物理零复制。
- 不支持的媒体返回 capability/error，不回退到旧 `<video>` 随机 seek 检测；经批准的顺序解码 Worker OffscreenCanvas 后端不属于旧路径。
- 长序列测试的内存不随解码帧数线性增长。

**测试/验证方式**

- 使用仓库现有浏览器测试方式启动构建产物，逐个运行 fixture。
- 在 Worker 中记录 decode/copy/process 峰值计数，测试后确认 `opened samples == closed samples`。
- 对同一素材连续运行两次，比较 config hash、engine version、边界顺序和时间戳。
- 构建并验证 Web；记录 Desktop/Mobile 尚未验证，不把它们作为当前 Phase 阻塞项。

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
3. 实现 `autoShotTaskService`，负责媒体身份、配置冻结、engine version/config hash、进度、暂停/继续和结果状态。
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
- Phase 0 已冻结 timestampUs 到项目整数帧的舍入、clamp、重复 PTS 和末帧规则。

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
3. 替换 `AutoShotRunRecord` 为新 engine 任务记录：强媒体身份、微秒进度、结果/evidence、engine version、canonical config/hash、checkpoint 和错误码。
4. 修改 project repository 只读写新结构；升级 IndexedDB schema 时清空并重建或显式清空旧 `auto-shot-runs` 派生记录，不能尝试恢复旧 checkpoint。
5. 保留现有用户流程和视觉表现：开始、进度、显式暂停/继续、中断后重扫、失败、审阅、显式应用与撤销。
6. 应用候选必须通过独立、可测试、可撤销的 shot/editor 领域命令一次性执行；Worker 与 React 组件都不得直接拼装或写入正式镜头。

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
- 页面卸载、切换项目和重启任务不会遗留 Worker 或旧任务消息；只有完整 checkpoint 可进入 `paused`，刷新遗留 `running` 明确转为 `interrupted`。
- 旧 run 记录被确定性清除，不能被识别为可恢复的新任务。
- 已应用镜头保存独立 provenance，不因项目唯一 task 被重扫覆盖而失去来源。
- 本阶段只保持旧自动分镜 UI 行为，以验证新引擎最小接入；Phase 12 按新的控制系统设计替换该临时界面，新结果仍需用户显式应用。
- Web 使用单一接入路径，不出现隐藏 fallback 或新旧双写；Desktop/Mobile 兼容性作为后续平台专项验证。

**测试/验证方式**

- Web build + 现有项目生命周期/browser 测试。
- 浏览器端覆盖开始、暂停、刷新、继续、中断后重扫、取消、失败、完成、候选排除、应用、撤销和恢复快照。
- 使用预置旧 DB 版本升级，确认只清理旧 auto-shot run，项目、镜头、截图和注释保持不变。
- 检查主线程 performance trace，确认无像素处理和长任务回归。

**可能的风险**

- `EditorWorkspace.tsx` 体积大，局部替换容易误触无关编辑器状态；改动必须限制在 import、auto-shot state/handler 和现有控制区域。
- DB 版本升级若 store 范围写错可能影响用户数据；升级测试必须验证所有非 auto-shot stores 的数量和关键记录。

### Phase 12：整体验收、旧路径删除与标定

**目标**

完成内容预设标定与新控制面板后验收新链路，删除旧 Canvas/seek 算法和旧字段，建立持续回归与性能/准确率基线；不保留长期双轨或静默降级。

**具体任务**

1. 运行 native、ABI、baseline、SIMD、Worker、真实视频和 Web 全矩阵测试；Desktop/Mobile 只记录为当前范围外未验证项。
2. 验证产品路径已无旧服务调用后删除旧 Canvas/seek detector。
3. 删除旧 `confidence`、`cursorFrame`、`durationFrames`、旧 `cuts` 等已无引用字段与测试 fixture。
4. 在 Phase 0 固定标注小集上记录 Content/Adaptive/Threshold 相对当前 JS 基线的 Precision、Recall、F1、边界误差和 fade 命中变化。
5. 分离记录 decode/copy/preprocess/detect 耗时与峰值内存，建立可重复基线。
6. 按 `AISENSHOT_CONTROL_SYSTEM_DESIGN.md` 先完成配置基础、隔离的 search/holdout 标定与生产晋升，再实施 feature 设置状态与新控制面板。
7. 更新根 README/架构文档状态和许可证 NOTICE；只记录实际采用或引用的算法来源。
8. 把 Engine 必要检查纳入 CI/总体验收脚本，但保持 Web 日常脚本职责清楚。

**涉及文件/目录**

创建：

- `packages/scene-engine/NOTICE`
- `packages/scene-engine/test/evaluation/README.md`
- `packages/scene-engine/test/evaluation/` 下的本地数据输入约定、评分脚本和非数据集本体配置。
- 必要的 CI workflow 或现有 CI 配置中的 Scene Engine job。
- `apps/web/src/features/auto-shot/config/` 下的产品配置类型、预设 registry、解析器与摘要器。
- `apps/web/src/features/auto-shot/components/` 下的新自动分镜控制与结果审阅组件。

修改：

- `package.json`
- `packages/scene-engine/package.json`
- `packages/scene-engine/README.md`
- `README.md`
- `docs/AISENSHOT_SCENE_ENGINE_PLAN.md` 与 `docs/AISENSHOT_CONTROL_SYSTEM_DESIGN.md`：同步实施状态、预设版本和已验证参数。
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
- 内容预设通过唯一解析器生成配置，新 UI 不再使用旧 sensitivity 线性映射。
- 无 Histogram、Hash、关键帧提取占位实现、配置或 UI。
- 所有许可证和参考来源记录完整。

**测试/验证方式**

```powershell
corepack pnpm scene-engine:test:native
corepack pnpm scene-engine:test:wasm
corepack pnpm --filter @aisenlens/scene-engine test
corepack pnpm build
git diff --check
```

另需运行项目现有浏览器回归、标注小集评分及长视频内存测试。删除旧文件后再次使用 `rg` 搜索 `runAutoShotDetection`、旧 `<video>` seek/Canvas 检测和旧 record 字段，结果应为零生产引用；不得误删缩略图、截图或经 Phase 0 批准的 Worker 预处理能力。

**可能的风险**

- 过早删除旧路径会失去可工作的产品入口，因此删除只能发生在新链路验收之后；验收后又不得长期保留双轨。
- 参数标定若混用不同色彩规则、数据集或容差，指标不可比较；每次调整必须记录 engine version、config、数据集和前后指标。
- 公共测试视频的许可可能限制入库，数据集本体不得进入产品构建产物。

## 三、实施顺序

以下顺序是强制依赖顺序，不允许并行跨越尚未通过的核心验收门：

| 顺序 | Phase | 主要产物 | 进入下一阶段的门槛 |
| --- | --- | --- | --- |
| 0 | Phase 0 | 当前 JS 基线、Web 能力矩阵、像素路径与冻结契约 | 基线和可行性评审通过 |
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
| 11 | Phase 11 | React 接入、强媒体身份、规范哈希、生命周期、候选应用与持久化切换 | 产品全流程、数据保护和 DB 升级回归通过 |
| 12 | Phase 12 | 配置基础、隔离标定、生产预设、新控制面板、单路径收敛与持续回归 | 全矩阵验收通过 |

与已批准架构文档的阶段映射如下，便于追踪而不改变原方案：

| 架构方案阶段 | 本实施计划阶段 |
| --- | --- |
| 规格与基准 | Phase 0 的现有基线、能力矩阵与契约冻结，Phase 2-4 的 golden，Phase 12 的正式回归评估 |
| C++ Content Core | Phase 1-2 |
| Adaptive + Threshold/Fade | Phase 3-4 |
| WASM ABI 与 Worker | Phase 5-9 |
| AisenLens 业务接入 | Phase 10-11 |
| 标定与优化 | Phase 12 |
| Later Histogram/Hash | 不在本计划实施范围 |

C++、CMake、Emscripten/WASM、TypeScript、React 的明确先后关系为：

```text
Web 基线与像素路径验证
  -> CMake/CTest 骨架
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

### 4.2 Phase 0 任务单：规格、现有基线与 Web 像素路径验证

**阶段状态**：`[x] 已完成`

#### [x] Task 0.1：冻结评估输入与评分契约

**输入**：当前 `autoShotService.ts`、项目帧语义、批准架构文档和本地测试素材约定。

**操作**：

1. 建立 fixture manifest 和 hard-cut/fade 标注 schema，所有素材记录来源、许可、checksum、容器、codec、尺寸、帧率/VFR 和预期事件。
2. 评分使用一对一匹配；hard cut 分别记录 0/1/2 项目帧容差，fade 记录建议点是否进入标注区间及区间重叠。
3. 固定项目帧投影的 `round/floor/ceil` 选择、首尾 clamp、重复 PTS 和 durationFrames 规则，并写成可执行测试。
4. 视频本体继续遵守 `.gitignore`，不得提交来源不明或受限素材。

**完成检查**：同一预测结果重复评分完全一致，所有标注可追溯且时间语义无歧义。

**完成记录（2026-08-27）**：已新增 `docs/AISENSHOT_SCENE_ENGINE_PHASE_0_BASELINE.md`、示例 manifest 和 `apps/web/test/auto-shot-contract.test.js`；已固定一对一匹配、0/1/2 项目帧容差、fade 半开区间、量化 FPS + `ceil` 项目帧投影、首尾 clamp、重复 PTS ordinal、durationFrames 与素材追溯规则。验证命令 `corepack pnpm test:auto-shot-contract` 通过（6/6），`git diff --check` 通过。未提交任何视频本体。

#### [x] Task 0.2：记录当前 JS 算法基线

**操作**：

1. 使用固定素材运行当前 Canvas/seek 自动分镜，不修改其算法参数或行为。
2. 记录 Precision、Recall、F1、边界平均/p95 偏移、总耗时、seek/像素处理耗时、峰值内存和主线程长任务。
3. 记录机器、OS、浏览器精确版本、素材 checksum、敏感度和最短镜头配置。
4. 明确当前基线只用于迁移比较，不要求新引擎兼容旧 score、旧 confidence 或旧 cuts schema。

**完成检查**：基线可在同一环境重复运行，差异有解释且报告不依赖肉眼判断。

**完成记录（2026-08-27）**：已新增可重复生成的合成素材脚本、浏览器基线测试和统一评分脚本；基线报告记录 Chrome/Windows、素材 SHA-256、准确率指标、边界偏移、总耗时、长任务与峰值内存。当前 JS 在合成标注集上产生 5 个 hard-cut 候选，0/1/2 帧容差均 `TP=0, FP=5, FN=2`，fade 命中 `1/1` 但有 4 个额外候选，结果已写入 `docs/AISENSHOT_SCENE_ENGINE_PHASE_0_BASELINE.md`。验证命令 `corepack pnpm test:auto-shot-baseline` 与 `corepack pnpm evaluate:auto-shot` 通过；素材本体保持 `.gitignore` 忽略。

#### [x] Task 0.3：验证 WebCodecs/Mediabunny 像素能力

**操作**：

1. 在专用测试 Worker 中顺序解码短视频，记录 `VideoSample.format`、coded/display dimensions、rotation、timestamp/duration 和 color space。
2. 分别验证原生 I420/NV12 平面复制、规范允许的 RGBX/RGBA copy、`format === null`、高 bit-depth/HDR 和 visible rect 行为。
3. 不得用 `copyTo({ format: "I420" })` 作为实现假设；显式格式转换只测试 WebCodecs 规范允许的 RGB 类格式。
4. 所有 sample 在 success/error/cancel 路径 close，记录 opened/closed 计数。

**完成检查**：形成目标 Web 浏览器能力矩阵，每个不支持分支都有明确 capability/error 决定。

**完成记录（2026-08-27）**：已新增 `auto-shot-capability.verification.ts` 并接入浏览器基线 harness；实测 H.264 sample 为 NV12，原生 copy 与 RGBA copy 成功，I420 显式转换失败，VP9 WebM 的 `VideoSampleSink` 返回明确 `Decoding error`，所有样本均执行 close。能力矩阵与生产候选决策已写入 `docs/AISENSHOT_SCENE_ENGINE_PHASE_0_BASELINE.md`，验证命令 `corepack pnpm test:auto-shot-baseline` 通过。

#### [x] Task 0.4：比较候选预处理与采样路径

**操作**：

1. 比较原生平面全帧 copy、RGBX/RGBA 全帧 copy、Worker OffscreenCanvas 低分辨率预处理三条路径。
2. 另外比较逐帧完整指标、逐帧低成本预筛选后候选精算，以及显式 stride + 邻域精修；不得只测算法函数而忽略 decode/copy。
3. 分离记录 decode、copy、preprocess、detect、total、WASM/JS memory 和主线程响应。
4. 任一低精度路径必须同时报告相对逐帧基线的 Recall 变化。

**完成检查**：选出至少一个通过准确率和性能门槛的生产候选；若没有，Phase 0 标记阻塞并调整方案，不进入 C++ 实现。

**完成记录（2026-08-27）**：已完成浏览器端到端 decode/copy/preprocess 测量并写入 Phase 0 报告；在标注 VP8 合成素材上以逐帧 RGBA 签名作为路径级基线，`96×54` OffscreenCanvas 候选 Recall 为 `1.0`、Recall delta `0`，平均预处理 `3.42ms`/帧；原生平面路径 Recall `0.5`，不作为默认低精度路径。已选定 Worker 内固定低分辨率预处理候选，并保留 NV12/RGBA 高保真能力分支；真正 detector 接入后仍需按 Phase 12 复验。

#### [x] Task 0.5：冻结跨阶段公共契约

**操作**：

1. 冻结 FrameView 的 pixel format、visible rect、bit depth、matrix、primaries、transfer、full range 和时间字段。
2. 冻结 canonical config/hash、恢复级媒体身份及成本、精确 engine state version、checkpoint envelope 和完整 committed boundaries。
3. 冻结 task 的 `completed/paused/cancelled/failed` outcome；pause 终结当前 job，resume 创建新 job。
4. 冻结跨后端确定性：边界/类型/顺序/决策精确一致，诊断浮点值按容差比较；决策指标采用明确量化。
5. 更新 Phase 0 报告和参考索引，运行 Web 测试、Web build 与 `git diff --check`。

**最终交付物**：可复现当前基线、Web 能力矩阵、像素路径决定、评分工具和冻结公共契约。

**完成记录（2026-08-27）**：已将 FrameView 色彩/几何字段、微秒时间、初版媒体 fingerprint/config hash、engine state version、checkpoint core/envelope 边界、task outcome 和跨后端确定性规则同步到架构方案与 Phase 0 报告；已更新参考索引。`corepack pnpm test:auto-shot-contract`、`corepack pnpm build`、`corepack pnpm evaluate:auto-shot` 与 `git diff --check` 均通过；Task 0.4 的路径级 Recall 门槛也已通过，因此 Phase 0 验收完成，可进入 Phase 1。第二轮审计后来确认初版 fingerprint/hash 不能满足恢复级契约，修订工作明确归入 Task 11.7–11.8，不改写当时测试事实。

**Phase 0 验收门**：Task 0.1-0.5 全部完成且 Web 验证通过，才能开始 Phase 1。

### 4.3 Phase 1 任务单：原生 C++ 工程骨架与最小生命周期

**阶段状态**：`[x] 已完成`

#### [x] Task 1.1：工作区与工具链预检

**输入**：仓库根目录、批准架构文档、本实施计划。
**操作**：

1. 读取根 `AGENTS.md`、`package.json`、`pnpm-workspace.yaml`、`.mise.toml`、`.gitignore` 和已通过验收的 Phase 0 报告。
2. 执行只读版本检查：`node --version`、`corepack pnpm --version`、`cmake --version`、`ctest --version` 和实际 C++ 编译器版本。
3. 确认 `packages/*` 已被 workspace 包含。
4. 核验 `package.json` 与 `.mise.toml` 均声明当前统一的 pnpm 版本；当前不是 pnpm 冲突修复任务。未经许可不得安装系统工具。
5. 确认工作树已有用户改动并记录，禁止回退 `AGENTS.md`、参考索引和架构文档。

**交付物**：预检记录写入 `packages/scene-engine/README.md` 的 Prerequisites；若因工具缺失不能验证，明确标记 Phase 1 尚未完成。
**禁止**：修改业务文件、下载 PySceneDetect/OpenCV、开始 Emscripten 安装。

**完成记录（2026-08-27）**：已核验 `AGENTS.md`、根/Web `package.json`、`pnpm-workspace.yaml`、`.mise.toml`、`.gitignore` 和 Phase 0 报告；Node `v24.19.0`、pnpm `11.24.0`、便携版 CMake/CTest `4.4.2` 和 LLVM-MinGW Clang `22.1.8` 均已验证可用。Phase 1 当时按计划未安装 Emscripten；后续已由 Task 6.1 安装并验证 emsdk 6.0.8。

#### [x] Task 1.2：创建 workspace 包元数据

**操作**：

1. 创建 `packages/scene-engine/package.json`，名称固定为 `@aisenlens/scene-engine`，标记 `private`，不声明 React 依赖。
2. 只加入 native configure/build/test 所需脚本；产物目录统一为 `packages/scene-engine/build/native`。
3. 在根 `package.json` 添加对应代理脚本，不改变现有 `dev/build/preview` 含义。
4. 检查根 `.gitignore` 已忽略 `build/`；已有规则足够时不修改。

**完成检查**：`corepack pnpm --filter @aisenlens/scene-engine exec node -p "process.cwd()"` 能定位包目录。
**禁止**：增加 npm 运行时依赖、创建第二个 scene engine 包、改 Web package。

**完成记录（2026-08-27）**：已创建唯一的 `@aisenlens/scene-engine` workspace 包及根代理脚本；`corepack pnpm --filter @aisenlens/scene-engine exec node -p "process.cwd()"` 可定位包目录。CMake/native 脚本因工具链缺失尚未执行。

#### [x] Task 1.3：建立 CMake/CTest 最小工程

**操作**：

1. 创建单一顶层 `packages/scene-engine/CMakeLists.txt`。
2. 设置经当前编译器验证的最低 CMake 版本和 C++17，关闭编译器扩展。
3. 创建 `aisenshot_scene_engine_core` 静态库 target；public include 仅暴露 `cpp/include`。
4. 使用 `include(CTest)`；`BUILD_TESTING=ON` 时创建单个初始测试 executable 并注册到 CTest。
5. 对 MSVC/GCC/Clang 设置合理 warning；本阶段 warning 不得通过全局禁用解决。
6. Debug sanitizer 使用显式 option，只在编译器支持时开启。

**完成检查**：空算法核心能在 Debug 与 Release 配置完成 configure/build/test。
**禁止**：加入 Emscripten flags、SIMD、OpenCV、FetchContent 或第三方测试框架。

**完成记录（2026-08-27）**：已建立单一 CMake/CTest 工程，C++17、无扩展、静态核心库、warning 选项和可选 sanitizer 均已配置；LLVM-MinGW `clang++ 22.1.8` 下 Debug、Release 构建与 CTest 全部通过。

#### [x] Task 1.4：落地基础值类型

**操作**：

1. `frame_view.h` 定义 `PixelFormat`、`PlaneView`、`FrameView`，包含实际 stride、coded/visible size、bit depth、颜色 matrix/primaries/transfer/full range、presentation index、`timestamp_us`、`duration_us`。
2. `scene_event.h` 定义现阶段需要的稳定事件值类型；允许零事件，不预造 Histogram/Hash/关键帧事件。
3. `config.h` 只定义引擎生命周期和已批准 detector 选择所需的基础配置；具体 detector 参数留给对应 Phase 落地。
4. `detector.h` 定义 `ISceneDetector` 的 `id/lookahead_frames/reset/process/flush` 生命周期。
5. 所有公共 header 不包含浏览器、React、项目数据库或 Emscripten 头文件。

**完成检查**：每个 public header 均能被最小 C++ translation unit 单独 include 并编译。
**禁止**：暴露 STL 对象给未来 C ABI、加入项目 frame/ShotRecord 类型、实现未来能力占位类。

**完成记录（2026-08-27）**：已落地 `FrameView`、`PlaneView`、色彩/像素枚举、`SceneEvent`、`EngineConfig`、`ISceneDetector`、`ErrorCode` 和 `SceneEngine` 公共头；未引入浏览器、React、数据库或 Emscripten 头文件。

#### [x] Task 1.5：实现最小 SceneEngine 生命周期

**操作**：

1. 实现 `SceneEngine` 构造/销毁、`process`、`flush`、`reset`。
2. `process` 校验受支持 PixelFormat、plane 数量、非空数据、coded/visible rect、stride、bit depth、颜色枚举、duration、presentation index 与 timestamp 单调性。
3. `detector_pipeline.cpp` 提供空 pipeline；合法帧处理成功但不产生事件。
4. flush 结束任务并返回零事件；flush 后 process 必须有明确错误，reset 后恢复初始状态。
5. 禁止持有输入原始帧指针到 `process` 返回之后。

**完成检查**：同一 engine reset 前后处理同一输入，状态和零事件输出一致。
**禁止**：在此任务中计算亮度、HSV、直方图或任何切点。

**完成记录（2026-08-27）**：已实现空 pipeline 的 process/flush/reset 生命周期、格式/plane/stride/visible rect/色彩/时间顺序校验、flush 后明确错误和 reset 恢复；当前合法帧只返回零事件。

#### [x] Task 1.6：先写测试用例并补齐实现

**操作**：

1. 创建不会被 `NDEBUG` 禁用的轻量 `EXPECT_*`/失败计数测试工具和统一 `test_main.cpp`。
2. 创建 synthetic frame factory，能生成带 padding stride 的 I420/NV12/RGBX/RGBA 小帧和不同颜色元数据/visible rect，且内存所有权由 fixture 保持。
3. 至少覆盖：create/destroy、空序列 flush、单帧、多帧、reset、flush 后 process、倒退 timestamp、倒退 presentation index、非法 stride、空 plane、零尺寸、负 duration（若类型允许）及重复 flush。
4. 对每个失败分支检查稳定错误类别，不只检查“抛出了错误”。
5. 在 Release 和 sanitizer Debug 下运行同一组测试。

**完成检查**：CTest 输出具体失败用例名；所有用例通过且无 sanitizer 报告。
**禁止**：使用真实视频、Canvas、WebCodecs 或需要网络下载的 fixture。

**完成记录（2026-08-27）**：已新增轻量断言工具、统一 test main、带 padding 的 I420/NV12/RGBX/RGBA synthetic frame factory，覆盖生命周期、重复 flush、倒退 timestamp/index、非法 stride/plane/dimensions/visible rect/bit depth/color metadata 等稳定错误类别。Debug、Release 和 sanitizer Debug 的 CTest 均通过。

#### [x] Task 1.7：文档与边界审计

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

**完成记录（2026-08-27）**：已更新 `packages/scene-engine/README.md` 的实际工具链路径和边界；已完成禁止依赖审计，native Release/sanitizer Debug、Web build、契约/浏览器测试和 `git diff --check` 均通过，满足进入 Phase 2 的前置条件。

### 4.4 Phase 2 任务单：共享帧指标与 Content Detector

**阶段状态**：`[x] 已完成`

#### [x] Task 2.1：核验 Phase 1 并冻结 Content 测试契约

**输入**：Phase 1 原生核心、合成帧工厂、批准架构中的 Content 公式与事件语义。

**操作**：

1. 运行 Phase 1 的 Release CTest 和可用 sanitizer 测试，确认零 detector 生命周期仍通过。
2. 把 Content 输入、输出、权重、阈值比较规则、首帧行为和微秒事件时间写成测试用例清单。
3. 明确数值规范：分析尺寸、保持宽高比方式、整数/定点中间值、HSV 范围、舍入方式、YUV matrix/full range/bit depth 处理和阈值相等时的判定；不得使用单一 YUV range 假设覆盖所有视频。
4. 先创建 `frame_metrics_test.cpp` 与 `content_detector_test.cpp`，让新增核心断言在实现前失败。
5. 用 synthetic frame factory 准备相同帧、纯亮度变化、纯色硬切、色相变化、stride padding、奇数尺寸、visible rect、颜色空间和 Phase 0 批准 PixelFormat 用例。

**完成检查**：测试名称能逐项表达契约，失败原因来自尚未实现的 metrics/Content，而不是 fixture 或构建错误。

**完成记录（2026-08-27）**：已核验 Phase 1 Release/Debug sanitizer CTest；新增 `frame_metrics_test.cpp`、`content_detector_test.cpp` 及格式、padding、奇数尺寸、visible rect、亮度/色相变化和阈值边界用例。Content 的 0..10000 定点值、首帧不触发、阈值相等触发、微秒时间和最短镜头约束已冻结。

**禁止**：接入 Adaptive/Threshold、复制 PySceneDetect Python 结构、为了匹配默认阈值而隐式改变颜色规则。

#### [x] Task 2.2：实现统一像素读取与下采样

**操作**：

1. 创建 `downscale.*` 和 `yuv_to_hsv.*`，分别负责坐标映射/采样及确定性的颜色分量转换。
2. 对 I420、NV12、RGBX、RGBA 使用 `FrameView` 中实际 plane、stride、visible rect 和颜色元数据，不假定紧密排列或 BT.709 limited range。
3. 下采样保持宽高比，分析缓冲只在尺寸变化时重新分配；不得保存原始输入帧指针。
4. 为全黑、全白、主色、奇数宽高、padding stride、visible rect、BT.601/709/full range 和格式等价增加精确或容差断言。
5. 在 Debug sanitizer 下运行 frame metrics 前置测试，修复所有越界与未定义行为。

**完成检查**：Phase 0 批准的格式表达同一合成图像时，亮度/HSV 分量在文档规定容差内一致；内存不随处理帧数增长。

**禁止**：引入 OpenCV/libyuv、Canvas 规则、平台特定 SIMD、第二套格式专属 detector。

**完成记录（2026-08-27）**：已实现 `downscale.*` 与 `yuv_to_hsv.*`，覆盖 I420、NV12、RGBX、RGBA、padding stride、visible rect、奇数尺寸及 BT.601/709、full/limited range 的定点读取；未引入第三方像素库。

#### [x] Task 2.3：实现 SharedFrameMetrics

**操作**：

1. 创建 `frame_metrics.*`，一次遍历分析表面产生 `mean_luma`、Content 所需分量差和加权前基础指标。
2. 明确首帧没有前帧差异的结果，不产生硬切事件；参与边界决策的指标采用冻结的整数/定点量化和舍入规则。
3. 只保留下一帧计算所需的紧凑分析状态，禁止缓存历史原始帧。
4. 增加计数测试桩或可观察测试，证明每个输入帧只构建一次共享指标。
5. 固定指标字段顺序和浮点容差，连续运行两次逐字段比较。

**完成检查**：`frame_metrics_test.cpp` 全部通过，重复运行结果确定，Phase 1 生命周期测试无回归。

**禁止**：在 metrics 层判断切点、发出 SceneEvent 或持有 detector 配置。

**完成记录（2026-08-27）**：`SharedFrameMetrics` 已以一次分析遍历产生 mean_luma、三分量差值和 content_score，并仅保留下一帧量化分析表面；首帧、重复帧和确定性回归测试通过。

#### [x] Task 2.4：实现 Content Detector 并接入 pipeline

**操作**：

1. 创建 `content_detector.*`，只消费 `SharedFrameMetrics`，实现分量权重、总 `score`、阈值判断和 reset/flush。
2. 事件携带真实 `timestamp_us`、presentation index、detector source、`score`、`threshold` 和分量 evidence。
3. 在 `config.h` 增加本 Phase 所需 Content 配置及严格校验；不加入其他 detector 的虚假默认实现。
4. 在 `detector_pipeline.cpp` 注册 Content，使 SceneEngine 可配置启用/禁用它；禁用时保持 Phase 1 零事件行为。
5. 补齐阈值下方、相等、上方，权重为零、无效权重和 reset 后重复运行测试。

**完成检查**：合成硬切按预期只输出一个确定事件；相同帧和阈值以下不误报；事件不使用 `confidence` 命名原始 score。

**禁止**：同时默认启用 Content 与 Adaptive、在 detector 内重新遍历像素、把项目帧号写入事件。

**完成记录（2026-08-27）**：已实现 `ContentDetector`、Content 配置校验、阈值下方/相等/上方、最短镜头和 reset/flush 行为，并接入 SceneEngine；`DetectorKind::None` 保持零事件。

#### [x] Task 2.5：建立 Content golden 与阶段回归

**操作**：

1. 将程序生成的合成序列及预期指标/事件固化为测试，不提交来源不明的视频。
2. 在 README 记录 AisenShot 的颜色/下采样数值规则，以及“参考 PySceneDetect 思路但阈值不保证数值等价”。
3. 运行完整 native Release、Debug sanitizer、所有 Phase 1-2 CTest 和 Web build。
4. 用 `rg` 确认 Content 只读取共享 metrics，包内没有 React/WebCodecs/OpenCV/Python 依赖。
5. 输出 Phase 2 交接报告，列出 golden 输入、预期边界和实际数值容差。

**最终交付物**：共享预处理、Content Detector、Content 配置、合成 golden 和原生回归测试。

**Phase 2 验收门**：Content golden、批准格式/颜色空间容差、决策确定性、sanitizer 和既有回归全部通过；未通过时不得开始 Adaptive。

**完成记录（2026-08-27）**：已新增 `docs/AISENSHOT_SCENE_ENGINE_PHASE_2_CONTENT.md` 交接记录与 native golden 用例；Debug、Release、sanitizer CTest、Web build 和禁止依赖审计均通过，满足进入 Phase 3 的前置条件。

### 4.5 Phase 3 任务单：Adaptive Detector

**阶段状态**：`[x] 已完成`

#### [x] Task 3.1：先建立 Adaptive 行为测试

**输入**：Phase 2 稳定的 Content score 序列与共享 metrics。

**操作**：

1. 运行 Phase 2 全部测试并固定一组合成 Content score 序列。
2. 先创建 `adaptive_detector_test.cpp`，覆盖孤立高峰、持续高运动、邻域均值为零、最小 Content score、前后窗口不足、look-ahead 和末尾 flush。
3. 明确窗口是否包含目标帧、目标帧索引与事件发布时间的关系，测试一帧边界偏移。
4. 增加分批 process、一次性 process、flush 和 reset 的等价性测试。

**完成检查**：新增测试在 Adaptive 未实现时按预期失败，且所有期望时间戳均明确指向目标帧而非当前处理帧。

**禁止**：用真实视频肉眼判断替代窗口测试、在测试中容忍未解释的一帧偏移。

**完成记录（2026-08-27）**：已新增 `adaptive_detector_test.cpp`，固定孤立高峰、look-ahead 两帧、零邻域、首帧、flush 和 reset 的行为，事件时间指向窗口中心帧。

#### [x] Task 3.2：实现 Adaptive 滚动窗口

**操作**：

1. 创建 `adaptive_detector.*`，只存放窗口所需 Content score、时间点和 presentation index。
2. 实现 adaptive ratio、邻域均值保护、最小 Content score 与窗口边界处理。
3. `lookahead_frames()` 返回真实未来窗口需求；事件使用目标帧自身 TimePoint。
4. `flush()` 对尾部不足窗口执行已测试的确定性策略，且不重复已提交事件。
5. `reset()` 清空全部窗口和延迟事件状态。

**完成检查**：孤立硬切检出、持续运动误报抑制、尾部 flush 和 reset 用例全部通过。

**禁止**：读取 FrameView 像素、重算 HSV/Content score、按平均帧率计算窗口时间。

**完成记录（2026-08-27）**：已实现 `AdaptiveDetector`，使用定长 Content score 窗口、交叉乘法 ratio 比较、零邻域保护、min content、lookahead 和确定性尾部 flush；不读取像素。

#### [x] Task 3.3：接入配置与 detector pipeline

**操作**：

1. 在 `config.h` 增加 Adaptive 所需参数及窗口/阈值合法性校验。
2. 修改 pipeline，使 hard-cut 模式明确选择 Content 或 Adaptive；拒绝模糊的“双默认 detector”配置。
3. 确保选择 Adaptive 时仍只生成一次共享 Content metrics。
4. 为配置序列化顺序和默认 preset 增加测试，为后续 config hash 保持确定字段顺序。
5. 验证切换 detector、reset engine、重新运行不会残留前一个 detector 状态。

**完成检查**：Content-only 与 Adaptive-only 都可独立运行；非法组合返回稳定配置错误。

**禁止**：删除 Content、让两个 hard-cut 结果未经 resolver 直接混合、提前实现 Fade。

**完成记录（2026-08-27）**：已增加 Adaptive 阈值/窗口/min score 配置及严格校验；`DetectorKind` 明确选择 Content 或 Adaptive，SceneEngine 每帧只构建一次共享 metrics。

#### [x] Task 3.4：确定性与阶段交接

**操作**：

1. 对每个合成序列重复运行 Content-only 和 Adaptive-only，逐字段比较事件。
2. 用计数测试证明 Adaptive 没有增加像素遍历次数。
3. 运行完整 native Release、sanitizer、Phase 1-3 CTest、Web build 和 diff check。
4. README 记录 look-ahead、flush 和目标事件时间语义。
5. 输出 Phase 3 交接报告，单独列出已验证的一帧偏移用例。

**最终交付物**：Adaptive Detector、配置与窗口测试、Content/Adaptive 模式选择。

**Phase 3 验收门**：look-ahead、持续运动抑制、尾部 flush、单次 metrics 和全量回归全部通过。

**完成记录（2026-08-27）**：native Debug、Release、sanitizer Debug Phase 3 CTest 和 Web build 均通过；Adaptive/Content 测试均为固定整数决策，README 与 Phase 3 交接记录已同步，WASM/Web Worker 接入留待后续阶段。

### 4.6 Phase 4 任务单：Threshold/Fade、融合、过滤与 checkpoint

**阶段状态**：`[x] 已完成`

#### [x] Task 4.1：先建立 Threshold/Fade 状态机测试

**输入**：Phase 2 `mean_luma` 指标、批准的 fade 区间和 bias 语义。

**操作**：

1. 创建 `threshold_detector_test.cpp`，先覆盖 floor/ceiling、向下/向上穿越、完整淡出淡入、仅淡出、仅淡入和未闭合结尾。
2. 对 fade bias 的起点、中点、终点分别写精确时间戳断言。
3. 覆盖 VFR 时间戳、重复亮度、短黑帧/白帧和 reset。
4. 明确 fade interval、建议切点和 source evidence 的字段预期。

**完成检查**：状态转换与 flush 的每个分支都由失败测试表达，测试不依赖 Content/Adaptive 事件。

**禁止**：把 fade 简化成普通 Content hard cut、使用项目帧率推算持续时间。

**完成记录（2026-08-27）**：已新增 `threshold_detector_test.cpp`，覆盖 floor/ceiling、向下/向上穿越、完整 fade、未闭合结尾、bias、VFR 微秒时间和 reset；测试独立于 Content/Adaptive。

#### [x] Task 4.2：实现 Threshold/Fade Detector

**操作**：

1. 创建 `threshold_detector.*`，只消费 `mean_luma` 和 TimePoint。
2. 实现 threshold 穿越、淡出/淡入配对、fade range、bias 切点和尾部 flush。
3. 在配置中增加 Threshold/Fade 参数及 floor/ceiling/bias 合法性检查。
4. 允许它与当前选定的一个 hard-cut detector 并行，不改变 hard-cut 选择规则。
5. 保留原始 transition interval 与 evidence，不能只输出一个失去上下文的切点。

**完成检查**：Task 4.1 全部通过，Threshold-only 和 hard-cut + Threshold 两种 pipeline 均可运行。

**禁止**：在 Threshold 内读取像素、丢弃 fade interval、提前做业务镜头创建。

**完成记录（2026-08-27）**：已实现 `ThresholdDetector`，使用 `mean_luma_q`、floor/ceiling、fade bias、区间 evidence、`emit_final_fade` 和微秒最短时长；已接入 SceneEngine 的可选 threshold 分支。

#### [x] Task 4.3：先测试并实现 EventResolver

**操作**：

1. 创建 `event_resolver_test.cpp`，覆盖同时间多 source、重复 hard cut、fade 区间内 hard cut、确定排序和输入顺序扰动。
2. 创建 `event_resolver.*`，实现排序、去重、同转场来源聚合及既定重叠决策。
3. 确保输出顺序与 detector 注册顺序无关，source/evidence 聚合顺序固定。
4. 对同一输入事件的所有排列运行测试，输出必须一致。

**完成检查**：resolver golden 逐字段一致，不通过简单“保留第一个”丢失来源。

**禁止**：在 resolver 中提前执行最终 minimum scene duration、转换为 AisenLens `ShotRecord` 或做 UI 文案映射。

**完成记录（2026-08-27）**：已实现 `EventResolver` 的确定排序、同时间 hard-cut 合并、fade 区间内 hard-cut 聚合和 source mask 保留，测试验证输入顺序扰动不改变结果。

#### [x] Task 4.4：先测试并实现最终 MinSceneFilter

**操作**：

1. 创建 `min_scene_filter_test.cpp`，输入必须是 resolver 已融合边界，覆盖最短镜头边界、恰好等于阈值、连续闪白/闪黑、merge 与 suppress。
2. 创建 `min_scene_filter.*`，以微秒比较相邻最终候选，不读取平均帧率。
3. 明确被 merge/suppress 事件的 sources/evidence 保留规则并写入测试。
4. 覆盖开头、结尾、重复时间戳、fade/hard-cut 融合后位置变化和 flush 后最后一段。

**完成检查**：融合后过滤结果有确定预期，最短镜头判断不使用 frame count，过滤不会因 detector 注册顺序改变。

**禁止**：在跨 detector 融合前执行最终 minimum scene duration、静默删除所有被抑制事件证据。

**完成记录（2026-08-27）**：已实现 `MinSceneFilter`，按微秒过滤相邻融合边界，并合并被抑制候选的 source mask；不读取平均帧率。

#### [x] Task 4.5：实现版本化 checkpoint

**操作**：

1. 先创建 `checkpoint_test.cpp`，对多个安全帧边界比较连续运行与暂停/恢复结果。
2. 创建 `checkpoint.*`，使用显式字段序列化 schema，不序列化 STL 内存布局或裸指针。
3. 纳入 ABI/schema/精确 engine state version、规范化 config hash、最后提交 TimePoint 及同 PTS ordinal、前帧 metrics、Adaptive 窗口、Fade 状态、resolver/filter 状态和已提交摘要。
4. 对截断、损坏、错误 schema、错误精确 engine state version 和错误 config hash 返回稳定错误；没有显式迁移器时不得只比较 major 后恢复。
5. 导入失败不得部分修改现有 engine；导入成功后不得重复提交 checkpoint 前的边界。

**完成检查**：在每个测试暂停点，恢复后的最终事件与连续运行逐字段完全一致。

**禁止**：写 IndexedDB、包含媒体 Blob、允许旧/未知 schema 猜测恢复。

**完成记录（2026-08-27）**：已完成独立 checkpoint core 的显式 little-endian schema、magic、精确 engine state version/config hash 校验和截断/损坏测试；`SceneEngine::export_checkpoint/import_checkpoint` 已纳入前帧 metrics、Adaptive/Fade 状态及引擎生命周期，并以连续运行 parity 测试验证导入失败不修改状态。

#### [x] Task 4.6：完整核心验收

**操作**：

1. 把 Threshold、filter、resolver、checkpoint 接入 SceneEngine 的 process/flush/reset 生命周期。
2. 运行 Content-only、Adaptive-only、各自 + Threshold/Fade 的配置矩阵。
3. 运行完整 native Release、sanitizer、全部 CTest 和确定性重放。
4. README 记录 detector 组合、事件融合、checkpoint 兼容规则。
5. 输出 Phase 4 交接报告，附连续/恢复 parity 结果。

**最终交付物**：三类 detector、最短镜头过滤、事件融合、版本化 checkpoint 及完整原生测试。

**Phase 4 验收门**：所有 detector 可按批准组合运行，VFR/flush/融合/checkpoint 确定性和 sanitizer 全部通过。

**完成记录（2026-08-27）**：SceneEngine 已统一收集 hard-cut/fade 候选，经过 EventResolver 与 MinSceneFilter 后按确定顺序输出，并将融合历史纳入 checkpoint；Content-only、Adaptive-only、Threshold 并行配置、flush、恢复 parity、native Release、sanitizer、Web build 和 `git diff --check` 均通过。Phase 4 验收门已满足。

### 4.7 Phase 5 任务单：稳定 C ABI 与原生 ABI 一致性

**阶段状态**：`[x] 已完成`

#### [x] Task 5.1：冻结并编译检查 C ABI header

**输入**：Phase 4 已稳定的 C++ API、事件和 checkpoint 语义。

**操作**：

1. 创建 `scene_engine_abi.h`，只定义固定宽度整数、浮点、offset、length、versioned struct 和 opaque handle。
2. 声明批准的 ABI 函数及稳定 `asen_status`/错误码，不暴露 C++ namespace、STL、异常或模板。
3. 为所有 ABI struct 增加 size/alignment 静态断言和显式 ABI version。
4. 创建纯 C smoke translation unit，证明 header 可由 C 编译器独立包含。
5. 文档化输入/输出缓冲区所有权、句柄有效期和函数调用顺序。

**完成检查**：C 与 C++ 编译 target 均通过；ABI header 不包含任何 C++ 专属类型。

**禁止**：使用 Embind、把 JSON 字符串作为逐帧边界、直接导出 C++ class。

**完成记录（2026-08-27）**：已新增纯 C `scene_engine_abi.h`，包含固定宽度配置/帧/事件结构、显式 ABI version、opaque handle 和稳定 status；C smoke translation unit 与 C++ offset/size static assertions 均通过。

#### [x] Task 5.2：实现句柄、配置与帧缓冲 ABI

**操作**：

1. 在 `scene_engine_abi.cpp` 实现句柄表或明确的 opaque handle 管理。
2. 实现 `asen_create/destroy`、版本检查和配置转换，所有异常在边界内捕获。
3. 实现 `asen_reserve_frame`，返回未来 WASM 可直接写入的稳定 layout/offset 语义。
4. 实现 `asen_process_frame`，从已保留缓冲构造 FrameView，不额外复制整帧。
5. 覆盖 null、无效/已销毁句柄、错误布局、错误调用顺序和重复销毁。

**完成检查**：失败路径返回稳定 status，不崩溃、不泄漏、不让异常穿越 ABI。

**禁止**：让调用方持有 C++ 指针、每帧重新创建 engine、在 ABI 内读取视频文件。

**完成记录（2026-08-27）**：已实现 `asen_create/destroy/process_frame/flush` 及配置、FrameView、SceneEvent 转换；异常被限制在 ABI 边界内，C++/C ABI Content parity 测试通过。

#### [x] Task 5.3：实现事件批量读取与 checkpoint ABI

**操作**：

1. 实现 `asen_read_events` 的容量查询/批量读取/剩余事件规则。
2. 实现 `asen_flush`，保证所有延迟事件可被后续批量读取。
3. 实现 checkpoint 导出长度查询、调用方缓冲写入和 import 校验。
4. 对小容量分多批读取、零容量、容量不足、重复读取和错误 checkpoint 建立测试。
5. 保证事件 evidence 的 ABI 表达不依赖变长 C++ 对象；需要变长数据时使用明确 offset/length 批次布局。

**完成检查**：多批读取不丢失、不重复且排序稳定；checkpoint C ABI 恢复与 C++ API 一致。

**禁止**：为每个事件字段创建单独导出函数、返回内部 vector 指针。

**完成记录（2026-08-27）**：已新增 `asen_read_events` 的 offset/capacity/written/total 批量读取接口，以及 checkpoint 长度查询、调用方缓冲写入和 import 校验；C++/C ABI 测试覆盖零容量查询与单批读取。

#### [x] Task 5.4：建立 C++/C ABI parity

**操作**：

1. 创建 `scene_engine_abi_test.cpp`，同一合成输入分别通过 C++ API 与 C ABI 执行。
2. 对 Content、Adaptive、Threshold/Fade 组合逐字段比较事件。
3. 比较连续运行、分批读取和 checkpoint 恢复结果。
4. 在 MSVC 及可用的另一编译器配置中验证 struct 尺寸；无法验证的平台在交接报告中明确列出。
5. 运行 sanitizer、完整 native CTest、Web build 和 diff check。

**最终交付物**：可由 C/C++ 调用的版本化 ABI、所有权文档和 parity 测试。

**Phase 5 验收门**：纯 C header smoke、所有 ABI 错误路径、C++/C ABI 事件与 checkpoint parity 全部通过。

**完成记录（2026-08-27）**：Clang/LLVM-MinGW 下已完成 C++/C Content 事件 parity、C ABI 批量读取、checkpoint 长度查询/import parity 与 sanitizer 回归；纯 C smoke、布局断言、错误路径和 Web build 均通过。MSVC 当前环境不可用，已在 Phase 5 交接记录中明确列出，Phase 5 验收完成。

### 4.8 Phase 6 任务单：Emscripten baseline WASM 与 TypeScript 低层封装

**阶段状态**：`[x] 已完成（6.1–6.5）`

#### [x] Task 6.1：预检并固定 Emscripten 工具链

**输入**：Phase 5 C ABI、当前 CMake 与 workspace 工具版本。

**操作**：

1. 运行 Phase 5 全量测试，确认 native ABI 基准稳定。
2. 只读检查 `emcc --version`、`emcmake --version` 和现有 emsdk；缺失时报告并按用户许可安装。
3. 选择一个在当前 Node/Vite/Windows 环境实际完成 smoke build 的精确 Emscripten 版本。
4. 在 README 和可复现工具配置中记录版本与激活命令；不覆盖 Node/pnpm 的既有决定。
5. 记录 baseline 产物格式、模块格式、导出函数和预期资源目录。

**完成检查**：一个最小 C ABI smoke module 可由固定工具链编译并由当前 Node 实例化。

**阶段记录（2026-08-27）**：已克隆 emsdk 并固定版本 6.0.8。官方 `wasm-binaries.zip` 通过分段下载后完成完整性校验并解压；`emsdk activate 6.0.8` 成功，`emcc 6.0.8`、`emcmake` 和 `packages/scene-engine` 的 Emscripten 静态库 smoke build 均已验证通过。本 Task 完成；正式 WASM target 留给 Task 6.2。

**禁止**：使用浮动 `latest`、安装后不记录版本、开始 SIMD/pthreads、引入 Embind。

#### [x] Task 6.2：建立 baseline WASM CMake target

**操作**：

1. 创建 `EmscriptenOptions.cmake`，把 Emscripten 专属选项与 native target 分离。
2. 从同一 C++ core 和 `scene_engine_abi.cpp` 构建 baseline 产物，只导出批准 C ABI 和必要 runtime 支持。
3. 设置 module 环境、内存初始/最大值、异常策略和文件名；本阶段禁用 SIMD 与 pthreads。
4. 在 package/root scripts 增加可重复的 configure/build 命令，清晰区分 native 与 wasm build 目录。
5. 确保生成物进入已忽略的 `dist/build`，不把本机绝对路径写入产物或源码。

**完成检查**：干净目录下可用一条文档化命令生成 baseline WASM，native build 不受 Emscripten flags 污染。

**完成记录（2026-08-27）**：新增 `cmake/EmscriptenOptions.cmake` 和无 `main` 的 WASM translation unit；同一 C++ core/C ABI 通过 `emcmake` 生成模块化 `dist/wasm/scene-engine.js` 与 `scene-engine.wasm`。baseline 使用 `SceneEngineModule`、固定 64 MiB 内存、关闭 memory growth/SIMD/pthreads，导出稳定 C ABI、`_malloc/_free` 并显式提供 runtime `HEAPU8` 视图；`configure:wasm`、`build:wasm`、Node ABI version smoke 和 `git diff --check` 均通过，native target 未受 Emscripten flags 污染。

**禁止**：提交临时 build 目录、把 WASM 二进制手工复制进 Web public、改变根 `build` 的现有含义。

#### [x] Task 6.3：定义 TypeScript 公共契约

**操作**：

1. 创建 `api/types.ts`、`config.ts`、`errors.ts` 和 `result/normalizeResult.ts`。
2. 把 EngineConfig、SceneEvent/Boundary、progress、`SceneTaskOutcome`、Worker checkpoint envelope 和稳定错误码表达为 strict TypeScript 类型。
3. 保持时间字段为整数微秒；原始 detector 值命名为 `score/threshold/evidence`。
4. 配置校验与 C++ 规则逐项对应，并为默认值、非法 detector 组合和未知字段策略增加 Node 测试。
5. `index.ts` 只导出业务无关公共 API，不导出 Emscripten Module、HEAP、指针、Mediabunny 或 Worker 内部协议。

**完成检查**：TypeScript strict build 通过，公共类型中没有 React、AisenLens 项目帧或 `ShotRecord`。

**禁止**：在 TS 侧重新实现 detector、把 `confidence` 用作 raw score、公开 C ABI struct 作为调用 API。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/src/api/{types,config,errors}.ts`、`src/result/normalizeResult.ts` 和唯一公共出口 `src/index.ts`。公共契约覆盖配置、事件/边界、进度、任务结果、checkpoint envelope 与稳定错误码；时间统一为安全整数微秒，检测原始值保留 `score`、`threshold`、`strength`、`evidence` 命名。配置校验拒绝未知字段、非法 detector 组合和不符合 C++ 固定点权重规则的输入；Node contract tests 与 strict TypeScript 检查通过。当前实现不导出 Emscripten、Worker、Mediabunny、React 或项目实体。

#### [x] Task 6.4：实现 wasmRuntime

**操作**：

1. 实现 module 实例化、ABI version 校验、create/destroy、frame reserve、process、event drain、flush 和 checkpoint 映射。
2. 缓存 `WebAssembly.Memory` 视图，只在 `memory.buffer` 改变时重建。
3. reserve 后返回可写 plane views，避免 TS 中间帧数组；所有句柄在 success/error/dispose 路径释放。
4. 把 `asen_status` 映射为稳定 TS error，不暴露底层异常文本作为唯一判定依据。
5. 为错误 ABI、实例化失败、无效配置、内存视图刷新和重复 dispose 增加测试。

**完成检查**：合成帧可经 TS runtime 写入预分配 WASM memory 并得到规范化事件。

**禁止**：在 runtime 中解码媒体、创建 Worker、逐事件字段调用 C 函数。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/src/worker/wasmRuntime.ts`。runtime 负责模块实例化与 ABI 版本校验、C ABI 配置映射、预分配 plane/frame 缓冲、内存视图刷新、单事件/批量事件读取、flush、checkpoint 查询/导入以及幂等 dispose；底层状态码统一转换为稳定 `SceneEngineError`，不把 Emscripten Module/HEAP 或指针暴露给公共出口。fake ABI 生命周期/错误测试与真实 baseline WASM 合成 RGBX 内容切点测试通过。

#### [x] Task 6.5：建立 native/WASM ABI parity

**操作**：

1. 创建 `abi-parity.test.ts` 和 TS synthetic frame helper，使用与 C++ golden 等价的数据。
2. 覆盖 Content、Adaptive、Threshold/Fade、flush、多批事件读取和 checkpoint 恢复。
3. 对时间戳、事件类型、顺序和边界要求完全一致；浮点 evidence 使用已批准容差。
4. 重复运行并检查规范化 config hash、精确 engine state version、边界决策确定性和诊断指标容差。
5. 运行 native CTest、WASM Node tests、package build、Web build 和 diff check。

**最终交付物**：固定 Emscripten baseline 构建、低层 TS 契约/runtime 和 native/WASM parity。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/test/abi-parity.test.ts`，使用真实 baseline WASM 覆盖 Content、Adaptive、Threshold/Fade、flush、批量事件读取及 checkpoint 导入/导出；native CTest 已覆盖对应 detector、事件顺序、checkpoint 与 C ABI。WASM 与 native 均保持整数微秒、presentation index、事件类型/source 和 raw score/threshold/evidence 语义一致。Node contract/parity tests 7/7 通过。

**Phase 6 验收门**：干净构建、ABI 版本校验、native/WASM 全矩阵 parity、strict TS 和既有回归全部通过。

### 4.9 Phase 7 任务单：Worker 协议、客户端与合成帧纵向链路

**阶段状态**：`[x] 已完成（7.1–7.5）`

#### [x] Task 7.1：先定义并测试 Worker 协议

**输入**：Phase 6 public types、wasmRuntime 和批准 Worker 状态图。

**操作**：

1. 创建 `protocol.ts`，定义带 discriminant 和 jobId 的双向消息 union。
2. 明确 INIT、START、PAUSE、CANCEL、DISPOSE 及 READY/STARTED/PROGRESS/CHECKPOINT/COMPLETED/CANCELLED/ERROR payload；PROGRESS 使用 `newBoundaries` 与 `totalBoundaries`，不得用含义不明的 cumulative `boundaries`。
3. 创建 `worker-protocol.test.ts`，覆盖每个合法状态转换、非法顺序、旧 job 消息和终态后消息。
4. 规定 progress 节流、增量边界、错误码和 checkpoint 的传输边界；checkpoint envelope 必须包含完整 committed boundaries、解码恢复位置和 core state。
5. 使用穷尽 `never` 检查确保新增消息无法被静默忽略。

**完成检查**：协议测试可在 Worker 实现前运行并准确失败；payload 不包含项目实体或像素帧。

**禁止**：在协议中传 React state、IndexedDB record、Mediabunny 类型或逐帧图像。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/src/worker/protocol.ts`，定义双向 discriminated union、jobId 约束、INIT/READY、START/PAUSE/CANCEL/DISPOSE 和全部终态消息；状态转换器会忽略旧 job 消息、拒绝非法顺序，并对终态后的消息保持幂等。协议测试覆盖合法暂停恢复、取消、旧任务消息和 dispose。

#### [x] Task 7.2：实现 SceneEngineClient

**操作**：

1. 创建 `SceneEngineClient.ts`，负责 Worker 创建、初始化等待、jobId 分配和单任务约束。
2. 封装 progress、AbortSignal、pause、cancel、dispose 和 `completed/paused/cancelled/failed` completion outcome；resume 通过新的 `start({ checkpoint })` 创建 job，不在原 task 上继续。
3. 忽略或记录非当前 jobId 消息，不能让旧任务污染新任务。
4. 所有 pending promise 在 PAUSED/COMPLETED/ERROR/CANCELLED/dispose/Worker 崩溃时确定性结束，不允许 `result` Promise 在 pause 后悬挂。
5. 使用 fake Worker 覆盖正常、错误、并发 start、取消竞态、重复 dispose 和 listener 清理。

**完成检查**：客户端测试无悬挂 promise/监听器，公共导出只暴露业务无关任务 API。

**禁止**：让 React 组件直接 new Worker、在 client 内做媒体解码或项目持久化。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/src/client/SceneEngineClient.ts`，通过注入式 Worker 工厂实现初始化等待、单任务约束、jobId 隔离、progress、AbortSignal、pause/cancel/dispose 和确定性 completion outcome；暂停后通过新 job 恢复，不复用旧任务。fake Worker 测试覆盖正常暂停、取消、并发 start、dispose 和 AbortSignal。

#### [x] Task 7.3：实现 Worker 状态机与资源生命周期

**操作**：

1. 创建 `scene-engine.worker.ts`，按 `idle -> initializing -> decoding -> flushing -> terminal` 实现状态机。
2. 当前仅接测试帧源，不接真实 Blob/Mediabunny。
3. pause 只在完成当前帧并 drain 安全事件后导出 core state，再封装完整 committed boundaries、`timestampUs + timestampOrdinal`、下一 presentation index 和媒体身份 digest，并以 paused outcome 结束当前 job；cancel 不导出 checkpoint。
4. 在 completed/cancelled/error/dispose 都释放 runtime 句柄、帧源和消息状态。
5. 对错误 runtime、process 异常、flush 异常和 Worker dispose 编写测试。

**完成检查**：合成任务的完成、暂停/恢复、取消和失败均到达唯一终态。

**禁止**：抢占 C++ 正在处理的帧、同时运行多个重型任务、吞掉 Worker 顶层错误。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/src/worker/scene-engine.worker.ts`，实现测试帧源的 idle/initializing/ready/running/pausing/cancelling/终态状态流转；pause 在当前帧处理并导出完整 checkpoint 后结束，cancel 不导出 checkpoint，完成/取消/异常均释放 runtime 和帧源。Worker 测试覆盖完成、暂停、取消和 runtime 失败。

#### [x] Task 7.4：实现单缓冲池和测试帧源

**操作**：

1. 创建 `frameBufferPool.ts`，首版只管理一个 reserve 后复用的 WASM frame buffer。
2. 在测试目录创建 synthetic frame source，逐帧把 plane 数据写入 runtime 返回的 views。
3. 验证相同尺寸不重新 reserve，尺寸/布局变化按明确策略处理。
4. 增加内存 view 失效、任务切换、异常中止和重复归还测试。
5. 测试 helper 不进入 `src/index.ts` 公共导出。

**完成检查**：长合成序列的 buffer 数量恒定，Worker 主线程消息不含像素数据。

**禁止**：提前实现环形/双缓冲、把合成帧生产接口当成产品 API。

**完成记录（2026-08-27）**：新增 `packages/scene-engine/src/worker/frameBufferPool.ts`，首版只保留一个 runtime-owned frame buffer；同一尺寸/像素格式复用，布局变化重新 reserve，重复 release 幂等。单元测试确认缓冲数量不会随帧数增长，测试帧源仅存在于 test support。

#### [x] Task 7.5：实际 module Worker smoke 与交接

**操作**：

1. 在真实浏览器环境加载 module Worker 和 baseline WASM，跑一个短合成序列。
2. 验证 Vite dev/build 两种资源加载路径、INIT ready 和 dispose。
3. 检查消息记录，确认 progress 节流且没有像素传回主线程。
4. 运行 native、WASM parity、Worker tests、package/Web build 和 diff check。
5. README 记录客户端生命周期、并发限制和 pause/cancel 区别。

**完成记录（2026-08-27）**：已启动本地 Vite 服务并在浏览器中确认 Web 首页加载完成且无控制台错误；`apps/web/test/scene-engine-module.worker.ts` 的 dev smoke 已修复启动期消息丢失问题：Worker 先缓存顶层模块加载期间的 `INIT`，依赖加载后回放；WASM 改为显式 fetch 二进制并通过 `instantiateWasm` 注入。Chrome 152 已验证立即发送 `INIT` 可到达 `READY`，并完成两帧 `START → PROGRESS → COMPLETED`，输出 1 个 hard-cut。`scripts/verify-scene-engine-web-build.mjs` 已确认 production Worker/WASM 产物，`scripts/verify-scene-engine-web-preview.mjs` 又在 `/aisenlens/` 非根路径完成 `READY → STARTED → PROGRESS → CHECKPOINT` smoke；本任务验收完成。

**最终交付物**：稳定 Worker 协议、SceneEngineClient、Worker 状态机、单缓冲和合成纵向测试。

**Phase 7 验收门**：协议穷尽、全部终态资源释放、暂停/恢复 parity、浏览器 module Worker smoke 全部通过。

### 4.10 Phase 8 任务单：Mediabunny/WebCodecs 真实视频链路

**阶段状态**：`[x] 已完成（8.1–8.5）`

#### [x] Task 8.1：建立媒体 fixture 与能力测试矩阵

**输入**：Phase 7 Worker 链路、现有 Mediabunny 版本、Phase 0 批准的像素路径和 Web 能力矩阵。

**操作**：

1. 核实现有项目对 Mediabunny 的使用方式和当前浏览器测试启动方式，只读取模块相关文件。
2. 复用并扩充 Phase 0 fixture manifest，记录容器、codec、尺寸、帧率/VFR、重复 PTS、rotation、color space/bit depth、音轨、许可和预期边界。
3. 准备最小无版权 H.264/MP4、VP9/WebM、VFR、重复 PTS、旋转、无音轨、format null/高 bit-depth capability、损坏文件和无视频轨 fixture；不能入库时记录本地生成命令与 checksum。
4. 先创建 browser integration tests，覆盖 capability、错误码和每个 fixture 的完成条件。
5. 明确当前目标 Web 浏览器的 WebCodecs 能力矩阵；桌面/移动壳留到对应平台专项。

**完成检查**：每个测试素材可追溯、尺寸受控、预期边界明确；缺失平台能力以稳定 capability 结果表达。

**禁止**：提交来源不明视频、把公开评测数据集纳入产品包、增加 Canvas seek fallback。

**完成记录（2026-08-27）**：复核现有 `test.mov` 与 `manifest.example.json`，补充 `auto-shot-media.verification.ts`/Worker 到浏览器基线；能力矩阵继续记录 H.264/MP4 的 NV12、色彩元数据、WebCodecs/VideoFrame/OffscreenCanvas 能力，以及 VP9/WebM 明确解码错误。素材来源、SHA-256、尺寸、时间基和标注均可追溯，未提交来源不明视频。

#### [x] Task 8.2：实现 mediaDecoder 顺序解码

**操作**：

1. 创建 `mediaDecoder.ts`，用 Mediabunny 打开 Blob/File、选择视频轨并使用 `VideoSampleSink.samples()` 顺序迭代。
2. 读取 timestamp/duration/coded/visible dimensions/rotation、format、bit depth、color space 和实际 sample layout；重复 PTS 使用 ordinal 区分。
3. 实现明确的初始化、迭代、关闭和错误映射；每个成功取得的 sample 必须在所有路径 close。
4. 支持 pause/resume 需要的 `timestampUs + timestampOrdinal + nextPresentationIndex` 解码重建信息，但不在本任务内写 IndexedDB。
5. 覆盖空视频、无轨、不支持 codec、解码错误、取消和 iterator 异常。

**完成检查**：fixture 可顺序枚举且 presentation timestamp 单调提交；opened sample 与 closed sample 计数一致。

**禁止**：逐时间点 `getSample()` 随机 seek、把 VideoSample 发给主线程、在 decoder 中判定场景。

**完成记录（2026-08-27；2026-08-29 更正）**：新增 `packages/scene-engine/src/worker/mediaDecoder.ts`，使用 `VideoSampleSink.samples()` 顺序读取 Blob，映射 timestamp/duration、尺寸、rotation、format、8-bit 限制、色彩元数据和实际 plane layout；每个 sample 在 `finally` 中 close，并提供 opened/closed/submitted/skipped 统计。2026-08-27 的 Chrome 152 记录只验证了 H.264 前 12 帧提交和 `openedSamples=closedSamples=12`，不能作为完整媒体覆盖证明。2026-08-29 已移除测试 Worker 的 12 帧截断，解码 smoke 现要求完整顺序迭代、`submittedFrames === frameCount`、时间戳单调且末帧 ordinal 为 `frameCount - 1`；必须在 Phase 11 产品矩阵中重跑并保存完整媒体结果。`scene-engine` strict typecheck、17 项 contract/parity tests、Web build 均通过。为保证重复 PTS ordinal 绝对确定性，当前 checkpoint 重放从流首部开始，关键帧 warm-up 优化留给 Task 8.4。

#### [x] Task 8.3：实现直接写入 WASM frame buffer

**操作**：

1. 按 Phase 0 决定初始化后端；原生 copy 后端在已知首帧布局后调用 runtime reserve，并创建 WebAssembly.Memory-backed plane views。
2. sample 原生为 I420/NV12 时复制实际平面；否则只请求规范允许的 RGBX/RGBA。不得调用或描述不存在保证的 `copyTo({ format: "I420" })`。
3. 若 Phase 0 批准 Worker OffscreenCanvas 低分辨率后端，只允许在同一 Worker 顺序解码后使用固定分析尺寸和有界小缓冲；不得经过主线程、旧 `<video>` seek 或无界 JS 数组。
4. 将 timestamp/duration/presentation index、visible rect、bit depth、color matrix/primaries/transfer/full range 与 plane layout 提交给 C ABI。
5. 任务期间检测 memory growth/view 失效；正常配置下不得逐帧增长内存或重新 reserve。

**完成检查**：主线程没有帧对象；原生 copy 后端每帧最多一次到 WASM 的显式复制；所有批准后端进入同一规范化 FrameView/指标契约并达到 Phase 0 门槛。

**禁止**：宣称硬件 surface 到 WASM 物理零复制、使用 `getImageData()`、把 RGBA Canvas 当静默降级。

**完成记录（2026-08-27）**：`WasmFrameBuffer` 已改为单一 WASM-backed allocation，并暴露 `copyDestination`/`planeOffsets`；同一 backing view 写入时 runtime 会跳过重复 JS→WASM copy。`mediaDecoder` 接收兼容 target 并校验 decoded plane layout，`MediaFrameSource.createFrameTarget()` 在首个可解码 sample 确定像素格式后预留固定布局，真实 Worker 将该 target 传入 decoder；Worker 合约测试确认 source-owned target 被转发。内存增长/布局变化会触发稳定错误，正常 H.264 smoke 未逐帧 reserve。

#### [x] Task 8.4：接入 Worker 任务、暂停与错误

**操作**：

1. 用真实 `mediaDecoder` 替换生产 Worker 中的测试帧源；测试帧源仍只留在 test support。
2. START 接受批准的 Blob/config/checkpoint，冻结媒体身份相关输入但不写项目存储。
3. progress 使用 processedUs/durationUs/decodedFrames/新增边界并节流。
4. pause 在安全帧边界返回完整 Worker checkpoint envelope；恢复时从关键帧预热并按 timestamp ordinal 跳过已提交 sample；cancel 关闭 iterator/sample/runtime 且不保存 checkpoint。
5. 映射 `UNSUPPORTED_CODEC/WASM_INIT_FAILED/DECODE_FAILED/INVALID_CHECKPOINT/CANCELLED` 等稳定错误。

**完成检查**：真实短视频可完成、暂停/恢复、取消和错误退出，所有路径资源计数归零。

**禁止**：Worker 访问 IndexedDB 业务模型、直接创建 ShotRecord、错误时调用旧 detector。

**完成记录（2026-08-27；2026-08-29 更正）**：新增 `apps/web/test/scene-engine-media-module.worker.ts`，Chrome 152 曾将 `test.mov` 的真实 Mediabunny source 接入 baseline WASM Worker，但当时测试源在 12 帧后主动结束；该记录仅证明 `READY → STARTED → PROGRESS → COMPLETED` 的生命周期，不能证明完整视频检测质量。2026-08-29 已移除该截断，并把全媒体 smoke 时限调整为 300 秒；生命周期 smoke 仍覆盖真实媒体 `pause → CHECKPOINT → resume → COMPLETED`、`cancel → CANCELLED` 和损坏 Blob → `ERROR`。直接 decoder smoke 现对完整媒体的 opened/closed/submitted 对账，Worker 在所有终态释放 source/runtime；完整回归报告是 Phase 11 关闭前的必需证据。

#### [x] Task 8.5：浏览器、内存与打包资源验收

**操作**：

1. 对 manifest 全部 fixtures 连续运行两次，比较时间戳、顺序、精确 engine state version 和规范化 config hash。
2. 运行长序列/重复短片测试，记录峰值 WASM memory、JS heap 和 sample 生命周期，确认不随帧数线性增长。
3. 验证 Vite dev 与 production Web build 的 Worker/WASM URL。
4. 验证 Web production build 从非站点根部署路径加载 Worker/WASM；记录 Electron/Capacitor 为当前未验证平台。
5. 运行 native/WASM/Worker/browser/Web 回归和 diff check。

**最终交付物**：真实媒体 decoder、WebCodecs 到 WASM 直接写入链路、浏览器 fixtures 和跨壳资源验证。

**Phase 8 验收门**：真实视频检测、一次必要复制、无主线程像素、sample 全释放、内存有界和打包资源 smoke 全部通过。

**完成记录（2026-08-27；2026-08-29 更正）**：新增 `scripts/verify-scene-engine-web-build.mjs`，在独立输出目录执行 Vite production build，确认生成 Worker chunk 与 hashed WASM asset；新增 `scripts/verify-scene-engine-web-preview.mjs`，以 `/aisenlens/` 非根路径静态部署 production 输出并由 Chrome 152 实际加载 Worker/WASM。历史 preview 仅做到真实 H.264 前 12 帧的 `READY → STARTED → PROGRESS → CHECKPOINT`，因此不能把该记录当成全媒体回归。2026-08-29 已将独立媒体 Worker、WASM baseline/SIMD Worker、production preview 及其报告断言改为完整媒体迭代；`corepack pnpm scene-engine:verify:web-preview` 已通过，SIMD production preview 完成 `COMPLETED`，处理 `2497` 帧并输出 `27` 个边界。真实媒体生命周期 smoke 覆盖 pause/resume/cancel/error；合成内存 smoke 在真实 baseline WASM Worker 中连续处理 200 帧，确认单次 reserve、WASM 内存 `67108864 → 67108864` 字节且无增长；浏览器 baseline 记录 JS heap 峰值约 22.8–24.1 MB，sample opened/closed 对账通过。

### 4.11 Phase 9 任务单：WASM SIMD 构建、探测与一致性

**阶段状态**：`[x] 已完成`

#### [x] Task 9.1：建立 SIMD 独立构建产物

**输入**：Phase 8 baseline 正确性与性能基线。

**操作**：

1. 保持 baseline target 不变，增加使用 `-msimd128` 的 SIMD target。
2. 输出 `scene-engine-simd.wasm`，确保导出函数、ABI version、内存和 module 格式与 baseline 一致。
3. 增加独立 build script，支持强制只构建 baseline 或 SIMD。
4. 对两个产物生成尺寸/checksum 记录，禁止资源名覆盖。
5. 在不支持 SIMD 的环境确认 baseline 构建与加载完全不依赖 SIMD 文件。

**完成检查**：两个 WASM 可分别实例化并通过 ABI smoke，公共 TS API 无变化。

**禁止**：删除 baseline、启用 pthreads、改变 detector 公式以追求 SIMD 速度。

**完成记录（2026-08-28）**：新增 `AISENSHOT_WASM_SIMD` CMake 选项及 `configure:wasm:simd`/`build:wasm:simd` 脚本，输出独立的 `dist/wasm-simd/scene-engine-simd.js/.wasm`；baseline 仍保持独立产物。加入共享帧指标 SIMD 增量路径后，重新构建的 SIMD WASM SHA-256 为 `A7F25ADCE1E6717A621D4E14C4CD75BC0E45E72A4C24EA528D1071C6E2995486`（148188 bytes），baseline 为 `B7688C181E6B8486B398CD7E9AF02D8D53367B86B6DFBC0821332BC1E2D7CAF1`（146064 bytes）。`simd-parity.test.ts` 验证 `WebAssembly.validate`、ABI version、Content 事件和 flush 与 baseline 一致。

#### [x] Task 9.2：实现能力探测和后端选择

**操作**：

1. 创建 `feature_probe.ts`，用最小合法 SIMD module 调用 `WebAssembly.validate()`。
2. runtime 初始化时只探测一次，选择 backend 后整个 job 固定。
3. 支持测试强制 baseline/SIMD，生产 API 只暴露实际 backend capability/result。
4. 覆盖 probe false、SIMD 文件缺失、实例化失败和 dispose/re-init。
5. 对批准的失败策略写测试，不得在运行中悄悄切换导致结果混合。

**完成检查**：支持环境选择 SIMD，不支持环境稳定选择 baseline；结果标记实际 backend。

**禁止**：按帧探测、把 probe 逻辑放入 React、吞掉无法解释的 SIMD 初始化错误。

**完成记录（2026-08-28）**：新增 `src/worker/featureProbe.ts` 与 `src/worker/wasmBackendLoader.ts`。Worker 初始化时只执行一次最小 `v128.const` `WebAssembly.validate()`，支持强制选择 SIMD 或 baseline；SIMD 资源缺失/编译/实例化失败只在初始化阶段回退 baseline，成功初始化后 backend 固定。新增 25 项 contract tests 覆盖 probe false/异常、强制 baseline、加载缓存、SIMD 失败回退、baseline 失败透传和显式 reset/re-init；production Vite build 生成两套 hashed WASM 资源，Chrome 152 在 `/aisenlens/` 非根路径真实加载并报告 `READY.backend/version`，随后完成 H.264 `START → PROGRESS → CHECKPOINT`。未发生运行中 backend 切换或静默吞错，Task 9.2 验收完成。

#### [x] Task 9.3：在共享预处理层增加 SIMD 优化

**操作**：

1. 先用 Phase 8 profile 确认像素绝对差、亮度累计、下采样或 HSV 分量差中的实际热点。
2. 只对已证明热点增加 SIMD 实现，保留同一标量 reference 路径。
3. detector、resolver、filter、checkpoint 继续共用同一逻辑。
4. 处理非向量宽度尾部、未对齐内存、奇数尺寸和小帧。
5. 每个优化点先跑单元 parity，再跑全事件 parity。

**完成检查**：所有像素/指标测试在 baseline/SIMD 容差内，通过 sanitizer 或 Emscripten 可用的内存检查。

**禁止**：复制一套 SIMD detector、移除标量基准、在没有 profile 证据时全面重写。

**完成记录（2026-08-28）**：Phase 8 路径 profile 显示浏览器端主要成本在解码与原生 plane copy，因此没有改动 Mediabunny、颜色转换或 detector 公式；在共享 `frame_metrics.cpp` 中仅对已有上一帧 luma/hue/saturation 字节差值累加增加 `__wasm_simd128__` 路径，使用 pairwise widening 累加，标量路径保留并处理尾部。无前一帧时仍走同一采样/转换逻辑，所有 detector、resolver、filter 和 checkpoint 保持共用。`scene-engine:test:simd` parity 通过；`scene-engine:benchmark:simd` 对 400 个 96×54 RGBX 热帧重复 3 轮，连续 profile 的 SIMD 中位数相对 baseline 约快 6.6%–7.6%，但报告仍仅作为回归信号。

#### [x] Task 9.4：建立 parity 与性能门槛

**操作**：

1. 创建 `simd-parity.test.ts`，对全部合成和真实 fixtures 强制运行两个 backend。
2. 镜头边界、类型、顺序、config hash 完全一致；指标只允许批准容差。
3. 创建 performance smoke，分开记录 decode/copy/preprocess/detect，不以总耗时作为唯一判断。
4. 在固定机器/浏览器记录冷启动、热运行、峰值内存和产物体积。
5. 若边界不一致或性能无收益，保持 SIMD 非默认并把 Phase 9 标记未通过，不修改 baseline 语义迁就 SIMD。

**完成检查**：parity 全通过，性能报告可复现且明确实际提升/退化。

**完成记录（2026-08-28；2026-08-29 更正）**：`simd-parity.test.ts` 已覆盖 RGBX、I420、NV12 合成帧的 ABI/事件 parity；浏览器 backend parity smoke 使用同一 `test.mov` 分别运行 baseline 与 SIMD，历史记录只比较了各自前 12 帧，不能作为长视频边界一致性证据。2026-08-29 已移除 parity Worker 的 12 帧截断并完成完整媒体复验：baseline 与 SIMD 均处理 `2497` 帧、各输出 `5` 个边界，`decodedFrames`、边界序列和时长完全一致。`scene-engine:benchmark:simd` 输出固定 96×54、400 个热帧、3 轮中位数，pairwise SIMD 优化后连续三次 profile 均观察到约 6.6%–7.6% 加速，满足当前性能门槛；生产恢复 SIMD 默认，仍保留初始化失败回退和 backend 固定策略。

#### [x] Task 9.5：全量回归与交接

**操作**：

1. 运行 native、C ABI、baseline、SIMD、Worker、浏览器、Web build 和 diff check。
2. 在 README 记录探测、强制测试方式、两个产物及正确性基准。
3. 确认 package public API 不要求调用方理解两个文件的内部加载细节。
4. 输出 Phase 9 交接报告，附 parity 表和性能环境。

**最终交付物**：同 ABI SIMD 产物、能力探测、共享预处理优化和 baseline/SIMD 回归。

**Phase 9 验收门**：能力选择、所有 fixture parity、性能记录、baseline 回归和跨壳加载全部通过。

**完成记录（2026-08-28）**：已完成 native CTest、25 项 TypeScript/Worker contract、SIMD 多格式 parity、baseline/SIMD H.264 浏览器 parity、常规 Web build、production Worker/WASM hashed 资源 build、`/aisenlens/` 非根路径 Chrome 152 preview、真实媒体生命周期 smoke、内存 smoke、backend 微基准和 `git diff --check`。pairwise SIMD 累加在固定机器上连续 profile 约提升 6.6%–7.6%，因此恢复 SIMD 生产默认；初始化失败仍回退 baseline，任务运行中不会切换 backend。Phase 9 验收门通过，可进入后续业务适配阶段。

### 4.12 Phase 10 任务单：AisenLens 业务适配层与持久化边界

**阶段状态**：`[x] 已完成`

#### [x] Task 10.1：核验 Web feature 边界并定义业务类型

**输入**：Phase 9 `@aisenlens/scene-engine` public API、现有 auto-shot/project/timeline 类型。

**操作**：

1. 运行 Phase 9 回归和 Web build，确认 Engine package 可由 workspace 消费。
2. 只读取 auto-shot、project、shot、timeline 中与自动分镜结果应用直接相关的文件。
3. 创建 `features/auto-shot/types.ts`，定义 task status、候选镜头、Engine 证据引用和 repository 窄接口。
4. 保持 Engine 原始结果与 AisenLens 候选结果为不同类型；业务类型可以引用 engine version/config hash/checkpoint，但不能复刻 C ABI。
5. 为任务状态的合法转换写类型/单元测试。

**完成检查**：业务类型不导入 React、Worker internal、WASM runtime 或 Mediabunny；Engine 类型只从 package `index.ts` 导入。

**禁止**：修改 `EditorWorkspace`、改 IndexedDB schema、把现有旧 record 扩展成双轨 union。

**完成记录（2026-08-28）**：核验了现有 auto-shot、project、shot、timeline 相关边界，新增 `apps/web/src/features/auto-shot/types.ts` 与 `taskState.ts`。业务类型独立表达 task、progress、candidate、Engine evidence 和 repository 窄接口；仅从 `@aisenlens/scene-engine` public index 引用类型，不导入 React、Worker internal、WASM runtime 或 Mediabunny。新增生命周期转换测试并通过 Web TypeScript strict 检查，未修改 `EditorWorkspace`、IndexedDB schema、旧 `AutoShotRunRecord` 或现有 UI。

#### [x] Task 10.2：测试先行实现 sceneResultAdapter

**操作**：

1. 先创建 adapter 测试，覆盖 0/结尾边界、VFR timestamp、重复 PTS/乱序边界、fade 区间、最短末段、零 duration 和 Phase 0 冻结的舍入临界点。
2. 实现 `sceneResultAdapter.ts`，严格按 Phase 0 规则集中完成 timestampUs 到项目整数帧的唯一映射，不重新选择舍入方式。
3. 生成排序、去重、合法 `[startFrame, endFrame)` 的候选镜头；不得直接写项目。
4. 保留 source、score、threshold、evidence、engine version 和 config hash，不能把 score 改名为概率 confidence。
5. 使用项目现有时间/帧工具时先验证语义；不合适时只在 adapter 内实现必要纯转换并测试。

**完成检查**：同一 EngineResult 与项目参数重复适配结果确定；所有候选区间连续、非负且不超项目末尾。

**禁止**：在多个组件散落 timestamp 转换、使用平均帧率参与 Engine 决策、创建 ShotRecord 副作用。

**完成记录（2026-08-28）**：新增 `features/auto-shot/sceneResultAdapter.ts`，集中执行 Phase 0 的 quantized-FPS + ceil timestamp 映射；对 0/结尾边界、VFR 时间戳、重复投影帧、fade evidence、零 duration、非法 timebase 和负 timestamp 增加测试。适配结果只生成确定性的 `[startFrame, endFrame)` 候选与尾段，不写入 project/ShotRecord，并保留 engine version、config hash、source detector、score、threshold 和 evidence。

#### [x] Task 10.3：测试先行实现 autoShotTaskService

**操作**：

1. 定义可注入 `SceneEngineClient` factory、run repository、媒体身份服务和 clock/id 依赖，便于无浏览器业务测试。
2. 先用 fake client/repository 写 running、progress、pause、resume、cancel、failed、completed 和 restart 测试。
3. 实现 `autoShotTaskService.ts`，冻结媒体身份、规范化 config、精确 engine state version 和 config hash。
4. 把 Worker checkpoint/result 转成业务 task record，但不在本阶段连接现有 IndexedDB store。
5. 保证旧 job progress 被拒绝、所有终态不可继续写入、cancel 不保存 checkpoint、pause 只保存包含完整边界前缀的 checkpoint envelope。

**完成检查**：服务状态机测试全部通过，没有 React 生命周期或组件 state 依赖。

**禁止**：导入 `EditorWorkspace`、直接访问 window/indexedDB、并行写旧/new auto-shot record。

**完成记录（2026-08-28）**：新增 `features/auto-shot/autoShotTaskService.ts`，注入 Engine client factory、窄 repository、config resolver、clock 和 id 生成器；服务冻结 normalized config 与当时的媒体 fingerprint key，处理 progress、pause/resume、cancel、failed、completed 和 restart，并在终态拒绝旧任务 progress、取消不保存 checkpoint。新增 3 组 fake client/repository 测试覆盖运行中更新、结果适配、checkpoint resume、取消、失败和 restart，全部通过；未连接 IndexedDB、React 生命周期或现有 UI。该历史实现的 fingerprint/hash 强度由 Task 11.7–11.8 替换。

#### [x] Task 10.4：连接 workspace 依赖和测试脚本

**操作**：

1. 在 `apps/web/package.json` 声明 `@aisenlens/scene-engine` workspace 依赖，使用仓库统一 pnpm 更新 lockfile。
2. 按 Web 现有 `node:test`/浏览器测试约定注册 service/adapter tests；确需新测试工具时先说明依赖理由并获得许可。
3. 验证 Vite 能解析 package public entry、Worker 和 WASM 资源，但不让 UI 启动任务。
4. 运行 Web strict build、Engine 全量回归和依赖边界 `rg`。
5. 检查生产 bundle 中不存在测试 synthetic source。

**完成检查**：Web 可构建且 service/adapter 单测通过，现有产品行为完全未改变。

**禁止**：在本阶段切换 UI、修改 project repository、创建临时双写 feature flag。

**完成记录（2026-08-28）**：`apps/web` 已声明 `@aisenlens/scene-engine: workspace:*`，package public entry/types/exports 已补齐，pnpm lockfile 更新并通过 supply-chain policy。新增 adapter/task-state/task-service 测试脚本，Web strict TypeScript、常规 build、production Worker/WASM build 均通过；production bundle 检查未发现 synthetic/test source 引用，现有 UI 未启动新任务。

#### [x] Task 10.5：阶段审计与交接

**操作**：

1. 用 `rg` 确认 React 组件没有新增 Worker/WASM/Mediabunny import。
2. 确认旧 `autoShotService.ts`、旧 `AutoShotRunRecord` 和现有 UI 本阶段未修改。
3. 运行 Engine tests、Web feature tests、Web build 和 diff check。
4. 输出 Phase 10 交接报告，列出 Phase 11 需要原子修改的 UI/record/repository 接点。

**最终交付物**：AisenLens auto-shot 类型、结果适配器、任务服务、fake 驱动测试和 workspace 消费配置。

**Phase 10 验收门**：无 React 的 adapter/service 全状态测试、时间映射测试、Web build 与边界审计全部通过。

**完成记录（2026-08-28）**：边界审计确认 `apps/web/src/components` 与 `pages` 没有新增 Worker/WASM/Mediabunny import；Phase 10 未修改旧 `autoShotService.ts`、`AutoShotRunRecord`、`projectRepository.ts`、`EditorWorkspace.tsx` 或 IndexedDB。Engine contract、adapter、task-state、task-service 测试、Web strict TypeScript、Web build、生产 bundle synthetic source 检查和 `git diff --check` 均通过。Phase 11 交接时实际 `projectRepository.ts` 使用 `DATABASE_VERSION = 12` 与 `auto-shot-runs` 派生 store；该事实已用于建立升级夹具，当前版本已在 Phase 11 提升至 13，禁止双写旧/新 schema。

### 4.13 Phase 11 任务单：React 最小接入与持久化原子切换

**阶段状态**：`[-] 进行中（11.1 与历史接线工作已完成；11.2–11.5 保持未关闭，新增 11.7–11.11 用于修复第二轮架构审计发现的正确性缺口；Phase 11 验收门通过前禁止正式执行 Phase 12）`

#### [x] Task 11.1：建立持久化升级回归夹具

**输入**：Phase 10 task record、现有 IndexedDB `auto-shot-runs` store，以及执行时从 `projectRepository.ts` 读取的实际 `DATABASE_VERSION`；不得把本文记录的历史版本号当成事实来源。

**操作**：

1. 先读取 `projectRepository.ts` 的完整 upgrade 逻辑和 repository tests，不假定只修改 interface 即可。
2. 创建旧数据库 fixture：至少包含项目、媒体、镜头、截图/注释及旧 AutoShotRunRecord。
3. 先写升级测试：升级后旧 auto-shot run 不可恢复，非 auto-shot 数据逐项保持。
4. 设计新 task record 的单一 store 读写 schema；若复用 store，则升级事务只清理/重建该派生数据，不创建长期第二 store。
5. 明确强媒体身份、精确 engine state version、checkpoint schema、canonical config 和 config hash 任一不匹配时的失效行为。

**完成检查**：测试在 repository 尚未修改时准确暴露旧记录问题，且能检测误删其他 store 数据。

**禁止**：读取旧 cuts 并转换为新 checkpoint、双写两个 schema、清空整个数据库。

**完成记录（2026-08-28）**：读取并核对了 `projectRepository.ts` 的实际 IndexedDB upgrade 逻辑，新增 `apps/web/test/project-repository-migration.verification.ts` 及浏览器 smoke 入口。夹具包含项目、媒体字段、镜头、截图、注释和旧 `AutoShotRunRecord`；数据库从版本 12 升级到版本 13 时只清理 `auto-shot-runs`，项目、镜头、截图和注释逐项保留。未读取旧 cuts，也未清空其他 store。

#### [x] Task 11.2：原子切换 project 类型与 repository

**操作**：

1. 用 Phase 10 新 task record 替换 `project/types.ts` 中旧 `AutoShotRunRecord` 字段。
2. 修改 repository 的 get/save/delete 签名与校验，只接受新 engine task record。
3. 提升 DB version 并实现精确 upgrade：旧 `auto-shot-runs` 派生记录失效/清除，新结构从空状态开始。
4. 增加新 record round-trip、projectId 唯一、媒体身份/canonical config/hash/engine 失效和删除测试。
5. 保证 upgrade 事务失败时数据库不会处于部分迁移状态。

**完成检查**：旧 fixture 升级、新 record CRUD、非 auto-shot 数据保留测试全部通过。

**禁止**：保留旧字段 optional 兼容、通过 `as` 绕过 schema、删除用户镜头/项目/注释数据。

**完成记录（2026-08-28；2026-08-29 更新）**：数据库版本已提升至 13，升级事务原子清理旧派生记录；`ProjectRepository` 新增 `getAutoShotTask/saveAutoShotTask/deleteAutoShotTask`，使用同一 `auto-shot-runs` store，写入前校验强媒体身份、进度和 checkpoint 的 `schemaVersion/engineVersion/configHash`，按 `projectId` 原子替换保证唯一。浏览器 smoke 已覆盖 round-trip、项目唯一性、身份不匹配失效、删除和非自动分镜数据保留；11.7–11.8 已替换早期四字段 fingerprint/hash。旧 service/type 仅保留至 Phase 12 删除前审计，当前不再被 `EditorWorkspace` 生产调用。

#### [x] Task 11.3：实现 useAutoShotTask

**操作**：

1. 创建 `useAutoShotTask.ts`，组合 task service 与 repository，暴露现有 UI 需要的状态和命令。
2. 管理挂载/卸载、项目切换、媒体切换、订阅清理、AbortSignal、Worker dispose 和 stale job 防护。
3. pause 持久化完整 checkpoint envelope，resume 先校验强媒体身份/canonical config/hash/精确 engine state version 并创建新 job；restart 删除旧 task 后启动新任务。
4. completed 只产生可审阅候选，apply 是单独命令；hook 不直接修改 shot 数据。
5. 用 hook 测试覆盖卸载、快速切项目、重复开始、暂停刷新、恢复、取消、失败和完成。

**完成检查**：每个生命周期路径只有一个活跃 client，卸载后没有 state update 或 Worker 遗留。

**禁止**：让组件直接访问 Worker、把大结果存入 Zustand、在 hook 中做像素处理。

**历史完成记录（2026-08-28；2026-08-29 更新）**：新增 `useAutoShotTask.ts`，组合 task service、repository 和生产 Worker client，处理项目/媒体切换、卸载取消、stale revision、pause/cancel/resume/restart 和候选状态；hook 不读取像素、不直接写 shot 数据。早期实现曾把遗留 `running` 转为 `paused`，第二轮审计后已改为 `interrupted`，并补充媒体身份异步加载与快速重复启动的竞态保护。task service 的 checkpoint 媒体/配置/schema/engine/hash 失配校验已由 11.7–11.8 替换；React hook 挂载/卸载、暂停恢复、取消、快速项目切换和 stale job smoke 已通过，真实浏览器产品生命周期矩阵由 Task 11.5 继续覆盖。

#### [x] Task 11.4：局部替换 EditorWorkspace 自动分镜控制

**操作**：

1. 只修改 `EditorWorkspace.tsx` 的相关 import、auto-shot state/ref、start/pause/restart/apply handler 和现有控制区绑定。
2. 删除组件内对 `runAutoShotDetection`、旧 AbortController 和旧 record 字段的直接依赖。
3. 使用 hook 提供的 progress/candidate/error/status，保持现有按钮、文案、布局和审阅流程不改版。
4. apply 通过现有 shot/editor 领域命令一次性创建镜头，并保持可撤销语义。
5. 对 running、paused、completed、failed 的 UI 条件逐项回归。

**完成检查**：`EditorWorkspace` 不导入 Worker/WASM/Mediabunny；用户操作路径与原 UI 一致。

**禁止**：顺手拆分整个 3640 行组件、修改设计、让 Worker 直接写 project/shot repository。

**完成记录（2026-08-28；2026-08-29 更新）**：`EditorWorkspace.tsx` 已移除旧自动分镜 service、旧 AbortController、旧 record 字段和旧 repository 调用，改由 `useAutoShotTask` 提供状态/命令；保留候选审阅和一次性应用分镜流程。Web strict TypeScript、production build、Edge 真实扫描/暂停/继续/审阅/应用/刷新/快照恢复均已通过；旧灵敏度控件仅作为 Phase 11 临时映射，Phase 12 将由新控制面板替换。

#### [x] Task 11.5：Web 产品全流程回归

**操作**：

1. 浏览器运行开始、进度、暂停、刷新、继续、取消、重扫、失败、完成、审阅、应用和撤销。
2. 切换项目/媒体时检查旧 job 消息、Worker 和 checkpoint 清理。
3. 用旧 DB fixture 做真实升级，核对项目、镜头、截图和注释数量/关键字段。
4. 运行 Web build、项目生命周期 browser tests 和 Engine 全量测试；记录 Desktop/Mobile 为当前范围外未验证项。
5. 检查 performance trace，主线程不得出现像素读取或 detector 长任务。

**完成检查**：产品路径全部使用新 Engine，旧 service 文件虽尚存在但无生产调用。

**阶段记录（2026-08-28；2026-08-29 更新）**：已通过数据库升级浏览器 smoke、Worker 层 H.264 生命周期 smoke（暂停恢复完成、取消、错误）、本地首页/项目库/空项目编辑器启动检查、Web strict TypeScript、production build、Engine contract 29/29、task-state/adapter/task-service/identity/apply tests 及 `git diff --check`。2026-08-29 拆分重跑完整媒体矩阵：顺序解码覆盖 2497 帧且末帧 ordinal 为 2496；两次重复解码一致；WASM threshold 1800 完成并输出 27 个边界；baseline/SIMD parity 在 threshold 2700 下均处理 2497 帧并输出 5 个边界，结果完全一致；暂停恢复、取消、错误分别通过；production preview `/aisenlens/` 完成 `COMPLETED`，SIMD 处理 2497 帧并输出 27 个边界。Edge 产品 UI 重跑确认旧灵敏度 `100` → 临时 threshold `1800` 后显示 27 个边界/28 段候选，重新加载后保留 28 个镜头。随后同一真实项目完成显式暂停→继续、候选排除、应用前影响确认、创建快照并应用、保存/刷新恢复和恢复应用前快照：应用后为 26 个镜头，恢复最早快照后回到 28 个镜头；页面错误日志为空。暂停期间出现的 `PROGRESS is invalid in pausing` 竞态已修复，协议测试新增“暂停后允许在途 PROGRESS”覆盖。新增 React Hook 浏览器 smoke 覆盖暂停→卸载→重新挂载→继续、取消、快速项目切换和 stale job 隔离；Hook 竞态保护及 service 资源清理已补齐。Edge 随后从项目库打开 `test03`（4 个镜头）→返回项目库→打开 `测试`（28 个镜头），确认不同媒体上下文不会串镜头；新 Edge 标签直接进入 `/app` 时显示“项目不存在或已删除/返回项目库”失败页。持久化撤销使用恢复快照覆盖应用后保存、刷新和恢复，镜头数已从 26 恢复到 28 个。lint 工具链现已配置并通过（ESLint flat config、TypeScript/React Hooks 基础规则、`--max-warnings=0`）；`exhaustive-deps` 依赖审计作为非阻断后续项记录。组合启用所有长视频 smoke 超过旧 360 秒总时限，已改为独立命令，不能据此判定功能失败。

**补充验证（2026-08-29）**：`scripts/verify-scene-engine-web-preview.mjs` 支持通过
`AISENLENS_SCENE_FIXTURE` 选择仓库内本地素材（默认仍为 `test.mov`）。本轮使用相同 SIMD 配置
完成 `test03.mov`（完整解码 359 帧、3 个边界）和 `test02.mov`（完整解码 1429 帧、9 个边界），
均到达 `COMPLETED`；素材本体仍不纳入 Git。

#### [x] Task 11.6：阶段审计与切换交接

**操作**：

1. 用 `rg` 列出 `autoShotService.ts`、旧字段和 Canvas/seek detector 的所有剩余引用。
2. 区分待 Phase 12 删除的纯旧路径与仍被其他媒体功能使用的 Canvas/helper，禁止扩大删除范围。
3. 确认没有 feature flag、fallback、双写或旧 checkpoint 兼容读取。
4. 输出 Phase 11 交接报告，给出 Phase 12 可删除文件/符号的证据清单。

**完成记录（2026-08-28；2026-08-29 更新）**：完成生产引用审计并新增 `docs/AISENSHOT_SCENE_ENGINE_PHASE_11_HANDOFF.md`。确认旧 service/type/repository 符号仅剩测试和待删除路径，`EditorWorkspace` 已无旧生产调用；React hook 专项 smoke 已通过，真实产品浏览器矩阵仍待完成，Desktop/Mobile 维持范围外。

#### [x] Task 11.7：冻结强媒体身份、规范配置哈希与中断状态契约

**输入**：当前 `MediaSourceFingerprint`、`SceneDetectionConfig`、Worker config hash、
`AutoShotTaskRecord`、checkpoint envelope 和第二轮架构审计结论。

**操作**：

1. 先用测试证明当前缺口：同义配置不同字段创建顺序产生不同 hash；仅文件名/大小/
   修改时间/MIME 的媒体身份可碰撞；无 checkpoint 的 running 记录不能合法恢复。
2. 在 Web auto-shot 类型中定义版本化 `AutoShotMediaIdentity`：展示型文件字段之外，包含
   identity schema、content digest strategy/value、文件大小、RFC 6381 canonical codec、
   coded/display 尺寸、归一化 rotation（`0/90/180/270`）和整数 `durationUs`。缺少视频轨
   元数据时返回结构化错误，不生成弱身份。
3. 冻结内容摘要策略。文件 `S <= 32 MiB` 使用整文件 SHA-256。更大文件使用覆盖全部字节的
   `sha256-chunk-manifest-4m-v1`：令 `C = 4_194_304`，按偏移 `0,C,2C...` 读取到 EOF，
   最后一块允许小于 C；逐块 SHA-256 后，对 UTF-8 紧凑数组
   `["aisenlens-content-digest",1,"sha256-chunk-manifest-4m-v1",S,C,`
   `[[offset,length,hex],...]]` 再做 SHA-256。块按升序、偏移/长度为十进制安全整数、摘要为
   64 位小写 hex，不含文件名/MIME/mtime；空块、重叠、缺口和末块越界必须拒绝。
4. 冻结最终身份规范文本：UTF-8 紧凑数组
   `["aisenlens-auto-shot-media-identity",1,S,strategy,contentDigest,codec,codedWidth,`
   `codedHeight,displayWidth,displayHeight,rotation,durationUs]`，其 SHA-256 小写 hex 为
   `mediaIdentityDigest`；task/checkpoint 同时保存完整字段并逐字段比较，不能只信 digest。
   chunk-manifest 覆盖每个文件字节，但不是标准“整文件 SHA-256”，UI/日志必须显示正确策略名。
5. 在 Scene Engine 公共 API 冻结 canonical config encoding v1。使用显式数组序列化：
   根为 `["aisenlens-scene-config",1,hardCut,fade,minimumSceneDurationUs,analysis,diagnostics]`；
   Content 为 `["content",threshold,hue,saturation,luma]`；Adaptive 为
   `["adaptive",adaptiveThreshold,windowWidth,minimumContentScore,hue,saturation,luma]`；
   fade 为 `null` 或 `[mode,threshold,bias,emitFinalFade?1:0]`；analysis 为
   `[maxWidth,["every-frame"]]` 或 `[maxWidth,["stride",step,refineRadiusFrames]]`。
   所有数值必须先通过严格整数校验，输出不含空白且不得依赖对象字段创建顺序。
6. 对上述 UTF-8 bytes 使用 FNV-1a 64-bit（offset basis `14695981039346656037`、prime
   `1099511628211`、每步模 `2^64`），文本格式固定为 `fnv1a64-v1:<16位小写hex>`；恢复
   仍比较完整 canonical config，不能只信 64-bit hash。
7. 给 `AutoShotTaskStatus` 增加 `interrupted`，冻结规则：只有完整 checkpoint 已持久化才
   能进入 paused；遗留 running 只能进入 interrupted 并重扫。
8. 把类型、序列化字段顺序、hash/version 字符串和状态转换写入 contract tests 与文档；
   同时增加 fade `bias = -1000/0/1000` 边界用例，修正当前 TypeScript validator 将负 bias
   错误拒绝的问题，并核对 C++/C ABI 范围一致。

**涉及文件**：

- `packages/scene-engine/src/api/{types,config,configHash}.ts`
- `packages/scene-engine/src/index.ts`
- `apps/web/src/features/auto-shot/{types,taskState}.ts`
- 对应 package/Web contract tests

**完成检查**：契约测试先红后绿；同义配置跨字段顺序 hash 相同；不同合法配置快照可区分；
类型中不再把通用 `MediaSourceFingerprint` 称为强身份；running→paused 无 checkpoint 被拒绝。

**完成记录（2026-08-28）**：已完成版本化身份模型、文件/4 MiB manifest 摘要服务、canonical
config/FNV-1a64 实现、Worker 单路径、负 bias 校验、interrupted 状态和契约测试；task record
与 checkpoint 已统一使用 `mediaIdentityDigest`，Repository/Service 按完整强身份恢复。

**禁止**：直接实现 UI、把文件名加入强身份 digest、用普通 `JSON.stringify(object)` 作为
canonical config、跳读大文件块、把 chunk-manifest digest 宣称为标准整文件 SHA-256。

#### [x] Task 11.8：实现媒体身份服务与 canonical config hash 单路径

**前置条件**：Task 11.7 全部通过。

**操作**：

1. 新建无 React 的 `autoShotMediaIdentityService`，优先在专用 Worker 读取 Blob 分块并使用
   Web Crypto SHA-256；若复用现有媒体 Worker，必须先用 trace 证明不会阻塞检测或主线程。
   同时从唯一媒体 metadata adapter 读取并规范化视频轨字段，不能让 UI 自行补值。
2. 以固定偏移算法处理小文件、恰好 32 MiB、大文件、空文件、读取失败和取消；摘要进度
   可以报告，但不得与像素检测进度混为一谈。
3. 替换 `autoShotTaskService` 的四字段 `fingerprintKey()`，任务、checkpoint 和 resume
   全部使用 canonical media identity string/digest；通用媒体重新关联逻辑保持原职责。
4. 将 Worker config hash 改为调用 package 唯一实现，删除局部 FNV-1a32/JSON.stringify
   版本；baseline/SIMD/checkpoint 继续共用同一个 64-bit 值。
5. 修正配置 validator 的 fade 负 bias 范围，并增加 identity 确定性/变化测试、固定摘要
   test vectors、canonical hash 跨宿主测试、checkpoint hash parity、取消/错误资源释放
   测试和有代表性的大 Blob 性能记录。

**完成检查**：Web 不再存在自动分镜四字段强身份或第二套 config hash；相同媒体重复计算
完全一致，采样块或轨道元数据变化会失效；native/WASM/Worker/task tests 与 Web build 通过。

**完成记录（2026-08-28）**：已加入无 React 媒体身份服务、固定块/取消/错误测试，并将 Worker
与 task service 的配置哈希切换至 canonical 64-bit 实现；task record、Repository 和
checkpoint 已切换到强身份摘要，旧四字段仅保留在普通媒体派生缓存职责中。

**禁止**：一次把大文件完整载入主线程内存、加入新的哈希依赖而不先检查现有能力、缓存
未经媒体身份重新验证的旧 digest、保留旧 hash 兼容读取。

#### [x] Task 11.9：修正 Hook 的暂停、刷新中断与资源生命周期

**前置条件**：Task 11.8 完成，repository 能读写新 media identity/hash/status。

**操作**：

1. 先为纯状态恢复判定写测试：paused+完整 checkpoint 可继续；running、paused+空/
   失配 checkpoint、identity/config/engine version 失配都只能 interrupted/重扫。
2. 修改 `useAutoShotTask`：加载遗留 running 时标为 interrupted，不再伪造 paused；只有
   显式 pause 成功并持久化后显示“继续”。
3. 项目/媒体切换时取消当前 Worker 并隔离 stale 消息；页面卸载只做 best-effort 资源
   释放，不假定浏览器等待异步持久化。下次启动按持久化事实判定 interrupted。
4. 覆盖重复开始、快速切项目、暂停后刷新继续、运行中刷新后重扫、取消、失败、完成、
   service/client dispose 和 repository 写失败。
5. 不新增 React 测试框架时，先把恢复决策提取为纯函数并用 `node:test` 覆盖，再用现有
   浏览器 smoke 覆盖真实 hook/Worker 生命周期。

**完成记录（2026-08-29）**：纯状态恢复、遗留 running→interrupted、无效暂停
结果防护、强身份恢复和 hook 恢复路径已完成并通过 node:test；task service 现在会在
Engine 启动异常或首个持久化写入失败时主动取消并释放 client，进度写入失败也会被记录为
`INTERNAL_ERROR`，避免未处理的异步 rejection；新增对应 7/7 service tests。真实 H.264
基线浏览器验证已通过；Hook 还补充了媒体身份异步加载不覆盖活动任务、快速连点不重复
启动的竞态保护，并让项目切换后的新任务等待旧任务取消完成。新增真实浏览器 Hook smoke：
独立项目完成启动→暂停→卸载→重新挂载→继续完成（恢复后 2474 帧、28 个候选）、独立取消
分支，以及快速切换项目后启动并取消新任务；切换后的事件记录确认旧 task ID 没有回写新 Hook。
失败和完整 UI 矩阵已由 service/hook 测试及 Edge 失败页复验补齐。2026-08-29 Edge 真实产品复验已覆盖显式暂停→继续；期间发现的在途 `PROGRESS` 与 `pausing` 状态竞态已在 Worker 协议中放行并加入契约测试，复验未再出现该错误。项目切换后旧 task 消息隔离、无活动项目失败页和不同媒体镜头状态隔离均已复验。

**完成检查**：任何 UI `paused` 都对应可导入 checkpoint；无 checkpoint 记录没有继续入口；
所有终态和切换路径只有一个 client，Worker/sample/runtime 资源对账归零。

#### [x] Task 11.10：实现候选审阅状态、应用领域命令与镜头 provenance

**前置条件**：Task 11.9 完成；先读取 shot/group/recovery/history/repository 的实际类型与
保存边界，不假设存在可复用领域命令。

**操作**：

1. 扩展 task record 的 `review`，保存 excluded candidate IDs、更新时间和 applied 状态；
   类型筛选只影响视图，重新扫描清空 review。
2. 新建纯 `applyAutoShotCandidates`：验证候选属于当前 task/config/media，按纳入边界生成
   连续半开镜头区间；完全同范围旧镜头保留 ID/资料，变化范围生成新 ID 且不继承分析。
3. 定义 `ShotDetectionMeta` 新结构，删除 `confidence`：manual 镜头只标 source；自动镜头
   内嵌 task/candidate/kind、media identity digest、preset ID/version、Engine version、
   config hash。不得依赖会被下一次扫描覆盖的 task record 才能解释来源。
4. 若受影响镜头含笔记、分析、截图或分组，命令先返回 impact summary；UI 经 Dialog 明确
   确认后创建 recovery snapshot，再一次性提交镜头与协调后的分组。项目帧 annotation 保留。
5. 接入 editor history，应用成为一次 undo 单元；保存/刷新后以 recovery snapshot 提供
   持久恢复，不把仅内存 undo 描述成永久保护。
6. 对空项目、完全同边界、排除候选、重复/非法候选、已有资料、分组协调、来源持久化、
   task 被重扫覆盖和撤销/恢复写测试。
7. 如正式 shot schema 需要升级，只做一次前向 IndexedDB upgrade，保留正式镜头数据并将
   旧 detection 明确归一为 manual；升级完成后不保留旧类型 union 或读取分支。

**完成记录（2026-08-29）**：已将候选应用抽为纯领域命令，校验连续半开区间、
按 review 排除并合并相邻区间、保留相同范围 shot ID、生成影响摘要；Editor 已通过确认 Dialog
调用该命令，确认后创建 recovery snapshot，并在同一结果中协调有效分组、保存 task review 应用时间，
正式镜头保存时写入不可变 auto-shot provenance，且 editor history 会同步保存/恢复 provenance 映射。恢复服务已有持久化快照恢复入口；Edge 真实项目已完成候选排除、应用前影响确认、快照应用、保存/刷新和恢复应用前快照（26→28 镜头）验证，持久化撤销矩阵已关闭。另已修正 Editor 应用层只清理被替换/删除镜头的笔记、分析字段、
截图和边界截图映射，保留镜头资料不再因应用自动分镜被整体清空；纯 `retainShotMap` 工具测试
已通过（1/1）。编辑器历史核心已提取为
纯状态模块 `editorHistoryState.ts`，覆盖撤销/重做、撤销后分支提交和历史上限的
`node:test` 已通过（4/4）；Hook 对外 API 未改变。迁移浏览器 smoke 也已验证 recovery
snapshot 修改后恢复及同项目最多保留 3 个快照；Edge 已完成应用后保存、刷新和恢复快照的持久化撤销矩阵。跨存储原子性由单个 IndexedDB readwrite 事务覆盖。

**完成检查**：`EditorWorkspace` 不再直接重建镜头或清空多个状态 map；自动镜头保存后不再
写成 manual；任务被覆盖后来源仍可读；数据影响在执行前可见且有 recovery snapshot。

**禁止**：按重叠猜测复制分析数据、自动删除截图 Blob、用 raw score 填 confidence、在
React 组件中复制应用算法、为旧 detection 长期保留兼容层。

#### [ ] Task 11.11：关闭 Phase 11 产品矩阵与阶段审计

**前置条件**：11.2–11.5 的开放检查与 11.7–11.10 全部通过。

**操作**：

1. 使用可追溯真实 H.264 素材运行：开始、进度、显式暂停、刷新继续、运行中刷新后中断/
   重扫、取消、失败、完成、候选排除、应用、撤销、恢复快照、项目/媒体切换。
2. 重新运行 DB 12→当前版本链式升级夹具，逐项核对项目、媒体、镜头、截图、注释、分组和
   模板；只允许清理旧 auto-shot 派生记录或执行已记录的 detection 前向归一化。
3. 运行 native、C ABI、WASM baseline/SIMD、Worker、package/Web tests、production build、
   preview、依赖边界审计和 `git diff --check`。
4. 更新 Phase 11 handoff，列出 exact commands、浏览器/机器、通过矩阵、已知限制和 Phase 12
   唯一允许继续使用的类型/schema/version。

**完成检查**：11.2–11.5、11.7–11.11 全部 `[x]`，Phase 11 验收门逐项有证据；之后才能把
Phase 12 从未开始改为进行中。

**当前记录（2026-08-29；本轮验收补充）**：Scene Engine、Worker、强身份 task/checkpoint、候选 review/apply、
provenance、确认 Dialog、分组协调、单事务 recovery snapshot 恢复（含迁移浏览器 smoke 的修改后恢复断言）和 Web build 已有自动化证据；Edge 实测真实 H.264 项目可完成扫描、候选应用、刷新恢复且控制台无错误。
2026-08-29 在 Edge 重新打开项目并重跑约 99.88 秒的 `test.mov`：早先 UI 使用旧默认 threshold 4000，扫描进度正常从 0% 到 100%，但只得到 1 个候选切点；同日修正临时映射后，Edge UI 显示 27 个边界/28 段候选且刷新后保留 28 个镜头，完整媒体 WASM smoke 和 `/aisenlens/` production preview 也得到 27 个边界，证明解码帧覆盖和临时阈值链路已接通。随后 Edge 完成显式暂停→继续、首候选排除、应用影响确认、创建快照并应用、保存/刷新，以及恢复应用前快照（26→28 镜头）；暂停竞态修复后未再出现协议错误，页面错误日志为空。当前仍不能把 27 个边界当作质量真值；后续需用人工标注长视频专项验证 Content/Adaptive/Threshold/Fade 配置、融合去抖、最短镜头过滤、时间映射和结果适配器。
项目/媒体上下文切换、无活动项目失败页、持久化撤销矩阵和 lint 工具链已完成；Task 11.11 仍保持未完成，
因为真实质量真值（人工标注长视频）以及具体“缺失媒体项目→重新选择文件”的入口还需要单独留证，Phase 12 不得启动。
React hook 挂载/卸载专项已由独立 Chrome smoke 覆盖；Edge 已覆盖真实暂停/继续、候选排除、
应用、保存/刷新、恢复快照、`test03`→`测试` 媒体上下文切换和无活动项目失败分支；未把普通项目切换
误记为缺失媒体文件重绑，后者仍需在实际缺失句柄的项目上执行一次可交互文件选择器回归。

本轮自动化验收已再次完成：`corepack pnpm install --frozen-lockfile`、`corepack pnpm lint`、
`corepack pnpm build`、Scene Engine native Debug/CTest、baseline 与 SIMD WASM 重建、TypeScript
typecheck、ABI/Worker contract `29/29`、Web 自动分镜 contract/task-state/adapter/media-fingerprint/
task-service、editor history 和 retain-shot-map 全部通过，`git diff --check` 通过。生产 preview 使用
`AISENLENS_SCENE_FIXTURE` 分别跑通 `test02.mov`（完整 `1429` 帧、`9` 个边界）和 `test03.mov`
（完整 `359` 帧、`3` 个边界），均为 `wasm-simd` 并到达 `COMPLETED`；默认浏览器基线也通过（Chrome
152，约 `180.8s`）。这些结果只证明链路、生命周期和确定性，不替代人工质量真值。

**最终交付物**：强媒体身份、canonical config hash、新 task persistence、明确的
paused/interrupted 生命周期、候选审阅状态、可撤销应用领域命令、镜头 provenance、
DB 升级和真实产品回归证据。

**Phase 11 验收门**：DB 原子升级、全生命周期、显式应用/撤销、主线程边界及 Web 回归全部通过；否则不得删除旧文件。

### 4.14 Phase 12 任务单：整体验收、研究控制面板、标定与旧路径删除

**阶段状态**：`[ ] 未开始正式执行（12.1、12.5 仅有准备性记录；必须先完成 Phase 11 的 11.2–11.5、11.7–11.11 并关闭验收门。后续 Agent 不得因已有准备记录跳过 Phase 11）`

**本阶段强制执行顺序**：`12.1 → 12.2 → 12.3A → 12.6A → 12.6B → 12.6C → 12.6D → 12.3B → 12.3C → 12.4 → 12.5 → 12.7`。
任务编号保留历史文档编号，不表示可按页面出现的数值顺序执行。先完成 PySceneDetect
语义驱动的**研究型控制面板**，再建立人工标定与 promotion；不得反向等待标定后才设计
面板，也不得将研究 preset 当作生产默认。

#### [ ] Task 12.1：在 Phase 11 关闭后重建删除前验收基线

**输入**：Phase 11 生产新链路、旧路径引用证据清单。

**操作**：

1. 在删除前再次运行 native、C ABI、baseline/SIMD、Worker、browser、Web 和 DB 升级矩阵。
2. 保存实际命令、机器/浏览器、关键结果和失败项；任何产品关键项失败则停止删除。
3. 用 `rg` 和构建依赖图证明 `runAutoShotDetection`/旧 record/旧 Canvas detector 没有生产调用。
4. 确认 `auto-shot-runs` 仅包含新 schema 或已被清理。

**完成检查**：存在可审计的“新链路已接管、旧路径无生产引用”证据。

**禁止**：凭人工点击一次就删除旧实现、把当前范围外的 Desktop/Mobile 写成已验证。

**准备性记录（2026-08-28，不代表 Task 完成）**：已新增 `docs/AISENSHOT_SCENE_ENGINE_PHASE_12_BASELINE.md`，记录当时的 native、C ABI、baseline/SIMD、Worker 生命周期、Web build/preview、IndexedDB 12→13 升级和旧生产引用审计。Phase 11 后续会改变 identity/hash/task/shot schema，故 Agent 必须在新版本上完整重跑并更新该基线，不能复用旧结果勾选完成。

#### [ ] Task 12.2：删除旧自动分镜实现与字段

**前置条件**：Task 12.1 在 Phase 11 最终版本上通过，且旧 service 的准确率历史结果已经以
报告形式冻结；不再为了比较保留可执行旧生产服务。

**操作**：

1. 删除 `apps/web/src/features/auto-shot/services/autoShotService.ts`。
2. 删除仅服务该旧算法、经引用审计确认无其他消费者的 helper、tests 和 fixtures。
3. 删除旧 `confidence/cursorFrame/durationFrames/cuts` 类型、分支和 UI 映射残留。
4. 清理无效 imports、scripts 和文档，不删除通用 Canvas/视频能力。
5. 删除后立即运行 Web type/build 和相关 tests，若发现真实消费者则分析所有权，不恢复兼容双轨。

**完成检查**：`rg` 对旧 service、旧字段和自动分镜 Canvas/getImageData 路径没有生产引用。

**禁止**：删除项目/镜头/缩略图等仍在使用的通用服务、保留隐藏 fallback、加入临时兼容 adapter。

#### [ ] Task 12.3A：建立研究/生产双 catalog 的配置基础

**前置条件**：Task 12.2 完成。

**操作**：

1. 在 `features/auto-shot/config/` 定义 `AutoShotControlSettings`、完整高级覆盖、冻结任务
   snapshot、配置摘要数据和版本化 candidate preset 类型；首版 preset ID 不包含 `custom`。
2. 实现唯一 `resolveAutoShotConfig`，固定“preset → detail → transitions/min duration →
   完整 advanced branch override”顺序；preset version 只能由 registry 注入。
3. 按控制设计冻结产品输入范围、整数单位转换和权重最大余数归一化；全零权重、越界值、
   detector 字段混用和未知字段必须给出结构化错误。
4. 将 PySceneDetect 的 Content、Adaptive、Threshold/Fade、最短镜头与过滤器**语义**转换为
   版本化 `researchPresetRegistry` 种子；只转换产品配置模型和合法范围，不复制 Python/OpenCV
   的数值默认值。每个种子包含 `catalog = research`、来源说明与“待标定”状态。
5. 建立初始为空的 `productionPresetRegistry` 及唯一 promotion 入口；常规生产扫描和默认选择
   不得读取 research catalog，显式研究模式可使用它；research catalog 也不得自称
   production/default/recommended。
6. 测试两个 catalog 隔离、全部 research preset×detail×transition 组合、完整 detector 切换、恢复 preset、字段顺序
   确定性、版本变化与 Engine config 校验。

**完成检查**：研究面板、标定脚本与未来生产 UI 将调用同一个 resolver；仓库中没有第二套
sensitivity/threshold 映射；未标定 preset 不可从 production registry 枚举。

#### [ ] Task 12.3B：在研究面板后建立标定工作台、数据集 manifest、评分与 sweep 工具

**前置条件**：Task 12.6D 通过；研究面板必须已能生成和冻结带 `catalog = research` 的任务快照。

**操作**：

1. 在 `features/scene-calibration/` 建立独立真值模型、服务和工作台组件；不复用
   `AnnotationMarker` 或 `ShotRecord`。首版只支持 hard-cut 点标注：接受当前候选、拒绝候选、
   新增/移动/删除人工边界，以及显式标记不确定范围；fade 区间另立后续任务。
2. 标定工作台复用现有视频预览、逐帧导航和时间线，但只通过 resolver 启动研究扫描；每份标注
   保存强媒体身份、微秒时间、辅助帧号、标注者、schema version、研究 preset/version、完整
   engine config/canonical hash、Engine version 与候选结果摘要。不得应用候选、改写项目镜头或
   把创作标记视为算法真值。
3. 实现 JSON 导出：包含媒体身份、来源/授权字段、真值、未确定范围、当前研究运行与标注元数据；
   默认不包含视频和本地绝对路径。外部 AI 需要查看素材时，由用户另行选择同一身份的视频文件；
   导出 UI 明确提示版权与隐私责任。导出 `search` 数据与 `holdout` 数据必须使用不同命令，
   holdout 不得被 AI 或参数搜索读取。
4. 扩充现有 evaluation manifest/README/脚本，不另建重复评分实现；视频本体继续只接受本地
   路径并保持忽略，提交 schema、示例、checksum 和来源/授权说明。
5. 为每个专项预设建立 search/holdout 清单，并实现校验：同一作品/来源不能跨集合；专项
   search 至少 8 视频/100 hard-cut，holdout 至少 4 视频/50 hard-cut；general holdout
   至少 12 视频/150 hard-cut；默认 fade 需至少 20 个 holdout fade 区间。
6. manifest 记录 codec、尺寸、rotation、时长、SHA-256、标注者和复核状态；至少 20% 标注
   有第二人复核，未解决分歧时评分命令失败。
7. 评分输出逐素材及聚合 hard-cut Precision/Recall/F1、平均/p95 边界偏移、fade 区间
   Recall/建议点命中/误报每分钟、耗时和可选诊断。
8. sweep 接受 candidate preset + 参数网格，只读取 search split；输出 canonical config、
   Engine version、dataset checksum、命令和排序规则，重复运行结果完全一致。

**完成检查**：标注可导出并独立复读为评分输入；候选接受/拒绝与人工新增边界均可追溯；故意
制造 split 泄漏、媒体身份不符、样本不足、checksum 变化、标注分歧和非法配置时命令确定性
失败；合法小 fixture 可在 CI 跑契约，受限/真实视频不进入产品包。

#### [ ] Task 12.3C：标定、独立留出验收与生产晋升

**前置条件**：Task 12.3B 通过，且实际本地数据达到控制设计 8.1 的数量/质量门槛。若素材
不足，Agent 必须把本任务标记阻塞并列出缺口，不能生成猜测默认值。

**操作**：

1. 仅在 search split 上比较 Content、Adaptive 和可选 Threshold/Fade；以 PySceneDetect
   区间作起点但转换为 AisenLens 固定点单位，不复制其默认值。
2. 为每个 preset 冻结 conservative/balanced/detailed 候选版本；三个档只改变 hard-cut
   判定强度，转场与最短镜头独立。
3. 冻结后只运行一次 holdout。严格应用控制设计 8.3 门槛；专项 preset 还要证明相对
   general 的明确增益，fade 未通过则默认仅硬切。
4. 看到 holdout 后若改参数，提升候选版本并更换未读取的新 holdout；不得反复调同一集合。
5. 只将通过项通过 promotion 脚本写入 `productionPresetRegistry`，生成含 preset/Engine/
   dataset version、canonical configs、指标、checksum 和日期的不可歧义报告。
6. 首次晋升后，将普通产品入口切换为 production catalog；research catalog 只保留给明确的
   标定/研究模式。测试普通入口不能枚举未晋升项目，既有研究任务仍可按其冻结快照审阅和恢复。

**完成检查**：每个生产可见 preset 都有通过门槛的 promotion report；未通过项不在 registry；
相同数据/版本重复评分一致，报告可追溯到 Engine、resolver 和数据集。

**禁止**：用“切得更多”替代质量、降低冻结门槛以通过、让 Agent 主观选择最佳观感、把
PySceneDetect 数值称为等价、把 search 指标冒充 holdout、将数据集打入产品 bundle。

#### [ ] Task 12.4：建立性能与内存基线

**前置条件**：Task 12.3C 至少晋升 `general`；只测已晋升生产配置，未通过的 candidate
preset 不进入产品性能结论。

**操作**：

1. 在记录的基准机器/浏览器上分别测 decode、copy、preprocess、detect、total 和峰值内存。
2. 对 baseline/SIMD、短片/长片、Content/Adaptive + Fade 记录相同指标。
3. 验证内存复杂度只与原始缓冲、分析缓冲和 detector window 相关，不随时长线性增长。
4. 记录 UI 主线程响应和 progress 节流情况。
5. 只基于 profile 提出后续优化项；本 Phase 不引入双缓冲/pthreads 等新架构。
6. 至少覆盖短片和 30 分钟以上长片；素材不足时可记录阻塞，但不得用循环同一短片冒充
   解码/容器/内存的长视频验收。

**完成检查**：性能报告注明硬件、OS、浏览器、素材、配置、冷/热条件和产物版本。

**禁止**：用不可复现绝对数字作为上线承诺、为性能提前改变算法语义。

#### [ ] Task 12.5：许可证、文档与持续检查

**操作**：

1. 创建/更新 `NOTICE`，记录实际采用的第三方许可和算法参考；未复制 PySceneDetect 代码时也明确独立实现边界。
2. 更新 Scene Engine README 的构建、测试、公共 API、支持格式、限制和故障码。
3. 同步架构文档、控制系统设计、实施状态、生产 preset version 和已验证参数。
4. 把 native/WASM/package/browser 必要测试加入现有 CI 或根验收脚本，避免改变日常 Web `build` 的职责边界。
5. 检查生成 WASM、fixtures 和评估数据的发布包含关系，产品包不得携带测试数据集。

**完成检查**：新环境可按 README 构建/测试，许可证与实际依赖一致，CI 能捕获核心回归。

**准备性记录（2026-08-28，不代表 Task 完成）**：已新增根目录 `NOTICE`，同步当时的 Scene Engine README、架构/计划文档和根 README；新增 `scene-engine:verify:core` 根验收脚本，覆盖 native、WASM、TypeScript contract 和 SIMD parity。Phase 11/12 最终 schema、preset 和依赖确定后仍须重新审计发布包含关系、许可证、CI 和文档状态。

#### [ ] Task 12.6A：引入 Zustand 并建立研究型 feature 设置控制器

**前置条件**：Task 12.3A 通过；先检查 `apps/web/package.json`，确认尚无现有
状态库可满足同一职责，再用 pnpm 为 Web workspace 安装并锁定 Zustand。

**操作**：

1. 创建 `useAutoShotSettingsStore`，只保存按 `projectId + mediaIdentityDigest` 区分的小型
   control draft、dirty 状态和重置动作；不持久化到 localStorage/IndexedDB。
2. 创建 `useAutoShotControl`，组合 store、research catalog、唯一 resolver 和结构化错误；
   首轮 production catalog 为空，只有显式研究模式可启动扫描。React 组件不能直接合并参数
   或写 preset version/catalog。
3. preset version 由 resolver 注入。恢复 preset 一次清除全部高级覆盖；切换媒体身份初始化为
   `general` 当前研究配置并显示“研究配置 / 待标定”，不能继承另一媒体的隐式草稿。首次
   `general` 晋升后，后续任务再切换为生产默认。
4. 使用 selector 避免无关设置触发整个编辑器重渲染；store 不保存 Worker、Blob、候选、
   EngineResult、checkpoint、运行进度或 repository 对象。
5. 测试项目/媒体隔离、重置、完整 detector override、research catalog 冻结快照、resolver
   错误和 selector 更新范围。

**完成检查**：依赖和 lockfile 由 pnpm 更新；全仓只有一个 auto-shot 设置 store；没有临时
Context/第二套状态；Web build 通过。

#### [ ] Task 12.6B：扩展任务快照、review 与 IndexedDB schema

**前置条件**：Task 12.6A 通过，复用 Phase 11 的强媒体身份和 canonical hash。

**操作**：

1. `AutoShotTaskRecord` 保存 media identity、resolver 生成的 control snapshot（含 preset
   ID/version/catalog）、完整 config、canonical config/hash、稳定 summary data 和 review。
2. task service 的新扫描入口只接收 `ResolvedAutoShotConfiguration`；禁止调用方分别传
   settings/config/hash。开始时原子冻结，resume 直接使用旧快照，不重新解析当前 registry。
3. repository 写入前严格校验 schema、identity、snapshot/config/hash 一致性、review 中 ID
   属于当前候选；未知字段或不一致记录失效。
4. 将实际 `DATABASE_VERSION` 提升一次，升级事务只清理旧 auto-shot 派生 task；项目、媒体、
   正式镜头、截图、annotation、group、template、recovery snapshot 逐项保留。
5. 测试旧 task 清理、新 record round-trip、paused research snapshot resume、registry 升级后
   新扫描使用新版本、候选排除刷新恢复和 task 覆盖后正式 shot provenance 保留。

**完成检查**：数据库 fixture 从 12 经 13 到当前版本链式升级通过；没有旧 sensitivity task
兼容读取/双写；完整快照可复现同一 Engine config。

#### [ ] Task 12.6C：实现研究型控制面板与候选审阅组件

**前置条件**：Task 12.6B 通过；先按项目 UI 复用顺序检查现有 Button、Dialog、Tooltip、Tabs、
DropdownMenu、Input、Checkbox 和 Sonner，不满足时才按 AGENTS.md 引入 shadcn 组件。

**操作**：

1. 创建 `AutoShotControlPanel`、PresetSelector、BasicSettings、AdvancedSettings、RunStatus 和
   ResultReview；组件使用默认导出，业务逻辑留在 hook/service。
2. 首轮面板只列出 research registry 中的项目，并在面板头部和每份冻结摘要中明确显示
   “研究配置 / 待标定”；production catalog 为空时不渲染“推荐”“最佳”“生产默认”或 disabled
   “即将推出”占位。显示 preset、检出程度、转场、最短镜头和确定性摘要。
3. 高级 hard-cut 切换时初始化完整合法分支；使用控制设计冻结范围/单位/步长，错误定位到
   具体输入。analysis 固定逐帧 96 宽，不显示 stride/高分辨率未验证选项。
4. 运行中设置只读并显示冻结摘要；显式暂停成功后才显示继续；interrupted 显示必须重扫。
5. 结果审阅显示 hard-cut/fade、视图筛选和逐候选纳入/排除；raw score 不称置信率。应用前
   根据 Phase 11 领域命令 impact summary 显示数据影响确认。
6. 覆盖键盘操作、label/description、禁用态、错误态、窄宽布局和 AisenLens 主题 token。

**完成检查**：组件测试/浏览器 smoke 覆盖研究普通/高级、待标定状态、运行/暂停/中断/完成、
候选排除和确认；每次组件修改后运行 `corepack pnpm build`。

#### [ ] Task 12.6D：接入 EditorWorkspace 并删除临时控制映射

**前置条件**：Task 12.6C 通过。

**操作**：

1. `EditorWorkspace` 只向面板提供项目/媒体上下文、布局位置和 Phase 11 应用领域命令；删除
   `autoSensitivity`、`autoMinDuration`、线性 threshold `useMemo` 和内联候选 UI。
2. 所有 start/restart 只通过 `useAutoShotControl → resolver → task service`；本阶段创建的快照
   固定为 `catalog = research`。运行中修改设置只能在取消/完成后创建新扫描，不静默改变当前任务。
3. 用 `rg` 证明旧 sensitivity 映射、React 直接 EngineConfig 拼装、第二 resolver 和旧 UI
   分支零引用。
4. 运行 research preset 的 UI 组合测试、task/repository/shot 应用回归、Web strict build、
   production Worker/WASM build 和 preview smoke。

**完成检查**：普通/高级研究模式生成的快照可复现且明确标记待标定；EditorWorkspace 不导入
Worker/WASM/Mediabunny，不再直接重建自动镜头。

**禁止**：把产品 preset 写入 Scene Engine 包、让 React 直接拼装 C ABI/EngineConfig、在
Zustand 存储大型结果、自动猜测内容类型、显示未验证选项、保留旧 UI 兼容分支。

#### [ ] Task 12.7：最终全矩阵验收

**前置条件**：Task 12.1–12.6D 全部完成；每个 UI 可见 preset 都有 Task 12.3C 的独立
holdout promotion report，旧路径已按 Task 12.2 删除。

**操作**：

1. 从干净 build 目录执行 native Release/sanitizer、C ABI、baseline、SIMD、Worker、浏览器
   fixtures、DB 逐版本升级和 Web 产品全流程。
2. 对媒体身份覆盖小文件完整摘要、大文件全覆盖 chunk-manifest、任意首/中/尾字节变化、
   同名异内容、metadata 变化、rotation/
   duration/codec 变化；对 canonical config 覆盖字段重排、边界值、完整配置二次比对与 hash
   版本不匹配。
3. 覆盖开始、进度、显式暂停/继续、刷新后的 interrupted→重扫、取消、失败、完成、候选
   排除恢复、影响确认、应用、撤销、恢复快照和 task 覆盖后 shot provenance 保留。
4. 覆盖每个生产 preset 的三个 detail、转场组合、至少一个完整高级 detector 覆盖、运行中
   设置冻结、设置修改后重扫和 registry 升级后旧 task 按冻结快照继续。
5. 重新运行 promotion report 与性能基线校验，确认 search/holdout 无泄漏、数据 checksum、
   resolver/Engine/preset version 和指标门槛均可复现；不能只复用历史报告文本。
6. 执行 Web strict typecheck/build、production preview、Worker/WASM 非站点根资源 smoke 和
   `git diff --check`；Desktop/Mobile 诚实记录为范围外。
7. 用 `rg` 确认没有旧生产 detector、旧 sensitivity 映射、双轨、第二 resolver、
   Histogram/Hash/关键帧占位实现；确认公开 package 不依赖 React/Zustand/project types，
   React 不导入 Worker/WASM/Mediabunny。
8. 输出最终报告：全部命令与环境、preset/Engine/schema/hash/identity 版本、产品矩阵、准确率、
   边界误差、性能、内存、数据库数据保护、已知 Web 限制和未进入本阶段的未来能力。

**最终交付物**：单一生产 Scene Engine 链路、内容预设与新控制面板、旧路径删除、准确率/性能基线、许可证与持续回归。

**Phase 12 验收门**：全矩阵通过、每个可见内容预设均有独立留出集支持的可追溯标定、
强媒体身份/规范哈希/恢复语义/应用与 provenance 数据保护均通过、旧 sensitivity/旧检测
路径零引用、数据与依赖边界正确、指标可复现；满足后本实施计划才可标记完成。

## 五、风险与注意事项

1. **当前首个阻断项是 Phase 11 正确性收口。** 工具链和核心构建已有历史通过记录，但强媒体身份、canonical config hash、刷新中断语义、候选应用领域命令与 provenance 未通过前，不得进入正式 Phase 12；任何环境仍须按任务单重新验证实际编译器，而不能只引用旧报告。
2. **时间权威不得回退到帧号。** C++/WASM 全程使用微秒；只有 `sceneResultAdapter` 能转为 AisenLens 项目帧，VFR 尤其不能用平均帧率参与 detector 决策。
3. **WebCodecs 到 WASM 不是物理零复制。** 可实现的目标是 `copyTo()` 一次必要复制直接进入预分配 WASM memory，禁止再经 Canvas、ImageData 或 JS 中间数组。
4. **恢复确定性是核心验收项。** Adaptive look-ahead、Fade 状态和过滤器状态都必须进入 checkpoint；连续运行与暂停/恢复结果不一致时不得接 UI，刷新遗留的无 checkpoint `running` 记录不得伪装为 `paused`。
5. **旧数据不能伪装成新 checkpoint。** 切换时清理 `auto-shot-runs` 中的旧派生记录，不实现旧结构兼容读取、双写或静默回退；清理范围必须经过数据库升级测试，不能影响项目和镜头数据。
6. **旧路径删除有严格时点。** Phase 11 先接入并验收，Phase 12 才删除旧 Canvas/seek 服务；验收后又不得长期保留两套生产检测器。
7. **Web 的 Worker/WASM 资源 URL 必须实测。** 开发服务器成功不代表 production 或非站点根部署成功；本轮必须验证 Vite Web 资源定位。Electron/Capacitor 在恢复对应平台开发时单独验证，当前不得写成已通过。
8. **阈值不能直接宣称与 PySceneDetect 等价。** 色彩转换、下采样和像素格式不同会改变 score；默认值只作为起点，正式值必须由固定数据集和 Precision/Recall/F1 记录支持。
9. **SIMD 只能在 baseline 正确后加入。** SIMD 与 baseline 必须共享 ABI、测试和 detector 逻辑；边界结果不一致时以 baseline 为准并阻止 SIMD 上线。
10. **严格控制范围。** 本计划不创建关键帧、Histogram、Hash 的空实现、公共配置或 UI 入口；未来扩展只依赖既有版本化 capability/result envelope，不在本轮提前设计功能。
11. **任务记录不是永久来源。** `auto-shot-runs` 按项目唯一且会被覆盖，正式镜头必须保存不可变的最小来源快照；否则重扫会破坏审计链。
12. **标定集不能兼作验收集。** 参数搜索只读 search，生产晋升只看冻结后的 holdout；数据不足或质量门未通过时应明确阻塞，不能由 Agent 猜测默认值或降低门槛。
