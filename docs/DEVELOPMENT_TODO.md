# AisenLens 开发待办

> 状态：持续维护中；AisenShot Scene Engine 的 Phase 11 技术与产品链路验收已完成；通用/影视与短视频已按用户批准晋升 production version 1，后续人工测试用于参数迭代；动画/游戏与访谈/Vlog 仍封存，Phase 12.4 及后续性能、数据保护和产品矩阵工作继续进行
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

**当前进度**：Phase 0–10 的核心、C ABI、WASM/Worker、WebCodecs 适配已完成；Phase 11 技术、生命周期、数据保护和 Web 产品链路已通过验收。Phase 12 已删除旧 Canvas/seek 路径并完成控制面基础；通用/影视与短视频已完成用户批准的 production version 1 晋升，后续人工测试和参数迭代继续记录，性能、数据保护、缺失媒体重绑证据及全产品矩阵仍未关闭。

强制执行顺序：

1. Phase 11 技术与产品链路已完成：canonical config hash、强媒体身份及 task/checkpoint 持久化、`paused/interrupted` 生命周期、候选 review、应用前确认、分组协调、recovery snapshot、正式镜头 provenance、真实暂停恢复/取消、项目/媒体切换、失败页、保存/刷新和快照恢复均已覆盖；人工质量标注与缺失媒体重绑交互证据明确延期到 Phase 12，不能把现有候选边界当作质量真值。
2. 已加入 `apps/web/eslint.config.mjs` 与根目录/Web `lint` 脚本，当前 lint 以 ESLint flat config、TypeScript 推荐规则、React Hooks 基础规则和 `--max-warnings=0` 作为静态门；`react-hooks/exhaustive-deps` 暂不阻断构建，待逐个审计现有媒体/编辑器生命周期 effect 后再提升为 error。
3. Phase 11 门关闭后重建删除前基线，再删除无生产引用的旧 Canvas/seek 自动分镜路径和旧字段。
4. 已建立唯一 resolver 与 research/production 双 catalog，并登记四个待标定研究预设（通用/影视、短视频、访谈/Vlog、动画/游戏）；当前 Web 编辑器只开放通用/影视和短视频，访谈/Vlog 与动画/游戏暂时封存，仍供后续标定工具使用。研究面板必须显式显示“待标定”，其数值不得称为生产默认。
5. 已引入最新 Zustand，新增按 `projectId + mediaIdentityDigest` 隔离的 auto-shot 设置 store 与控制 hook；不保存 Blob、Worker、候选或 checkpoint，不写 localStorage/IndexedDB。
6. Phase 12.2 已删除旧 Canvas/seek 自动分镜 service、旧 `AutoShotRunRecord`、旧 repository 方法和旧基线入口；Phase 12.6B 已完成任务控制快照、resolver 冻结、resume 使用旧快照和 IndexedDB version 14 迁移。
7. **Phase 12 控制面（2026-08-29，已验证）**：旧“灵敏度 + 最短时长”映射已删除；编辑器通过 production catalog、Zustand 设置草稿和 resolver 生成冻结任务快照，研究/标定工具仍可显式读取 research catalog。
8. 在研究面板之后建立独立 `features/scene-calibration` 人工标定工作台：只产生带强媒体身份与微秒真值的 JSON/评分输入，不改写正式镜头或创作标记。严格拆分 search/holdout，sweep 和外部 AI 只能读取 search。
9. **算法质量事项（2026-08-29）**：人工质量标注已由用户明确延期至 Phase 12；在标注和 holdout 评分完成前，不得将任何当前 preset 或算法标记为 production 可用。
10. **Phase 12.6C/12.6D（2026-08-29）**：新控制面板支持预设、检出程度、转场、最短镜头、高级阈值、运行/暂停/重扫、候选排除和“应用候选分镜”确认流程；lint/build、配置/设置/task service 测试和 IndexedDB migration smoke 均通过。
11. **Phase 12.3B（2026-08-30，进行中）**：人工标注工作台已接入编辑器分镜面板，候选状态显式区分接受、拒绝、修正与待判定；可按播放头新增、定位、移动或删除 hard-cut，并可管理不确定区间、填写标注者和导出 JSON。标注以 `projectId + 强媒体身份` 写入独立 IndexedDB store，刷新和恢复创作快照均不会覆盖。已修正候选接受时错误沿用 `startFrame` 的问题，改为按 `timestampUs + 量化 FPS + ceil` 投影项目帧。经用户确认，`annotator = aisen` 的标注只要结构完整且合理性分析通过即可用于 search，不强制第二人复核；最新 test02、test 和 test03 标注均符合该标准，test 已补填 `annotator = aisen` 并重新导出，最新 test03 为 7/7 候选接受，此前 test03 导出不纳入有效 manifest。已冻结 `calibration-search-2026-08-30.json`（3 个视频、66 个 confirmed hard-cut），并按声明的整文件/4MB 分块指纹复核本地媒体通过；校验剩余仅为 search/holdout 样本数量不足。真实 sweep 与独立 holdout 标定仍待完成。
12. **donghua 回归（2026-08-30）**：动画/游戏预设在该素材上 `balanced` 产生 4 个 hard-cut，`detailed` 产生 17 个；默认阈值暂不因单条素材调整，后续纳入 search 标定。修复了预览阶段用四舍五入秒数重算总帧数造成的“候选区间必须连续”错误，现使用检测结果的权威 `endFrame`，Edge 回归通过。
13. **donghua02 对照（2026-08-30）**：动画/游戏 `balanced` 与 `detailed` 均只产生 6 个 hard-cut，且集中在前半段；同素材通用/影视 `balanced` 的 Adaptive 产生 19 个。结论是动画预设当前实际使用 Content-only，漏掉了相近色彩/舒缓镜头的局部变化；需先补齐 Content/Adaptive 对照入口或 sweep，再继续决定动画 preset 默认 detector。
14. **专项预设暂存（2026-08-30）**：基于 `donghua03` 及前序动画素材切点明显偏少、低于通用/影视效果的复测结果，Web 编辑器暂时隐藏 `animation-gameplay`（动画 / 游戏）与 `talking-head`（访谈 / Vlog）。两者仍保留在 research registry、resolver 和标定工具中，不删除配置；后续完成足量标注、Content/Adaptive 对照与 holdout 验收后再评估重新开放。
15. **通用/影视与短视频回归基线（2026-08-30）**：用户确认当前两项预设通过已有人工测试，冻结各自 version 1 的 balanced/仅硬切参数与 canonical hash，作为后续多视频回归比较基线。
16. **production version 1 晋升（2026-08-30）**：按用户明确批准，将 `general`（通用/影视）与 `short-form`（短视频）写入 production catalog，普通 Web 编辑器已切换到 production。后续用户测试用于发现问题和创建新版本，不直接修改当前冻结基线；动画/游戏、访谈/Vlog 不进入 production。
17. 完成性能、内存、数据库数据保护、人工标注/search/holdout、production preview 和全产品矩阵后，才关闭 Phase 12。
18. **开发者工具入口（2026-08-30）**：左侧工具栏新增“开发者”入口；标定模式和高级检测参数各自默认关闭，只有主动开启才显示对应内容。标定模式需在自动分镜完成后才显示独立标定工作台；高级模式可切换检测器并调整阈值、窗口、最低内容差异和分量权重。关闭仅隐藏界面，不删除已有标注或覆盖值；普通生产流程不再展示这些开发操作。
19. **生产面板界面收敛（2026-08-30）**：移除普通面板中的生产状态徽标、配置未运行提示、晋升说明和 detector/采样尺寸摘要；状态继续保存在设置草稿与任务快照。最短镜头秒数输入改为窄宽度居中显示，预设按钮置于输入框右侧并统一按钮样式；扫描完成后主按钮变为“重新扫描”，删除重复重扫按钮，候选按钮统一为“应用候选分镜”。恢复自动分镜默认设置移至左侧工具栏底部的“设置”面板。

当前约束：

- 只开发和验收 Web，Desktop/Mobile 不作为阻塞门。
- 不假定浏览器可以通过 `copyTo()` 请求 I420；原生平面、RGB 标准化和 Worker 低分辨率预处理由基准决定。
- 先冻结颜色空间、VFR 帧映射、强媒体身份、canonical config/hash、checkpoint envelope、task outcome、应用命令和 provenance。
- 新引擎接管并通过回归后删除旧 Canvas/seek 检测，不长期保留双轨。

详见：

- `docs/auto-shot/ARCHITECTURE.md`
- `docs/auto-shot/IMPLEMENTATION_PLAN.md`
- `docs/auto-shot/CONTROL_SYSTEM.md`
- `docs/auto-shot/OPTIMIZATION_LOG.md`

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
