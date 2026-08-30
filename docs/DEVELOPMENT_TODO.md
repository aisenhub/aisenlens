# AisenLens 开发待办

> 状态：持续维护中；AisenShot Scene Engine 的 Phase 11 技术与产品链路验收已完成；人工质量标注按用户决定延期至 Phase 12.3B/12.3C，Phase 12.6A–12.6D 的研究配置、Zustand 控制器、任务冻结和新控制面板已完成，标定与生产晋升仍未开始
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

**当前进度**：Phase 0–10 的核心、C ABI、WASM/Worker、WebCodecs 适配已完成；Phase 11 技术、生命周期、数据保护和 Web 产品链路已通过验收。Phase 12 已删除旧 Canvas/seek 路径并完成研究控制面基础；人工质量标注、search/holdout、缺失媒体重绑证据和 production 晋升仍未关闭。

强制执行顺序：

1. Phase 11 技术与产品链路已完成：canonical config hash、强媒体身份及 task/checkpoint 持久化、`paused/interrupted` 生命周期、候选 review、应用前确认、分组协调、recovery snapshot、正式镜头 provenance、真实暂停恢复/取消、项目/媒体切换、失败页、保存/刷新和快照恢复均已覆盖；人工质量标注与缺失媒体重绑交互证据明确延期到 Phase 12，不能把现有候选边界当作质量真值。
2. 已加入 `apps/web/eslint.config.mjs` 与根目录/Web `lint` 脚本，当前 lint 以 ESLint flat config、TypeScript 推荐规则、React Hooks 基础规则和 `--max-warnings=0` 作为静态门；`react-hooks/exhaustive-deps` 暂不阻断构建，待逐个审计现有媒体/编辑器生命周期 effect 后再提升为 error。
3. Phase 11 门关闭后重建删除前基线，再删除无生产引用的旧 Canvas/seek 自动分镜路径和旧字段。
4. 已建立唯一 resolver 与 research/production 双 catalog，并登记四个待标定研究预设（通用/影视、短视频、访谈/Vlog、动画/游戏）；下一步按 PySceneDetect 的 Content、Adaptive、Threshold/Fade、最短镜头和过滤器**语义**完成研究型控制面板与候选审阅。研究面板必须显式显示“待标定”，其数值不得称为生产默认。
5. 已引入最新 Zustand，新增按 `projectId + mediaIdentityDigest` 隔离的 auto-shot 设置 store 与控制 hook；不保存 Blob、Worker、候选或 checkpoint，不写 localStorage/IndexedDB。
6. Phase 12.2 已删除旧 Canvas/seek 自动分镜 service、旧 `AutoShotRunRecord`、旧 repository 方法和旧基线入口；Phase 12.6B 已完成任务控制快照、resolver 冻结、resume 使用旧快照和 IndexedDB version 14 迁移。
7. **Phase 12 控制面（2026-08-29，已验证）**：旧“灵敏度 + 最短时长”映射已删除；编辑器现在通过 research catalog、Zustand 设置草稿和 resolver 生成冻结任务快照，面板明确显示“研究配置 · 待标定”。
8. 在研究面板之后建立独立 `features/scene-calibration` 人工标定工作台：只产生带强媒体身份与微秒真值的 JSON/评分输入，不改写正式镜头或创作标记。严格拆分 search/holdout，sweep 和外部 AI 只能读取 search。
9. **算法质量事项（2026-08-29）**：人工质量标注已由用户明确延期至 Phase 12；在标注和 holdout 评分完成前，不得将任何当前 preset 或算法标记为 production 可用。
10. **Phase 12.6C/12.6D（2026-08-29）**：新控制面板支持预设、检出程度、转场、最短镜头、高级阈值、运行/暂停/重扫、候选排除和应用前预览；lint/build、配置/设置/task service 测试和 IndexedDB migration smoke 均通过。
11. **Phase 12.3B（2026-08-30，进行中）**：人工标注工作台已接入编辑器分镜面板，候选状态显式区分接受、拒绝与待判定；可按播放头新增、定位、移动或删除 hard-cut，并可管理不确定区间、填写标注者和导出 JSON。标注以 `projectId + 强媒体身份` 写入独立 IndexedDB store，刷新和恢复创作快照均不会覆盖。已修正候选接受时错误沿用 `startFrame` 的问题，改为按 `timestampUs + 量化 FPS + ceil` 投影项目帧；test03 已重新导出并通过 schema/身份/帧号复读校验（7/7 候选接受）。真实数据集、checksum 复核和 search/holdout 标定仍待完成。
12. 只把通过冻结指标门槛和独立 holdout 的 preset 晋升 production catalog；普通产品入口此后只枚举已晋升项目，research catalog 仅限明确的研究/标定模式。
13. 完成性能、内存、数据库数据保护、人工标注/search/holdout、production preview 和全产品矩阵后，才关闭 Phase 12。

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
