# 参考项目索引

## 2026-09-08 Workflow 重构规划（正式产品，排除废弃预览）

先复核 React Router useSearchParams、Zustand createStore、WAI Window Splitter、wavesurfer Regions 官方资料，再提出“既有栈导航 + 项目作用域会话 + 复用领域能力”的初案；随后按 OpenReel → OpenCut 顺序检查以下文件。本轮只写规划，没有修改生产代码，也不把参考项目功能当作 AisenLens 已有能力。

| 当前模块 | 本轮实际查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| Workflow Shell、Viewer / Inspector、Marker 命令边界 | OpenReel `openreel-video-main/apps/web/src/components/editor/EditorInterface.tsx`、`InspectorPanel.tsx`、`apps/web/src/stores/project/marker-slice.ts` | EditorInterface 分别引入 Toolbar、Preview、Inspector、Timeline 和项目/UI/引擎 store；Inspector 有独立 section/tab 组件；Marker slice 通过 actionExecutor 执行更新。 | 采纳稳定项目生命周期、视图/命令分离及分区布局；保持 AisenLens 现有播放器、Timeline、Marker。只读这些相关片段，不复制完整编辑器、Chat 或云服务。 |
| Scene 导航、Structure 显示、时间线视口 | OpenCut `opencut-classic-main/apps/web/src/components/editor/scenes-view.tsx`、`core/managers/scenes-manager.ts`、`timeline/hooks/use-timeline-zoom.ts` | ScenesView 经 editor.scenes 调用管理操作，manager 使用 command 执行创建/删除/改名；缩放 hook 将行为委托 ZoomController 并负责订阅/清理。 | 只采纳按需场景导航和命令/视口边界。OpenCut 编辑序列不等同 AisenLens 叙事 Scene；保留当前至少两镜、连续、跨类别不重叠的 Group 规则，不做假嵌套树。 |
| Sound、Learn 和未来能力边界 | 上述工作区/Inspector 片段；wavesurfer 官方 Regions 文档；AisenLens 自身 media、shot、group、template 源码 | 区间UI模式不能证明具备语音识别；AisenLens 已有多轨/波形和原笔记，但无独立 Pattern/Technique 实体。 | Sound 复用现有音轨，语义轨显示未开放；Learn 首轮只聚合真实 notes/summary，方法保存与 Create 保留 Coming Soon。未来新 Domain 另行按模块研究。 |

最终计划：`docs/plans/aisenlens-workflow-redesign/00-master-plan.md`及01–08自包含阶段计划。用户已明确废弃Lensflow预览，本条不继承任何预览样式、数据或组件复用决定。

## 参考项目来源与本地获取

参考项目不提交到 AisenLens 仓库；只有本索引随 Git 同步。设计或实现某个
模块时，优先使用现有本地副本。若对应目录不存在，可在仓库外的临时目录按下表
获取并仅检查与当前模块相关的文件；不得把下载结果提交到 AisenLens。

| 本地目录 | GitHub 来源 | 说明 |
| --- | --- | --- |
| `opensource-openreel/` | `https://github.com/Augani/openreel-video` | 公共参考仓库，优先查阅。 |
| `opensource-opencut/` | `https://github.com/OpenCut-app/OpenCut` | 公共参考仓库，次优先查阅。 |
| `opensource-PySceneDetect/` | `https://github.com/Breakthrough/PySceneDetect` | 场景检测算法与测试参考。 |
| `previous-aisenlens/` | 待项目所有者确认 | 历史本地快照；未验证原始远程地址时不得替换为推测链接。 |

获取后仍须遵守根 `AGENTS.md` 的模块研究顺序，并将实际查阅的文件与确认结论
更新到本索引。

## 2026-08-28 自动分镜内容预设与前端控制

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 自动分镜产品设置、内容预设与候选应用 | OpenReel `packages/core/src/ai/cloud-job-types.ts`、`apps/web/src/components/editor/ai-panel/ai-kinds.config.ts`、`apps/web/src/components/editor/ai-panel/AIPanel.tsx`；OpenCut `apps/web/src/components/editor/scenes-view.tsx`、`apps/web/src/core/managers/scenes-manager.ts`；PySceneDetect `scenedetect/detectors/{content_detector,adaptive_detector,threshold_detector}.py`、`scenedetect/_cli/config.py`、`docs/cli/config_file.rst`、`benchmark/{README,SWEEP_REPORT}.md`；PySceneDetect 0.7.1 官方 detector/config/benchmark 文档；Adobe Premiere Scene Edit Detection 官方说明 | OpenReel 将 scene detection 作为独立分析任务及 `scenes` 输出，但没有成熟参数面板；OpenCut 没有自动镜头检测，其场景选择 UI 与命令式写入分离。PySceneDetect 明确区分 Content 固定阈值、Adaptive 邻域比率/最低内容差异、Threshold/Fade 亮度状态机、最短场景与过滤策略；公开 sweep 显示 BBC 长内容、AutoShot/ClipShots 短 Web 内容的最佳参数显著不同，证明单一灵敏度不足。Premiere 将检测结果的应用方式与检测过程分开。 | 建立 Web 产品配置层：普通用户选择内容预设、检出程度、转场和最短镜头，高级模式再提供完整 detector 分支覆盖；唯一解析器生成严格 EngineConfig，preset version 只由 registry 注入，任务冻结控制快照与 resolved config。首版不设 `custom` preset，不自动猜内容类型。参数只能在 AisenLens C++/WASM 像素路径上用互斥 search/holdout 标定，通过冻结门槛后才晋升生产 registry；候选 review 与应用领域命令分离，正式镜头保存独立 provenance。详见 `docs/auto-shot/CONTROL_SYSTEM.md`。 |

## 2026-08-30 内容预设合并评估

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 内容预设是否需要按视频类型拆分 | PySceneDetect 官方 `ContentDetector`、`AdaptiveDetector`、`ThresholdDetector` 文档与 CLI；PySceneDetect `benchmark/README.md`、`benchmark/SWEEP_REPORT.md`；OpenReel `cloud-job-types.ts`、`ai-kinds.config.ts`、`AIPanel.tsx`；OpenCut `scenes-view.tsx`、`scenes-manager.ts`；AisenLens `researchPresetRegistry.ts`、`resolveAutoShotConfig.ts` | PySceneDetect 将检测器语义与阈值、窗口、最短场景长度独立配置；BBC、AutoShot、ClipShots 的最优参数不同，不能用一个全局灵敏度覆盖。OpenReel 只把场景检测作为一种分析任务，OpenCut 只提供场景管理交互，均没有可复用的内容类型预设体系。 | 普通 UI 合并“通用视频”和“电影 / 剧集”为“通用/影视”，因为两者均为 Adaptive 且差异主要是默认最短时长与转场选择；转场继续独立控制。保留“短视频”（快节奏/较短镜头）、“访谈 / Vlog”（人物动作与曝光更保守）和“动画 / 游戏”（Content 检测器）三个预设。不得因 UI 合并而混淆 Adaptive 与 Content 的引擎语义；合并后的参数需重新用 search/holdout 标定。 |

## 2026-08-31 AisenHub 多产品平台后端

| 当前模块 | 查阅文件与项目 | 已确认结论 | AisenLens / AisenHub 决定 |
| --- | --- | --- | --- |
| 统一账号、多产品商品、买断权益、兑换码、API 与审计 | OpenReel `apps/web/src/config/api-endpoints.ts`、`apps/web/src/services/api-proxy.ts`、`apps/web/functions/api/proxy/[[catchall]].ts`；OpenCut `apps/web/src/auth/{server,client,rate-limit}.ts`、`apps/web/src/db/schema.ts`、`apps/web/src/app/api/{auth/[...all],feedback}/route.ts`；GitHub `supabase/supabase`、`polarsource/polar`、`getlago/lago`、`unkeyed/unkey`、`openfga/openfga` 及其官方文档 | OpenReel 将端点、生产代理、允许来源、路径白名单、请求体上限和上游超时集中管理；OpenCut 将服务端会话、Redis 限流、输入校验和 API 路由分开。Polar 将一次性购买/订阅商品与 License Key 等 Benefit 分离；Lago 将 Feature、Entitlement 与 Billing 分离；Unkey 对密钥采用摘要、作用域、限流和审计；OpenFGA 将授权模型、关系和授权检查分离并提供模型测试。Supabase 已提供 Auth、PostgreSQL、RLS、Edge Functions 和自定义 API 域名，足以承载初期平台。 | 建立独立 AisenHub Platform 仓库，采用 Supabase/PostgreSQL 模块化单体，不引入新的认证、计费或授权服务。用应用、功能、商品、不可变商品版本、权益授予、兑换批次、兑换记录、订单和审计组成通用模型；AisenLens（`lens.aisenhub.com`）成为第一个客户端。平台 API 使用精确 Origin、Host-only API Cookie、CSRF、幂等和受控数据库事务；产品前端通过共享 SDK 接入。当前无生产数据，直接废弃旧 `supporter` 和专用兑换模型，不保留兼容层。详见 AisenHub-platform `docs/AISENHUB_PLATFORM_BACKEND_ARCHITECTURE.md`。 |

## 2026-08-29 自动分镜人工标定与数据导出

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 场景边界人工标注、候选复核与标定数据导出 | OpenReel `apps/web/src/stores/project/marker-slice.ts`、`apps/web/src/components/editor/timeline/MarkerIndicator.tsx`、`apps/web/src/services/keyboard-shortcuts.ts`；OpenCut `apps/web/src/core/managers/scenes-manager.ts`、`apps/web/src/components/editor/scenes-view.tsx`、`apps/web/src/timeline/snapping/resolve.ts`；W3C WebVTT 1.0；MDN `HTMLVideoElement.requestVideoFrameCallback()`；Label Studio Timeline Labels / video annotation documentation | OpenReel 将标记写入独立 action，并在时间线上支持定位、编辑和删除；OpenCut 将场景视图与时间线定位/吸附逻辑分开。WebVTT 使用有序时间区间，适合作为交换格式参照，但场景切点还需要 detector 配置、媒体身份和边界证据。`requestVideoFrameCallback()` 可在实际呈现帧时提供 media time，但不保证逐帧精确 seek；专业标注产品普遍使用“模型预标注 + 人工确认/新增/删除”以提高效率。 | 新建独立 `features/scene-calibration`，不得复用创作型 `annotation` 标记或直接改正式 `ShotRecord`。标定以微秒时间为权威、项目帧号为辅助；首版只支持 hard-cut 点标注、候选接受/拒绝/新增和一个显式不确定状态，fade 区间在第二步加入。标定记录绑定版本化媒体身份、标注 schema、人工来源和生成时的 Engine/config；默认导出 JSON（不含视频），可选另选视频文件交给外部 AI。评分与 preset 晋升仅使用固定 search/holdout 划分，AI 只能基于 search 提出候选配置，不能直接修改 production registry。 |

## 2026-08-25 AisenShot Scene Engine

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 本地分镜检测引擎 | OpenReel `packages/core/src/ai/cloud-job-types.ts`、`apps/web/src/components/editor/ai-panel/ai-kinds.config.ts`、`packages/core/src/media/{mediabunny-engine,types}.ts`；OpenCut `apps/web/src/wasm/{index,media-time}.ts`；PySceneDetect `scenedetect/{detector,scene_manager,stats_manager}.py`、`scenedetect/detectors/{content_detector,adaptive_detector,threshold_detector}.py`、`tests/test_detectors.py`、`benchmark/README.md`、`LICENSE`；本项目 Mediabunny 1.29.1 `src/{media-sink,sample}.ts` 类型与实现；W3C WebCodecs `VideoFrameCopyToOptions`/pixel format 规范 | OpenReel 只提供云端场景检测能力边界，本地媒体层采用顺序解码与复用缓冲；OpenCut 将 WASM 核心与 TypeScript 整数媒体时间隔离；PySceneDetect 0.7.1（BSD-3-Clause）的核心可提炼为流式 detector、延迟事件/flush、共享帧指标、Content、Adaptive 和 Threshold 状态机。Mediabunny 可按呈现顺序迭代 `VideoSample`，但 `format` 可能为 null；WebCodecs 显式 `copyTo()` 格式转换只保证 RGB 类格式，不能任意请求 I420。YUV 指标还需要 matrix/range/bit-depth/visible-rect 语义。 | 保留独立 `@aisenlens/scene-engine` 方向，但先执行 Phase 0：建立当前 JS 准确率/性能基线并比较原生平面、RGB 标准化和 Worker 低分辨率预处理。C++ core 使用版本化 C ABI；checkpoint 拆分为 core state 与包含完整边界前缀/解码位置的 Worker envelope；最终边界在跨 detector 融合后执行最短镜头约束。当前只验收 Web，Desktop/Mobile 留待平台专项。详见 `docs/auto-shot/ARCHITECTURE.md`。 |

## 2026-08-16 统一支持者身份

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 付款、兑换与专属反馈的身份模型 | OpenReel 的 auth/entitlement 相关检索；OpenCut `apps/web/src/auth/{client,server}.ts` | OpenReel 未提供可复用的用户权益模型；OpenCut 的 Better Auth 服务器会话和 Redis 限流与当前 Supabase/RPC 架构不兼容。 | 保留 `free`、`supporter` 两类角色；付款和兑换码均授予 `supporter`。移除早期徽章字段、早期档位与早期兑换活动，专属反馈统一通过 `supporter` 身份核验。 |

## 2026-08-16 支持者专属反馈资格核验

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 支持者专属反馈入口与身份授权 | OpenReel `apps/web/src` 的 auth/login 相关检索；OpenCut `apps/web/src/auth/{client,server}.ts` | OpenReel 未提供可复用的用户身份门控；OpenCut 的 Better Auth 与 Next.js 服务端架构不适用于 Vite + Supabase。AisenLens 已有 `user_entitlements.role` 和受控反馈 RPC。 | 由新增 Supabase RPC 实时检查 `supporter` 身份，前端仅根据结果打开专属反馈或显示跳转提示；提交 RPC 再次验证身份，早期支持者以 `submitter_identity` 保留其实际身份。 |

## 2026-08-16 访客功能登录门控

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 反馈、打赏与兑换码的访客认证入口 | OpenReel `apps/web/src` 的 auth/login 相关检索；OpenCut `apps/web/src/auth/{client,server}.ts` | OpenReel 未提供可复用的面向访客认证门控；OpenCut 使用 Better Auth、Next.js 服务端路由和 Redis 限流，不适用于当前 Vite + Supabase 客户端架构。 | 复用现有 `AuthModal` 与 Supabase 会话状态，从 `App` 向页面传入统一的登录要求回调。各业务表单只在提交前门控；后端 RLS 与 RPC 仍是最终授权边界，不新增认证依赖。 |

## 2026-08-16 打赏订单核验与支付时限

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 固定金额二维码支付确认 | OpenReel `apps/web/src` 的 payment/countdown 相关检索；OpenCut `apps/web/src` 的 payment/countdown 相关检索 | 两个参考项目均无可复用的固定金额收款、订单尾号核验或支付时限模块；仅存在与编辑器任务相关的计时器实现。 | 不引入支付依赖。前端使用原生 `setInterval` 显示两分钟倒计时，Supabase RPC 以 `expires_at` 作为最终时限；订单后四位仅由受控 RPC 在确认支付时写入。 |

## 2026-08-14 部署配置

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| Vercel 单页应用部署 | `previous-aisenlens/vercel.json`、`previous-aisenlens/apps/web/vercel.json`、`previous-aisenlens/package.json`、`previous-aisenlens/apps/web/package.json` | 旧项目在 Vercel 上通过 `/(.*) → /index.html` 重写支持单页应用访问；根脚本负责构建前端工作区。 | 此行为 2026-08-14 的历史记录。当前 AisenLens 是 pnpm workspace：从仓库根目录构建 `@aisenlens/web`，发布 `apps/web/dist`，并保留必要的 SPA rewrite。 |

## 2026-08-14 视频加载与解码能力

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 本地视频导入、元数据探测、原生预览与离线取帧 | OpenReel `packages/core/src/media/mediabunny-engine.ts`、`packages/core/src/video/{frame-cache,texture-cache}.ts`、`apps/web/src/bridges/media-bridge.ts`；OpenCut `apps/web/src/{media/mediabunny.ts,services/video-cache/service.ts,media/use-file-upload.ts}` | 两项目均将容器解析/轨道元数据、浏览器/Worker 的实际解码能力和预览资源分开处理。OpenReel 对 `Input`、`CanvasSink`、顺序解码迭代器和小型 LRU 帧缓存显式释放；OpenCut 以每个媒体一套 `Input` + `CanvasSink`，串行化定位请求，保留当前帧与下一帧预取，并在媒体切换时释放输入与迭代器。两者都不把扩展名或 MIME 当作可播放、可离线解码的最终结论。 | AisenLens 保留本地 `FileSystemFileHandle` 与原生 `<video>` 交互预览；导入阶段升级为可读容器、原生预览、离线帧解码三项独立能力，并持久化诊断结果。建立按素材 ID 复用、可取消、有限内存的 Mediabunny 解码会话，替换每次截图/缩略图通过对象 URL 重新读取和创建 `Input` 的路径。 |

## 2026-08-14 视频导出流式保存

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 浏览器视频导出的保存目标与长文件内存控制 | OpenReel `packages/core/src/export/export-engine.ts`、`apps/web/src/services/export-runner.ts`；Mediabunny `dist/modules/src/target.d.ts` | OpenReel 从保存对话框取得 `FileSystemWritableFileStream` 后交给导出引擎；Mediabunny `StreamTarget` 兼容该流，并将写入背压传回输出。 | AisenLens 在用户点击导出时优先调用 `showSaveFilePicker()`，文件流只保留在主线程；Worker 以 4 MiB 分块 `StreamTarget` 回传数据，等待主线程写盘确认以维持背压。没有 File System Access API 时保留 Blob 下载作为平台能力回退。 |

## 2026-08-14 分析视频导出弹窗

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 浏览器视频导出的设置、进度与下载入口 | OpenReel `apps/web/src/components/editor/ExportDialog.tsx`；OpenCut `apps/web/src/components/editor/export-button.tsx` | OpenReel 将预设、格式、输出尺寸和设备能力放在导出前配置；OpenCut 把格式、质量、音频开关与导出中的进度/取消保持在同一交互表面，成功后才触发下载。 | AisenLens 保持紧凑的编辑器弹窗：报告和分析视频分开进入；分析视频仅列出能力协商确认可用的 MP4/WebM，显示源尺寸与帧率，提供内容/构图/音频开关、质量档、进度、取消、可读错误和下载。 |

## 2026-08-14 Worker 视频导出

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 浏览器端视频编码、音频混音、进度与取消 | 浏览器 WebCodecs / Canvas 2D API；OpenReel `packages/core/src/export/{export-worker.ts,webcodecs-backend.ts}`；OpenCut `apps/web/src/services/renderer/scene-exporter.ts` | OpenReel 在 Worker 中按顺序等待 `VideoSampleSource.add()`，以尊重编码背压；先用 `getFirstEncodableVideoCodec()` 协商能力，取消时调用 `Output.cancel()`；离线混音后的 PCM 作为独立音频阶段编码。OpenCut 将每帧 Canvas 渲染、音频添加、最终封装及进度/取消归入单个导出任务。 | AisenLens 建立独立导出 Worker：Mediabunny `CanvasSink` 解码源帧，在 `OffscreenCanvas` 合成图层后由 `VideoSampleSource` 编码；主线程负责读取本地文件、解析项目分镜并用 `OfflineAudioContext` 混合主视频和项目音频，Worker 负责输出封装。首版提供 MP4/WebM 能力协商、阶段进度、取消和 Blob 结果；导出弹窗与文件系统流式保存后续接入该内核。 |
| Worker PCM 音频编码 | OpenReel `packages/core/src/export/export-worker.ts`；OpenCut `apps/web/src/services/renderer/scene-exporter.ts`；Mediabunny `dist/modules/src/{sample.d.ts,media-source.d.ts}` | 两个参考项目均在主线程可用 `OfflineAudioContext` 的前提下将 `AudioBuffer` 交给 `AudioBufferSource`；Mediabunny 同时提供可由原始 PCM 构造的 `AudioSample` 与 `AudioSampleSource`，逐样本添加时同样具备背压控制。 | AisenLens 保持离线混音在主线程，向 Worker 传输 planar `Float32Array`；Worker 不依赖未普遍暴露的 `OfflineAudioContext`，改用分块 `AudioSample` + `AudioSampleSource` 编码。 |

## 2026-08-14 分析视频图层 Canvas 渲染

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 分析信息与构图蒙版的离屏合成 | 浏览器 Canvas 2D API；OpenReel `apps/web/src/components/editor/preview/canvas-renderers.ts`、`packages/core/src/video/video-engine.ts`；OpenCut `apps/web/src/services/renderer/{canvas-renderer.ts,nodes/text-node.ts}` | OpenReel 将每类图层绘制为可复用的 Canvas 函数，并让预览和导出使用同一绘制路径；OpenCut 将图层解析与最终 `renderToCanvas` 分离，Canvas 上下文可由主线程或离屏画布提供。 | AisenLens 在 `features/video` 提供纯 `render(context, frame)` 图层函数：内容信息复用既有 ViewModel，构图复用既有几何 Canvas 绘制；组合器按内容、构图、未来字幕的固定顺序调用，不访问 DOM、React 或项目仓储。 |

## 2026-08-14 分镜截图精确取帧

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 分镜首帧、尾帧与导出代表图 | OpenReel `packages/core/src/{media/mediabunny-engine.ts,video/video-engine.ts}`；OpenCut `apps/web/src/{media/mediabunny.ts,core/managers/project-manager.ts}` | OpenReel 通过 `CanvasSink` 按时间戳读取帧，并在读取后立即复制 Canvas，避免池化画布被下一次解码覆盖；OpenCut 使用 Mediabunny 解码素材首帧，并将画布渲染与持久化缩略图分离。 | AisenLens 将所有分镜截图统一为 Mediabunny `CanvasSink` 精确取帧：首尾帧保持原始画面，用户选定的代表图按当前构图导出设置在独立 Canvas 上绘制辅助；不再创建隐藏原生 video 或复制预览 DOM。 |

## 2026-08-14 编辑器视频信息检测

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 本地视频的时长、尺寸、帧率与音轨识别；离线帧、混音与视频导出 | OpenReel `packages/core/src/{media/mediabunny-engine.ts,audio/audio-engine.ts,export/webcodecs-backend.ts}`、`apps/web/src/bridges/media-bridge.ts`；OpenCut `apps/web/src/{media/mediabunny.ts,media/audio.ts,services/video-cache/service.ts,services/renderer/scene-exporter.ts}` | 两项目都通过 Mediabunny 的 `Input`、主视频轨与 `computePacketStats()` 获得容器级时长、显示尺寸、音轨存在性和平均帧率；两者均以 `CanvasSink` 离线解码视频帧，以 `AudioBufferSink`/Web Audio 读取或混合音频，并通过 `VideoSampleSource`、`Output` 与浏览器编码器封装导出。OpenReel 将取帧、混音和编码解耦，OpenCut 将帧缓存和音频轨调度分离。 | AisenLens 在关联视频时用 Mediabunny 写入项目媒体元数据；对已有但缺帧率、总帧数或音轨状态的项目，首次打开时后台补齐并保存。原生 `<video>` 仅承担交互预览；后续离线帧处理、音频时间线和导出 Worker 统一由媒体核心提供，不复制多轨剪辑器的 UI 模型。 |

## 2026-08-13 编辑器内容蒙版

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 当前分镜的分析信息预览层 | MDN `Web/CSS/pointer-events`；OpenReel `apps/web/src/components/editor/{Preview.tsx,inspector/TemplateVariablesPanel.tsx}`；OpenCut `apps/web/src/{preview/components/overlay-layer.tsx,guides/preview-overlay.tsx,guides/registry.tsx}`；旧 AisenLens `apps/web/src/dom/{overlay-controller.js,overlay-canvas.js}` | MDN 说明覆盖元素可用 `pointer-events: none` 透传交互；OpenReel 将按时间解析的文本/图形叠层与实时预览、交互控制分离；OpenCut 通过独立覆盖层区分场景层、视窗层和 HUD；旧项目验证了归一化几何图形在不同画面尺寸下的稳定性。 | 新建 `features/content-overlay`，作为与构图蒙版分离、只读的分析信息层：从当前分镜与模板快照解析镜号、时间码、描述和用户选择字段，DOM 层仅覆盖真实视频画面并透传指针事件；采用固定的紧凑/侧栏/下三分之一布局，不做自由拖拽，不进入截图或导出。 |

## 2026-08-13 编辑器显式保存与状态反馈

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 项目级保存协调 | 旧 AisenLens `apps/web/src/app/save-coordinator.js`、`apps/web/src/dom/save-bindings.js`；OpenReel 未发现与本地单项目持久化直接对应的实现；OpenCut `opencut-classic-main/apps/web/src/core/managers/save-manager.ts` | 旧项目以串行队列维护 `saving/failed/idle` 与最后成功时间，并把按钮和 `Ctrl/Cmd+S` 指向同一保存动作；OpenCut 将防抖保存与 `saveNow()` 分开，并公开待保存和保存中状态。 | 编辑器使用项目级串行保存协调器：所有分镜、分组、标记、模板与构图蒙版从同一快照提交；编辑后 400ms 轻量防抖，`Ctrl/Cmd+S` 与顶栏按钮立即刷写；失败保留未保存状态并允许重试，页面离开和切至后台时请求最后一次保存。 |

## 2026-08-13 编辑器入点 / 出点选区

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 单视频观看选区 | OpenReel `apps/web/src/stores/project/{types.ts,clip-slice.ts,store-helpers.ts}`；OpenCut 未发现与单视频源选区直接对应的实现；旧 AisenLens `apps/web/src/dom/waveform-canvas.js` | OpenReel 将 `inPoint` / `outPoint` 作为媒体范围，裁切与时间映射都按范围钳制；旧项目的波形选区仅做可视范围着色。 | AisenLens 建立会话级、帧精度的独立观看选区：`I/O` 只设置入/出点，不修改分镜边界；两端完整时播放限制在该范围，时间标尺显示淡色范围与 I/O 标记。后续可将其复用到镜头组与导出工作流。 |

## 2026-08-13 编辑器快捷键

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 单视频拉片编辑器快捷键 | OpenReel `apps/web/src/services/keyboard-shortcuts.ts`；OpenCut `apps/web/src/actions/{definitions.ts,use-keybindings.ts,keybindings-store.ts,use-keyboard-shortcuts-help.ts}`；旧 AisenLens `apps/web/src/{app/action-catalog.js,dom/video-shortcuts.js}` | OpenReel 用含分类、动作 ID、默认键和当前键的注册表统一帮助、预设和监听；OpenCut 将动作、映射、持久化、冲突校验和 capture-phase 监听拆开，并在文本输入、弹层和加载状态禁用全局键位；旧 AisenLens 已有 Space、逐帧和方向键的单视频交互，但其 Enter 语义是截图。 | 建立 editor 专属单一快捷键注册表。第一期优先采用跨专业软件稳定的 `Space`、`J/K/L`、逐帧、编辑点跳转、`Home/End`、`M`；手动新增分镜快捷键已移除，待新方案确认后再加入。 |

## 2026-08-13 编辑器字号层级

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 高密度编辑器排版 | Material Design 3 `styles/typography/type-scale-tokens`；OpenReel `apps/web/tailwind.config.js`、`apps/web/src/components/editor/panels/EditingTemplateControls.tsx`、`packages/ui/src/styles/globals.css`；OpenCut `apps/web/src/app/globals.css`、`apps/web/src/components/editor/scenes-view.tsx` | Material 以 label/body/title 的信息角色建立等级；OpenReel 以 `text-xs` 为编辑器控制主档，并单独提供 10px 辅助档；OpenCut 将工作区 `text-xs`、`text-sm` 配为约 11.5px、12.6px，时间码使用独立等宽紧凑档。 | 编辑器统一为 16px 页面标题、12px 面板标题和正文、11px 辅助信息、10px 时间码/标尺；8px 只允许时间轴狭窄分镜标签。当前项目边界记录于 `docs/PROJECT_ARCHITECTURE.md`。 |

## 2026-08-13 视频播放区域优化调研

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 单视频预览、播放状态与拖动定位 | MDN `HTMLVideoElement.requestVideoFrameCallback()`、`HTMLMediaElement.seeked`；OpenReel `packages/core/src/playback/{playback-controller,master-timeline-clock}.ts`、`apps/web/src/bridges/playback-bridge.ts`、`apps/web/src/components/editor/Preview.tsx`；OpenCut `apps/web/src/core/managers/playback-manager.ts` | MDN 的视频帧回调在新视频帧送往合成器时触发，适合把显示同步到实际呈现帧；`seeked` 表示定位完成。OpenReel 将播放控制器、状态桥接和 UI 解耦，并把拖动预览与最终正式 seek 分离，但其 AudioContext 主时钟与漂移补偿服务于多轨合成。OpenCut 集中播放状态和订阅接口，但以 `requestAnimationFrame` 推进项目时间，适合自身时间线而不是已具备原生媒体时钟的单视频预览。 | 保留原生 `<video>` 作为唯一时钟；将播放状态扩展为 loading / ready / seeking / playing / paused / ended / error，使用 `requestVideoFrameCallback` 优先同步显示帧、`timeupdate` 作为回退。时间轴拖动采用“轻量预览 + 松开后一次正式 seek”；新增媒体加载、缓冲和错误反馈。当前不引入 AudioContext 主时钟、多轨合成、漂移补偿或 Canvas 渲染引擎。 |

## 2026-08-13 分镜列表选中联动

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 时间轴当前分镜与右侧列表可见性 | OpenReel `apps/web/src/components/editor/SearchModal.tsx`；OpenCut `apps/web/src/selection/selectable-surface.tsx`；旧 AisenLens 未查阅（前两者已提供选中项揭示模式） | 两个参考都在选择变化后对目标元素调用 `scrollIntoView`；OpenCut 使用 `block: "center"` 强调选择，OpenReel 对连续选择使用 `block: "nearest"` 减少视图跳动。 | AisenLens 以播放头帧所属分镜作为工作区当前分镜，列表使用 `block: "nearest"` 揭示选中项；折叠分组先展开，筛选不匹配时不改变用户筛选条件；列表点击定位到目标分镜首帧。 |

## 2026-08-13 时间轴研究轨道排序

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 时间轴左侧轨道拖拽排序 | OpenReel `apps/web/src/components/editor/Timeline.tsx`、`components/editor/timeline/TrackHeader.tsx`、`stores/project/track-slice.ts`；OpenCut 仅有素材放置过程中的轨道方向选择，不适用；旧 AisenLens 未查阅（OpenReel 已提供可用交互） | OpenReel 通过轨道头原生拖拽和拖放目标完成排序，轨道头与轨道内容共享同一 visual order。 | AisenLens 复用原生拖拽交互，但因现有轨道只是研究视图投影，排序保存到 `localStorage` 工作区偏好，而不是项目数据。 |

## 2026-08-13 帧带缩放解码调度

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 快速缩放时的帧带响应 | OpenReel `apps/web/src/motion/frame-cache.ts`、`components/editor/timeline/ClipComponent.tsx`；OpenCut `apps/web/src/media/processing.ts`；旧 AisenLens 未查阅（参考项目已覆盖缓存与缩略图调度模式） | OpenReel 以受限缓存和已有 filmstrip 重采样避免重复解码；OpenCut 在媒体处理阶段生成单张派生缩略图。两者都不适合直接承担 AisenLens 的逐时间点真实帧采样，但“缓存边界”和“派生资源”原则可借鉴。 | AisenLens 增加 150ms 缩放防抖、单一可抢占解码队列、复用离屏 video、播放头附近优先级和逐帧发布。旧请求不再继续写入缓存；Object URL 受内存上限控制。 |

## 2026-08-13 时间轴帧带真实帧采样

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 随时间轴缩放变化的视频帧带 | OpenReel `apps/web/src/components/editor/timeline/ClipComponent.tsx`；OpenCut `apps/web/src/timeline/components/timeline-element.tsx`、`apps/web/src/media/thumbnail.ts`；旧 AisenLens 未查阅（前两者已提供成熟的缩略图密度模式） | OpenReel 按片段像素宽度以约 60px 一格重采样已有 filmstrip；OpenCut 按轨道高度和画面比例计算固定缩略图 tile 宽度。两者都让缩略图密度随缩放后的像素宽度变化。 | AisenLens 需要比重复/重采样现有小集合更精确：每个约 80px 槽位映射到明确帧号。仅为可见范围和缓冲区按需解码缺失帧，持久化到既有 IndexedDB 派生帧缓存；不引入多轨剪辑模型或新媒体库。 |

## 2026-08-13 时间轴标记轨增强

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 项目批注标记的时间轴呈现与选中 | OpenReel `apps/web/src/components/editor/timeline/MarkerIndicator.tsx`、`apps/web/src/stores/project/marker-slice.ts`；OpenCut 与当前标记实体不对应，未采用；旧 AisenLens 未查阅（OpenReel 已提供可用模式） | OpenReel 将标记作为独立项目实体，以时间定位、标签编辑、删除和播放头跳转呈现；标记视觉状态不应复制为另一份领域数据。 | AisenLens 保持既有 `AnnotationMarker` 数据模型，新增工作区级选中标记和类别可见性状态。时间轴点击复用既有标记面板和分镜选择，不增加第二套编辑界面。 |

## 2026-08-13 时间轴 P4 研究结构联动

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 分组、分镜与筛选结果的时间轴呈现 | OpenReel `apps/web/src/components/editor/Timeline.tsx`；OpenCut `apps/web/src/timeline/components/timeline-track.tsx`、`hooks/element/use-element-selection.ts`；旧 AisenLens 未查阅（前两者已提供可用模式） | OpenReel 和 OpenCut 都将轨道内容渲染与选中状态分离；OpenCut 的元素选择由上层状态统一管理，而非由轨道维护重复状态。 | 复用现有分镜、分组实体与右侧详情状态，不创建剪辑器元素模型。筛选结果由已有 `findMatchingShotIds()` 在编辑器工作区统一派生；时间轴仅负责命中高亮与非命中弱化。分组范围点击复用现有分组选择和详情面板入口。 |

## 2026-08-12 自动分镜

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 本地硬切候选（历史方案） | OpenReel `apps/web/src/bridges/silence-cut-bridge.ts`；OpenCut `apps/web/src/wasm/media-time.ts`；旧 AisenLens `features/auto-shot/{state,detector,segment-runner,worker-client}.js` | OpenReel 以独立处理桥接进度与界面；OpenCut 约束媒体时间到整数精度；旧项目验证媒体指纹、扫描游标、低分辨率签名、阈值和最小间隔。 | 这是 2026-08-12 的历史决策，已被 2026-08-25/27 AisenShot Scene Engine 方案取代。当前 Canvas/seek 实现只作为 Phase 0 迁移基线，新生产路径仍保留“候选审阅后显式应用”的产品边界。 |

## 2026-08-12 分镜首尾帧

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 分镜边界画面采集 | MDN `HTMLVideoElement` / Canvas；OpenReel `apps/web/src/components/editor/Timeline.tsx`；OpenCut `apps/web/src/wasm/media-time.ts`；旧 AisenLens `apps/web/src/features/shots/shot-boundaries.js`、`features/export/export-service.js` | 成熟编辑器把剪辑边界与播放预览分离；OpenCut 使用整数时间单位，旧项目的导出行只读取一个画面列。 | 用离屏原生 video 定位并经 Canvas 持久化 JPEG；分镜保存独立首帧/尾帧引用，首帧同时作为默认导出代表图。用户采集当前帧后替换代表图，后续边界变化不覆盖其选择。 |

## 2026-08-12 分镜分组

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 场景/段落分组 | OpenReel `apps/web/src/stores/project-store.ts`；OpenCut `apps/web/src/timeline/scenes.ts`、`commands/scene/delete-scene.ts`；旧 AisenLens `features/groups/{group-service,group-layout,group-persistence}.js`、`utils/shot-groups.js` | OpenReel 和 OpenCut 将容器实体与媒体元素分离；旧项目验证了分组成员连续性、有效 ID 校验与显示布局。 | 分组作为项目级独立实体，采用稳定分镜 ID；第一版只支持同层连续、至少两镜、无重叠的场景/段落/序列，不复制剪辑器多场景和多轨模型。 |

## 2026-08-12 拉片报告导出

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 报告与表格导出 | OpenReel `apps/web/src/components/editor/ExportDialog.tsx`；OpenCut `apps/web/src/components/editor/export-button.tsx`；旧 AisenLens `features/export/{export-service,excel-export}.js` | 成熟方案把设置/预览与实际生成分离；旧项目的报告行由镜号、时间、分析字段、代表图和分组章节组成。 | 首版使用浏览器 Blob 本地生成 CSV 和内嵌截图的 HTML 报告，先提供预览和清晰格式边界；后续再实现 `.xlsx` 与 PDF，不引入剪辑视频导出能力。 |
| PDF 报告 | OpenReel `apps/image/src/components/editor/ExportDialog.tsx`；OpenCut `apps/web/src/components/editor/export-button.tsx`；旧 AisenLens `features/export/pdf-export.js`、`dom/pdf-export.js` | 浏览器环境无法稳定静默生成 PDF；成熟交互会明确格式与生成状态，旧项目通过浏览器可打印 DOM 生成阅读型 PDF。 | 复用内嵌截图的 HTML 报告，在独立窗口加载完成后调用 `print()`；用户在浏览器系统对话框中选择“另存为 PDF”，不引入不稳定的 Canvas/PDF 依赖。 |

## 2026-08-12 项目备份与恢复

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 本地项目备份 | OpenReel `packages/core/src/storage/project-serializer.ts`；OpenCut `apps/web/src/services/storage/migrations/runner.ts`；旧 AisenLens `platform/project-backup-service.js`、`features/project/project-backup-import.js` | 项目格式必须带版本并先校验；媒体二进制和项目描述分开，缺失视频可作为占位资源恢复；导入不应覆盖已有项目。 | 首版导出版本化单文件 JSON，包含领域数据与截图资源，导入时创建新 ID 项目、重映射关联 ID；视频不复制，恢复后需要重新关联。 |

## 2026-08-12 自动恢复与存储管理

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 轻量恢复快照与派生缓存 | OpenReel `apps/web/src/hooks/useProjectRecovery.ts`、`apps/web/src/components/welcome/RecoveryDialog.tsx`；OpenCut `apps/web/src/services/storage/quota.ts`、持久化与迁移链；旧 AisenLens `app/storage-diagnostics.js`、存储服务 | OpenReel 的恢复点可只保存项目状态；OpenCut 将配额估算与可再生成缓存分离；旧项目验证了本地结构化数据、资源和缓存需分层诊断。 | 编辑器每 30 秒保存项目、分镜、分组、批注和模板，单项目仅留三份；不复制视频、截图、波形和缩略图。项目库使用浏览器配额估算展示用量，并只清理可再生成波形与帧缩略图。 |

## 2026-08-12 项目内分镜检索与筛选

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 分镜定位与条件筛选 | OpenReel `apps/web/src/components/editor/Timeline.tsx`、`apps/web/src/motion/components/MotionTimeline.tsx`；OpenCut `apps/web/src/app/projects/page.tsx`；旧 AisenLens `features/shots/shot-store.js`、`features/groups/group-service.js` | OpenReel 将关键词和类别条件组合为即时派生列表，并明确筛选后空状态；OpenCut 的搜索输入只维护查询状态、由列表派生结果；旧项目只有分镜和分组过滤，不含可复用的检索 UI。 | AisenLens 不引入服务端索引或新依赖。分镜列表在内存中即时匹配镜号、分组、批注、分析字段与标记；提供分组类别、批注、截图和标记条件，匹配结果可定位当前分镜和播放头。 |

## 2026-08-13 单视频研究时间轴演进

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 时间轴坐标、轨道与缩放 | OpenReel `apps/web/src/stores/timeline-store.ts`、`components/editor/{Timeline,timeline/TimeRuler, timeline/TrackLane}.tsx`；OpenCut `apps/web/src/timeline/{types,scale,zoom-utils,components/timeline-ruler}.ts(x)`、`hooks/use-timeline-zoom.ts`；旧 AisenLens `features/waveform/waveform-controller.js` | 两套剪辑器都集中时间-像素换算、滚动和缩放，让标尺和所有轨道共享坐标；OpenReel 分离轨道 UI，OpenCut 分离交互控制器并按可见区间渲染；旧项目验证围绕鼠标缩放、平移和播放跟随。 | AisenLens 维持单视频拉片边界，不迁入多轨剪辑或混音模型；重构为共享视窗状态和可配置研究轨道，依次承载标尺/标记、波形、帧带、分组、分镜、未来字幕与范围型构图提示。 |

## 2026-08-12 真实音频波形

## 2026-08-14 媒体素材与多轨混音基础

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 媒体资产、录音与离线混音 | OpenReel `packages/core/src/{media/mediabunny-engine.ts,audio/audio-engine.ts,export/webcodecs-backend.ts}`；OpenCut `apps/web/src/{media/mediabunny.ts,media/audio.ts,core/managers/audio-manager.ts,services/renderer/scene-exporter.ts}` | 两者都将媒体二进制与项目领域数据分离；音频片段保存素材引用、时间范围、增益和淡化参数，导出时通过 `OfflineAudioContext` 合成为单一音频结果。 | 项目改为媒体资产集合、主视频资产 ID 与显式音频轨；文件句柄按素材 ID 保存，录音 Blob 独立持久化。音频轨片段以帧编号保存入点、时长、增益、静音和淡化；未来预览和视频导出复用同一离线混音计划。 |
| 离线帧缩略图 | OpenReel `packages/core/src/media/mediabunny-engine.ts`；OpenCut `apps/web/src/media/mediabunny.ts` | `CanvasSink.getCanvas(timestamp)` 返回不晚于目标时间的最后一帧，并可指定输出宽度；应先检查视频轨 `canDecode()`，再以单个持久 sink 串行读取多个时间点。 | AisenLens 帧带改用动态加载的 `CanvasSink`，保持既有 IndexedDB JPEG 缓存和可取消队列，删除隐藏视频元素的 seek 解码路径。 |

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 本地音频波形 | MDN Web Audio `decodeAudioData`；OpenReel `packages/core/src/media/waveform-generator.ts`；OpenCut `apps/web/src/{media/waveform-summary.ts,services/waveform-cache/service.ts}`；旧 AisenLens `utils/audio-waveform.js`、`dom/waveform-canvas.js` | OpenReel 从高分辨率峰值派生多分辨率，OpenCut 缓存源音频摘要后按渲染桶采样，旧项目验证峰值/RMS 分桶与受限桶数量。 | 当前只建设概览峰值：用 Web Audio 解码本地视频，最多 1,200 桶，以项目 ID 与媒体指纹缓存。解码失败或无音轨时明确提示，不再使用伪造波形。 |

## 2026-08-14 编辑器启动性能

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 页面首屏加载、媒体初始化与波形派生 | OpenReel `apps/web/src/App.tsx`；OpenCut `apps/web/src/media/waveform-summary.ts` | OpenReel 使用 `lazy` / `Suspense` 延后编辑器模块；OpenCut 将源音频摘要缓存后按可视桶采样，避免在每次渲染时全量处理样本。 | AisenLens 将页面改为按需加载；保留派生波形缓存，并把缓存缺失时的全量解码延后到浏览器空闲时执行。项目媒体加载使用请求序号丢弃过期结果，恢复快照仅按周期保存。 |

## 2026-08-12 帧处理与派生缓存

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 真实帧带与缓存 | MDN `HTMLVideoElement` / Canvas；OpenReel `packages/core/src/{video/frame-cache.ts,storage/cache-manager.ts}`；OpenCut `apps/web/src/services/{video-cache,waveform-cache}/service.ts`；旧 AisenLens `platform/project-cache.js`、`features/waveform/waveform-controller.js` | 四类方案均将运行时解码对象与可再生缓存分开；OpenReel 使用容量受限的 LRU 帧缓存，OpenCut 按媒体串行化定位请求并缓存结果，旧项目提供本地缓存统计。 | 单主视频阶段使用原生 video + Canvas 顺序采样，不引入 Mediabunny/WebCodecs 依赖；帧带 JPEG 以项目 ID、媒体指纹和帧号写入 IndexedDB，Object URL 只在运行时存在。 |

本目录中的项目仅作为功能、交互和数据结构参考。只有当 AisenLens 开发某个具体模块时，才按目标读取对应项目的相关文件；不直接复制实现，也不在未确认许可与适配范围前迁移代码。

## 参考项目

| 目录 | 来源 | 可参考范围 | 已获取信息 |
| --- | --- | --- | --- |
| `previous-aisenlens/` | 旧版 AisenLens Demo | 既有拉片功能、项目模型与交互流程 | 已确认顶层功能模块 |
| `opensource-opencut/` | 开源项目 | 媒体、预览、时间线与剪辑器能力 | 已确认顶层模块目录 |
| `opensource-openreel/` | 开源项目 | 本地优先媒体处理、本地 AI 与可替换能力层 | 已确认架构理念与顶层职责 |

## 使用记录

| 日期 | 当前模块 | 参考项目与文件 | 已确认结论 / 方案 | 对 AisenLens 的决定 |
| --- | --- | --- | --- | --- |

| 2026-08-12 | 模板字段管理 | 旧版 AisenLens `features/templates/{field-pool,template-editor,template-storage,template-service}.js`；OpenReel 模板资源模型；OpenCut 固定属性面板 | 旧版将参考字段/用户字段、字段池、字段顺序和参考项维护分开；OpenReel/OpenCut 不提供可直接复用的分析字段模型 | 保留固定字段优先、独立排序和参考项理念；以项目快照与稳定字段 ID 实现五种字段类型，删除字段不清洗历史分镜分析值 |
| 2026-08-12 | 模板值规范化 | 旧版 AisenLens `utils/templates.js`；OpenReel `packages/core/src/types/scriptable-template.ts`；OpenCut 定向检索属性/校验层 | 旧版统一处理空值、去重和数量上限；OpenReel 分离字段类型、约束与 UI 提示；OpenCut 无可复用的可配置字段校验层 | 新增模板规范化服务，所有模板和分镜写入共用类型校验；保留历史未知字段，避免模板更新破坏本地项目数据 |
| 2026-08-12 | 必填字段与完整度 | JSON Schema `required` 官方规则；旧版 AisenLens 模板/分镜模块；OpenReel 占位符 `required` 类型定义；OpenCut 定向检索 | JSON Schema 将必填项定义为数据约束；旧版没有分镜完整度模型；OpenReel 有 `required` 声明但服务于替换占位符；OpenCut 无适配机制 | 必填项作为项目模板快照规则；以非阻塞完整度提示驱动分镜 `draft` / `confirmed`，不打断创作者的本地保存 |
| 2026-08-12 | 分镜截图与画面采样 | MDN `HTMLCanvasElement.toBlob()`；旧版 AisenLens `features/screenshots/{screenshot-service,screenshot-assets}.js`；OpenReel 媒体缩略图流程；OpenCut `media/thumbnail.ts` | 浏览器 Canvas 可直接将当前视频帧编码为 Blob；旧版区分原图与缩略图并管理 Object URL；OpenReel/OpenCut 将缩略图视为派生展示资源 | AisenLens 只持久化完整 JPEG 与元数据，缩略图不重复持久化；截图显式归属分镜并有独立主图引用，不再自动覆盖项目封面 |

每次只记录为当前任务确认过的信息，避免将推测当作结论。

| 2026-08-12 | 分镜标记与注释 | MDN IndexedDB API；OpenReel `stores/project/marker-slice.ts`、`components/editor/inspector/MarkersPanel.tsx`、`timeline/MarkerIndicator.tsx`；OpenCut `commands/scene/{toggle,update,move}-bookmark.ts` | OpenReel 将标记作为独立实体，统一提供增删改、列表排序和播放跳转；OpenCut 将书签位置归一为帧时间；浏览器 IndexedDB 适合本地结构化标记仓库。 | AisenLens 以独立 `AnnotationMarker` 存储项目级标记：按帧定位、可选关联创建时所在分镜、支持四类创作标记与说明；不再用单一 `Shot.marked` 布尔值表达标记状态。 |

| 日期 | 当前模块 | 参考项目与文件 | 已确认结构/方案 | 对 AisenLens 的决定 |
| --- | --- | --- | --- | --- |
| 2026-08-12 | 初始化 | 目录清单 | 已确认有三个参考项目 | 后续按模块定向阅读 |
| 2026-08-12 | 模块划分 | `previous-aisenlens/apps/web/src/features/` | 旧项目按 `project`、`player`、`shots`、`auto-shot`、`screenshots`、`waveform`、`templates`、`groups`、`overlay`、`export`、`recording`、`settings` 划分 | AisenLens 采用“核心拉片模块 + 可选扩展能力”的分层方式 |
| 2026-08-12 | 模块划分 | `opensource-opencut/opencut-classic-main/apps/web/src/` | OpenCut 分别设有 `media`、`preview`、`timeline`、`project`、`editor`、`canvas`、`export`、`rendering`、`transcription` 等模块 | 仅借鉴其媒体/时间线等成熟能力边界，不引入完整剪辑器范围 |
| 2026-08-12 | 模块划分理念 | `opensource-openreel/openreel-video-main/README.md`、`apps/`、`packages/` 顶层目录 | 以界面层、状态/服务层、桥接协调层、独立核心能力层划分；媒体处理、存储与本地 AI 可独立替换 | AisenLens 按“项目领域模块 + 本地能力服务 + 可替换 AI/媒体引擎”设计，避免把技术引擎耦合到页面组件 |
| 2026-08-12 | 编辑器模块架构 | 三个参考项目的顶层模块与架构说明 | 以模块化理念确定领域、能力与协调三层，而非复制具体业务目录 | 历史计划已收敛为当前项目边界，见 `docs/PROJECT_ARCHITECTURE.md` |
| 2026-08-12 | OpenReel 数据结构 | `packages/core/src/types/project.ts`、`types/timeline.ts`、`storage/types.ts`、`storage/project-serializer.ts`、`apps/web/src/stores/timeline-store.ts` | 项目 JSON、媒体二进制、派生缓存、文件句柄和临时播放 UI 状态分开存储；项目格式具有版本号 | AisenLens 借鉴“持久领域数据与临时 UI 状态分离、二进制资源与项目 JSON 分离、可版本化导入导出”的原则；不照搬多轨剪辑实体 |
| 2026-08-12 | OpenCut 数据结构 | `media/types.ts`、`timeline/types.ts`、`services/storage/types.ts`、`services/storage/service.ts`、`wasm/media-time.ts` | 以媒体元数据、场景/轨道、书签分层；项目序列化会清除运行时音频缓冲；二进制资源按项目放入 OPFS，元数据/项目放 IndexedDB；以整数 tick 避免浮点时间误差，并维护迁移链 | AisenLens 保留“媒体元数据与二进制分离、运行时对象不持久化、带迁移的版本格式、存储配额检查”；采用帧编号作为初期精确时间基准，暂不引入其多场景/多轨剪辑模型 |
| 2026-08-12 | 数据结构基线 | OpenReel 与 OpenCut 的领域模型和本地存储设计 | 已确认使用版本化项目 JSON、资源分层、帧编号时间与迁移原则 | 历史设计已被当前 IndexedDB 实现替代；现行基线见 `docs/PROJECT_ARCHITECTURE.md` |
| 2026-08-12 | 项目与媒体字段 | OpenReel 的媒体引用与 OpenCut 的本地资源分层原则 | 已确认无视频项目、稳定封面、媒体文件指纹、默认引用与可选托管副本 | 当前数据和媒体边界见 `docs/PROJECT_ARCHITECTURE.md` |
| 2026-08-12 | 分镜模型 | `previous-aisenlens/.../features/shots/shot-store.js`、`shot-boundaries.js`、`shot-persistence.js`、`auto-shot/state.js`、`detector.js` | 分镜有稳定 ID、按时间派生序号、时长由相邻边界推导；自动检测记录视频指纹、阈值、最小间隔、进度和硬切/渐变切分置信度，并支持中断恢复 | AisenLens 保留稳定 ID、帧边界、自动检测溯源与可恢复任务；采用显式半开帧区间而非仅存开始时间，具体 `Shot` 字段待确认 |
| 2026-08-12 | 分镜确认规则 | 旧项目的边界计算与自动检测溯源理念 | 已确认默认连续覆盖视频、边界联动、自动分镜草稿/人工确认，以及合并时资料归入前镜头 | 当前候选审阅边界见 `docs/PROJECT_ARCHITECTURE.md` |
| 2026-08-12 | 自动分镜运行记录 | 旧项目保存媒体指纹、检测阈值、最小间隔与扫描游标的状态模型 | 已确认保留暂停/恢复能力及硬切、渐变切分溯源 | 已增加 `AutoShotRun` 和 `AutoShotSettings` 结构 |
| 2026-08-12 | 模板规则 | `previous-aisenlens/.../features/templates/field-pool.js`、`template-editor.js`、`template-service.js`、`template-storage.js` | 字段池区分参考字段与用户字段；支持固定字段、字段选择、排序和字段选项；模板定义单独持久化 | AisenLens 借鉴字段池、固定字段、分组排序和独立模板持久化，但以稳定字段 ID、字段类型和项目快照替代字段名称映射 |
| 2026-08-12 | 模板固定字段 | 旧项目固定字段与字段池理念 | 已确认镜号、时间范围、时长、截图为非模板的镜头基础信息；仅固定镜头描述分析字段 | 当前 feature 与数据边界见 `docs/PROJECT_ARCHITECTURE.md` |
| 2026-08-12 | 模板参考标签 | 旧项目字段参考选项的辅助填写理念 | 已确认选项用于约束保存值，参考标签用于辅助思考；用户可逐字段维护参考标签 | 已在 `TemplateField` 增加 `referenceTerms`，并纳入项目模板快照 |
| 2026-08-12 | 镜头分析值 | AisenLens 模板快照与 AI 溯源原则 | 已确认字段值按字段类型规范化保存；镜头描述记录事实；AI 不可直接覆盖正式分析值 | 已更新 `ShotAnalysis` 的值规则，待继续定义 AI 建议实体 |
| 2026-08-12 | AI 建议确认 | 本地优先 AI 与人工审核原则 | 已确认 AI 建议逐条接受/拒绝，人工修改会使待处理建议失效，所有处理结果可追溯 | 已增加 `AiSuggestion` 与 `AiTaskRecord` 的关系和确认规则 |
| 2026-08-12 | OpenReel 云端 AI | `packages/core/src/ai/cloud-job-types.ts`、`apps/web/src/components/editor/ai-panel/ai-kinds.config.ts`、`apps/web/src/stores/kieai-store.ts`、桌面 GPU 云任务设计文档 | OpenReel 有两条云端路径：平台 GPU 云任务提供转写、场景检测、抠像、稳定、防抖、音频分离等媒体处理；用户自带 KieAI Key 用于图像/视频生成。二者均以持久化任务、轮询、失败重试和结果导入项目为边界 | AisenLens 未来区分本地引擎、自带 Key 云端与平台云端；统一接入 AI 任务系统，但仅将结果转为可审核的分析建议、草稿镜头或转写候选 |
| 2026-08-12 | 本地存储与备份 | `previous-aisenlens/docs/BROWSER_STORAGE_MIGRATION_PLAN.md`、`platform/project-backup-service.js`、OpenCut `services/storage/{service,quota,opfs-adapter}.ts`、OpenReel `storage/{types,cache-manager,project-serializer}.ts` | 旧项目已验证“结构化数据与二进制资源分层、三档 ZIP 备份、导入先校验后写入”的路径；OpenCut 提供配额安全余量、OPFS 与迁移链；OpenReel 区分项目、媒体、缓存、波形及文件重关联，并以 LRU 管理可再生缓存 | AisenLens 延续本地媒体引用默认策略，采用正式数据永不自动清理、派生缓存可按 LRU 清理、三档备份及导入事务隔离；具体数据包与恢复规则待确认 |
| 2026-08-12 | AI 任务系统 | OpenReel `cloud-job-types.ts`、`ai-kinds.config.ts`、`gpu-job-store.ts`、`kieai-store.ts`、GPU 云任务设计文档 | 按能力声明输入、输出与应用方式；任务具备排队、上传/准备、处理、完成、失败、取消状态，持久化待处理任务以支持刷新后的轮询，并将原始结果经适配后写回编辑器 | AisenLens 采用能力注册表、项目级重型任务串行、可恢复任务摘要、可重试错误与结果适配器；AI 输出仅生成草稿或候选，仍需用户确认 |
| 2026-08-12 | 用户自带 API Key | OpenReel `services/secure-storage.ts`、`stores/settings-store.ts`、`services/kieai/client.ts`、`ApiKeysPanel.tsx` | 密钥与普通设置分离：网页端用本地主密码派生 AES-GCM 密钥加密 IndexedDB，桌面端转用系统钥匙串；设置层只保存“已配置服务”标识、默认提供方和模型，调用层按服务 ID 临时读取密钥，锁定时清空模型/声音等会话缓存 | AisenLens 将采用“密钥、非敏感配置、任务溯源”三层分离；网页端需明确本地存储与浏览器直连风险，桌面端优先系统钥匙串；不把密钥、完整请求或响应写入项目与备份 |
| 2026-08-12 | 视频播放 | OpenReel `playback/{playback-controller,master-timeline-clock}.ts`、`bridges/playback-bridge.ts`；OpenCut `core/managers/playback-manager.ts` | OpenReel 将时钟、渲染、音频与 UI 状态桥接分离，并提供拖动预览和最终定位；OpenCut 集中播放状态并向界面提供订阅，不让页面各自维护时间 | AisenLens 当前以原生视频为唯一时钟，借鉴控制器、事件订阅与拖动交互边界；不引入多轨合成所需的 AudioContext 主时钟和漂移补偿 |

## 2026-08-15 OpenReel 工作区结构

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 多端应用与共享能力组织（历史决策） | OpenReel `package.json`、`pnpm-workspace.yaml`、`apps/{web,desktop,image,studio}/package.json`、`packages/*/package.json` | OpenReel 使用 pnpm monorepo：Web、Image 和 Studio 是独立 Vite 应用；Desktop 是 Electron 壳，其 renderer 构建直接调用 `@openreel/web`。共享 UI、视频核心、图像核心、AI/Agent 和 FX 包位于 `packages/*`。根目录的 Xcode/Android 条目不在 pnpm workspace 中。 | “必须等待第二个消费者才能建包”已由 2026-08-27 架构审核修订：普通共享包仍优先等待真实复用；具有独立构建/测试或跨语言 ABI 边界的基础引擎允许例外。当前只开发和验收 Web。 |

| 2026-08-15 | Cross-platform workspace | OpenReel `package.json`, `pnpm-workspace.yaml`, and `apps/desktop/package.json`; OpenCut root `package.json` and `apps/{web,desktop}` | Both projects use workspace boundaries for independently released applications. OpenReel builds its Electron renderer by invoking the Web package build. | AisenLens 使用 pnpm workspace，`apps/web` 是唯一 UI/业务来源。当前只开发和验收 Web；共享包通常等待真实复用，但具有独立构建/测试或跨语言 ABI 边界的基础引擎（如 Scene Engine）允许在单一产品消费者阶段建立。 |

| 2026-08-15 | SEO metadata and crawl discovery | OpenReel `apps/web` search found no reusable route or prerendering pattern; OpenCut `apps/web/src/app/{metadata,robots,sitemap}.ts` | OpenCut centralizes brand metadata, robots directives, and sitemap entries. Its Next.js rendering stack is not suitable for direct adoption in the existing Vite application. | AisenLens keeps Vite and adapts the centralized metadata plus static `robots.txt`/`sitemap.xml` pattern. Public marketing content will receive stable URLs; editor and account surfaces will remain non-indexable. |

| 2026-08-15 | 兑换码与支持者权益 | OpenReel 与 OpenCut 的许可、订阅、支付、优惠码和兑换码相关文件检索 | 两个参考项目均未发现可复用的兑换码或用户权益实现；OpenReel 的 macOS entitlements 仅用于桌面应用签名，与用户身份权益无关。 | AisenLens 使用 Supabase/PostgreSQL 事务 RPC：哈希保存兑换码、行锁保证单次领取、活动配额限制和独立的早期支持者徽章；不复制参考项目代码，也不引入第三方支付或兑换依赖。 |

## 约定

| 2026-08-12 | 分析模板快照 | OpenReel 模板/占位符相关组件；OpenCut 固定属性面板与表单基础设施 | OpenReel 的模板服务于视频创作资源替换，OpenCut 属性面板以固定编辑器字段为主，均无可复用的拉片分析字段快照模型 | AisenLens 采用独立项目模板快照、稳定字段 ID、选项约束与参考词辅助的模型，不复用二者具体实现 |

| 2026-08-14 | 手动新增分镜（已移除） | OpenReel `apps/web/src/utils/timeline-item-actions.ts`；OpenCut `apps/web/src/commands/timeline/element/split-elements.ts` | 两者在播放头形成新的时间段时均保留左侧实体并创建新的右侧实体，且拒绝零时长或重叠时间段 | 当前手动新增分镜入口、快捷键和实现均已移除，待新的交互与数据模型确认后重新设计。 |

| 2026-08-14 | 手动分镜重设计调研 | OpenReel `apps/web/src/{utils/timeline-item-actions.ts,hooks/useKeyboardShortcuts.ts,components/editor/Timeline.tsx}`；OpenCut `apps/web/src/{actions/use-editor-actions.ts,commands/timeline/element/split-elements.ts}` | OpenReel 只切分播放头位于内部且已选中的实体；OpenCut 以单个可撤销命令保存切分前状态、保留左侧实体 ID、创建右侧新 ID，并明确拒绝边界切分。 | 手动分镜保持移除状态；待方案确认后以单一帧精度领域命令、明确目标选择和可见失败原因重新实现，不恢复旧入口或快捷键兼容层。 |

| 2026-08-12 | 分镜边界编辑 | OpenReel `apps/web/src/utils/timeline-item-actions.ts`、`stores/project-store.ts`；OpenCut `apps/web/src/wasm/media-time.ts`、`timeline/controllers/resize-controller.ts` | OpenReel 将分割/裁切集中到领域动作并约束为片段内部操作；OpenCut 将时间投影为整数精度，交互分为预览、提交与取消 | AisenLens 用帧号保存共享边界；拖动只预览，松开后同步前后镜头边界，最少保留一帧，不引入多轨裁切模型 |

- 本项目的视频、截图和项目内容以本地存储为优先边界。
- 先确认数据结构、再讨论交互与实现；未经确认不直接开发。
- 使用开源实现前，记录许可证、引用范围和必要改造。

## 2026-08-13 时间轴轨道设置

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 轨道设置入口 | OpenReel `apps/web/src/components/editor/Timeline.tsx`、`timeline/TrackHeader.tsx`、`timeline/track-layer-filter.ts`；OpenCut `apps/web/src/timeline/components/timeline-toolbar.tsx` | OpenReel 将轨道筛选、显示状态和重排管理集中在时间轴层，轨道行保持轻量；OpenCut 同样将时间轴范围操作集中到工具栏。 | AisenLens 在时间轴左上角提供“轨道设置”入口，集中管理五条研究轨道的显示、行高与顺序；轨道行只保留名称、拖拽排序和高度拖拽，不引入素材轨道、锁定、静音或混音能力。 |

## 2026-08-13 时间轴播放头拖动

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 播放头手柄与视窗导航 | OpenReel `apps/web/src/components/editor/{Timeline,timeline/Playhead}.tsx`；OpenCut `apps/web/src/timeline/{controllers/playhead-controller.ts,components/timeline-playhead.tsx,components/index.tsx}` | OpenReel 以播放头顶部五边形手柄和独立竖线标识当前时间；OpenCut 提供显式可拖拽播放头按钮，拖动期间持续 seek、按帧吸附，结束时提交视图状态。两者均保留横向滚动条作为移动时间视窗的独立控制。 | AisenLens 应为现有播放头增加顶部可拖拽手柄，拖动时只改变当前播放时间且按项目帧率取整；保留当前中键平移和底部横向滚动条，不引入剪辑器素材拖放或多轨剪辑行为。 |

## 2026-08-13 视频预览视窗

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 视频预览展示与观察 | OpenReel `apps/web/src/components/editor/Preview.tsx`；OpenCut `apps/web/src/preview/components/{index,preview-viewport,toolbar}.tsx`、`preview/zoom.ts`、`hooks/use-fullscreen.ts` | 两个成熟编辑器均将预览区域作为独立视窗：提供适配窗口、固定倍率缩放、放大后的平移和全屏；时间码与播放控制保留在预览附近。OpenCut 将构图辅助线预留为独立叠层，OpenReel 的复杂 Canvas 合成用于多轨创作。 | AisenLens 保持原生单视频渲染，不引入 Canvas 合成或编辑器效果链；优先新增预览适配/缩放/平移、全屏、可选构图安全框和可编辑时间码。画中画、素材变换手柄和复杂滤镜不属于当前拉片分析主流程。 |
| 预览百分比、安全区与全屏 | OpenReel `apps/web/src/components/editor/Preview.tsx`（`ZOOM_OPTIONS`、`previewFrameSize`、`showSafeMargins`、`handleFullscreen`） | OpenReel 的缩放预设为 `50/75/100/125/150/200%`；以适配后的画布尺寸乘缩放比例，放大后由视窗滚动查看。安全区是覆盖画面的独立虚线层，默认使用 5% 边距；全屏基于预览容器的 Fullscreen API。 | AisenLens 使用相同的倍率预设与容器全屏交互，但原生 `<video>` 保持唯一渲染源；加入 5% 动作安全区和 10% 标题安全区，不引入 OpenReel 多轨 Canvas 合成。 |
| 预览画布比例与自动推荐 | OpenReel `apps/web/src/components/editor/Preview.tsx`（`ASPECT_PRESETS`、`aspectLabelFor`、画布比例菜单） | OpenReel 定义 `16:9`、`9:16`、`1:1`、`4:5`、`4:3`、`21:9` 六种画布预设；以源宽高比和预设比例的绝对误差选择最近项，非近似项标为 Custom。 | AisenLens 使用相同六组比例与最近比例匹配规则；视频加载或更换时自动推荐最接近画布比例，用户可在预览控制条手动切换。画布变化只影响预览容器，原视频保持 contain，不修改素材或项目媒体元数据。 |
| 画布背景填充 | OpenReel `apps/web/src/components/editor/Preview.tsx`（`previewBgRef`、`canvasFillMode`、`canvasFillColor`）与 `settings/GeneralPanel.tsx`（背景色板） | OpenReel 默认让画布留白跟随 `--screen-bg`：深色为黑色、浅色为白色；可选用纯色填充，纯色用于素材与画布比例不一致时的空白区域。另有模糊填充，依赖 Canvas 合成。 | AisenLens 复刻主题默认黑/白与 OpenReel 同款纯色板，并提供自定义色；仅填充原生视频 `object-contain` 留白。暂不添加模糊填充，避免为观察型单视频预览引入 Canvas 合成与额外性能开销。 |
| 放大视窗导航 | OpenReel `apps/web/src/components/editor/Preview.tsx`（`previewFrameSize`、`zoomLevel > 1 ? overflow-auto`）；OpenCut `apps/web/src/preview/components/preview-viewport.tsx`（缩放中心、平移范围约束） | OpenReel 放大后使用浏览器滚动容器浏览实际增大的画布；OpenCut 以视窗中心和缩放比例计算可见范围，并在拖动时将观察中心约束在画布边界内。 | AisenLens 保留 OpenReel 的实际画布放大与默认居中，但采用 OpenCut 的无滚动条视窗导航：仅在画布超出视窗时允许中键拖拽浏览，位置限制在画布边界，切换倍率、比例或全屏后重置到中心。 |
| 预览播放控制时间码 | OpenReel `apps/web/src/components/editor/Preview.tsx`（控制栏时间码） | OpenReel 在控制栏左侧将当前播放时间与总时长作为一个紧凑的 `当前 / 总时长` 时间码组展示，中央区域只承载播放控制。 | AisenLens 将当前时间和视频结束时间合并为左侧单一时间码组，保留中央控制键的几何居中及右侧静音按钮。 |
| 构图辅助蒙版 | OpenReel `apps/web/src/components/editor/Preview.tsx`（构图网格、安全区叠层）；OpenCut `apps/web/src/guides/{grid,preview-overlay}.ts(x)`、`guides/definitions/grid.tsx`、`preview/components/guide-popover.tsx` | OpenReel 将三分法和安全区作为不拦截操作的预览叠层；OpenCut 将“指南定义、可调选项、预览叠层挂载、临时视图状态”分离，网格使用百分比坐标并限制行列数。 | AisenLens 将构图蒙版独立为 `features/composition-overlay`：渲染层不参与导出、不影响视频播放；类型定义和预设在 feature 内，项目级设置通过项目仓储保存；首版不引入逐帧或自由绘制路径，保证与后续分析内容蒙版保持边界。 |
| 旧 AisenLens 构图叠层 | `previous-aisenlens/apps/web/src/dom/{overlay-controller,overlay-canvas}.js`、`features/overlay/overlay-controller.js`、`dom/screenshot-capture.js`、`docs/PROJECT_GUIDE.md` | 旧项目将 Canvas 绘制、形状命中规则与 DOM 事件分离；所有几何点均按画面宽高归一化，缩放后可正确还原；截图会复用同一绘制模型写入构图线与手绘形状。 | AisenLens 延续“归一化几何数据、渲染与交互拆分、截图复用绘制模型”的原则；预览改用 SVG 叠层获得更好的 React 响应式和选中交互，不搬运旧 DOM 控制器或其全局可变状态。 |
| 2026-08-13 构图蒙版自由图形 | `previous-aisenlens/apps/web/src/dom/{overlay-controller,overlay-canvas}.js`；OpenCut `apps/web/src/{guides/preview-overlay.tsx,preview/components/preview-interaction-overlay.tsx,preview/hit-test.ts}`；OpenReel `apps/web/src/components/editor/preview/{MotionPathOverlay,MotionPathHandles}.tsx` | 三者均将显示叠层与交互层分开；旧项目将形状端点归一化，OpenCut 使用反向层级命中，OpenReel 为 SVG 可交互元素保留独立命中区域。 | AisenLens 在 SVG `viewBox 0 0 100 100` 中保存直线、矩形、椭圆和箭头；仅“视频蒙版”工具激活时承接指针事件，第一期支持创建、选择和删除，不引入曲线、自由笔刷或复杂控制点。 |
| 2026-08-13 构图蒙版截图 | 旧 AisenLens `apps/web/src/dom/{screenshot-capture,overlay-canvas}.js`；OpenCut `apps/web/src/services/renderer/canvas-renderer.ts`；OpenReel `apps/web/src/components/editor/preview/canvas-renderers.ts` | 成熟实现均先渲染源画面，再以同一绘制模型在离屏 Canvas 叠加覆盖内容，避免截取临时 UI 状态。 | AisenLens 将构图样式和图形绘制到原始分辨率的截图 Canvas；项目级开关控制手动截图和首尾帧自动截图，截图记录保存构图签名以在样式变更后准确刷新。 |
| 2026-08-13 构图图形编辑 | 旧 AisenLens `apps/web/src/features/overlay/overlay-controller.js`、`dom/overlay-controller.js`；OpenCut `apps/web/src/preview/{components/transform-handles.tsx,hooks/use-transform-handles.ts}`；OpenReel `apps/web/src/components/editor/preview/MotionPathHandles.tsx` | 旧项目以几何命中区分端点、中心和控制点；OpenCut 使用包围框四角控制器；OpenReel 将路径控制点作为独立可拖动元素。 | AisenLens 保持单层 SVG 与归一化坐标：图形内部可拖动，闭合图形用四角缩放，直线/箭头用两端调整，曲线增加独立控制点；`Shift` 约束闭合图形比例与线条角度。 |
| 2026-08-13 构图图形变换交互 | OpenCut `apps/web/src/preview/{components/transform-handles.tsx,hooks/use-transform-handles.ts,controllers/transform-handle-controller.ts}`；OpenReel `apps/web/src/components/editor/preview/MotionPathHandles.tsx`；旧 AisenLens `apps/web/src/{features/overlay/overlay-controller.js,dom/overlay-controller.js}` | OpenCut 将四角、四边与旋转手柄拆为统一变换框，并使用指针捕获和“预览—提交—取消”三阶段操作；OpenReel 对路径控制点独立处理；旧项目验证归一化坐标可在不同画面尺寸中稳定复用。 | 闭合图形采用 PowerPoint 风格统一变换框：四角等比缩放、四边单轴缩放、内部移动、顶部旋转；直线/箭头保留端点模型，曲线保留端点和贝塞尔控制点，不强行套用旋转框。所有操作以快照开始、实时预览、松手单次提交，`Esc` 取消。 |
# 2026-08-16 支持页专属反馈入口

| 当前模块 | 查阅文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 早期支持者产品共创反馈 | OpenReel `apps/web/src` 的反馈相关检索；OpenCut `apps/web/src/feedback/components/feedback-popover.tsx`、`app/api/feedback/route.ts`、`db/schema.ts` | OpenReel 未提供面向用户的反馈入口；OpenCut 将轻量反馈收集放在编辑器入口的 Popover 中，并在本地保存草稿与历史。AisenLens 已有带分类、标题、内容校验及身份关联的 Supabase RPC。 | 复用 AisenLens 现有反馈服务和 Base UI Dialog，以适配多字段反馈表单；不复制 OpenCut 的 API、数据库或本地历史方案，不新增依赖、接口或表。 |

## 2026-08-27 自动分镜 Phase 0 Web 能力验证

| 当前模块 | 参考项目与文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| 自动分镜像素路径与浏览器能力 | 本轮未新增参考项目代码查阅；结合已记录的 OpenReel/OpenCut 媒体边界与本地 Chrome/WebCodecs/Mediabunny spike | 已实测 H.264/NV12 原生平面复制、RGBA 标准化复制、OffscreenCanvas 低分辨率预处理及 VP9 解码错误分支；这些是本机浏览器事实，不把旧参考项目行为当作浏览器能力结论。 | 沿用参考项目“解码对象与派生结果分离、能力层可替换”的原则；具体像素格式、错误分支和候选路径以 `docs/auto-shot/ARCHITECTURE.md` 与 `docs/auto-shot/REGRESSION_CONTRACT.md` 为准。 |

## 2026-08-27 自动分镜 Phase 4 Threshold/Fade

| 当前模块 | 参考项目与文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| Threshold/Fade 状态机 | PySceneDetect `scenedetect/detectors/threshold_detector.py`、`tests/test_detectors.py`、`scenedetect/scene_manager.py` | Threshold 以逐帧亮度阈值穿越配对 fade-out/fade-in，fade bias 只影响成对区间的建议边界，末尾未闭合 fade 由显式开关决定；SceneManager 对 detector 延迟事件有独立缓冲语义。 | 采用独立 `ThresholdDetector`，只消费 `SharedFrameMetrics.mean_luma_q`，使用微秒时间和定点 bias；不复制 Python/OpenCV 实现，不把 fade 简化为 Content hard cut。事件融合、最终过滤和 checkpoint 已接入 Phase 4 核心。 |

## 2026-08-27 自动分镜 Phase 5 C ABI

| 当前模块 | 参考项目与文件 | 已确认结论 | AisenLens 决定 |
| --- | --- | --- | --- |
| WASM/C ABI 边界 | OpenReel `packages/creation-bindings/src/wasm.ts`；OpenCut `apps/web/src/wasm/{index.ts,media-time.ts}` | OpenReel 将 WASM 实例化与宿主 backend 隔离；OpenCut 在 TS 侧恢复整数媒体时间约束，不把 Rust/WASM 内部对象直接暴露给业务层。 | AisenLens 先冻结纯 C ABI：固定宽度结构、opaque handle、调用方拥有帧/事件/ checkpoint 缓冲；后续 WASM/TS 只绑定该边界，不复制参考项目实现。 |
