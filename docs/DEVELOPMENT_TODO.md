# AisenLens 开发待办

> 状态：持续维护中；Zustand/App 状态迁移仍未开始，AisenShot Scene Engine 已完成 Phase 0–10 与 Phase 11 最小接线，当前必须先关闭 Phase 11 正确性与产品验收门，Phase 12 研究控制面板、正式标定和生产晋升均尚未开始
>
> 本文只记录已批准的后续架构工作，不代表对应代码已经存在。

## 1. 引入 Zustand 并迁移应用状态

**目标**：将跨页面、跨功能的客户端状态从 `apps/web/src/app/App.tsx`
逐步迁移到职责明确的 Zustand store，保持 Supabase、IndexedDB 与媒体
业务边界不变。

实施顺序：

1. 安装并锁定 Zustand；先定义 store 的状态、操作和测试边界，不直接迁移 UI。
2. 在 `features/auth` 建立会话和用户资料状态入口，由现有 Supabase service
   提供数据；订阅创建、清理和错误处理不再留在 `App.tsx`。
3. 将主题等全局 UI 偏好，以及当前项目选择等跨页面状态，分别迁移到所属
   store 或 feature state；不把 IndexedDB 项目、媒体 Blob 或大型检测结果放入 Zustand。
4. 将 `App.tsx` 收敛到路由、Provider、布局和应用初始化；页面继续只做组合。
5. 覆盖登录/登出、会话恢复、订阅清理、项目切换和主题持久化，并运行 Web build。

**完成标准**：`App.tsx` 不直接订阅 Supabase 或维护会话、用户资料和项目业务
状态；store 不绕过现有 service/repository 边界。

## 2. App 会话与业务状态迁移

此项与 Zustand 引入同期执行，但保持独立验收：

- Auth feature 负责会话、资料刷新和登出流程。
- Project feature 负责当前项目的选择与加载边界。
- App 层只提供路由、全局 Provider、布局和必要的初始化编排。
- 不为旧的 `App.tsx` 状态路径保留长期双轨或兼容层。

## 3. AisenShot 自动分镜算法与引擎优化

**当前进度**：Phase 0–10 的核心、C ABI、WASM/Worker、WebCodecs 适配已完成；Phase 11 已有任务持久化和 React 最小接线，但第二轮审计确认它尚未通过最终验收。现存 Phase 12 基线只是准备性历史记录。旧“灵敏度 + 最短时长”UI 只承担最小接入验证，不作为最终产品控制。

强制执行顺序：

1. 先完成 Phase 11.7–11.11，并收口 11.2–11.5：已完成 canonical config hash、强媒体身份及 task/checkpoint 持久化、`paused/interrupted` 生命周期、候选 review、应用前确认、分组协调、recovery snapshot 和正式镜头 provenance；task service 的启动/首写失败清理、异步进度写入错误，以及 Hook 的异步身份加载/快速重复启动竞态、真实暂停恢复/取消、快速项目切换和 stale job smoke 也已覆盖；编辑器历史纯状态撤销/重做测试已补齐，Edge 已验证真实暂停→继续、候选排除、应用、保存/刷新、快照恢复、不同项目/媒体切换和无活动项目失败页。
2. 已加入 `apps/web/eslint.config.mjs` 与根目录/Web `lint` 脚本，当前 lint 以 ESLint flat config、TypeScript 推荐规则、React Hooks 基础规则和 `--max-warnings=0` 作为静态门；`react-hooks/exhaustive-deps` 暂不阻断构建，待逐个审计现有媒体/编辑器生命周期 effect 后再提升为 error。
3. Phase 11 门关闭后重建删除前基线，再删除无生产引用的旧 Canvas/seek 自动分镜路径和旧字段。
4. 建立唯一 resolver 与 research/production 双 catalog；先按 PySceneDetect 的 Content、Adaptive、Threshold/Fade、最短镜头和过滤器**语义**完成研究型控制面板、feature 级 Zustand 设置 store、任务控制 hook 和候选审阅。研究面板必须显式显示“待标定”，其数值不得称为生产默认。
5. **临时可运行兜底（2026-08-29，已验证）**：在研究面板取代旧 UI 前，旧“灵敏度”默认映射固定在阈值 `1800`；Edge UI 重跑约 99.88 秒 H.264 `test.mov` 已显示 27 个边界/28 段候选并在刷新后保留 28 个镜头，避免原默认阈值 `4000` 只形成尾部候选。该映射只是 Phase 11 临时修复，Task 12.6D 必须删除，不能作为未来 production preset 的证据。
6. 在研究面板之后建立独立 `features/scene-calibration` 人工标定工作台：只产生带强媒体身份与微秒真值的 JSON/评分输入，不改写正式镜头或创作标记。严格拆分 search/holdout，sweep 和外部 AI 只能读取 search。
7. **算法质量阻塞（2026-08-29）**：Edge 早先重跑约 99.88 秒的真实 H.264 `test.mov` 使用旧默认阈值 `4000` 仅形成尾部候选；修正临时映射后，真实 UI 已显示 27 个边界/28 段候选，但这仍未有人工作为质量真值。顺序解码与 baseline/SIMD parity 已拆分重跑并覆盖全部 2497 帧、末帧 ordinal 2496；历史 browser smoke 和 parity Worker 曾主动只处理前 12 帧，现已改为全媒体顺序迭代并断言末帧覆盖。下一步需在人工标注长视频回归集上排查各 detector 参数、融合去抖、最短镜头过滤、时间映射和结果适配器；证明召回率前，不得将任何当前 preset 或算法标记为可用。
8. 只把通过冻结指标门槛和独立 holdout 的 preset 晋升 production catalog；普通产品入口此后只枚举已晋升项，research catalog 仅限明确的研究/标定模式。
9. 完成性能、内存、数据库数据保护、production preview 和全产品矩阵后，才关闭 Phase 12。

当前约束：

- 只开发和验收 Web，Desktop/Mobile 不作为阻塞门。
- 不假定浏览器可以通过 `copyTo()` 请求 I420；原生平面、RGB 标准化和 Worker 低分辨率预处理由基准决定。
- 先冻结颜色空间、VFR 帧映射、强媒体身份、canonical config/hash、checkpoint envelope、task outcome、应用命令和 provenance。
- 新引擎接管并通过回归后删除旧 Canvas/seek 检测，不长期保留双轨。

详见：

- `docs/AISENSHOT_SCENE_ENGINE_PLAN.md`
- `docs/AISENSHOT_SCENE_ENGINE_IMPLEMENTATION_PLAN.md`
- `docs/AISENSHOT_CONTROL_SYSTEM_DESIGN.md`

## 4. Web 发布构建与加载优化（非阻塞）

**背景**：2026-08-28 的 Vercel 生产部署已成功完成，Scene Engine 的
baseline/SIMD WASM 运行时资源已随 Web 构建发布。构建日志中的下列提示不影响
当前功能或部署结果，记录为后续优化项，而不是当前自动分镜验收的阻塞条件。

1. **优化编辑器首屏包体积**：Vite 报告一个压缩后约 527 kB 的 JavaScript chunk
   超过 500 kB 提示阈值。先以构建分析定位模块构成，再评估将编辑器内低频功能或
   仅在执行自动分镜时需要的模块改为按需加载；不得为了拆包改变自动分镜的 Worker、
   WASM 资源 URL 或产品交互。
2. **消除预渲染时的 Vite 依赖扫描提示**：`prerender-public-routes.mjs` 运行期间，
   Vite 会在服务关闭/重启时输出一次过期 dependency scan 请求提示。复核预渲染脚本
   的服务生命周期与 Vite 版本兼容性，在不改变静态页面产物和 SPA 回退行为的前提下
   消除该非致命日志。
3. **保留生产发布验证**：每次改动上述构建链路后，运行 Web production build，并在
   Vercel Preview/Production 实测公开页面、编辑器入口以及自动分镜 Worker/WASM 的
   资源加载；不能只以本地开发服务器成功作为依据。

**完成标准**：构建日志不再出现可避免的依赖扫描警告，或有记录充分的上游限制；首屏
加载优化以实际构建产物与浏览器性能数据为准，且不引入新的自动分镜运行时回归。
