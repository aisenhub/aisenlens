# AisenShot Scene Engine 架构规划

> 状态：已完成第二轮架构审核，尚未实施
>
> 初版日期：2026-08-25
>
> 最后修订：2026-08-27
> 范围：分镜检测核心、浏览器运行时与前端集成边界  
> 不包含：现有业务代码修改、UI 改版、关键帧提取及其他视频分析能力

## 1. 结论摘要

AisenShot Scene Engine 应作为独立于 React 和项目领域模型的本地视频分析包建设，推荐放在 `packages/scene-engine/`，包名使用 `@aisenlens/scene-engine`。算法核心使用无 OpenCV、无 Python 运行时依赖的 C++ 实现，通过稳定的 C ABI 编译为 WebAssembly；浏览器侧由专用 Worker 完成媒体解封装、WebCodecs 解码、帧数据写入 WASM、任务控制和结果回传。

第一阶段只实现三条检测路径：

1. `Content Detector`：相邻帧 HSV/亮度内容差异，负责硬切检测。
2. `Adaptive Detector`：复用 Content 指标，以前后滚动窗口抑制快速运动造成的误报。
3. `Threshold/Fade Detector`：使用平均亮度阈值状态机检测淡入、淡出，并输出转场区间和建议切点。

`Histogram Detector`、`Hash Detector` 明确推迟。引擎只输出与 UI 无关的镜头边界、转场类型、来源和可解释指标；AisenLens 的任务持久化、候选确认、`ShotRecord` 创建及时间轴更新继续由 Web 应用负责。

目标数据链路（预处理后端由 Phase 0 基准决定，不预设单一路径）：

```text
本地视频 Blob/File
  -> Mediabunny 解封装 + WebCodecs 顺序解码（Worker）
  -> VideoSample/VideoFrame 顺序取帧
  -> 原生 YUV/RGB copyTo 或 Worker 内低分辨率预处理
  -> WASM 预分配帧缓冲
  -> C++/WASM AisenShot Scene Engine
  -> 原始检测事件 -> 事件融合 -> 镜头边界结果
  -> TypeScript 结果适配器
  -> 可审阅候选分镜
  -> 用户确认
  -> React 拉片时间轴
```

## 2. 本阶段目标与非目标

### 2.1 目标

- 提取 PySceneDetect 中与分镜检测直接相关的算法思想，不移植其 CLI、视频后端、CSV、输出、切片或 Python 调度框架。
- 建立可独立原生测试、可编译为 WASM、可由其他宿主替换解码器的 C++ 核心。
- 将解码、算法、任务编排、项目持久化和 React UI 分层。
- 同时支持硬切与淡入淡出事件，并保留每个结果的可解释指标。
- 从接口和内存模型上为 WebCodecs、WASM SIMD、长视频流式处理和暂停恢复做好准备。
- 在冻结生产像素路径前，用真实浏览器基准比较原生平面复制、RGB 标准化和 Worker 低分辨率预处理，避免把未经验证的全分辨率复制成本固化为架构。
- 迁移完成后以新引擎替换当前 Canvas 自动分镜服务，不长期维护两套检测算法。

### 2.2 非目标

- 不重写或嵌入整个 PySceneDetect。
- 不在生产环境引入 Python、OpenCV、FFmpeg.wasm 或服务端检测。
- 不在本阶段实现 Histogram、Hash、机器学习检测器、关键帧提取、人物分析或内容理解。
- 不让 C++ 核心读取视频文件、访问 IndexedDB、发送 Worker 消息或理解 AisenLens 项目/分镜实体。
- 不让 React 组件直接管理 WebCodecs、WASM 内存或检测器状态。
- 不承诺浏览器当前无法提供的解码表面到 WASM 线性内存的真正零拷贝。

## 3. 当前项目与现有链路分析

### 3.1 项目结构

仓库已是 pnpm workspace：

```text
apps/
  web/       React + Vite 主应用
  desktop/   桌面壳
  mobile/    移动壳
packages/    当前无正式共享包，适合放置独立 Scene Engine
docs/
reference-projects/
```

Web 应用已按 feature 组织，相关模块为：

```text
apps/web/src/features/
  auto-shot/services/autoShotService.ts
  editor/components/EditorWorkspace.tsx
  media/
  project/services/projectRepository.ts
  project/types.ts
  shot/
  timeline/
  video/services/frameThumbnailService.ts
```

### 3.2 当前自动分镜实现

`autoShotService.ts` 当前同时承担：

- 创建隐藏 `<video>` 并反复设置 `currentTime`；
- 使用 96×54 Canvas 和 `getImageData()` 获取 RGBA；
- 计算亮度直方图、颜色直方图和四分区空间特征；
- 维护自适应阈值、硬切确认、渐变累积和边界二分精修；
- 处理暂停、错误、进度和 IndexedDB 持久化。

`EditorWorkspace.tsx` 直接创建 `AbortController`、调用检测服务、恢复任务，并把完成的切点转换为编辑器分镜。当前链路可用，但存在以下结构性问题：

| 问题 | 影响 |
| --- | --- |
| 解码、像素处理、算法、任务和存储集中在一个服务 | 无法独立测试或替换其中一层 |
| `<video>` seek 以关键帧和浏览器行为为边界 | 不是稳定的逐帧顺序解码，边界精度受限 |
| Canvas RGBA + `getImageData()` | 产生颜色转换、主线程工作和额外内存复制 |
| 每 0.2 秒采样 | 会跨过短镜头，Adaptive/Fade 也缺少连续帧上下文 |
| 当前 `confidence` 实际是差异分数 | 并非经过校准的概率，语义容易误用 |
| 进度与运行状态位于大型编辑器组件 | UI 与检测任务生命周期耦合 |

### 3.3 可复用的现有基础

- 项目已依赖 Mediabunny 1.29.1，并在缩略图和视频导出中使用其媒体管线。
- Mediabunny 的 `VideoSampleSink.samples()` 可按呈现顺序预解码帧；`VideoSample.copyTo()` 可把像素写入给定 `ArrayBufferView`。
- 项目已经使用 Worker 完成视频导出，具备 Worker 协议、取消和流式处理经验。
- 项目领域时间以整数帧和半开区间 `[startFrame, endFrame)` 表示，检测结果仍可通过单独适配器进入现有模型。
- 自动分镜已有“任务结果先审阅、用户显式应用”的正确产品边界，应保留。

## 4. 参考调研与采用决策

### 4.1 成熟公开方案与浏览器能力

| 方案/能力 | 已确认价值 | AisenShot 决定 |
| --- | --- | --- |
| PySceneDetect 0.7.1 | Content、Adaptive、Threshold 检测器；延迟事件、结束 flush、指标记录；BSD-3-Clause | 只独立实现所需数学和状态机，不移植 Python 框架或 OpenCV 依赖 |
| WebCodecs `VideoFrame` | 提供解码帧、微秒时间戳、平面像素复制和 Worker 可用能力；显式 `copyTo()` 格式转换只保证 RGB 类输出，不能任意要求 I420 | 作为浏览器帧来源；先探测实际格式，再选择原生平面或 RGB 标准化路径 |
| Mediabunny 1.29.1 | 已在项目中使用；封装解封装、WebCodecs 解码和顺序 `VideoSample` 迭代 | 作为首个浏览器解码适配器，不重复编写容器解析器 |
| WebAssembly SIMD | 适合并行处理像素绝对差、亮度统计和下采样 | 同一 ABI 构建 baseline/SIMD 两个产物，运行时能力探测后选择 |
| Emscripten + CMake | C++ 到浏览器 WASM 的成熟工具链 | 只用于构建和薄 C ABI 导出，不用 Embind 暴露复杂对象图 |
| TRECVID-SBD 评估约定 | 硬切使用容差内一对一匹配，渐变使用点落在标注区间，报告 Precision/Recall/F1 和边界误差 | 作为算法验收口径，不只比较“检测到多少段” |

### 4.2 OpenReel 与 OpenCut

- OpenReel 的场景检测是云任务能力声明，没有可复用的本地场景算法；可借鉴的是“能力类型、异步任务状态、结果清单与应用方式分离”。
- OpenReel 的媒体核心使用 Mediabunny 顺序解码和复用帧缓冲，证明解码会话应独立于 UI，并应避免逐时间点重复随机 seek。
- OpenCut 未提供场景检测器；其可用模式是 Rust/WASM 核心与 TypeScript 品牌化整数媒体时间之间的薄边界。AisenShot 同样应把时间投影集中在适配层，而不是让任意 UI 代码转换浮点秒数。

### 4.3 从 PySceneDetect 提取与舍弃的部分

保留：

- `process(frame) -> events[]`、`flush(end) -> events[]` 的流式检测器生命周期；
- 检测器可声明 look-ahead，并允许当前帧发出较早帧的事件；
- Content 的 HSV/亮度分量差异与可配置权重；
- Adaptive 对 Content 指标使用前后窗口比值和最低内容差异保护；
- Threshold/Fade 的亮度阈值穿越、淡出/淡入配对和 bias 切点；
- 最短镜头过滤、闪切合并/抑制概念；
- 可选逐帧指标，用于阈值标定和回归测试。

舍弃：

- Python `SceneManager`、线程队列、OpenCV/PyAV 视频后端；
- `FrameTimecode` 的多种动态输入形式；
- Stats CSV、CLI 配置、视频切片、图片输出和 HTML 报告；
- Python 继承层级和运行时反射；
- 与 AisenLens 当前 0.2 秒 Canvas 签名算法的兼容模式。

说明：PySceneDetect 的默认阈值只能作为初始基准。AisenShot 使用 YUV 输入、自有 HSV 转换和独立下采样后，必须通过测试集重新标定，不能把相同数值直接宣传为等价效果。

## 5. 推荐目录结构

推荐先建立一个 workspace 包，避免在只有一个真实消费者时拆成多个 npm 包；包内保持 C++、WASM ABI、浏览器运行时和公共 TypeScript API 的明确边界。

```text
packages/scene-engine/
├── package.json                    # @aisenlens/scene-engine，无 React 依赖
├── CMakeLists.txt                  # 原生与 Emscripten 共用入口
├── cmake/
│   └── EmscriptenOptions.cmake
├── cpp/
│   ├── include/aisenshot/
│   │   ├── scene_engine.h          # C++ 公共门面
│   │   ├── detector.h              # ISceneDetector 生命周期
│   │   ├── frame_view.h            # 只读平面帧视图
│   │   ├── scene_event.h            # 时间点、切点、淡变区间、证据
│   │   └── config.h
│   ├── src/
│   │   ├── core/
│   │   │   ├── scene_engine.cpp
│   │   │   ├── detector_pipeline.cpp
│   │   │   ├── event_resolver.cpp
│   │   │   └── min_scene_filter.cpp
│   │   ├── image/
│   │   │   ├── downscale.cpp
│   │   │   ├── yuv_to_hsv.cpp
│   │   │   └── frame_metrics.cpp
│   │   └── detectors/
│   │       ├── content_detector.cpp
│   │       ├── adaptive_detector.cpp
│   │       └── threshold_detector.cpp
│   └── tests/
│       ├── synthetic_frame_factory.cpp
│       ├── content_detector_test.cpp
│       ├── adaptive_detector_test.cpp
│       ├── threshold_detector_test.cpp
│       ├── event_resolver_test.cpp
│       └── checkpoint_test.cpp
├── wasm/
│   ├── scene_engine_abi.h           # 版本化 C ABI
│   ├── scene_engine_abi.cpp
│   └── feature_probe.ts             # SIMD 能力探测
├── src/
│   ├── index.ts                     # 唯一公共导出
│   ├── api/
│   │   ├── types.ts
│   │   ├── config.ts
│   │   └── errors.ts
│   ├── client/
│   │   └── SceneEngineClient.ts     # UI 无关的任务 API
│   ├── worker/
│   │   ├── scene-engine.worker.ts
│   │   ├── protocol.ts
│   │   ├── mediaDecoder.ts          # Mediabunny/WebCodecs 适配器
│   │   ├── wasmRuntime.ts
│   │   └── frameBufferPool.ts
│   └── result/
│       └── normalizeResult.ts
├── test/
│   ├── abi-parity.test.ts
│   ├── worker-protocol.test.ts
│   └── browser-integration.test.ts
└── README.md

apps/web/src/features/auto-shot/
├── services/
│   ├── autoShotTaskService.ts       # 项目任务编排与持久化
│   └── sceneResultAdapter.ts         # EngineResult -> AisenLens 候选分镜
├── hooks/
│   └── useAutoShotTask.ts           # React 生命周期适配，未来实施
└── types.ts                          # 只保留 AisenLens 业务类型
```

边界要求：

- `packages/scene-engine` 不得导入 React、Zustand、项目仓储或 `ShotRecord`。
- C++ 核心不得导入浏览器/WebCodecs 类型；原生测试直接喂 `FrameView`。
- Worker 内部可以依赖 Mediabunny，但公共 API 不暴露 Mediabunny 类型。
- `apps/web` 只通过包的公共 TypeScript API 启动任务和接收结果。
- 项目仓储和结果应用仍属于 `features/auto-shot` / `features/project`，不进入通用引擎。

## 6. 模块职责

| 模块 | 负责 | 不负责 |
| --- | --- | --- |
| `SceneEngine` C++ 门面 | 检测器生命周期、帧顺序校验、事件收集、flush、版本信息 | 文件读取、线程、UI、存储 |
| `FrameMetrics` | 下采样、HSV/亮度统计、共享指标计算 | 判断是否为切点 |
| `ContentDetector` | 固定阈值硬切判断 | 自适应窗口、淡变配对 |
| `AdaptiveDetector` | Content 指标窗口、比值和延迟事件 | 重复计算帧颜色特征 |
| `ThresholdDetector` | 黑场/白场阈值穿越、淡变配对、bias | 普通硬切检测 |
| `MinSceneFilter` | 对融合后的最终边界执行最短镜头、merge/suppress | 检测器内部峰值去抖、跨检测器融合 |
| `EventResolver` | 排序、去重、同一转场多来源合并 | 写入 AisenLens 分镜 |
| WASM C ABI | 句柄、配置、帧缓冲、事件读取、checkpoint | 业务友好 API |
| `wasmRuntime` | 选择 baseline/SIMD、内存视图、资源释放 | 媒体解码 |
| `mediaDecoder` | Blob 解封装、顺序解码、时间戳、像素格式协商 | 场景判定 |
| Worker | 同线程连接 decoder 与 WASM、进度、暂停/取消 | React 状态、IndexedDB 业务模型 |
| `SceneEngineClient` | 类型安全任务 API、Worker 协议封装 | 结果应用 |
| `autoShotTaskService` | 媒体指纹、任务记录、checkpoint 持久化 | 像素算法 |
| `sceneResultAdapter` | 时间投影、候选分镜、用户应用 | 改写引擎原始证据 |

## 7. C++ 核心设计

### 7.1 帧模型

C++ 只接收只读、无所有权的平面视图：

```cpp
enum class PixelFormat : uint8_t { I420, NV12, RGBX, RGBA };
enum class ColorMatrix : uint8_t { Identity, Bt601, Bt709, Bt2020Ncl };
enum class ColorPrimaries : uint8_t { Unknown, Bt709, Bt470Bg, Smpte170M, Bt2020 };
enum class TransferCharacteristics : uint8_t { Unknown, Bt709, Srgb, Pq, Hlg };

struct PlaneView {
  const uint8_t* data;
  uint32_t stride;
  uint32_t width;
  uint32_t height;
};

struct FrameView {
  PixelFormat format;
  PlaneView planes[3];
  uint32_t coded_width;
  uint32_t coded_height;
  uint32_t visible_x;
  uint32_t visible_y;
  uint32_t visible_width;
  uint32_t visible_height;
  uint8_t bit_depth;
  ColorMatrix matrix;
  ColorPrimaries primaries;
  TransferCharacteristics transfer;
  bool full_range;
  uint64_t presentation_index;
  int64_t timestamp_us;
  int64_t duration_us;
};
```

规则：

- 帧必须按呈现顺序输入，`timestamp_us` 单调不减。
- `presentation_index` 是本次解码的顺序编号，不等同于 AisenLens 项目帧号。
- 最短镜头时长使用微秒比较，避免 VFR 视频依赖平均帧率。
- C++ 第一版只接收规范化的 8-bit `I420`、`NV12`、`RGBX` 或 `RGBA`；10/12-bit、未知格式和 HDR 必须由 Worker 按已验证策略规范化，或返回明确 capability error。
- 颜色矩阵、primaries、transfer、full/limited range、bit depth 和 visible rect 必须随帧传入；YUV 转换不得假定所有视频都是 BT.709 limited range。
- 旋转和镜像不改变全画面标量统计，但会影响空间采样网格；Worker 必须冻结统一的可见区域与方向语义，同一任务中不得切换。

### 7.2 检测器接口

```cpp
class ISceneDetector {
 public:
  virtual ~ISceneDetector() = default;
  virtual DetectorId id() const = 0;
  virtual uint32_t lookahead_frames() const = 0;
  virtual void reset() = 0;
  virtual void process(const FrameContext& frame,
                       const SharedFrameMetrics& metrics,
                       EventSink& output) = 0;
  virtual void flush(const TimePoint& end, EventSink& output) = 0;
};
```

`lookahead_frames()` 明确 Adaptive 会在处理未来帧时发出较早的目标帧事件。所有事件必须携带自己的真实时间点，调用方不能假设事件发生在当前输入帧。

### 7.3 共享指标层

先对输入帧按保持比例的目标分析尺寸下采样，再一次性生成检测器共享指标：

- `mean_luma`：Threshold/Fade 直接使用；
- HSV 8-bit 平面或与前一帧直接累积出的 `delta_hue`、`delta_saturation`、`delta_luma`；
- `content_score`：按配置权重归一化；
- 可选诊断字段：处理尺寸、输入格式、转换耗时。

第一阶段不计算边缘图。PySceneDetect 默认 `delta_edges` 权重为 0，先省去 Canny、膨胀和对应 OpenCV 依赖；接口保留指标扩展位，但不预先实现未使用能力。

### 7.4 Content Detector

核心步骤：

1. 第一帧只建立前帧状态，分数为 0。
2. 逐像素计算相邻分析帧的 Hue、Saturation、Luma 平均绝对差。
3. 按权重归一化为 `content_score`，与固定阈值比较。
4. 将超过阈值的事件交给最短镜头/闪切过滤器。
5. 输出 `hard-cut` 事件，并附三个分量、综合分数和阈值。

初始基准参数可从 PySceneDetect 的 `threshold=27`、三分量等权和最短镜头 0.6 秒开始测试，但产品默认值必须在 AisenShot 自身像素管线完成标定后确认。

### 7.5 Adaptive Detector

Adaptive 不继承或再次执行 Content Detector，而是消费同一个 `content_score` 流：

1. 保存 `2 * window_width + 1` 个连续分数。
2. 以窗口中心帧为目标，计算其余前后邻居的平均分。
3. `adaptive_ratio = target_score / neighbor_average`，零均值时使用明确上限。
4. 同时满足 `adaptive_ratio >= adaptive_threshold` 和 `target_score >= min_content_score` 才产生硬切。
5. 事件时间取窗口中心帧，因此天然有 `window_width` 帧输出延迟。

建议以 PySceneDetect 的 `adaptive_threshold=3.0`、`window_width=2`、`min_content_val=15` 作为基准用例，并把窗口延迟、零均值、视频尾部不足窗口和最短镜头判断列为必测边界。

### 7.6 Threshold/Fade Detector

第一阶段实现两个明确模式：

- `floor`：平均亮度跌破阈值视为 fade-out，重新升至阈值视为 fade-in；
- `ceiling`：用于闪白/淡白，逻辑相反。

输出不是模糊的 `gradual-transition` 单点，而是：

```text
fade event
├── start       第一次阈值穿越
├── end         对应的反向阈值穿越
├── boundary    start/end 之间按 fade_bias 计算的建议切点
├── direction   through-black | through-white
└── evidence    threshold、start/end mean_luma
```

`fade_bias` 取 `[-1, 1]`；0 表示区间中点。视频结束仍处于 fade-out 时，仅在 `emit_final_fade=true` 时由 `flush()` 输出未闭合事件。AisenShot 使用明确的平均亮度定义并重新标定阈值，不复制 PySceneDetect `numpy.mean(BGR)` 的实现细节。

### 7.7 事件过滤与融合

推荐检测预设只选择一个主要硬切策略：`content` 或 `adaptive`，再按需并行启用 `threshold`。不要默认同时运行 Content 和 Adaptive 后简单拼接结果。

事件处理分三级：

1. 检测器级去抖：只处理同一 detector 的连续高分峰、闪切候选和 look-ahead，不执行最终 minimum-scene 约束。
2. 跨检测器解析：按时间排序，把容差窗口内或 fade 区间内的同一事件合并。
3. 最终边界约束：在融合后的边界上执行 minimum scene duration，并按明确的 merge/suppress 策略保留被抑制证据。

融合后事件保留 `sources[]` 和各自 evidence。有效 fade 区间与硬切点重叠时，最终类型优先标为 fade，但不得丢弃硬切来源。所有去重规则必须是确定性的。跨 native/WASM/SIMD 要求边界时间、类型、顺序和决策完全一致；诊断浮点指标只允许在批准容差内不同。

为避免阈值附近因浮点累计顺序产生不同边界，参与 detector 决策的共享指标应优先采用整数累计、定点量化或明确舍入；Adaptive ratio 优先通过交叉乘法比较。浮点值只用于对外诊断，不应成为跨后端不稳定的隐藏决策源。

### 7.8 指标不是概率

公共结果不使用未经校准的 `confidence` 名称。建议字段：

- `score`：检测器原始分数；
- `threshold`：触发阈值；
- `strength`：可选的 0..1 UI 排序值，必须标明为启发式归一化；
- `evidence`：检测器专属可解释指标。

若未来需要概率置信度，必须基于标注数据做校准并给出版本，不把 `score / threshold` 直接称为概率。

## 8. 时间与结果模型

### 8.1 引擎时间点

```ts
export interface SceneTimePoint {
  presentationIndex: number;
  timestampUs: number;
  durationUs: number;
}
```

- `timestampUs` 是引擎和解码层的权威位置。
- `presentationIndex` 用于诊断、测试并区分重复 PTS；恢复位置不得只依赖 timestamp。
- 引擎不读取项目平均帧率，也不输出 `ShotRecord`。
- `sceneResultAdapter` 负责将 `timestampUs` 一次性投影为 AisenLens 整数项目帧，并按 `[startFrame, endFrame)` 构造候选。Phase 0 必须冻结舍入方式、首尾 clamp、重复 PTS、零 duration 和项目末帧规则，禁止实现阶段临时选择 `floor/round/ceil`。
- 引擎只返回内部边界；视频起点和终点由结果适配器加入，避免把“边界”和“完整镜头列表”混为一体。

### 8.2 公共结果

```ts
export type DetectorKind = "content" | "adaptive" | "threshold";

export interface SceneBoundary {
  id: string;
  kind: "hard-cut" | "fade";
  boundary: SceneTimePoint;
  transitionRange: {
    start: SceneTimePoint;
    end: SceneTimePoint;
  } | null;
  sources: Array<{
    detector: DetectorKind;
    score: number;
    threshold: number;
    strength: number | null;
    evidence: Record<string, number>;
  }>;
}

export interface SceneEngineResult {
  schemaVersion: 1;
  engineVersion: string;
  configHash: string;
  media: {
    durationUs: number;
    decodedFrames: number;
    codedWidth: number;
    codedHeight: number;
  };
  boundaries: SceneBoundary[];
  diagnostics: {
    backend: "wasm-baseline" | "wasm-simd";
    elapsedMs: number;
    peakWasmBytes: number;
  };
}
```

`id` 应由 schema、事件类型、检测器、时间点/区间和 config hash 确定性生成，便于暂停恢复和重复运行去重，不使用随机 UUID。`configHash` 必须基于版本化、字段顺序固定的规范化配置生成，不能直接 hash 普通对象的偶然序列化结果。

## 9. TypeScript 公共 API

公共 API 面向任意 TypeScript 宿主，不面向 React：

```ts
export type HardCutConfig =
  | {
      kind: "content";
      threshold: number;
      weights: { hue: number; saturation: number; luma: number };
    }
  | {
      kind: "adaptive";
      adaptiveThreshold: number;
      windowWidth: number;
      minimumContentScore: number;
      weights: { hue: number; saturation: number; luma: number };
    };

export interface SceneDetectionConfig {
  hardCut: HardCutConfig;
  fade: null | {
    mode: "floor" | "ceiling";
    threshold: number;
    bias: number;
    emitFinalFade: boolean;
  };
  minimumSceneDurationUs: number;
  analysis: {
    maxWidth: number;
    temporalSampling:
      | { kind: "every-frame" }
      | { kind: "stride"; step: number; refineRadiusFrames: number };
  };
  diagnostics: "off" | "summary" | "metrics";
}

export interface StartSceneDetectionRequest {
  source: Blob;
  mediaFingerprint: string;
  config: SceneDetectionConfig;
  checkpoint?: SceneEngineCheckpoint;
}

export interface SceneEngineCheckpoint {
  schemaVersion: 1;
  engineVersion: string;
  configHash: string;
  mediaFingerprint: string;
  resumeAfter: {
    timestampUs: number;
    timestampOrdinal: number;
    nextPresentationIndex: number;
  };
  committedBoundaries: SceneBoundary[];
  coreState: ArrayBuffer;
}

export type SceneTaskOutcome =
  | { status: "completed"; result: SceneEngineResult }
  | { status: "paused"; checkpoint: SceneEngineCheckpoint }
  | { status: "cancelled" }
  | { status: "failed"; error: SceneEngineError };

export interface SceneEngineTask {
  readonly jobId: string;
  readonly completion: Promise<SceneTaskOutcome>;
  pause(): Promise<SceneEngineCheckpoint>;
  cancel(): Promise<void>;
}

export interface SceneEngineClient {
  start(
    request: StartSceneDetectionRequest,
    observer?: { onProgress(progress: SceneEngineProgress): void },
  ): SceneEngineTask;
  dispose(): Promise<void>;
}
```

规则：

- 配置使用带判别字段的联合类型，不使用松散 `Record<string, unknown>`。
- `Blob` 可为 `File`，但 API 不要求 DOM 文件输入控件。
- 进度最多按固定时间间隔节流回传，不逐帧 `postMessage`。
- 错误使用稳定 code（如 `UNSUPPORTED_CODEC`、`WASM_INIT_FAILED`、`DECODE_FAILED`、`INVALID_CHECKPOINT`、`CANCELLED`），UI 再映射为文案。
- `cancel` 不产生 checkpoint；`pause` 只在安全帧边界完成并返回 checkpoint，同时使当前任务以 `paused` outcome 结束。恢复始终通过新的 `start({ checkpoint })` 创建新任务，不复用已暂停的 Worker job。

## 10. Worker 协议与运行状态

### 10.1 协议

```text
主线程 -> Worker
  INIT
  START { jobId, Blob, config, checkpoint? }
  PAUSE { jobId }
  CANCEL { jobId }
  DISPOSE

Worker -> 主线程
  READY { backend, version }
  STARTED { jobId }
  PROGRESS { jobId, processedUs, durationUs, decodedFrames, newBoundaries, totalBoundaries }
  CHECKPOINT { jobId, checkpoint }
  COMPLETED { jobId, result }
  CANCELLED { jobId }
  ERROR { jobId, code, message, details? }
```

### 10.2 状态机

```text
idle -> initializing -> decoding -> flushing -> completed
                         |    |
                         |    +-> pausing -> paused(checkpoint)
                         +------> cancelling -> cancelled
                         +------> failed
```

Worker 一次只执行一个重型检测任务；项目级并发由 `autoShotTaskService` 控制。任务开始时冻结媒体指纹、配置和引擎版本，运行中 UI 设置变化不改变当前结果。

### 10.3 暂停恢复

checkpoint 分为两层。C++ 核心只导出不透明算法状态 `coreState`，至少包含：

- ABI、schema 和 engine version；
- config hash、最后已提交时间点、下一帧位置；
- 前一分析帧所需的紧凑状态；
- Adaptive 分数窗口、Fade 状态机、最短镜头过滤状态；
- 已输出边界的确定性摘要，用于校验而不是替代完整结果。

Worker/TypeScript 层再封装 `SceneEngineCheckpoint`，保存完整已提交边界、`timestampUs + timestampOrdinal`、下一 `presentationIndex`、媒体指纹、配置 hash 和 coreState。恢复前必须校验媒体指纹、配置 hash、checkpoint schema 和精确 engine state version；没有显式迁移器时不得只比较主版本后猜测恢复。浏览器解码器从 checkpoint 时间点重新建立顺序解码；若从更早关键帧启动，必须按 timestamp 与同时间戳序号跳过预热帧，且不得二次提交给引擎。checkpoint 由 Web 应用存入 IndexedDB，C++ 核心不直接持久化。

媒体指纹不能只依赖文件名、大小、修改时间和 MIME。产品恢复校验至少还应包含内容摘要（完整 SHA-256 或经过评审的首尾分块摘要）以及视频轨 codec、尺寸和时长；计算策略需在 Phase 0 记录成本与碰撞风险。

## 11. WebCodecs 与 WASM 内存策略

### 11.1 可实现的复制上限

当前 Web 平台不能把硬件解码器内部 `VideoFrame` 表面直接映射为普通 WASM 线性内存，因此被送入 WASM 的像素至少需要一次显式复制。生产预处理后端必须由 Phase 0 在目标浏览器中实测后选择：

```text
A. VideoSample 原生 I420/NV12 -> copyTo(WASM memory) -> C++ 下采样
B. VideoSample -> copyTo RGBX/RGBA(WASM memory) -> C++ 下采样
C. VideoSample -> Worker OffscreenCanvas 低分辨率预处理 -> 小缓冲写入 WASM
```

路径 C 不是旧 `<video>` 随机 seek 降级，而是 Worker 内顺序解码后的显式预处理后端。它只有在兼容性或端到端基准优于全分辨率复制时才能启用，并必须使用相同 detector/result 契约。禁止的路径是让像素经过主线程或形成无界中间对象：

```text
VideoFrame -> Canvas -> ImageData -> JS Array -> WASM Array
```

### 11.2 具体策略

- 解码器、帧复制和 WASM 全部运行在同一个专用 Worker，像素帧不经过 React 主线程。
- 使用 `VideoSampleSink.samples()` 顺序解码，不对每个时间点调用随机 `getSample()`。
- 不得假定可以通过 `copyTo()` 请求 I420。若 sample 原生暴露 I420/NV12，则复制其实际平面；否则只请求规范允许的 RGBX/RGBA 标准化格式，或选择经 Phase 0 批准的 Worker 预处理后端。
- `sample.format === null`、10/12-bit/HDR 和浏览器格式差异必须进入 capability matrix；未经验证不得静默改变颜色语义。
- 得知视频尺寸后一次性 `reserve_frame_buffers()`，处理期间禁止 WASM memory growth，避免 `Uint8Array` 视图失效。
- 第一版使用单复用缓冲；性能分析证明复制和计算不能重叠后，再引入双缓冲，不预先增加环形队列复杂度。
- 每帧处理完成立即 `VideoSample.close()`；检测器只保留下采样后的前帧状态和小窗口指标，不持有原始 4K 帧。
- diagnostics 默认不回传逐帧指标；开启时按批次传 `Float32Array`，使用 transferable buffer。
- 进度消息只包含标量和新增边界，不包含帧图像。

### 11.3 SIMD

产出同 ABI 的两个 WASM 文件：

- `scene-engine.wasm`：baseline；
- `scene-engine-simd.wasm`：使用 `-msimd128`。

运行时通过小模块 `WebAssembly.validate()` 探测 SIMD，选择一次后在任务期间固定。SIMD 优先用于：

- 8/16 位像素绝对差累加；
- YUV 下采样与亮度均值；
- HSV 分量差异；
- 直方累计前的批量预处理（未来）。

本阶段不启用 WASM pthreads。线程需要 `SharedArrayBuffer` 和跨源隔离，会改变部署头与第三方资源约束；应在单 Worker + SIMD 基准证明 CPU 为瓶颈后单独评估。

## 12. C ABI 设计原则

不使用 Embind 暴露 C++ 类，避免绑定层对象和逐帧 JS 调用开销。建议版本化、句柄式 C ABI：

```c
uint32_t asen_abi_version(void);

asen_status asen_create(
  const asen_engine_config_v1* config,
  asen_handle* out_handle);

asen_status asen_reserve_frame(
  asen_handle handle,
  const asen_frame_layout_v1* layout,
  asen_frame_buffer_v1* out_buffer);

asen_status asen_process_frame(
  asen_handle handle,
  const asen_frame_meta_v1* frame);

uint32_t asen_read_events(
  asen_handle handle,
  asen_event_v1* output,
  uint32_t capacity);

asen_status asen_flush(asen_handle handle, int64_t end_timestamp_us);
asen_status asen_export_checkpoint(asen_handle handle, asen_blob_v1* output);
asen_status asen_import_checkpoint(asen_handle handle, const uint8_t* data, uint32_t size);
void asen_destroy(asen_handle handle);
```

- ABI 结构体只使用固定宽度整数、浮点数、offset 和 length，不跨边界传 STL、异常或裸字符串。
- C++ 异常不得穿过 ABI；统一转为 `asen_status` 和可读取错误信息。
- TS wrapper 缓存 HEAP 视图，只在 `memory.buffer` 改变时刷新。
- 事件批量读取，不为每帧/每字段调用独立导出函数。
- native 和 WASM 构建必须跑同一组 C++ 核心测试。

## 13. AisenLens 集成边界

未来接入时，React 不应再导入 Worker、Mediabunny 或 WASM 运行时。推荐调用链：

```text
AutoShotPanel / EditorWorkspace
  -> useAutoShotTask
  -> autoShotTaskService
  -> @aisenlens/scene-engine SceneEngineClient
  -> Worker + WebCodecs + WASM
  -> SceneEngineResult
  -> sceneResultAdapter
  -> AutoShotCandidate[]
  -> 用户显式应用
  -> shotService / editor command
```

迁移时应：

- 用 feature hook/service 收拢当前 `EditorWorkspace.tsx` 中的运行状态和控制器；
- 新建引擎结果记录，而不是继续把差异分数命名为 `confidence`；
- 保留媒体指纹、暂停/继续、重新扫描和显式应用；
- 结果适配器统一完成 timestamp -> project frame、排序、边界去重和半开区间构造；
- 应用结果继续是单一可撤销领域操作，不允许 Worker 直接写项目仓储；
- 新链路验收后删除 `autoShotService.ts` 的 Canvas/seek 算法，不保留长期双轨或静默降级。

## 14. 测试与评估方案

### 14.1 C++ 单元测试

- Content：首帧、纯色硬切、亮度变化、色相变化、相同帧、权重、阈值边界。
- Adaptive：窗口延迟、局部高峰、持续快速运动、邻居均值为零、尾部 flush、最小内容分。
- Threshold：floor/ceiling、单次穿越、完整淡出淡入、bias 三个位置、结尾未闭合 fade。
- Filter：minimum duration、merge/suppress、连续闪白、重复事件。
- Resolver：同时间多来源、fade 区间与 hard-cut 重叠、确定性排序。
- 时间：非整数帧率、VFR 时间戳、重复/倒退时间戳错误。
- checkpoint：暂停前后结果与一次连续运行完全一致。

### 14.2 参考一致性测试

- 使用程序生成的无版权合成帧序列建立 golden fixtures。
- 在开发阶段用 PySceneDetect 0.7.1 对同一合成序列生成参考指标和边界，AisenShot 允许明确记录的色彩转换容差。
- Python 只作为开发验证工具，不进入 npm 包、浏览器产物或用户运行环境。
- 若从 PySceneDetect 直接采用任何代码片段，必须保留 BSD-3-Clause 许可声明；推荐独立实现并在文档注明算法参考来源。

### 14.3 数据集评估

按照 TRECVID-SBD 口径记录：

- hard cut：容差 0、1、2 帧下的 Precision、Recall、F1；
- fade：预测点是否落在标注转场区间；
- matched event 的平均/95 分位边界偏移；
- 每分钟视频处理耗时、峰值内存、解码耗时与算法耗时拆分。

评估顺序：项目自有人工标注小集 -> BBC/AutoShot hard-cut -> ClipShots gradual。公开数据集许可和下载不纳入产品仓库；基准脚本只接受本地数据路径。

### 14.4 浏览器集成测试

- 使用现有浏览器测试方式加载短视频，校验 Worker 初始化、baseline/SIMD 选择和完整结果。
- 覆盖 MP4/H.264、WebM/VP9、无音轨、旋转元数据、VFR、取消、暂停恢复、损坏文件和不支持编码。
- 验证主线程不接收帧像素；Worker 每帧释放 `VideoSample`；长视频内存不随帧数线性增长。
- 同一素材/配置连续运行两次，结果顺序、时间点、config hash 必须一致。

## 15. 性能与质量门槛

实施前先记录基准机型，避免只写无上下文的绝对数字。第一阶段验收至少满足：

- 准确率回归以同一标注集和同一容差比较，不以肉眼观感替代指标。
- 正确性基线默认逐帧分析；生产默认是否逐帧、采用低成本逐帧预筛选还是显式 stride，必须由 Phase 0/标注集的召回率与端到端性能共同决定。任何 stride 都必须是可见的质量预设，候选区间精修不能掩盖漏检风险。
- 峰值内存为 `O(原始帧缓冲 + 分析帧 + detector window)`，不得随视频时长增长。
- 处理期间 React 主线程不做像素读取和检测计算，进度更新节流后不造成可见卡顿。
- SIMD 与 baseline 必须输出相同边界；浮点指标差异限定在测试容差内。
- 任何阈值调整都必须记录引擎版本、数据集、配置和前后 Precision/Recall/F1。

## 16. 分阶段实施路线

### Phase 0：规格与基准

- 固化本文 API、时间语义、事件语义和像素格式。
- 建立合成帧 fixture、最小人工标注真实视频集、评分脚本和当前 JS 算法准确率/性能基线。
- 在目标 Web 浏览器比较原生 YUV、RGBX/RGBA、Worker OffscreenCanvas 低分辨率预处理，以及逐帧/预筛选策略的 decode、copy、preprocess、detect、总耗时和内存。
- 冻结 VFR 到项目帧的舍入规则、颜色空间规范、媒体指纹、checkpoint envelope、任务 outcome 和 config hash 规范。
- 确认 Emscripten 版本、构建产物和许可证 NOTICE。

退出条件：配置/结果/checkpoint schema 经评审；至少一种 Web 像素路径通过真实 smoke；基线报告可复现；不再用 `confidence` 表示原始差异分。Phase 0 未通过不得开始 C++ Phase 1。

### Phase 1：C++ Content Core

- 建立独立 CMake target、`FrameView`、共享指标和 Content Detector。
- 原生单元测试先行；不接浏览器、不接 React。
- 明确下采样与 YUV->HSV 数值规范。

退出条件：合成用例稳定，native sanitizer/CTest 通过，指标与参考容差有记录。

### Phase 2：Adaptive + Threshold/Fade

- Adaptive 复用 Content 指标，不重复像素遍历。
- 实现 Threshold floor/ceiling、fade range、bias 和 flush。
- 完成过滤、融合、checkpoint 和确定性测试。

退出条件：三类检测器可独立启用；连续运行与 checkpoint 恢复结果一致。

### Phase 3：WASM ABI 与 Worker

- 建立 C ABI、baseline/SIMD 构建和 TS wrapper。
- 接入 Mediabunny `VideoSampleSink` 顺序解码。
- `copyTo()` 直接写 WASM 预分配 I420 缓冲。
- 实现进度、取消、暂停和错误协议。

退出条件：真实短视频可在 Worker 中完成检测，主线程无像素帧消息，WASM/native 结果一致。

### Phase 4：AisenLens 业务接入

- 新建 `autoShotTaskService`、hook 和结果适配器。
- 接入项目任务记录、媒体指纹和候选确认。
- 将应用候选收敛为领域命令。
- 验收后删除现有 Canvas/seek 检测服务和相关旧字段。

退出条件：暂停/继续、重新扫描、显式应用和时间轴结果完整回归；不保留双检测路径。

### Phase 5：标定与优化

- 在标注集上做 Content/Adaptive 参数 sweep。
- 分离 decode/copy/preprocess/detect 耗时，再决定优化重点。
- 启用和验证 SIMD；只有证据表明需要时才评估双缓冲或线程。

退出条件：准确率、边界误差、耗时和内存基线进入持续回归。

### Later：Histogram / Hash

只有前三类检测器稳定后再立项。Histogram 可复用下采样/颜色指标基础，Hash 需要独立感知哈希模块；两者不得在当前阶段以空实现、占位 UI 或无测试配置提前进入公共 API。

## 17. 风险与应对

| 风险 | 应对 |
| --- | --- |
| WebCodecs 解码支持受浏览器和系统影响 | 由 decoder 返回明确 capability/error；不在核心内加入 Canvas seek 降级 |
| `VideoFrame.copyTo()` 不能任意请求 I420，且 sample format 可能为 null | 启动时记录实际格式；原生 I420/NV12 走平面快路，其他格式按规范转 RGBX/RGBA，必要时使用经基准批准的 Worker 预处理后端或返回 capability error |
| WASM memory growth 使 JS 视图失效 | 视频尺寸已知后预分配，任务期间禁用增长并设置可测内存上限 |
| HSV 实现与 OpenCV 数值不同 | 固化公式、合成 golden 和容差；重新标定阈值，不假装数值完全等价 |
| Adaptive 延迟导致时间点错位 | 每个事件携带目标 TimePoint；接口暴露 lookahead 并专项测试 |
| fade 与 hard-cut 重复 | 原始证据保留，EventResolver 确定性聚类而非简单去重 |
| VFR 项目帧映射偏差 | 引擎保留 timestampUs；只在领域适配器集中映射一次 |
| 长视频暂停后无法精确恢复 | checkpoint 保存算法状态，解码器按关键帧预热但不重复提交 |
| SIMD 产生平台差异 | baseline 为正确性基准，SIMD 跑同一 fixtures 和浏览器矩阵 |
| 引擎扩展变成通用视频框架 | 当前只定义版本化 capability/result envelope，不设计关键帧等未立项功能 |

## 18. 架构决策记录

1. 采用单一 `packages/scene-engine` workspace 包，内部隔离 C++ core 与 browser host。
2. C++ core 只消费平面帧，不负责视频文件解码。
3. 浏览器首个 decoder 使用现有 Mediabunny + WebCodecs，不自研容器解析。
4. 生产帧路径在 Worker 内完成，主线程不接触像素。
5. `VideoFrame -> WASM` 允许一次必要复制，禁止 Canvas/ImageData/JS Array 中转。
6. Content 和 Adaptive 共享指标；默认预设只选择其一，Fade 可并行。
7. 引擎以微秒时间戳为权威，AisenLens 项目帧由适配器生成。
8. 原始 score 不称为 confidence。
9. 先 native correctness，再 WASM，再 React 集成；不以 UI 驱动算法结构。
10. 新引擎验收后删除旧 Canvas 检测路径，不维护兼容双轨。
11. 仅为未来能力保留版本和 capability 扩展点，本阶段不设计关键帧提取。
12. 生产像素路径由 Web 端到端基准决定，不把全分辨率 YUV->WASM 复制预先写死为唯一正确实现。
13. checkpoint 由 Worker envelope 与 C++ core state 组成；恢复要求精确版本、强媒体身份和完整结果前缀。
14. 先融合跨检测器事件，再对最终边界执行 minimum scene duration。

## 19. 规划完成后的下一项工作

下一阶段只应执行 Phase 0：确认 API/schema、选择 Emscripten 构建版本、建立合成与真实 fixture、记录当前 JS 基线并验证浏览器像素路径。Phase 0 完成并记录结果前，不应开始 C++ Phase 1、React 接入或替换现有自动分镜业务链路。
